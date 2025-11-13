import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { QdrantVectorStore } from '@langchain/qdrant';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';

export class RAGService {
  private vectorStore: any = null;
  private embeddings: OpenAIEmbeddings;
  private model: ChatOpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    console.log('Initializing RAG service with OpenAI API key:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');

    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-ada-002',
    });

    this.model = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      streaming: true,
    });
  }

  /**
   * Initialize the RAG system by loading and indexing documents
   */
  async initialize(documentsPath: string = './documents'): Promise<void> {
    try {
      // Load documents from directory
      const loader = new DirectoryLoader(documentsPath, {
        '.txt': (path) => new TextLoader(path),
        '.pdf': (path) => new PDFLoader(path),
      });

      const docs = await loader.load();

      if (docs.length === 0) {
        throw new Error('No documents found to index');
      }

      // Split documents into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await textSplitter.splitDocuments(docs);

      // Create or connect to vector store
      this.vectorStore = await QdrantVectorStore.fromDocuments(splitDocs, this.embeddings, {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: 'documents',
      });

      console.log(`✅ RAG system initialized with ${docs.length} documents`);
    } catch (error) {
      console.error('Failed to initialize RAG system:', error);
      throw error;
    }
  }

  /**
   * Connect to existing Qdrant collection
   */
  async connectToExisting(collectionName: string = 'menopause_knowledge'): Promise<void> {
    try {
      this.vectorStore = await QdrantVectorStore.fromExistingCollection(this.embeddings, {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: collectionName,
      });

      console.log(`✅ Connected to existing Qdrant collection: ${collectionName}`);
    } catch (error) {
      console.error('Failed to connect to Qdrant:', error);
      throw error;
    }
  }

  /**
   * Query the RAG system
   */
  async query(question: string): Promise<string> {
    if (!this.vectorStore) {
      throw new Error('RAG system not initialized');
    }

    if (typeof question !== 'string') {
      throw new Error(`Question must be a string, received: ${typeof question}`);
    }

    const queryString = String(question).trim();
    console.log('RAG Service - Query input type:', typeof queryString, 'Value:', queryString);

    try {
      // Get relevant documents
      console.log('Retrieving relevant documents...');
      const docs = await this.vectorStore.similaritySearch(queryString, 4);
      console.log(`Retrieved ${docs.length} documents`);

      // Format context from documents
      const context = docs.map((doc: any, i: number) => `Document ${i + 1}:\n${doc.pageContent}`).join('\n\n');

      console.log('Context length:', context.length);

      // Create prompt with context
      const prompt = `You are a knowledgeable and helpful assistant. Provide clear, well-structured answers based on the provided context.

Instructions for your response:
- Give a detailed answer that fully addresses the question
- Support your answer with specific information from the context
- Organize your response clearly, using paragraphs when needed
- Include relevant details and examples
- Use a professional yet conversational tone

Context:
${context}

Question: ${queryString}

Answer:`;

      console.log('Calling LLM...');
      const response = await this.model.invoke(prompt);
      console.log('LLM response type:', typeof response);

      // Extract text from response
      if (typeof response === 'string') {
        return response;
      }

      if (response.content) {
        return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      }

      return JSON.stringify(response);
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    }
  }

  /**
   * Query the RAG system with streaming support
   */
  async *queryStream(question: string): AsyncGenerator<string, void, unknown> {
    if (!this.vectorStore) {
      throw new Error('RAG system not initialized');
    }

    if (typeof question !== 'string') {
      throw new Error(`Question must be a string, received: ${typeof question}`);
    }

    const queryString = String(question).trim();

    try {
      // Get relevant documents
      const docs = await this.vectorStore.similaritySearch(queryString, 4);

      // Format context from documents
      const context = docs.map((doc: any, i: number) => `Document ${i + 1}:\n${doc.pageContent}`).join('\n\n');

      // Create prompt with context
      const prompt = `You are a knowledgeable and helpful assistant. Provide clear, well-structured answers based on the provided context.

Instructions for your response:
- Give a detailed answer that fully addresses the question
- Support your answer with specific information from the context
- Organize your response clearly, using paragraphs when needed
- Include relevant details and examples
- Use a professional yet conversational tone

Context:
${context}

Question: ${queryString}

Answer:`;

      // Stream the response
      const stream = await this.model.stream(prompt);

      for await (const chunk of stream) {
        if (typeof chunk.content === 'string') {
          yield chunk.content;
        }
      }
    } catch (error) {
      console.error('Streaming query failed:', error);
      throw error;
    }
  }

  /**
   * Get relevant documents without generating an answer
   */
  async getRelevantDocuments(query: string, k: number = 4) {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    if (typeof query !== 'string') {
      throw new Error(`Query must be a string, received: ${typeof query}`);
    }

    const queryString = String(query).trim();
    console.log('RAG Service - Document search input type:', typeof queryString);

    try {
      const results = await this.vectorStore.similaritySearch(queryString, k);
      return results;
    } catch (error) {
      console.error('Document retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Add new documents to the vector store
   */
  async addDocuments(filePaths: string[]): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    try {
      const docs = [];

      for (const filePath of filePaths) {
        if (filePath.endsWith('.pdf')) {
          const loader = new PDFLoader(filePath);
          docs.push(...(await loader.load()));
        } else if (filePath.endsWith('.txt')) {
          const loader = new TextLoader(filePath);
          docs.push(...(await loader.load()));
        }
      }

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await textSplitter.splitDocuments(docs);
      await this.vectorStore.addDocuments(splitDocs);

      console.log(`✅ Added ${docs.length} documents to vector store`);
    } catch (error) {
      console.error('Failed to add documents:', error);
      throw error;
    }
  }
}
