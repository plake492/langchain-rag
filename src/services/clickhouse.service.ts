// src/services/clickhouse.service.ts
import { Request } from 'express';
import { RAGMetrics } from '@utils/metrics';
import { createClient, ClickHouseClient } from '@clickhouse/client';

interface RAGAnalyticsEvent {
  event_time: Date;
  user_id: string | null;
  conversation_id: string | null;
  message_id: string;
  medical_topic: string;
  collection: string;
  query_text: string;
  query_length: number;
  embedding_time_ms: number;
  vector_search_time_ms: number;
  rerank_time_ms: number;
  llm_generation_time_ms: number;
  total_time_ms: number;
  sources_retrieved: number;
  sources_returned: number;
  sources_used_in_response: number;
  avg_relevance_score: number | null;
  top_relevance_score: number | null;
  model_used: string;
  tokens_prompt: number | null;
  tokens_completion: number | null;
  tokens_total: number | null;
  estimated_cost: number;
  response_length: number;
  answered_from_context: boolean;
  is_streaming: boolean;
  error_occurred: boolean;
  error_type: string | null;
  error_message: string | null;
  user_agent: string | null;
  ip_address: string | null;
}

class ClickHouseService {
  private client: ClickHouseClient | null = null;
  private isConnected: boolean = false;

  constructor() {
    // Don't auto-connect - let initialization happen explicitly
  }

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        host: process.env.CLICKHOUSE_HOST!,
        username: process.env.CLICKHOUSE_USER || 'default',
        password: process.env.CLICKHOUSE_PASSWORD!,
        database: process.env.CLICKHOUSE_DATABASE || 'whws_rag',
        request_timeout: 30000,
      });

      // Test connection
      await this.client.ping();
      console.log('✅ ClickHouse connected successfully');
      this.isConnected = true;
    } catch (error) {
      console.error('❌ ClickHouse connection failed:', error);
      console.warn('⚠️  Continuing without ClickHouse analytics');
      this.isConnected = false;
      // Don't throw - we want the app to continue even if analytics fails
    }
  }

  async logRAGAnalytics(event: RAGAnalyticsEvent): Promise<void> {
    if (!this.isConnected || !this.client) {
      // Silently skip if not connected
      return;
    }

    try {
      await this.client.insert({
        table: 'rag_analytics',
        values: [event],
        format: 'JSONEachRow',
      });
    } catch (error) {
      // Don't throw - analytics failures shouldn't break the app
      console.error('Failed to log to ClickHouse:', error);
    }
  }

  async query<T = any>(sql: string): Promise<T[]> {
    if (!this.isConnected || !this.client) {
      throw new Error('ClickHouse not connected');
    }

    const resultSet = await this.client.query({
      query: sql,
      format: 'JSONEachRow',
    });
    return (await resultSet.json()) as T[];
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      this.client = null;
    }
  }
}

/**
 * Normalize IP address for ClickHouse IPv4 type
 * Converts IPv6 localhost to IPv4, extracts IPv4 from IPv6-mapped addresses,
 * and returns null for pure IPv6 addresses
 */
function normalizeIPAddress(ip: string | null | undefined): string | null {
  if (!ip) return null;

  // Convert IPv6 localhost to IPv4
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }

  // Extract IPv4 from IPv6-mapped IPv4 addresses (::ffff:x.x.x.x)
  if (ip.startsWith('::ffff:')) {
    const ipv4 = ip.substring(7);
    // Validate it's a proper IPv4
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ipv4)) {
      return ipv4;
    }
  }

  // If it's already IPv4, return it
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return ip;
  }

  // For pure IPv6 addresses, return null (ClickHouse IPv4 type can't store them)
  return null;
}

/**
 * Helper to log analytics to ClickHouse (fire and forget)
 */
async function logToClickHouse(params: {
  messageId: string;
  collection: string;
  question: string;
  answer: string;
  sources: any[];
  answeredFromContext: boolean;
  isStreaming: boolean;
  totalTime: number;
  metrics?: RAGMetrics;
  error?: {
    occurred: boolean;
    type: string;
    message: string;
  };
  req: Request;
}): Promise<void> {
  try {
    const sourceMetrics = params.metrics?.calculateSourceMetrics(params.sources) || { scores: [], count: 0 };
    const avgScore = params.metrics?.calculateAvgScore(sourceMetrics.scores) || null;
    const topScore = params.metrics?.calculateTopScore(sourceMetrics.scores) || null;
    const timings = params.metrics?.getTimings() || {
      embeddingTime: 0,
      vectorSearchTime: 0,
      rerankTime: 0,
      llmGenerationTime: 0,
    };

    // Estimate token counts (rough approximation: 1 token ≈ 4 chars)
    const estimatedPromptTokens = Math.ceil((params.question.length + params.sources.reduce((sum, s) => sum + (s.pageContent?.length || 0), 0)) / 4);
    const estimatedCompletionTokens = Math.ceil(params.answer.length / 4);
    const estimatedTotalTokens = estimatedPromptTokens + estimatedCompletionTokens;

    // Estimate cost (using GPT-4 pricing as example: $0.03 per 1K prompt, $0.06 per 1K completion)
    const costPerPromptToken = 0.03 / 1000;
    const costPerCompletionToken = 0.06 / 1000;
    const estimatedCost = estimatedPromptTokens * costPerPromptToken + estimatedCompletionTokens * costPerCompletionToken;

    await clickhouseService.logRAGAnalytics({
      event_time: new Date(),
      user_id: null, // Add from auth if you have it
      conversation_id: null, // Add if you track conversations
      message_id: params.messageId,
      medical_topic: params.collection, // menopause or breast_cancer
      collection: params.collection,
      query_text: params.question,
      query_length: params.question.length,
      embedding_time_ms: timings.embeddingTime,
      vector_search_time_ms: timings.vectorSearchTime,
      rerank_time_ms: timings.rerankTime,
      llm_generation_time_ms: timings.llmGenerationTime,
      total_time_ms: params.totalTime,
      sources_retrieved: params.sources.length,
      sources_returned: params.sources.length,
      sources_used_in_response: params.sources.length, // Count of sources actually used
      avg_relevance_score: avgScore,
      top_relevance_score: topScore,
      model_used: 'gpt-3.5-turbo', // Matches the model in RAGService
      tokens_prompt: estimatedPromptTokens,
      tokens_completion: estimatedCompletionTokens,
      tokens_total: estimatedTotalTokens,
      estimated_cost: estimatedCost,
      response_length: params.answer.length,
      answered_from_context: params.answeredFromContext,
      is_streaming: params.isStreaming,
      error_occurred: params.error?.occurred || false,
      error_type: params.error?.type || null,
      error_message: params.error?.message || null,
      user_agent: params.req.get('user-agent') || null,
      ip_address: normalizeIPAddress(params.req.ip || params.req.socket.remoteAddress || null),
    });
  } catch (error) {
    // Silently fail - don't let analytics break the app
    console.error('ClickHouse logging failed:', error);
  }
}

// Export singleton instance
export const clickhouseService = new ClickHouseService();
export { normalizeIPAddress, logToClickHouse };
