#!/usr/bin/env sh
set -eu
curl --fail --silent --show-error -X POST http://127.0.0.1:8000/api/v1/demo -H 'Content-Type: application/json' -d '{}'
