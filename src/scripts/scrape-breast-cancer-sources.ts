import { MenopauseSourceScraper, ContentValidator, DuplicateDetector } from '@services/scraper';
import { breastCancerSources } from '@config/breast-cancer-sources';
import { logScraperActivity } from '@utils/logger';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

async function scrapeSources() {
  console.log('🚀 Starting breast cancer source scraping...\n');

  logScraperActivity({
    action: 'start',
    message: 'Starting breast cancer scraping process',
  });

  if (breastCancerSources.length === 0) {
    console.error('\n❌ No sources configured!');
    console.log('📝 Please add breast cancer sources to: src/config/breast-cancer-sources.ts');
    console.log('   See src/config/menopause-sources.ts for examples');
    process.exit(1);
  }

  const scraper = new MenopauseSourceScraper();
  const validator = new ContentValidator();
  const deduplicator = new DuplicateDetector();

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Scrape all sources
  console.log('📥 Scraping sources...');
  let allDocs = await scraper.scrapeMultipleURLs(
    breastCancerSources,
    2000 // 2 second delay between requests
  );

  console.log(`\n📊 Initial documents scraped: ${allDocs.length}`);

  logScraperActivity({
    action: 'scrape_url',
    chunks: allDocs.length,
    message: `Scraped ${breastCancerSources.length} URLs`,
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

  // Store in Qdrant with breast_cancer_knowledge collection
  console.log('\n💾 Storing in Qdrant (breast_cancer_knowledge collection)...');

  try {
    const vectorStore = await QdrantVectorStore.fromDocuments(allDocs, embeddings, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: 'breast_cancer_knowledge', // Different collection name
    });

    console.log('✅ All documents stored in Qdrant!');

    logScraperActivity({
      action: 'store',
      totalDocuments: allDocs.length,
      message: 'Successfully stored in Qdrant (breast_cancer_knowledge)',
    });

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

// Run the scraper
scrapeSources()
  .then(() => {
    console.log('\n🎉 Breast cancer scraping complete!');
    console.log('✅ Collection "breast_cancer_knowledge" is ready to use');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Scraping failed:', error);
    process.exit(1);
  });
