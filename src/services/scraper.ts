import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { ValidationResult } from "@types";
import axios from "axios";

export class MenopauseSourceScraper {
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  /**
   * Scrape a single URL
   */
  async scrapeURL(url: string, metadata: Record<string, any> = {}): Promise<Document[]> {
    try {
      const loader = new CheerioWebBaseLoader(url);

      // Load the page
      const docs = await loader.load();

      // Add metadata
      docs.forEach((doc: any) => {
        doc.metadata = {
          ...doc.metadata,
          ...metadata,
          source: url,
          scrapedAt: new Date().toISOString(),
        };
      });

      // Split into chunks
      const splitDocs = await this.textSplitter.splitDocuments(docs);

      console.log(`✅ Scraped ${url} - ${splitDocs.length} chunks`);
      return splitDocs;
    } catch (error) {
      console.error(`❌ Failed to scrape ${url}:`, error);
      return [];
    }
  }

  /**
   * Scrape multiple URLs with rate limiting
   */
  async scrapeMultipleURLs(
    urls: Array<{ url: string; metadata: Record<string, any> }>,
    delayMs: number = 2000
  ): Promise<Document[]> {
    const allDocs: Document[] = [];

    for (const { url, metadata } of urls) {
      const docs = await this.scrapeURL(url, metadata);
      allDocs.push(...docs);

      // Rate limiting - be respectful
      if (delayMs > 0) {
        await this.delay(delayMs);
      }
    }

    return allDocs;
  }

  /**
   * Scrape with custom selectors for specific content
   */
  async scrapeWithSelectors(
    url: string,
    selectors: {
      title?: string;
      content?: string;
      exclude?: string[];
    },
    metadata: Record<string, any> = {}
  ): Promise<Document[]> {
    try {
      const loaderOptions: any = {};
      if (selectors.content) {
        loaderOptions.selector = selectors.content;
      }

      const loader = new CheerioWebBaseLoader(url, loaderOptions);

      const docs = await loader.load();

      // Add enhanced metadata
      docs.forEach((doc: any) => {
        doc.metadata = {
          ...doc.metadata,
          ...metadata,
          source: url,
          scrapedAt: new Date().toISOString(),
        };
      });

      const splitDocs = await this.textSplitter.splitDocuments(docs);

      console.log(`✅ Scraped ${url} - ${splitDocs.length} chunks`);
      return splitDocs;
    } catch (error) {
      console.error(`❌ Failed to scrape ${url}:`, error);
      return [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ContentValidator {
  /**
   * Validate scraped content quality
   */
  validateContent(doc: Document): ValidationResult {
    const issues: string[] = [];
    let score = 100;

    // Check 1: Minimum content length
    if (doc.pageContent.length < 100) {
      issues.push("Content too short (< 100 chars)");
      score -= 30;
    }

    // Check 2: Medical terminology presence
    const medicalTerms = [
      "menopause", "hormone", "estrogen", "perimenopause",
      "symptom", "treatment", "therapy", "health"
    ];

    const hasTerms = medicalTerms.some(term =>
      doc.pageContent.toLowerCase().includes(term)
    );

    if (!hasTerms) {
      issues.push("No menopause-related medical terms found");
      score -= 40;
    }

    // Check 3: Navigation/boilerplate content
    const boilerplatePatterns = [
      /cookies?/i,
      /privacy policy/i,
      /terms of service/i,
      /subscribe to newsletter/i,
      /follow us on/i,
    ];

    const hasBoilerplate = boilerplatePatterns.some(pattern =>
      pattern.test(doc.pageContent)
    );

    if (hasBoilerplate && doc.pageContent.length < 500) {
      issues.push("Appears to be navigation/boilerplate content");
      score -= 50;
    }

    // Check 4: Required metadata
    if (!doc.metadata.organization) {
      issues.push("Missing organization metadata");
      score -= 20;
    }

    if (!doc.metadata.source) {
      issues.push("Missing source URL");
      score -= 20;
    }

    return {
      isValid: score >= 50,
      issues,
      score,
    };
  }

  /**
   * Filter valid documents
   */
  filterValidDocuments(docs: Document[]): Document[] {
    return docs.filter(doc => {
      const result = this.validateContent(doc);

      if (!result.isValid) {
        console.log(`⚠️  Filtering out low-quality content (score: ${result.score})`);
        console.log(`   Issues: ${result.issues.join(", ")}`);
        return false;
      }

      return true;
    });
  }
}

export class DuplicateDetector {
  /**
   * Simple content-based deduplication
   */
  removeDuplicates(docs: Document[]): Document[] {
    const seen = new Set<string>();
    const unique: Document[] = [];

    for (const doc of docs) {
      // Create a hash of first 200 chars
      const contentHash = doc.pageContent.substring(0, 200).trim();

      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        unique.push(doc);
      } else {
        console.log(`🔄 Removed duplicate content from ${doc.metadata.source}`);
      }
    }

    console.log(`\n📊 Deduplication: ${docs.length} → ${unique.length} documents`);
    return unique;
  }
}

export class RateLimiter {
  private lastRequestTime: Map<string, number> = new Map();

  async throttle(domain: string, minDelayMs: number = 2000): Promise<void> {
    const lastTime = this.lastRequestTime.get(domain) || 0;
    const now = Date.now();
    const timeSinceLastRequest = now - lastTime;

    if (timeSinceLastRequest < minDelayMs) {
      const waitTime = minDelayMs - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms for ${domain}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime.set(domain, Date.now());
  }
}

export async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const baseUrl = new URL(url).origin;
    const robotsUrl = `${baseUrl}/robots.txt`;

    const response = await axios.get(robotsUrl);
    const robotsTxt = response.data;

    // Check if your user agent is disallowed
    if (robotsTxt.includes("Disallow: /")) {
      console.warn(`⚠️  ${url} may disallow scraping`);
      return false;
    }

    return true;
  } catch (error) {
    // No robots.txt found - generally OK to proceed
    return true;
  }
}
