import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import chatRoutes from '@routes/chat';
import { HealthResponse } from '@types';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom morgan tokens
morgan.token('body', (req: any) => JSON.stringify(req.body));
morgan.token('timestamp', () => new Date().toISOString());
app.use(morgan('dev'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response<HealthResponse>) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    qdrantConnected: !!(process.env.QDRANT_URL && process.env.QDRANT_API_KEY) || false,
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'LangChain RAG API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      query: 'POST /api/chat/query',
      documents: 'POST /api/chat/documents',
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Only start server if running locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;
