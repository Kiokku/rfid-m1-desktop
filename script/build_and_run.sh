#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
APP_NAME="RFID M1 授权工位"

pkill -x "$APP_NAME" >/dev/null 2>&1 || true
npm run build

case "$MODE" in
  run)
    npm start
    ;;
  --debug|debug)
    ELECTRON_ENABLE_LOGGING=1 npm start
    ;;
  --logs|logs|--telemetry|telemetry)
    ELECTRON_ENABLE_LOGGING=1 npm start
    ;;
  --verify|verify)
    npm start &
    APP_PID=$!
    sleep 2
    kill -0 "$APP_PID"
    kill "$APP_PID" >/dev/null 2>&1 || true
    ;;
  *)
    echo "usage: $0 [run|--debug|--logs|--telemetry|--verify]" >&2
    exit 2
    ;;
esac
