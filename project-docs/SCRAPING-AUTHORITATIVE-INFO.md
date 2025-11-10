# Scraping Authoritative Menopause Sources for RAG

## Reputable Source Links

### Professional Medical Societies

**The Menopause Society (formerly NAMS)**
- Main Site: https://www.menopause.org/
- For Women: https://www.menopause.org/for-women
- Patient Education: https://www.menopause.org/for-women/menopause-faqs
- Find a Practitioner: https://www.menopause.org/for-women/find-a-menopause-practitioner
- Position Statements: https://www.menopause.org/publications/clinical-practice-materials

**International Menopause Society (IMS)**
- Main Site: https://www.imsociety.org/
- Education: https://www.imsociety.org/education/
- Recommendations: https://www.imsociety.org/recommendations/

**American College of Obstetricians and Gynecologists (ACOG)**
- Main Site: https://www.acog.org/
- Patient FAQs: https://www.acog.org/womens-health/faqs
- Menopause FAQs: https://www.acog.org/womens-health/faqs/the-menopause-years
- Practice Bulletins: https://www.acog.org/clinical/clinical-guidance/practice-bulletin

### Government & Research Institutions

**NIH - Office of Research on Women's Health**
- Main Site: https://orwh.od.nih.gov/
- Menopause Resources: https://orwh.od.nih.gov/research/menopause
- SWAN Study: https://www.swanstudy.org/

**U.S. Office on Women's Health**
- Menopause Page: https://www.womenshealth.gov/menopause
- Publications: https://www.womenshealth.gov/publications

**MedlinePlus**
- Menopause: https://medlineplus.gov/menopause.html
- Hormone Therapy: https://medlineplus.gov/hormonereplacementtherapy.html

### Academic Medical Centers

**UCLA Health**
- Menopause Program: https://www.uclahealth.org/obgyn/menopause

**NYU Langone Health**
- Center for Midlife Health: https://nyulangone.org/locations/center-for-midlife-health-menopause

**Stanford Medicine**
- Women's Health: https://stanfordhealthcare.org/medical-clinics/womens-health.html

### Non-Profit Organizations

**Let's Talk Menopause**
- Main Site: https://letstalkmenopause.org/

---

## Implementation: Web Scraping for RAG

### Installation

```bash
npm install cheerio puppeteer playwright
npm install @langchain/community
```

### Basic Web Scraping Setup

Create `src/services/scraper.ts`:

```typescript
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import * as cheerio from "cheerio";

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
      docs.forEach(doc => {
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
      const loader = new CheerioWebBaseLoader(url, {
        selector: selectors.content || "body",
      });

      const docs = await loader.load();

      // Add enhanced metadata
      docs.forEach(doc => {
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
```

---

## Curated Source List for Scraping

Create `src/config/menopause-sources.ts`:

```typescript
export interface SourceConfig {
  url: string;
  metadata: {
    organization: string;
    category: string;
    credibility: "high" | "medium";
    lastVerified: string;
  };
  selectors?: {
    content?: string;
    exclude?: string[];
  };
}

export const menopauseSources: SourceConfig[] = [
  // The Menopause Society
  {
    url: "https://www.menopause.org/for-women/menopause-faqs",
    metadata: {
      organization: "The Menopause Society",
      category: "Professional Medical Society",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  {
    url: "https://www.menopause.org/for-women/sexual-health-menopause-online",
    metadata: {
      organization: "The Menopause Society",
      category: "Professional Medical Society",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  
  // ACOG
  {
    url: "https://www.acog.org/womens-health/faqs/the-menopause-years",
    metadata: {
      organization: "ACOG",
      category: "Professional Medical Society",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  
  // Government Sources
  {
    url: "https://www.womenshealth.gov/menopause",
    metadata: {
      organization: "U.S. Office on Women's Health",
      category: "Government",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  {
    url: "https://medlineplus.gov/menopause.html",
    metadata: {
      organization: "MedlinePlus/NIH",
      category: "Government",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  {
    url: "https://medlineplus.gov/hormonereplacementtherapy.html",
    metadata: {
      organization: "MedlinePlus/NIH",
      category: "Government",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  
  // Academic Medical Centers
  {
    url: "https://www.uclahealth.org/obgyn/menopause",
    metadata: {
      organization: "UCLA Health",
      category: "Academic Medical Center",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
];

// Additional URLs to scrape (add as you verify them)
export const additionalSources: SourceConfig[] = [
  // IMS - may require special handling
  {
    url: "https://www.imsociety.org/education/",
    metadata: {
      organization: "International Menopause Society",
      category: "Professional Medical Society",
      credibility: "high",
      lastVerified: "2025-11-10",
    },
  },
  // Add more as needed
];
```

---

## Scraping Script

Create `src/scripts/scrape-menopause-sources.ts`:

