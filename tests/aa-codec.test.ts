import { describe, expect, it } from 'vitest'

import {
  AaCommandEncoder,
  AaResponseStream,
  expectResponse,
  parseClassicBlock,
  parseClassicValue,
  parseTypeACard,
} from '../main/aa-codec.js'
import type { AaResult } from '../main/aa-codec.js'

const typeAResponse = Buffer.from('AABB000C0000100000040020A1B2C3D487', 'hex')

describe('AA codec', () => {
  it('encodes the required M1 commands with incrementing sequence, big-endian length and XOR', () => {
    const encoder = new AaCommandEncoder()

    expect(commandFrame(encoder.requestTypeA('all'))).toEqual(Buffer.from('AA000005000010005247', 'hex'))
    expect(commandFrame(encoder.authenticateClassic({ type: 'A', sector: 1, key: Buffer.from('FFFFFFFFFFFF', 'hex') }))).toEqual(Buffer.from('AA01000C000010016001FFFFFFFFFFFF7D', 'hex'))
    expect(commandFrame(encoder.readClassicBlock(4))).toEqual(Buffer.from('AA020005000010020411', 'hex'))
    expect(commandFrame(encoder.writeClassicBlock(4, Buffer.alloc(16, 0xA5)))).toEqual(Buffer.from('AA0300150000100304A5A5A5A5A5A5A5A5A5A5A5A5A5A5A5A501', 'hex'))
    expect(commandFrame(encoder.initializeClassicValue(5, 100))).toEqual(Buffer.from('AA0400090000100705000000647B', 'hex'))
    expect(commandFrame(encoder.incrementClassicValue(5, 100))).toEqual(Buffer.from('AA05000900001008050000006475', 'hex'))
    expect(commandFrame(encoder.readClassicValue(5))).toEqual(Buffer.from('AA0600050000100A051C', 'hex'))
  })

  it('reassembles split frames and emits merged responses in order', () => {
    const stream = new AaResponseStream()

    expect(stream.push(typeAResponse.subarray(0, 8))).toEqual([])
    expect(stream.push(Buffer.concat([
      typeAResponse.subarray(8),
      Buffer.from('AA020005000010010016', 'hex'),
    ]))).toEqual([
      {
        kind: 'response',
        response: {
          sequence: 0xBB,
          device: 0,
          command: [0x10, 0x00],
          status: 0,
          data: Buffer.from('040020A1B2C3D4', 'hex'),
        },
      },
      {
        kind: 'response',
        response: { sequence: 2, device: 0, command: [0x10, 0x01], status: 0, data: Buffer.alloc(0) },
      },
    ])
  })

  it('returns type-safe protocol errors without retaining sensitive bytes', () => {
    const stream = new AaResponseStream()

    expect(stream.push(Buffer.concat([Buffer.from('AA01000400001000', 'hex'), typeAResponse]))).toEqual([
      { kind: 'error', error: { code: 'invalid-length' } },
      {
        kind: 'response',
        response: {
          sequence: 0xBB,
          device: 0,
          command: [0x10, 0x00],
          status: 0,
          data: Buffer.from('040020A1B2C3D4', 'hex'),
        },
      },
    ])
    expect(stream.push(Buffer.from('AA0100050000100100FF', 'hex'))).toEqual([
      { kind: 'error', error: { code: 'invalid-checksum' } },
    ])
    expect(stream.push(Buffer.concat([Buffer.from('AA01FFFF', 'hex'), typeAResponse]))).toEqual([
      { kind: 'error', error: { code: 'invalid-length' } },
      expect.objectContaining({ kind: 'response' }),
    ])

    const protocolError = expectResponse({ sequence: 2, device: 0, command: [0x10, 0x01], status: 0x25, data: Buffer.alloc(0) }, { sequence: 2, command: [0x10, 0x01] })
    const unexpected = expectResponse({ sequence: 3, device: 0, command: [0x10, 0x01], status: 0, data: Buffer.alloc(0) }, { sequence: 2, command: [0x10, 0x01] })

    expect(protocolError).toEqual({ ok: false, error: { code: 'protocol-status', status: 0x25 } })
    expect(unexpected).toEqual({ ok: false, error: { code: 'unexpected-sequence' } })
    expect(JSON.stringify([protocolError, unexpected])).not.toMatch(/A1B2|C3D4|FFFF/i)
  })

  it('returns typed input errors instead of echoing invalid key or block bytes', () => {
    const encoder = new AaCommandEncoder()

    const invalidKey = encoder.authenticateClassic({ type: 'A', sector: 1, key: Buffer.from('A1B2C3D4', 'hex') })
    const invalidBlock = encoder.writeClassicBlock(4, Buffer.alloc(15, 0xFF))

    expect(invalidKey).toEqual({ ok: false, error: { code: 'invalid-input' } })
    expect(invalidBlock).toEqual({ ok: false, error: { code: 'invalid-input' } })
    expect(JSON.stringify([invalidKey, invalidBlock])).not.toMatch(/A1B2|C3D4|FFFF/i)
  })

  it('parses TypeA, block and value payloads only when their lengths are valid', () => {
    expect(parseTypeACard(Buffer.from('040020A1B2C3D4', 'hex'))).toEqual({
      ok: true,
      value: { atqa: Buffer.from('0400', 'hex'), sak: 0x20, uid: Buffer.from('A1B2C3D4', 'hex') },
    })
    expect(parseClassicBlock(Buffer.alloc(15))).toEqual({ ok: false, error: { code: 'invalid-payload' } })
    expect(parseClassicValue(Buffer.from('00000064', 'hex'))).toEqual({ ok: true, value: 100 })
  })
})

function commandFrame(result: AaResult<Buffer>) {
  if (!result.ok) throw new Error('预期编码成功。')
  return result.value
}
