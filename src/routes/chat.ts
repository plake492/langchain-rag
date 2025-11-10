import { Router, Request, Response } from 'express';
import { RAGService } from '@services/rag';
import { QueryRequest, QueryResponse, ErrorResponse } from '@types';
import { logToFile } from '@/utils/logging';

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
    console.log('Querying RAG system with question:', questionStr, 'Type:', typeof questionStr);
    const answer = await ragService.query(questionStr);
    console.log('Answer received:', typeof answer, answer?.substring?.(0, 100));

    const sources = await ragService.getRelevantDocuments(questionStr, k);
    console.log('Sources retrieved:', sources.length);

    const answerWithSources = {
      answer,
      sources: sources.map((doc: any) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
      })),
    };

    logToFile({ type: 'QARY', file: 'query-logs' }, { question: questionStr, answer: answerWithSources });
    res.json(answerWithSources);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
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
