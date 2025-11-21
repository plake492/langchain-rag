// src/routes/chat.ts

import { Router, Request, Response } from 'express';
import { RAGService } from '@services/rag';
import { QueryRequest, QueryResponse, ErrorResponse } from '@types';
import { logQuery } from '@utils/logger';
import { logToClickHouse } from '@services/clickhouse.service';
import { RAGMetrics } from '@utils/metrics';
import { v4 as uuidv4 } from 'uuid';

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
  const messageId = uuidv4();
  const metrics = new RAGMetrics();

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

    // Query with metrics tracking
    const endLLMTiming = metrics.startTiming('llmGenerationTime');
    const answer = await ragService.query(questionStr, metrics);
    endLLMTiming();

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

    // Log to existing logger
    logQuery({
      question: questionStr,
      answer: answer.substring(0, 200) + '...',
      sources: sources.length,
      duration,
    });

    // Log to ClickHouse (fire and forget)
    logToClickHouse({
      messageId,
      collection,
      question: questionStr,
      answer,
      sources,
      answeredFromContext: isAnsweredFromContext,
      isStreaming: false,
      totalTime: duration,
      metrics,
      req,
    }).catch(console.error);

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

    // Log error to ClickHouse (fire and forget)
    logToClickHouse({
      messageId,
      collection: req.body.collection || 'unknown',
      question: req.body.question || 'unknown',
      answer: '',
      sources: [],
      answeredFromContext: false,
      isStreaming: false,
      totalTime: duration,
      error: {
        occurred: true,
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      req,
    }).catch(console.error);

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
  const messageId = uuidv4();
  const metrics = new RAGMetrics();

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

    // Time the streaming
    const endLLMTiming = metrics.startTiming('llmGenerationTime');

    // Stream the answer with metrics
    for await (const chunk of ragService.queryStream(questionStr, metrics)) {
      fullAnswer += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    }

    endLLMTiming();

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
    let sources: any[] = [];
    if (isAnsweredFromContext) {
      sources = await ragService.getRelevantDocuments(questionStr, k);
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

    // Log to existing logger
    logQuery({
      question: questionStr,
      answer: fullAnswer.substring(0, 200) + '...',
      sources: isAnsweredFromContext ? k : 0,
      duration,
    });

    // Log to ClickHouse (fire and forget)
    logToClickHouse({
      messageId,
      collection,
      question: questionStr,
      answer: fullAnswer,
      sources,
      answeredFromContext: isAnsweredFromContext,
      isStreaming: true,
      totalTime: duration,
      metrics,
      req,
    }).catch(console.error);
  } catch (error) {
    const duration = Date.now() - startTime;

    logQuery({
      question: req.body.question || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    // Log error to ClickHouse
    logToClickHouse({
      messageId,
      collection: req.body.collection || 'unknown',
      question: req.body.question || 'unknown',
      answer: '',
      sources: [],
      answeredFromContext: false,
      isStreaming: true,
      totalTime: duration,
      error: {
        occurred: true,
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      req,
    }).catch(console.error);

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
