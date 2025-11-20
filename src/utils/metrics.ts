// src/utils/metrics.ts

interface TimingMetrics {
  embeddingTime: number;
  vectorSearchTime: number;
  rerankTime: number;
  llmGenerationTime: number;
}

interface SourceMetrics {
  scores: number[];
  count: number;
}

export class RAGMetrics {
  private timings: TimingMetrics;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.timings = {
      embeddingTime: 0,
      vectorSearchTime: 0,
      rerankTime: 0,
      llmGenerationTime: 0,
    };
  }

  startTiming(phase: keyof TimingMetrics): () => void {
    const start = Date.now();
    return () => {
      this.timings[phase] = Date.now() - start;
    };
  }

  getTotalTime(): number {
    return Date.now() - this.startTime;
  }

  getTimings(): TimingMetrics {
    return { ...this.timings };
  }

  calculateSourceMetrics(sources: any[]): SourceMetrics {
    const scores = sources.map((s) => s.metadata?.score || 0).filter((score) => score > 0);

    return {
      scores,
      count: sources.length,
    };
  }

  calculateAvgScore(scores: number[]): number | null {
    if (scores.length === 0) return null;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  calculateTopScore(scores: number[]): number | null {
    if (scores.length === 0) return null;
    return Math.max(...scores);
  }
}
