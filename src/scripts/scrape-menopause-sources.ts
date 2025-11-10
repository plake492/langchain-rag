import { MenopauseSourceScraper, ContentValidator, DuplicateDetector } from '@services/scraper';
import { menopauseSources, additionalSources } from '@config/menopause-sources';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

async function scrapeSources() {
  console.log('🚀 Starting menopause source scraping...\n');

  const scraper = new MenopauseSourceScraper();
  const validator = new ContentValidator();
  const deduplicator = new DuplicateDetector();

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Scrape all sources
  console.log('📥 Scraping sources...');
  let allDocs = await scraper.scrapeMultipleURLs(
    menopauseSources,
    2000 // 2 second delay between requests
  );

  console.log(`\n📊 Initial documents scraped: ${allDocs.length}`);

  // Validate content
  console.log('\n🔍 Validating content quality...');
  allDocs = validator.filterValidDocuments(allDocs);
  console.log(`📊 After validation: ${allDocs.length} documents`);

  // Remove duplicates
  console.log('\n🔄 Removing duplicates...');
  allDocs = deduplicator.removeDuplicates(allDocs);

  if (allDocs.length === 0) {
    console.error('\n❌ No valid documents to store. Exiting.');
    process.exit(1);
  }

  // Store in Qdrant
  console.log('\n💾 Storing in Qdrant...');

  try {
    const vectorStore = await QdrantVectorStore.fromDocuments(allDocs, embeddings, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: 'menopause_knowledge',
    });

    console.log('✅ All documents stored in Qdrant!');

    // Summary by organization
    const byOrg = allDocs.reduce(
      (acc, doc) => {
        const org = doc.metadata.organization;
        acc[org] = (acc[org] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('\n📈 Documents by Organization:');
    Object.entries(byOrg).forEach(([org, count]) => {
      console.log(`   ${org}: ${count} chunks`);
    });
  } catch (error) {
    console.error('\n❌ Failed to store in Qdrant:', error);
    throw error;
  }
}

// Run the scraper
scrapeSources()
  .then(() => {
    console.log('\n🎉 Scraping complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Scraping failed:', error);
    process.exit(1);
  });
