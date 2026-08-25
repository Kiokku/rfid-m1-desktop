export type AaCommand = readonly [number, number]

export type AaResponse = {
  sequence: number
  device: number
  command: AaCommand
  status: number
  data: Buffer
}

export type AaCodecError =
  | { code: 'invalid-start' }
  | { code: 'invalid-length' }
  | { code: 'invalid-checksum' }
  | { code: 'unexpected-sequence' }
  | { code: 'unexpected-command' }
  | { code: 'protocol-status'; status: number }
  | { code: 'invalid-input' }
  | { code: 'invalid-payload' }

export type AaResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AaCodecError }

export type AaStreamResult =
  | { kind: 'response'; response: AaResponse }
  | { kind: 'error'; error: AaCodecError }

type ExpectedResponse = {
  sequence: number
  command: AaCommand
}

const deviceAddress = 0
const maximumM1ResponseLength = 21
const command = {
  requestTypeA: [0x10, 0x00] as AaCommand,
  authenticateClassic: [0x10, 0x01] as AaCommand,
  readClassicBlock: [0x10, 0x02] as AaCommand,
  writeClassicBlock: [0x10, 0x03] as AaCommand,
  initializeClassicValue: [0x10, 0x07] as AaCommand,
  incrementClassicValue: [0x10, 0x08] as AaCommand,
  readClassicValue: [0x10, 0x0A] as AaCommand,
}

export class AaCommandEncoder {
  #nextSequence = 0

  requestTypeA(mode: 'awake' | 'all') {
    return this.encode(command.requestTypeA, Buffer.from([mode === 'awake' ? 0x26 : 0x52]))
  }

  authenticateClassic({ type, sector, key }: { type: 'A' | 'B'; sector: number; key: Buffer }) {
    if (!isByte(sector) || key.length !== 6) return invalidInput()
    return this.encode(command.authenticateClassic, Buffer.concat([Buffer.from([type === 'A' ? 0x60 : 0x61, sector]), key]))
  }

  readClassicBlock(block: number) {
    return isByte(block)
      ? this.encode(command.readClassicBlock, Buffer.from([block]))
      : invalidInput()
  }

  writeClassicBlock(block: number, blockData: Buffer) {
    if (!isByte(block) || blockData.length !== 16) return invalidInput()
    return this.encode(command.writeClassicBlock, Buffer.concat([Buffer.from([block]), blockData]))
  }

  initializeClassicValue(block: number, value: number) {
    return this.encodeValue(command.initializeClassicValue, block, value)
  }

  incrementClassicValue(block: number, value: number) {
    return this.encodeValue(command.incrementClassicValue, block, value)
  }

  readClassicValue(block: number) {
    return isByte(block)
      ? this.encode(command.readClassicValue, Buffer.from([block]))
      : invalidInput()
  }

  private encode(commandCode: AaCommand, data: Buffer) {
    const sequence = this.#nextSequence
    this.#nextSequence = (sequence + 1) & 0xFF
    return { ok: true, value: encodeCommand(sequence, commandCode, data) } as const
  }

  private encodeValue(commandCode: AaCommand, block: number, value: number) {
    if (!isByte(block) || !isUint32(value)) return invalidInput()
    return this.encode(commandCode, valuePayload(block, value))
  }
}

export class AaResponseStream {
  #pending = Buffer.alloc(0)

  push(chunk: Buffer): AaStreamResult[] {
    this.#pending = Buffer.concat([this.#pending, chunk])
    const results: AaStreamResult[] = []

    while (this.#pending.length) {
      if (this.#pending[0] !== 0xAA) {
        this.skipToNextFrame()
        results.push({ kind: 'error', error: { code: 'invalid-start' } })
        continue
      }
      if (this.#pending.length < 4) break

      const length = this.#pending.readUInt16BE(2)
      if (length < 5 || length > maximumM1ResponseLength) {
        this.skipToNextFrame()
        results.push({ kind: 'error', error: { code: 'invalid-length' } })
        continue
      }

      const frameLength = length + 5
      if (this.#pending.length < frameLength) break
      const frame = this.#pending.subarray(0, frameLength)
      this.consume(frameLength)
      if (xor(frame.subarray(1, -1)) !== frame.at(-1)) {
        results.push({ kind: 'error', error: { code: 'invalid-checksum' } })
        continue
      }

      results.push({
        kind: 'response',
        response: {
          sequence: frame[1],
          device: frame.readUInt16BE(4),
          command: [frame[6], frame[7]],
          status: frame[8],
          data: Buffer.from(frame.subarray(9, -1)),
        },
      })
    }

    return results
  }

  private consume(length: number) {
    this.#pending = Buffer.from(this.#pending.subarray(length))
  }

  private skipToNextFrame() {
    const nextStart = this.#pending.indexOf(0xAA, 1)
    this.#pending = nextStart === -1 ? Buffer.alloc(0) : Buffer.from(this.#pending.subarray(nextStart))
  }
}

export function expectResponse(response: AaResponse, expected: ExpectedResponse): AaResult<AaResponse> {
  if (response.sequence !== expected.sequence) return { ok: false, error: { code: 'unexpected-sequence' } }
  if (response.command[0] !== expected.command[0] || response.command[1] !== expected.command[1]) {
    return { ok: false, error: { code: 'unexpected-command' } }
  }
  if (response.status !== 0) return { ok: false, error: { code: 'protocol-status', status: response.status } }
  return { ok: true, value: response }
}

export function parseTypeACard(data: Buffer): AaResult<{ atqa: Buffer; sak: number; uid: Buffer }> {
  if (data.length !== 7 && data.length !== 10) return { ok: false, error: { code: 'invalid-payload' } }
  return {
    ok: true,
    value: { atqa: Buffer.from(data.subarray(0, 2)), sak: data[2], uid: Buffer.from(data.subarray(3)) },
  }
}

export function parseClassicBlock(data: Buffer): AaResult<Buffer> {
  return data.length === 16
    ? { ok: true, value: Buffer.from(data) }
    : { ok: false, error: { code: 'invalid-payload' } }
}

export function parseClassicValue(data: Buffer): AaResult<number> {
  return data.length === 4
    ? { ok: true, value: data.readUInt32BE() }
    : { ok: false, error: { code: 'invalid-payload' } }
}

function encodeCommand(sequence: number, commandCode: AaCommand, data: Buffer) {
  const length = 4 + data.length
  const frame = Buffer.alloc(length + 5)
  frame[0] = 0xAA
  frame[1] = sequence
  frame.writeUInt16BE(length, 2)
  frame.writeUInt16BE(deviceAddress, 4)
  frame[6] = commandCode[0]
  frame[7] = commandCode[1]
  data.copy(frame, 8)
  frame[frame.length - 1] = xor(frame.subarray(1, -1))
  return frame
}

function valuePayload(block: number, value: number) {
  const payload = Buffer.alloc(5)
  payload[0] = block
  payload.writeUInt32BE(value, 1)
  return payload
}

function xor(bytes: Uint8Array) {
  return bytes.reduce((result, value) => result ^ value, 0)
}

function invalidInput(): AaResult<never> {
  return { ok: false, error: { code: 'invalid-input' } }
}

function isByte(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xFF
}

function isUint32(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xFFFFFFFF
}
