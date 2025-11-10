# Express Server for LangChain RAG System

## Installation

```bash
npm install express cors dotenv
npm install -D @types/express @types/cors @types/node typescript ts-node nodemon
```

## Project Structure

```
project/
├── src/
│   ├── server.ts           # Main server file
│   ├── routes/
│   │   └── chat.ts         # Chat/query routes
│   ├── services/
│   │   └── rag.ts          # RAG service logic
│   └── types/
│       └── index.ts        # TypeScript types
├── documents/              # Your document files
├── .env
├── tsconfig.json
└── package.json
```

## TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## Package.json Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

## RAG Service

Create `src/services/rag.ts`:

```typescript
import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RetrievalQAChain } from "langchain/chains";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";

export class RAGService {
  private vectorStore: QdrantVectorStore | null = null;
  private chain: RetrievalQAChain | null = null;
  private embeddings: OpenAIEmbeddings;
  private model: OpenAI;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.model = new OpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Initialize the RAG system by loading and indexing documents
   */
  async initialize(documentsPath: string = "./documents"): Promise<void> {
    try {
      // Load documents from directory
      const loader = new DirectoryLoader(documentsPath, {
        ".txt": (path) => new TextLoader(path),
        ".pdf": (path) => new PDFLoader(path),
      });

      const docs = await loader.load();

      if (docs.length === 0) {
        throw new Error("No documents found to index");
      }

      // Split documents into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await textSplitter.splitDocuments(docs);

      // Create or connect to vector store
      this.vectorStore = await QdrantVectorStore.fromDocuments(
        splitDocs,
        this.embeddings,
        {
          url: process.env.QDRANT_URL,
          apiKey: process.env.QDRANT_API_KEY,
          collectionName: "documents",
        }
      );

      // Create retrieval chain
      this.chain = RetrievalQAChain.fromLLM(
        this.model,
        this.vectorStore.asRetriever({ k: 4 })
      );

      console.log(`✅ RAG system initialized with ${docs.length} documents`);
    } catch (error) {
      console.error("Failed to initialize RAG system:", error);
      throw error;
    }
  }

  /**
   * Connect to existing Qdrant collection
   */
  async connectToExisting(): Promise<void> {
    try {
      this.vectorStore = await QdrantVectorStore.fromExistingCollection(
        this.embeddings,
        {
          url: process.env.QDRANT_URL,
          apiKey: process.env.QDRANT_API_KEY,
          collectionName: "documents",
        }
      );

      this.chain = RetrievalQAChain.fromLLM(
        this.model,
        this.vectorStore.asRetriever({ k: 4 })
      );

      console.log("✅ Connected to existing Qdrant collection");
    } catch (error) {
      console.error("Failed to connect to Qdrant:", error);
      throw error;
    }
  }

  /**
   * Query the RAG system
   */
  async query(question: string): Promise<string> {
    if (!this.chain) {
      throw new Error("RAG system not initialized");
    }

    try {
      const response = await this.chain.call({
        query: question,
      });

      return response.text;
    } catch (error) {
      console.error("Query failed:", error);
      throw error;
    }
  }

  /**
   * Get relevant documents without generating an answer
   */
  async getRelevantDocuments(query: string, k: number = 4) {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    try {
      const results = await this.vectorStore.similaritySearch(query, k);
      return results;
    } catch (error) {
      console.error("Document retrieval failed:", error);
      throw error;
    }
  }

  /**
   * Add new documents to the vector store
   */
  async addDocuments(filePaths: string[]): Promise<void> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    try {
      const docs = [];

      for (const filePath of filePaths) {
        if (filePath.endsWith(".pdf")) {
          const loader = new PDFLoader(filePath);
          docs.push(...(await loader.load()));
        } else if (filePath.endsWith(".txt")) {
          const loader = new TextLoader(filePath);
          docs.push(...(await loader.load()));
        }
      }

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await textSplitter.splitDocuments(docs);
      await this.vectorStore.addDocuments(splitDocs);

      console.log(`✅ Added ${docs.length} documents to vector store`);
    } catch (error) {
      console.error("Failed to add documents:", error);
      throw error;
    }
  }
}
```

## TypeScript Types

Create `src/types/index.ts`:

```typescript
export interface QueryRequest {
  question: string;
  k?: number;
}

export interface QueryResponse {
  answer: string;
  sources?: Array<{
    content: string;
    metadata: Record<string, any>;
  }>;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  qdrantConnected: boolean;
}
```

