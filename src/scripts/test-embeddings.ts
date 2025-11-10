import dotenv from 'dotenv';
dotenv.config();

import { OpenAIEmbeddings } from '@langchain/openai';

async function testEmbeddings() {
  console.log('Testing OpenAI Embeddings...\n');

  console.log('Environment check:');
  console.log('- OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  console.log('- Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 7));
  console.log();

  try {
    const embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-ada-002',
    });

    console.log('Embeddings instance created successfully');
    console.log('Testing with sample text...\n');

    const testText = 'What is menopause?';
    console.log('Input text:', testText);
    console.log('Input type:', typeof testText);

    const result = await embeddings.embedQuery(testText);

    console.log('\n✅ Success!');
    console.log('Embedding dimensions:', result.length);
    console.log('First 5 values:', result.slice(0, 5));
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

testEmbeddings();
