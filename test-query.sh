#!/bin/bash

echo "Testing basic query endpoint..."
echo ""

curl -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the main symptoms of menopause?"}' \
  | jq '.'

echo ""
echo "Check logs/queries-$(date +%Y-%m-%d).log for the logged query"
