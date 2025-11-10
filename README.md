# LangChain RAG System for Menopause Information

A TypeScript-based RAG (Retrieval-Augmented Generation) system that provides accurate menopause information from authoritative medical sources including The Menopause Society, ACOG, NIH, and leading academic medical centers.

## Features

- **Authoritative Sources**: Scraped content from trusted medical organizations
- **Vector Search**: Semantic search using Qdrant vector database
- **Source Attribution**: All responses include source metadata
- **Content Validation**: Automatic quality filtering and deduplication
- **Express API**: RESTful endpoints for querying the knowledge base
- **HIPAA-Ready**: Designed with healthcare compliance in mind

## Prerequisites

- Node.js 18+
- OpenAI API key
- Qdrant instance (local or cloud)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```
OPENAI_API_KEY=your_openai_api_key
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key  # Optional for local
PORT=3000
```

### 3. Start Qdrant (Local Development)

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 4. Populate the Knowledge Base

Scrape and index authoritative menopause sources:

```bash
npm run scrape
```

This will:
- Scrape content from The Menopause Society, ACOG, NIH, and other sources
- Validate content quality
- Remove duplicates
- Store in Qdrant vector database

### 5. Start the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

The server will be running at `http://localhost:3000`

## API Endpoints

### Health Check
```bash
GET /health
```

### Query the RAG System
```bash
POST /api/chat/query
Content-Type: application/json

{
  "question": "What are the most common symptoms of menopause?",
  "k": 4
}
```

Response:
```json
{
  "answer": "Based on the documentation...",
  "sources": [
    {
      "content": "...",
      "metadata": {
        "organization": "The Menopause Society",
        "source": "https://...",
        "credibility": "high"
      }
    }
  ]
}
```

### Get Relevant Documents Only
```bash
POST /api/chat/documents
Content-Type: application/json

{
  "question": "hormone replacement therapy",
  "k": 3
}
```

## Project Structure

```
langchain-rag/
├── src/
│   ├── server.ts              # Express server
│   ├── routes/
│   │   └── chat.ts            # API routes
│   ├── services/
│   │   ├── rag.ts             # RAG service
│   │   └── scraper.ts         # Web scraping & validation
│   ├── config/
│   │   └── menopause-sources.ts # Source URLs
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   └── scripts/
│       └── scrape-menopause-sources.ts
├── documents/                 # Local document storage (optional)
├── project-docs/              # Implementation documentation
├── .env                       # Environment variables
├── tsconfig.json              # TypeScript config
└── package.json
```

## Authoritative Sources

The knowledge base includes content from:

- **The Menopause Society** (formerly NAMS)
- **American College of Obstetricians and Gynecologists (ACOG)**
- **NIH Office on Women's Health**
- **MedlinePlus**
- **UCLA Health**
- And other verified academic medical centers

## Content Validation

The scraper includes:
- Minimum content length checks
- Medical terminology validation
- Boilerplate filtering
- Metadata verification
- Duplicate detection

## HIPAA Compliance Notes

For healthcare applications:
1. Self-host Qdrant for data control
2. Use BAA-covered services
3. Implement audit logging
4. Encrypt data in transit and at rest
5. Re-scrape sources quarterly for accuracy

## Development

### Build
```bash
npm run build
```

### Type Checking
```bash
npx tsc --noEmit
```

### Update Knowledge Base
```bash
npm run scrape
```

## Configuration

### Chunk Size & Overlap
Modify in `src/services/rag.ts`:
```typescript
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
```

### Retrieved Documents
Modify in `src/services/rag.ts`:
```typescript
this.vectorStore.asRetriever({ k: 4 })
```

### Add New Sources
Edit `src/config/menopause-sources.ts`:
```typescript
export const menopauseSources: SourceConfig[] = [
  {
    url: "https://example.org/menopause",
    metadata: {
      organization: "Example Org",
      category: "Medical",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  // ...
];
```

## Testing

### Test Health Endpoint
```bash
curl http://localhost:3000/health
```

### Test Query
```bash
curl -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is perimenopause?",
    "k": 4
  }'
```

## Troubleshooting

### Qdrant Connection Issues
- Ensure Qdrant is running: `docker ps`
- Check `QDRANT_URL` in `.env`
- For cloud, verify API key

### Scraping Fails
- Check internet connection
- Verify source URLs are accessible
- Review rate limiting (2s delay between requests)

### No Documents Found
- Run scraping script first: `npm run scrape`
- Check Qdrant collection exists
- Verify content passed validation

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- All sources are authoritative and verified
- Content validation passes
- HIPAA compliance considerations are maintained
