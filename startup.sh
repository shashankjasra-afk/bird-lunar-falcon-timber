#!/bin/sh
set -eu
cd /workspace
if ! curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8091/health; then
  python3 /workspace/python/dealflow_graph.py >>/tmp/dealflow-graph.log 2>&1 &
fi
node scripts/preview.mjs stop || true
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