## Chat Routes

Create `src/routes/chat.ts`:

```typescript
import { Router, Request, Response } from "express";
import { RAGService } from "../services/rag";
import { QueryRequest, QueryResponse, ErrorResponse } from "../types";

const router = Router();
const ragService = new RAGService();

// Initialize RAG service on startup
let isInitialized = false;

const ensureInitialized = async () => {
  if (!isInitialized) {
    try {
      await ragService.connectToExisting();
      isInitialized = true;
    } catch (error) {
      console.error("RAG service initialization failed:", error);
      throw error;
    }
  }
};

/**
 * POST /api/chat/query
 * Query the RAG system
 */
router.post(
  "/query",
  async (req: Request<{}, {}, QueryRequest>, res: Response<QueryResponse | ErrorResponse>) => {
    try {
      await ensureInitialized();

      const { question, k = 4 } = req.body;

      if (!question || question.trim().length === 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Question is required",
        });
      }

      const answer = await ragService.query(question);
      const sources = await ragService.getRelevantDocuments(question, k);

      res.json({
        answer,
        sources: sources.map((doc) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
        })),
      });
    } catch (error) {
      console.error("Query error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/chat/documents
 * Retrieve relevant documents without generating an answer
 */
router.post(
  "/documents",
  async (req: Request<{}, {}, QueryRequest>, res: Response) => {
    try {
      await ensureInitialized();

      const { question, k = 4 } = req.body;

      if (!question || question.trim().length === 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Question is required",
        });
      }

      const documents = await ragService.getRelevantDocuments(question, k);

      res.json({
        documents: documents.map((doc) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
        })),
      });
    } catch (error) {
      console.error("Document retrieval error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
```

## Main Server

Create `src/server.ts`:

```typescript
import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./routes/chat";
import { HealthResponse } from "./types";

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/chat", chatRoutes);

// Health check endpoint
app.get("/health", (req: Request, res: Response<HealthResponse>) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    qdrantConnected: true,
  });
});

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "LangChain RAG API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      query: "POST /api/chat/query",
      documents: "POST /api/chat/documents",
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

## Environment Variables

Create `.env`:

```bash
# Server
PORT=3000

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key  # Optional for local

# Node Environment
NODE_ENV=development
```

## Running the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## API Usage Examples

### Query the RAG System

```bash
curl -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the main features of the product?",
    "k": 4
  }'
```

Response:
```json
{
  "answer": "Based on the documentation, the main features include...",
  "sources": [
    {
      "content": "Feature 1 description...",
      "metadata": {
        "source": "docs/features.txt"
      }
    }
  ]
}
```

### Get Relevant Documents Only

```bash
curl -X POST http://localhost:3000/api/chat/documents \
  -H "Content-Type: application/json" \
  -d '{
    "question": "pricing information",
    "k": 3
  }'
```

### Health Check

```bash
curl http://localhost:3000/health
```

## Frontend Integration

### React/TypeScript Example

```typescript
const queryRAG = async (question: string) => {
  const response = await fetch('http://localhost:3000/api/chat/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, k: 4 }),
  });

  if (!response.ok) {
    throw new Error('Query failed');
  }

  const data = await response.json();
  return data;
};

// Usage
const answer = await queryRAG('What is the return policy?');
console.log(answer.answer);
console.log(answer.sources);
```

## Additional Features to Consider

### Rate Limiting

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Request Validation

```bash
npm install express-validator
```

```typescript
import { body, validationResult } from 'express-validator';

router.post(
  '/query',
  body('question').isString().isLength({ min: 1, max: 1000 }),
  body('k').optional().isInt({ min: 1, max: 10 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... rest of handler
  }
);
```

### Streaming Responses

For real-time streaming responses:

```typescript
router.post('/query-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Use LangChain streaming callbacks
  const stream = await chain.stream({ query: req.body.question });
  
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }
  
  res.end();
});
```

## Security Best Practices

1. **Use HTTPS in production**
2. **Implement authentication** (JWT, OAuth, etc.)
3. **Validate and sanitize all inputs**
4. **Set appropriate CORS policies**
5. **Use helmet for security headers**

```bash
npm install helmet
```

```typescript
import helmet from 'helmet';
app.use(helmet());
```

6. **For HIPAA compliance** (MammoChat):
   - Enable audit logging
   - Encrypt data in transit and at rest
   - Implement proper access controls
   - Use signed BAAs with all service providers