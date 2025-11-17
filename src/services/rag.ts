import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { QdrantVectorStore } from '@langchain/qdrant';
import { TextLoader } from '@langchain/classic/document_loaders/fs/text';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DirectoryLoader } from '@langchain/classic/document_loaders/fs/directory';

// Collection type definition
export type CollectionType = 'menopause' | 'breast_cancer';

// Mapping of collection types to Qdrant collection names
const COLLECTION_NAMES: Record<CollectionType, string> = {
  menopause: 'menopause_knowledge',
  breast_cancer: 'breast_cancer_knowledge',
};

export class RAGService {
  private vectorStoreCache: Map<CollectionType, any> = new Map();
  private currentCollection: CollectionType = 'menopause';
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
        '.txt': (path: string) => new TextLoader(path),
        '.pdf': (path: string) => new PDFLoader(path),
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
      const vectorStore = await QdrantVectorStore.fromDocuments(splitDocs, this.embeddings, {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: 'documents',
      });

      // Cache the vector store as menopause collection by default
      this.vectorStoreCache.set('menopause', vectorStore);
      this.currentCollection = 'menopause';

      console.log(`✅ RAG system initialized with ${docs.length} documents`);
    } catch (error) {
      console.error('Failed to initialize RAG system:', error);
      throw error;
    }
  }

  /**
   * Connect to existing Qdrant collection
   * @deprecated Use switchCollection instead for multi-collection support
   */
  async connectToExisting(collectionName: string = 'menopause_knowledge'): Promise<void> {
    try {
      const vectorStore = await QdrantVectorStore.fromExistingCollection(this.embeddings, {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: collectionName,
      });

      // Cache the default menopause collection
      this.vectorStoreCache.set('menopause', vectorStore);
      this.currentCollection = 'menopause';

      console.log(`✅ Connected to existing Qdrant collection: ${collectionName}`);
    } catch (error) {
      console.error('Failed to connect to Qdrant:', error);
      throw error;
    }
  }

  /**
   * Switch to a different collection
   * Caches connections for performance
   */
  async switchCollection(collection: CollectionType): Promise<void> {
    // Check if already using this collection
    if (this.currentCollection === collection && this.vectorStoreCache.has(collection)) {
      console.log(`Already using collection: ${collection}`);
      return;
    }

    // Check cache first
    if (this.vectorStoreCache.has(collection)) {
      console.log(`Using cached connection for collection: ${collection}`);
      this.currentCollection = collection;
      return;
    }

    // Connect to new collection
    try {
      const collectionName = COLLECTION_NAMES[collection];
      console.log(`Connecting to collection: ${collection} (${collectionName})`);

      const vectorStore = await QdrantVectorStore.fromExistingCollection(this.embeddings, {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: collectionName,
      });

      this.vectorStoreCache.set(collection, vectorStore);
      this.currentCollection = collection;

      console.log(`✅ Connected to collection: ${collection}`);
    } catch (error) {
      console.error(`Failed to connect to collection ${collection}:`, error);
      throw new Error(`Collection '${collection}' not found or unavailable`);
    }
  }

  /**
   * Get the current active vector store
   */
  private getVectorStore(): any {
    const vectorStore = this.vectorStoreCache.get(this.currentCollection);
    if (!vectorStore) {
      throw new Error('No collection connected. Call switchCollection first.');
    }
    return vectorStore;
  }

  /**
   * Query the RAG system
   */
  async query(question: string): Promise<string> {
    const vectorStore = this.getVectorStore();

    if (typeof question !== 'string') {
      throw new Error(`Question must be a string, received: ${typeof question}`);
    }

    const queryString = String(question).trim();
    console.log('RAG Service - Query input type:', typeof queryString, 'Value:', queryString);

    try {
      // Get relevant documents
      console.log('Retrieving relevant documents...');
      const docs = await vectorStore.similaritySearch(queryString, 4);
      console.log(`Retrieved ${docs.length} documents`);

      // Format context from documents with source references
      const context = docs
        .map((doc: any, i: number) => {
          const sourceOrg = doc.metadata?.organization || 'Unknown Source';
          const sourceUrl = doc.metadata?.source || '';
          return `[Source ${i + 1}: ${sourceOrg}]\n${doc.pageContent}`;
        })
        .join('\n\n');

      console.log('Context length:', context.length);

      // Determine the medical topic based on current collection
      const medicalTopic = this.currentCollection === 'menopause' ? 'menopause' : 'breast cancer';

      // Create prompt with context
      const prompt = `You are a medical expert specializing in ${medicalTopic}. Your role is to provide accurate, evidence-based information strictly from the medical documents provided below.

CRITICAL INSTRUCTIONS:
- You are providing information about ${medicalTopic}
- Base your answers ONLY on the context provided from authoritative medical sources
- When citing information, reference the source by number (e.g., [1], [2], etc.) immediately after the relevant statement
- Use citations frequently to show which source supports each claim
- If the context doesn't contain information to answer the question, clearly state that
- Provide detailed, comprehensive answers that address all aspects of the question
- Use clear medical terminology while remaining accessible to patients
- Organize your response with proper structure (paragraphs, lists when appropriate)
- Include specific details, statistics, or recommendations found in the context
- Maintain a professional, compassionate, and informative tone
- Do not make assumptions or provide information not found in the context

Context from Medical Documents:
${context}

Question: ${queryString}

Answer (remember to cite sources using [1], [2], etc.):`;

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
    const vectorStore = this.getVectorStore();

    if (typeof question !== 'string') {
      throw new Error(`Question must be a string, received: ${typeof question}`);
    }

    const queryString = String(question).trim();

    try {
      // Get relevant documents
      const docs = await vectorStore.similaritySearch(queryString, 4);

      // Format context from documents with source references
      const context = docs
        .map((doc: any, i: number) => {
          const sourceOrg = doc.metadata?.organization || 'Unknown Source';
          const sourceUrl = doc.metadata?.source || '';
          return `[Source ${i + 1}: ${sourceOrg}]\n${doc.pageContent}`;
        })
        .join('\n\n');

      // Determine the medical topic based on current collection
      const medicalTopic = this.currentCollection === 'menopause' ? 'menopause' : 'breast cancer';

      // Create prompt with context
      const prompt = `You are a medical expert specializing in ${medicalTopic}. Your role is to provide accurate, evidence-based information strictly from the medical documents provided below.

CRITICAL INSTRUCTIONS:
- You are providing information about ${medicalTopic}
- Base your answers ONLY on the context provided from authoritative medical sources
- When citing information, reference the source by number (e.g., [1], [2], etc.) immediately after the relevant statement
- Use citations frequently to show which source supports each claim
- If the context doesn't contain information to answer the question, clearly state that
- Provide detailed, comprehensive answers that address all aspects of the question
- Use clear medical terminology while remaining accessible to patients
- Organize your response with proper structure (paragraphs, lists when appropriate)
- Include specific details, statistics, or recommendations found in the context
- Maintain a professional, compassionate, and informative tone
- Do not make assumptions or provide information not found in the context

Context from Medical Documents:
${context}

Question: ${queryString}

Answer (remember to cite sources using [1], [2], etc.):`;

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
    const vectorStore = this.getVectorStore();

    if (typeof query !== 'string') {
      throw new Error(`Query must be a string, received: ${typeof query}`);
    }

    const queryString = String(query).trim();
    console.log('RAG Service - Document search input type:', typeof queryString);

    try {
      const results = await vectorStore.similaritySearch(queryString, k);
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
    const vectorStore = this.getVectorStore();

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
      await vectorStore.addDocuments(splitDocs);

      console.log(`✅ Added ${docs.length} documents to vector store`);
    } catch (error) {
      console.error('Failed to add documents:', error);
      throw error;
    }
  }
}
