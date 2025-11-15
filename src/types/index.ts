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
