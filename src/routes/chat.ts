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

    const { question, k = 4, collection = 'menopause' } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Question must be a non-empty string',
      });
    }

    // Switch to requested collection
    await ragService.switchCollection(collection);

    const questionStr = String(question).trim();
    const answer = await ragService.query(questionStr);

    // Check if the answer indicates it couldn't be answered from context
    const cannotAnswerPhrases = [
      "doesn't contain",
      "don't contain",
      'not provided in the context',
      'not found in the context',
      'context does not',
      'no information',
      'cannot answer',
      "can't answer",
      'unable to answer',
      'not addressed in the provided',
      'not covered in the context',
    ];

    const answerLower = answer.toLowerCase();
    const isAnsweredFromContext = !cannotAnswerPhrases.some((phrase) => answerLower.includes(phrase));

    // Only get sources if the answer was based on the context
    const sources = isAnsweredFromContext ? await ragService.getRelevantDocuments(questionStr, k) : [];
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
      sources: sources.map((doc: any, index: number) => ({
        id: index + 1,
        content: doc.pageContent,
        metadata: doc.metadata,
        organization: doc.metadata?.organization || 'Unknown Source',
        url: doc.metadata?.source || doc.metadata?.url,
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

    const { question, k = 4, collection = 'menopause' } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Question must be a non-empty string',
      });
    }

    // Switch to requested collection
    await ragService.switchCollection(collection);

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

    // Check if the answer indicates it couldn't be answered from context
    const cannotAnswerPhrases = [
      "doesn't contain",
      "don't contain",
      'not provided in the context',
      'not found in the context',
      'context does not',
      'no information',
      'cannot answer',
      "can't answer",
      'unable to answer',
      'not addressed in the provided',
      'not covered in the context',
    ];

    const answerLower = fullAnswer.toLowerCase();
    const isAnsweredFromContext = !cannotAnswerPhrases.some((phrase) => answerLower.includes(phrase));

    // Only get and send sources if the answer was based on the context
    if (isAnsweredFromContext) {
      const sources = await ragService.getRelevantDocuments(questionStr, k);
      res.write(
        `data: ${JSON.stringify({
          type: 'sources',
          sources: sources.map((doc: any, index: number) => ({
            id: index + 1,
            content: doc.pageContent,
            metadata: doc.metadata,
            organization: doc.metadata?.organization || 'Unknown Source',
            url: doc.metadata?.source || doc.metadata?.url,
          })),
        })}\n\n`
      );
    }

    // Send completion event
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

    const duration = Date.now() - startTime;

    // Log the streaming query
    logQuery({
      question: questionStr,
      answer: fullAnswer.substring(0, 200) + '...',
      sources: isAnsweredFromContext ? k : 0,
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

    const { question, k = 4, collection = 'menopause' } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Question is required',
      });
    }

    // Switch to requested collection
    await ragService.switchCollection(collection);

    const documents = await ragService.getRelevantDocuments(question, k);

    res.json({
      documents: documents.map((doc: any, index: number) => ({
        id: index + 1,
        content: doc.pageContent,
        metadata: doc.metadata,
        organization: doc.metadata?.organization || 'Unknown Source',
        url: doc.metadata?.source || doc.metadata?.url,
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
