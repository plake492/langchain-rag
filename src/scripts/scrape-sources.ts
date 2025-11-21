import { MenopauseSourceScraper, ContentValidator, DuplicateDetector } from '@services/scraper';
import { menopauseSources } from '@config/menopause-sources';
import { breastCancerSources } from '@config/breast-cancer-sources';
import { pcosSources } from '@config/pcos-sources';
import { logScraperActivity } from '@utils/logger';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { SourceConfig, CollectionType } from '../types';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const TRACKING_FILE = path.join(__dirname, '../../.scrape-tracking.json');

interface ScrapeTrackingData {
  lastScraped: {
    [key: string]: {
      timestamp: string;
      urlCount: number;
      documentCount: number;
    };
  };
  scrapedUrls: {
    [key: string]: string[]; // collection -> urls
  };
}

class ScrapeTracker {
  private data: ScrapeTrackingData;

  constructor() {
    this.data = this.loadTracking();
  }

  private loadTracking(): ScrapeTrackingData {
    if (fs.existsSync(TRACKING_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf-8'));
      } catch {
        return { lastScraped: {}, scrapedUrls: {} };
      }
    }
    return { lastScraped: {}, scrapedUrls: {} };
  }

  private saveTracking(): void {
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(this.data, null, 2));
  }

  getUnscrapedSources(collection: string, sources: SourceConfig[]): SourceConfig[] {
    const scrapedUrls = this.data.scrapedUrls[collection] || [];
    return sources.filter((source) => !scrapedUrls.includes(source.url));
  }

  markAsScraped(collection: string, sources: SourceConfig[], documentCount: number): void {
    if (!this.data.scrapedUrls[collection]) {
      this.data.scrapedUrls[collection] = [];
    }

    const urls = sources.map((s) => s.url);
    this.data.scrapedUrls[collection] = [...new Set([...this.data.scrapedUrls[collection], ...urls])];

    this.data.lastScraped[collection] = {
      timestamp: new Date().toISOString(),
      urlCount: urls.length,
      documentCount,
    };

    this.saveTracking();
  }

  getLastScraped(collection: string) {
    return this.data.lastScraped[collection];
  }

  reset(collection?: string): void {
    if (collection) {
      delete this.data.scrapedUrls[collection];
      delete this.data.lastScraped[collection];
    } else {
      this.data = { lastScraped: {}, scrapedUrls: {} };
    }
    this.saveTracking();
  }

  showStatus(): void {
    console.log('\n📊 Scraping Status:\n');

    const collections = ['menopause_knowledge', 'breast_cancer_knowledge', 'pcos_knowledge'];
    collections.forEach((collection) => {
      const scrapedUrls = this.data.scrapedUrls[collection] || [];
      const lastScraped = this.data.lastScraped[collection];

      console.log(`${collection}:`);
      console.log(`  URLs scraped: ${scrapedUrls.length}`);

      if (lastScraped) {
        console.log(`  Last scraped: ${new Date(lastScraped.timestamp).toLocaleString()}`);
        console.log(`  Documents stored: ${lastScraped.documentCount}`);
      } else {
        console.log(`  Last scraped: Never`);
      }
      console.log('');
    });
  }
}

async function checkCollectionExists(collection: string): Promise<boolean> {
  try {
    const client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });

    const collections = await client.getCollections();
    return collections.collections.some((c) => c.name === collection);
  } catch (error) {
    console.warn(`⚠️  Could not check collection existence: ${error}`);
    return false;
  }
}

