import { Router, Request, Response } from 'express';
import { RAGService } from '@services/rag';
import { QueryRequest, QueryResponse, ErrorResponse } from '@types';
import { logQuery } from '@utils/logger';

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
      console.error('RAG service initialization failed:', error);
      throw error;
    }
  }
};

/**
 * POST /api/chat/query
 * Query the RAG system
 */
router.post('/query', async (req: Request<{}, {}, QueryRequest>, res: Response<QueryResponse | ErrorResponse>) => {
  const startTime = Date.now();
  try {
    await ensureInitialized();

    const { question, k = 4 } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Question must be a non-empty string',
      });
    }

    const questionStr = String(question).trim();
    const answer = await ragService.query(questionStr);
    const sources = await ragService.getRelevantDocuments(questionStr, k);
    const duration = Date.now() - startTime;

    // Log the query
    logQuery({
      question: questionStr,
      answer: answer.substring(0, 200) + '...',
      sources: sources.length,
      duration,
    });

    res.json({
      answer,
      sources: sources.map((doc: any) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
      })),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logQuery({
      question: req.body.question || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    console.error('Query error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/chat/query/stream
 * Query the RAG system with streaming response
 */
router.post('/query/stream', async (req: Request<{}, {}, QueryRequest>, res: Response) => {
  const startTime = Date.now();
  try {
    await ensureInitialized();

    const { question, k = 4 } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Question must be a non-empty string',
      });
    }

    const questionStr = String(question).trim();

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullAnswer = '';

    // Stream the answer
    for await (const chunk of ragService.queryStream(questionStr)) {
      fullAnswer += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    }

    // Get and send sources
    const sources = await ragService.getRelevantDocuments(questionStr, k);
    res.write(
      `data: ${JSON.stringify({
        type: 'sources',
        sources: sources.map((doc: any) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
        })),
      })}\n\n`
    );

    // Send completion event
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

    const duration = Date.now() - startTime;

    // Log the streaming query
    logQuery({
      question: questionStr,
      answer: fullAnswer.substring(0, 200) + '...',
      sources: sources.length,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logQuery({
      question: req.body.question || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    res.write(`data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/chat/documents
 * Retrieve relevant documents without generating an answer
 */
router.post('/documents', async (req: Request<{}, {}, QueryRequest>, res: Response) => {
  try {
    await ensureInitialized();

    const { question, k = 4 } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Question is required',
      });
    }

    const documents = await ragService.getRelevantDocuments(question, k);

    res.json({
      documents: documents.map((doc: any) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
      })),
    });
  } catch (error) {
    console.error('Document retrieval error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