```typescript
import { MenopauseSourceScraper } from "../services/scraper";
import { menopauseSources, additionalSources } from "../config/menopause-sources";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();

async function scrapeSources() {
  console.log("🚀 Starting menopause source scraping...\n");

  const scraper = new MenopauseSourceScraper();
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Scrape all sources
  const allDocs = await scraper.scrapeMultipleURLs(
    menopauseSources,
    2000 // 2 second delay between requests
  );

  console.log(`\n📊 Total documents scraped: ${allDocs.length}`);

  // Store in Qdrant
  console.log("\n💾 Storing in Qdrant...");
  
  const vectorStore = await QdrantVectorStore.fromDocuments(
    allDocs,
    embeddings,
    {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: "menopause_knowledge",
    }
  );

  console.log("✅ All documents stored in Qdrant!");
  
  // Summary by organization
  const byOrg = allDocs.reduce((acc, doc) => {
    const org = doc.metadata.organization;
    acc[org] = (acc[org] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\n📈 Documents by Organization:");
  Object.entries(byOrg).forEach(([org, count]) => {
    console.log(`   ${org}: ${count} chunks`);
  });
}

// Run the scraper
scrapeSources()
  .then(() => {
    console.log("\n🎉 Scraping complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Scraping failed:", error);
    process.exit(1);
  });
```

Run with:
```bash
npm run ts-node src/scripts/scrape-menopause-sources.ts
```

---

## Data Validation Strategy

### 1. Source Validation

```typescript
interface ValidationResult {
  isValid: boolean;
  issues: string[];
  score: number;
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
```

### 2. Duplicate Detection

```typescript
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
```

### 3. Freshness Check

```typescript
export class FreshnessChecker {
  /**
   * Check if sources should be re-scraped
   */
  needsUpdate(lastScraped: string, maxAgeMonths: number = 3): boolean {
    const scrapedDate = new Date(lastScraped);
    const now = new Date();
    const monthsDiff = (now.getTime() - scrapedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    return monthsDiff > maxAgeMonths;
  }

  /**
   * Get sources that need updating
   */
  getStaleSource(sources: SourceConfig[], maxAgeMonths: number = 3): SourceConfig[] {
    return sources.filter(source => {
      const lastVerified = source.metadata.lastVerified;
      return this.needsUpdate(lastVerified, maxAgeMonths);
    });
  }
}
```

---

## Enhanced Scraping with Validation

```typescript
import { ContentValidator, DuplicateDetector } from "./validators";

async function scrapeWithValidation() {
  const scraper = new MenopauseSourceScraper();
  const validator = new ContentValidator();
  const deduplicator = new DuplicateDetector();

  console.log("🚀 Starting validated scraping...\n");

  // Scrape all sources
  let allDocs = await scraper.scrapeMultipleURLs(menopauseSources, 2000);
  
  console.log(`\n📊 Initial documents: ${allDocs.length}`);

  // Validate content
  allDocs = validator.filterValidDocuments(allDocs);
  console.log(`📊 After validation: ${allDocs.length}`);

  // Remove duplicates
  allDocs = deduplicator.removeDuplicates(allDocs);

  // Store validated documents
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  await QdrantVectorStore.fromDocuments(
    allDocs,
    embeddings,
    {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: "menopause_knowledge",
    }
  );

  console.log("\n✅ Validated data stored in Qdrant!");
}
```

---

## Ethical & Legal Considerations

### robots.txt Compliance

```typescript
import axios from "axios";

export async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const baseUrl = new URL(url).origin;
    const robotsUrl = `${baseUrl}/robots.txt`;
    
    const response = await axios.get(robotsUrl);
    const robotsTxt = response.data;

    // Check if your user agent is disallowed
    // This is a simple check - you may want a proper robots.txt parser
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
```

### Rate Limiting Best Practices

```typescript
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
```

---

## HIPAA Compliance Notes

For MammoChat and healthcare applications:

1. **Data Storage**
   - Store scraped content in HIPAA-compliant infrastructure
   - Qdrant should be self-hosted or use a BAA-covered cloud provider
   - Encrypt data at rest and in transit

2. **Access Logs**
   - Log all scraping activities
   - Track which sources were accessed and when
   - Maintain audit trail for compliance

3. **Content Attribution**
   - Always maintain source metadata
   - Attribute information properly in responses
   - Never claim scraped content as your own

4. **Update Frequency**
   - Medical information changes - re-scrape quarterly
   - Track source update dates
   - Flag potentially outdated information

---

## Testing Your Scraper

```typescript
// Test single URL
async function testScraper() {
  const scraper = new MenopauseSourceScraper();
  
  const docs = await scraper.scrapeURL(
    "https://www.menopause.org/for-women/menopause-faqs",
    {
      organization: "The Menopause Society",
      category: "Test",
      credibility: "high",
      lastVerified: new Date().toISOString(),
    }
  );

  console.log(`Scraped ${docs.length} document chunks`);
  console.log("\nFirst chunk preview:");
  console.log(docs[0].pageContent.substring(0, 200));
  console.log("\nMetadata:");
  console.log(docs[0].metadata);
}
```

---

## Maintenance Schedule

| Task | Frequency | Description |
|------|-----------|-------------|
| Re-scrape all sources | Quarterly | Update knowledge base |
| Verify source URLs | Monthly | Check for broken links |
| Review new sources | Monthly | Add authoritative sources |
| Clean duplicates | After each scrape | Remove redundant content |
| Validate content quality | After each scrape | Filter low-quality data |

---

## Next Steps

1. Test scraper with a few URLs first
2. Validate content quality and relevance
3. Scale to full source list
4. Set up automated re-scraping schedule
5. Implement monitoring and alerting
6. Add citation tracking for responses