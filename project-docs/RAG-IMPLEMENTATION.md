# Basic LangChain RAG System in TypeScript

## Overview

RAG (Retrieval-Augmented Generation) combines document retrieval with LLM generation. The system retrieves relevant documents based on a query, then uses those documents as context for the LLM to generate answers.

**This guide is specifically for building a menopause information RAG system** that draws from authoritative medical sources including The Menopause Society, ACOG, NIH, and leading academic medical centers. The knowledge base is populated through web scraping (see scraping documentation) and stored in Qdrant for fast semantic search.

## Installation

```bash
npm install langchain @langchain/openai @langchain/community @langchain/qdrant
```

For the Qdrant vector database:
```bash
npm install @qdrant/js-client-rest
```

## Core Components

A basic RAG system has four main parts:

**Document Loaders** load your data from various sources. For this menopause system, we use web scrapers to pull content from authoritative medical websites (The Menopause Society, ACOG, NIH, etc.)

**Text Splitters** break documents into chunks that fit within token limits while maintaining semantic meaning.

**Embeddings** convert text chunks into vector representations that capture semantic meaning, allowing the system to find relevant menopause information based on conceptual similarity rather than just keyword matching.

**Vector Stores** store and efficiently search through embedded vectors to find relevant content. We use Qdrant to store the menopause knowledge base with metadata for source attribution.

## Basic Implementation

This example assumes you've already scraped menopause sources using the scraping workflow. See the scraping documentation for how to populate the vector database.

```typescript
import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RetrievalQAChain } from "langchain/chains";

async function createRAGSystem() {
  // 1. Create embeddings instance
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  
  // 2. Connect to existing Qdrant collection with scraped menopause data
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: "menopause_knowledge",
    }
  );

  // 3. Create retrieval chain
  const model = new OpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0.7,
  });

  const chain = RetrievalQAChain.fromLLM(
    model,
    vectorStore.asRetriever({ k: 4 })
  );

  // 4. Query the system
  const response = await chain.call({
    query: "What are the most common symptoms of menopause?",
  });

  console.log(response.text);
}
```

**Note:** The `menopause_knowledge` collection is populated by the scraping workflow described in the scraping documentation. This contains validated content from authoritative sources like The Menopause Society, ACOG, NIH, and academic medical centers.

## Key Configuration Options

**Chunk Size**: Controls how much text goes into each chunk. Smaller chunks (500-1000) provide more precise retrieval but may lose context. Larger chunks (1500-2000) maintain more context but may be less precise.

**Chunk Overlap**: Prevents information from being split awkwardly between chunks. Typical values are 10-20% of chunk size.

**Number of Retrieved Documents**: The retriever's `k` parameter controls how many relevant chunks to retrieve. Start with 3-4 and adjust based on results.

```typescript
const retriever = vectorStore.asRetriever({
  k: 4,  // retrieve top 4 most relevant chunks
});
```

## Setting Up Qdrant

You have three options for running Qdrant:

### Option 1: Local Docker (Development)

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### Option 2: Qdrant Cloud (Production)

