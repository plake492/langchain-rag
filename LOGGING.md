# Logging & Streaming Documentation

## Logging System

The application uses Winston for structured logging with daily rotating files stored in the `logs/` directory.

### Log Files

**Query Logs** (`logs/queries-YYYY-MM-DD.log`)
- All API query requests and responses
- Includes question, answer preview, source count, and duration
- Error queries are logged separately in `queries-error-YYYY-MM-DD.log`

**Scraper Logs** (`logs/scraper-YYYY-MM-DD.log`)
- Scraping activity including start, URLs processed, validation, deduplication
- Documents stored per organization
- Error tracking during scraping

### Log Format

All logs are stored in JSON format with timestamps:

```json
{
  "timestamp": "2025-11-10 12:30:45",
  "level": "info",
  "type": "query",
  "question": "What is menopause?",
  "answer": "Menopause is...",
  "sources": 4,
  "duration": 1234
}
```

### Log Retention

- **Query logs**: 14 days
- **Error logs**: 30 days
- **Scraper logs**: 30 days
- Max file size: 20MB (rotates automatically)

### Viewing Logs

```bash
# View latest query logs
tail -f logs/queries-$(date +%Y-%m-%d).log | jq

# View latest scraper logs
tail -f logs/scraper-$(date +%Y-%m-%d).log | jq

# Search for specific queries
cat logs/queries-*.log | jq 'select(.question | contains("menopause"))'

# View error logs
tail -f logs/queries-error-$(date +%Y-%m-%d).log | jq
```

## Streaming API

### Endpoints

#### Non-Streaming (Standard)
```bash
POST /api/chat/query
Content-Type: application/json

{
  "question": "What is menopause?",
  "k": 4
}
```

Response:
```json
{
  "answer": "Full answer text...",
  "sources": [...]
}
```

#### Streaming (Real-time)
```bash
POST /api/chat/query/stream
Content-Type: application/json

{
  "question": "What is menopause?",
  "k": 4
}
```

Response (Server-Sent Events):
```
data: {"type":"chunk","content":"Menopause"}

data: {"type":"chunk","content":" is"}

data: {"type":"chunk","content":" a natural"}

data: {"type":"sources","sources":[...]}

data: {"type":"done"}
```

### Frontend Integration Examples

#### React/TypeScript with EventSource

```typescript
const streamQuery = (question: string) => {
  const eventSource = new EventSource('/api/chat/query/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  let fullAnswer = '';

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'chunk') {
      fullAnswer += data.content;
      setAnswer(fullAnswer); // Update UI in real-time
    } else if (data.type === 'sources') {
      setSources(data.sources);
    } else if (data.type === 'done') {
      eventSource.close();
    } else if (data.type === 'error') {
      console.error('Error:', data.message);
      eventSource.close();
    }
  };

  eventSource.onerror = (error) => {
    console.error('Stream error:', error);
    eventSource.close();
  };
};
```

#### Using fetch with ReadableStream

```typescript
async function streamQuery(question: string) {
  const response = await fetch('/api/chat/query/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        if (data.type === 'chunk') {
          // Update UI with new chunk
          appendToAnswer(data.content);
        } else if (data.type === 'sources') {
          // Display sources
          setSources(data.sources);
        }
      }
    }
  }
}
```

#### React Hook Example

```typescript
import { useState, useCallback } from 'react';

function useRAGStreaming() {
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const query = useCallback(async (question: string) => {
    setAnswer('');
    setIsStreaming(true);

    const response = await fetch('/api/chat/query/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'chunk') {
            setAnswer((prev) => prev + data.content);
          } else if (data.type === 'sources') {
            setSources(data.sources);
          } else if (data.type === 'done') {
            setIsStreaming(false);
          }
        }
      }
    }
  }, []);

  return { answer, sources, isStreaming, query };
}
```

## Benefits

### Streaming
- **Better UX**: Users see responses as they're generated
- **Perceived Performance**: Feels faster even if total time is similar
- **Progressive Enhancement**: Can show partial answers while loading sources
- **Real-time Feedback**: Users know the system is working

### Logging
- **Debugging**: Track query patterns and errors
- **Analytics**: Understand what users are asking
- **Performance**: Monitor response times
- **Compliance**: Audit trail for healthcare applications
- **Scraping Insights**: Track which sources contribute most content