async function scrapeSources(collection: CollectionType, sources: SourceConfig[], tracker: ScrapeTracker, onlyNew: boolean = true) {
  const collectionName = collection === 'menopause' ? 'menopause_knowledge' : collection === 'breast_cancer' ? 'breast_cancer_knowledge' : 'pcos_knowledge';
  const topicName = collection === 'menopause' ? 'menopause' : collection === 'breast_cancer' ? 'breast cancer' : 'pcos';

  console.log(`🚀 Starting ${topicName} source scraping...\n`);

  logScraperActivity({
    action: 'start',
    message: `Starting ${topicName} scraping process`,
  });

  // Check if collection exists
  const collectionExists = await checkCollectionExists(collectionName);
  console.log(`📦 Collection "${collectionName}" exists: ${collectionExists ? 'Yes' : 'No'}\n`);

  // Determine which sources to scrape
  let sourcesToScrape = sources;
  if (onlyNew && collectionExists) {
    sourcesToScrape = tracker.getUnscrapedSources(collectionName, sources);

    if (sourcesToScrape.length === 0) {
      console.log('✅ All sources already scraped!');
      console.log(`📊 Total scraped URLs: ${sources.length}`);

      const lastScraped = tracker.getLastScraped(collectionName);
      if (lastScraped) {
        console.log(`📅 Last scraping: ${new Date(lastScraped.timestamp).toLocaleString()}`);
        console.log(`📄 Documents in collection: ${lastScraped.documentCount}`);
      }

      console.log('\n💡 Use --force to re-scrape all sources');
      return;
    }

    console.log(`🔍 Found ${sourcesToScrape.length} new sources to scrape`);
    console.log(`✓ Already scraped: ${sources.length - sourcesToScrape.length} sources\n`);
  } else {
    console.log(`📥 Scraping all ${sources.length} sources\n`);
  }

  if (sourcesToScrape.length === 0) {
    console.error('\n❌ No sources configured!');
    process.exit(1);
  }

  const scraper = new MenopauseSourceScraper();
  const validator = new ContentValidator();
  const deduplicator = new DuplicateDetector();

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Scrape sources
  console.log('📥 Scraping sources...');
  let allDocs = await scraper.scrapeMultipleURLs(sourcesToScrape, 2000);

  console.log(`\n📊 Initial documents scraped: ${allDocs.length}`);

  logScraperActivity({
    action: 'scrape_url',
    chunks: allDocs.length,
    message: `Scraped ${sourcesToScrape.length} URLs`,
  });

  // Validate content
  console.log('\n🔍 Validating content quality...');
  const beforeValidation = allDocs.length;
  allDocs = validator.filterValidDocuments(allDocs);
  console.log(`📊 After validation: ${allDocs.length} documents`);

  logScraperActivity({
    action: 'validate',
    chunks: beforeValidation,
    validChunks: allDocs.length,
  });

  // Remove duplicates
  console.log('\n🔄 Removing duplicates...');
  const beforeDedup = allDocs.length;
  allDocs = deduplicator.removeDuplicates(allDocs);

  logScraperActivity({
    action: 'deduplicate',
    chunks: beforeDedup,
    duplicates: beforeDedup - allDocs.length,
  });

  if (allDocs.length === 0) {
    logScraperActivity({
      action: 'error',
      error: 'No valid documents to store',
    });
    console.error('\n❌ No valid documents to store. Exiting.');
    process.exit(1);
  }

  // Store in Qdrant
  console.log(`\n💾 Storing in Qdrant (${collectionName} collection)...`);

  try {
    // Batch documents to avoid payload size limits (33MB limit in Qdrant)
    const BATCH_SIZE = 100;
    let vectorStore: QdrantVectorStore | undefined;

    for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
      const batch = allDocs.slice(i, i + BATCH_SIZE);
      console.log(`📤 Uploading batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allDocs.length / BATCH_SIZE)} (${batch.length} documents)...`);

      if (i === 0) {
        // First batch: create collection
        vectorStore = await QdrantVectorStore.fromDocuments(batch, embeddings, {
          url: process.env.QDRANT_URL,
          apiKey: process.env.QDRANT_API_KEY,
          collectionName,
        });
      } else {
        // Subsequent batches: add to existing collection
        if (!vectorStore) {
          throw new Error('VectorStore not initialized');
        }
        await vectorStore.addDocuments(batch);
      }
    }

    console.log('✅ All documents stored in Qdrant!');

    logScraperActivity({
      action: 'store',
      totalDocuments: allDocs.length,
      message: `Successfully stored in Qdrant (${collectionName})`,
    });

    // Mark as scraped
    tracker.markAsScraped(collectionName, sourcesToScrape, allDocs.length);

    // Summary by organization
    const byOrg = allDocs.reduce(
      (acc, doc) => {
        const org = doc.metadata.organization as string;
        acc[org] = (acc[org] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('\n📈 Documents by Organization:');
    Object.entries(byOrg).forEach(([org, count]) => {
      console.log(`   ${org}: ${count} chunks`);
      logScraperActivity({
        action: 'complete',
        organization: org,
        chunks: count,
      });
    });
  } catch (error) {
    logScraperActivity({
      action: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.error('\n❌ Failed to store in Qdrant:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const tracker = new ScrapeTracker();

  // Parse arguments
  const collection = args.find((arg) => ['menopause', 'breast-cancer', 'pcos', 'all'].includes(arg));
  const isStatus = args.includes('--status');
  const isReset = args.includes('--reset');
  const isForce = args.includes('--force');
  const onlyNew = !isForce;

  // Show status
  if (isStatus) {
    tracker.showStatus();
    return;
  }

  // Reset tracking
  if (isReset) {
    if (collection && collection !== 'all') {
      const collectionName = collection === 'menopause' ? 'menopause_knowledge' : collection === 'breast-cancer' ? 'breast_cancer_knowledge' : 'pcos_knowledge';
      tracker.reset(collectionName);
      console.log(`✅ Reset tracking for ${collection}`);
    } else {
      tracker.reset();
      console.log('✅ Reset all tracking data');
    }
    return;
  }

  // Show help
  if (!collection || args.includes('--help')) {
    console.log(`
📚 Source Scraper

Usage:
  npm run scrape <collection> [options]

Collections:
  menopause        Scrape menopause sources only
  breast-cancer    Scrape breast cancer sources only
  pcos             Scrape PCOS sources only
  all              Scrape all sources

Options:
  --force          Re-scrape all sources (ignores tracking)
  --status         Show scraping status for all collections
  --reset          Reset tracking data for specified collection
  --help           Show this help message

Examples:
  npm run scrape menopause              # Scrape only new menopause sources
  npm run scrape breast-cancer --force  # Re-scrape all breast cancer sources
  npm run scrape all                    # Scrape all new sources
  npm run scrape --status               # Show what's been scraped
  npm run scrape menopause --reset      # Reset menopause tracking
    `);
    return;
  }

  // Run scraping
  try {
    if (collection === 'all') {
      console.log('🚀 Scraping all collections...\n');
      await scrapeSources('menopause', menopauseSources, tracker, onlyNew);
      console.log('\n' + '='.repeat(60) + '\n');
      await scrapeSources('breast_cancer', breastCancerSources, tracker, onlyNew);
      console.log('\n' + '='.repeat(60) + '\n');
      await scrapeSources('pcos', pcosSources, tracker, onlyNew);
    } else if (collection === 'menopause') {
      await scrapeSources('menopause', menopauseSources, tracker, onlyNew);
    } else if (collection === 'breast-cancer') {
      await scrapeSources('breast_cancer', breastCancerSources, tracker, onlyNew);
    } else if (collection === 'pcos') {
      await scrapeSources('pcos', pcosSources, tracker, onlyNew);
    }

    console.log('\n🎉 Scraping complete!');
    console.log('\n💡 Run "npm run scrape --status" to see what\'s been scraped');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Scraping failed:', error);
    process.exit(1);
  }
}

main();