Sign up at [cloud.qdrant.io](https://cloud.qdrant.io) and use the provided URL and API key.

### Option 3: Self-Hosted (Production)

Deploy Qdrant on your own infrastructure for full control (recommended for HIPAA compliance).

### Connecting to Your Menopause Knowledge Base

After running the scraping workflow, your Qdrant instance will have a `menopause_knowledge` collection populated with validated content from authoritative sources.

```typescript
import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";

// Option 1: Simple connection (recommended for most use cases)
const vectorStore = await QdrantVectorStore.fromExistingCollection(
  embeddings,
  {
    url: process.env.QDRANT_URL,
    collectionName: "menopause_knowledge",
  }
);

// Option 2: With API key (Qdrant Cloud)
const vectorStore = await QdrantVectorStore.fromExistingCollection(
  embeddings,
  {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: "menopause_knowledge",
  }
);

// Option 3: Using existing client with custom config
const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(
  embeddings,
  {
    client,
    collectionName: "menopause_knowledge",
  }
);
```

### Querying with Source Attribution

Since your knowledge base contains content from multiple authoritative sources, you can filter by metadata:

```typescript
// Query and get sources
const results = await vectorStore.similaritySearch(
  "What is hormone replacement therapy?",
  4
);

// Display results with attribution
results.forEach((doc) => {
  console.log("Content:", doc.pageContent);
  console.log("Source:", doc.metadata.organization);
  console.log("URL:", doc.metadata.source);
  console.log("---");
});
```

### Filter by Source Organization

```typescript
// Only search content from specific organizations
const vectorStore = await QdrantVectorStore.fromExistingCollection(
  embeddings,
  {
    url: process.env.QDRANT_URL,
    collectionName: "menopause_knowledge",
    filter: {
      must: [
        {
          key: "metadata.credibility",
          match: { value: "high" }
        }
      ]
    }
  }
);
```

## Populating Your Knowledge Base

Your RAG system's knowledge base is populated through web scraping of authoritative menopause sources. See the separate scraping documentation for the complete workflow.

### Quick Overview of Scraping Process

```typescript
import { MenopauseSourceScraper } from "./services/scraper";
import { menopauseSources } from "./config/menopause-sources";

// Scrape authoritative sources
const scraper = new MenopauseSourceScraper();
const docs = await scraper.scrapeMultipleURLs(menopauseSources, 2000);

// Store in Qdrant
const vectorStore = await QdrantVectorStore.fromDocuments(
  docs,
  embeddings,
  {
    url: process.env.QDRANT_URL,
    collectionName: "menopause_knowledge",
  }
);
```

### Sources Include:
- **The Menopause Society** - Clinical guidelines and position statements
- **ACOG** - Practice bulletins and patient education
- **NIH/MedlinePlus** - Government health resources
- **UCLA, NYU, Stanford** - Academic medical center programs

### Adding Additional Sources

If you need to add new content to your existing knowledge base:

```typescript
// Connect to existing collection
const vectorStore = await QdrantVectorStore.fromExistingCollection(
  embeddings,
  {
    url: process.env.QDRANT_URL,
    collectionName: "menopause_knowledge",
  }
);

// Scrape new source
const newDocs = await scraper.scrapeURL(
  "https://www.example-medical-org.org/menopause",
  {
    organization: "Example Medical Org",
    category: "Professional Medical Society",
    credibility: "high",
    lastVerified: new Date().toISOString(),
  }
);

// Add to collection
await vectorStore.addDocuments(newDocs);
```

## Environment Setup

Create a `.env` file:
```
OPENAI_API_KEY=your_key_here
QDRANT_URL=http://localhost:6333  # or your Qdrant Cloud URL
QDRANT_API_KEY=your_key_here  # only needed for Qdrant Cloud
```

## Next Steps

### Getting Started
1. **Set up Qdrant** - Run locally with Docker or deploy to cloud
2. **Run the scraping workflow** - See scraping documentation to populate your knowledge base
3. **Test queries** - Verify retrieval quality with menopause-related questions
4. **Deploy the Express API** - See Express server documentation

### Enhancements for Production
- **Custom prompts** - Tailor responses for empathetic, patient-friendly language
- **Source citations** - Always attribute information to authoritative sources
- **Conversation memory** - Support multi-turn conversations for complex questions
- **Streaming responses** - Real-time response generation for better UX
- **Content filtering** - Filter by source credibility and category
- **Regular updates** - Re-scrape sources quarterly to maintain accuracy

### For HIPAA Compliance (MammoChat)
- Implement audit logging for all queries
- Self-host Qdrant for data control
- Use BAA-covered services for all third-party integrations
- Encrypt data in transit and at rest
- Track source freshness for medical accuracy

### Related Documentation
- See `scraping-menopause-sources.md` for populating the knowledge base
- See `express-rag-server.md` for building the API
- See `langchain-rag-typescript.md` for RAG fundamentals