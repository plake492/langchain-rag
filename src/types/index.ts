export type CollectionType = 'menopause' | 'breast_cancer';

export interface QueryRequest {
  question: string;
  k?: number;
  collection?: CollectionType;
}

export interface QueryResponse {
  answer: string;
  sources?: Array<{
    content: string;
    metadata: Record<string, any>;
    id: number;
    organization: string;
    url?: string;
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

export interface SourceConfig {
  url: string;
  metadata: {
    organization: string;
    category: string;
    credibility: 'high' | 'medium';
    lastVerified: string;
  };
  selectors?: {
    content?: string;
    exclude?: string[];
  };
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  score: number;
}

export interface LogginTypes {
  type: 'SCRP' | 'QARY';
  file: 'query-logs' | 'scrapping-logs';
}

export interface ChatCompletionLog {
  userId: string;
  conversationId: string;
  messageId: string;
  medicalTopic: string;
  query: string;
  embeddingTimeMs: number;
  vectorSearchTimeMs: number;
  retrievedSources: Array<{
    content: string;
    metadata: Record<string, any>;
    id: number;
    relevanceScore: number;
  }>;
  relevanceScores: number[];
  llmGenerationTimeMs: number;
  tokensUsed: number;
  totalResponseTimeMs: number;
  modelUsed: string;
}

export interface RAGAnalyticsEvent {
  event_time: Date;
  user_id: string;
  conversation_id: string;
  message_id: string;
  medical_topic: string;
  query_length: number;
  embedding_time_ms: number;
  vector_search_time_ms: number;
  sources_retrieved: number;
  avg_relevance_score: number;
  llm_generation_time_ms: number;
  tokens_used: number;
  total_time_ms: number;
  model_used: string;
}
