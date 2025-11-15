#!/bin/bash

echo "Testing streaming query endpoint..."
echo "Watch as the answer streams in real-time:"
echo ""

curl -X POST http://localhost:3000/api/chat/query/stream \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the main symptoms of menopause?"}'

echo ""
echo ""
echo "Check logs/queries-$(date +%Y-%m-%d).log for the logged query"
