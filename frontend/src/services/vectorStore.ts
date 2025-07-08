import { config } from '@/lib/config';
import { ContextData, VectorSearchResult } from '@/types';

class VectorStoreService {
  private baseUrl: string;
  private collectionName: string;

  constructor() {
    this.baseUrl = config.vectorDb.url;
    this.collectionName = config.vectorDb.collectionName;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Vector Store API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Initialize or get collection
  async initializeCollection(): Promise<void> {
    try {
      await this.makeRequest('/collections', 'POST', {
        name: this.collectionName,
        metadata: {
          description: 'MCPMaker context embeddings',
          created_by: 'MCPMaker',
        },
      });
    } catch (error: any) {
      // Collection might already exist, which is fine
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  // Store context data with embeddings
  async storeContext(context: ContextData): Promise<string> {
    await this.initializeCollection();

    // Generate embedding for the content
    const embedding = await this.generateEmbedding(context.content);

    const document = {
      id: context.id,
      embeddings: [embedding],
      metadatas: [{
        title: context.title,
        type: context.type,
        uploadedAt: context.uploadedAt.toISOString(),
        processed: context.processed,
        ...context.metadata,
      }],
      documents: [context.content],
    };

    await this.makeRequest(`/collections/${this.collectionName}/add`, 'POST', document);

    return context.id;
  }

  // Search for similar context
  async searchContext(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    const response = await this.makeRequest(`/collections/${this.collectionName}/query`, 'POST', {
      query_embeddings: [queryEmbedding],
      n_results: limit,
      include: ['metadatas', 'documents', 'distances'],
    });

    const results: VectorSearchResult[] = [];
    
    if (response.ids && response.ids[0]) {
      for (let i = 0; i < response.ids[0].length; i++) {
        results.push({
          id: response.ids[0][i],
          content: response.documents[0][i],
          metadata: response.metadatas[0][i],
          score: 1 - (response.distances[0][i] || 0), // Convert distance to similarity score
        });
      }
    }

    return results;
  }

  // Get context by ID
  async getContext(id: string): Promise<ContextData | null> {
    try {
      const response = await this.makeRequest(`/collections/${this.collectionName}/get`, 'POST', {
        ids: [id],
        include: ['metadatas', 'documents'],
      });

      if (response.ids && response.ids.length > 0) {
        const metadata = response.metadatas[0];
        const content = response.documents[0];

        return {
          id: response.ids[0],
          type: metadata.type,
          title: metadata.title,
          content: content,
          metadata: metadata,
          uploadedAt: new Date(metadata.uploadedAt),
          processed: metadata.processed,
          vectorId: id,
        };
      }
    } catch (error) {
      console.error('Error getting context:', error);
    }

    return null;
  }

  // Update context
  async updateContext(context: ContextData): Promise<void> {
    const embedding = await this.generateEmbedding(context.content);

    await this.makeRequest(`/collections/${this.collectionName}/update`, 'POST', {
      ids: [context.id],
      embeddings: [embedding],
      metadatas: [{
        title: context.title,
        type: context.type,
        uploadedAt: context.uploadedAt.toISOString(),
        processed: context.processed,
        ...context.metadata,
      }],
      documents: [context.content],
    });
  }

  // Delete context
  async deleteContext(id: string): Promise<void> {
    await this.makeRequest(`/collections/${this.collectionName}/delete`, 'POST', {
      ids: [id],
    });
  }

  // Get all contexts for a user
  async getUserContexts(userId: string): Promise<ContextData[]> {
    const response = await this.makeRequest(`/collections/${this.collectionName}/get`, 'POST', {
      where: { userId },
      include: ['metadatas', 'documents'],
    });

    const contexts: ContextData[] = [];
    
    if (response.ids) {
      for (let i = 0; i < response.ids.length; i++) {
        const metadata = response.metadatas[i];
        contexts.push({
          id: response.ids[i],
          type: metadata.type,
          title: metadata.title,
          content: response.documents[i],
          metadata: metadata,
          uploadedAt: new Date(metadata.uploadedAt),
          processed: metadata.processed,
          vectorId: response.ids[i],
        });
      }
    }

    return contexts;
  }

  // Generate embedding using OpenAI
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-ada-002',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI Embedding Error: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return result.data[0].embedding;
  }

  // Batch store multiple contexts
  async batchStoreContexts(contexts: ContextData[]): Promise<string[]> {
    if (contexts.length === 0) return [];

    await this.initializeCollection();

    const embeddings = await Promise.all(
      contexts.map(context => this.generateEmbedding(context.content))
    );

    const document = {
      ids: contexts.map(c => c.id),
      embeddings: embeddings,
      metadatas: contexts.map(context => ({
        title: context.title,
        type: context.type,
        uploadedAt: context.uploadedAt.toISOString(),
        processed: context.processed,
        ...context.metadata,
      })),
      documents: contexts.map(c => c.content),
    };

    await this.makeRequest(`/collections/${this.collectionName}/add`, 'POST', document);

    return contexts.map(c => c.id);
  }

  // Get collection statistics
  async getCollectionStats(): Promise<{
    count: number;
    size: number;
    metadata: Record<string, any>;
  }> {
    const response = await this.makeRequest(`/collections/${this.collectionName}`);
    
    return {
      count: response.count || 0,
      size: response.size || 0,
      metadata: response.metadata || {},
    };
  }

  // Clear all contexts for a user
  async clearUserContexts(userId: string): Promise<void> {
    const contexts = await this.getUserContexts(userId);
    const ids = contexts.map(c => c.id);
    
    if (ids.length > 0) {
      await this.makeRequest(`/collections/${this.collectionName}/delete`, 'POST', {
        ids: ids,
      });
    }
  }

  // Search with filters
  async searchWithFilters(
    query: string,
    filters: Record<string, any>,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    const response = await this.makeRequest(`/collections/${this.collectionName}/query`, 'POST', {
      query_embeddings: [queryEmbedding],
      n_results: limit,
      where: filters,
      include: ['metadatas', 'documents', 'distances'],
    });

    const results: VectorSearchResult[] = [];
    
    if (response.ids && response.ids[0]) {
      for (let i = 0; i < response.ids[0].length; i++) {
        results.push({
          id: response.ids[0][i],
          content: response.documents[0][i],
          metadata: response.metadatas[0][i],
          score: 1 - (response.distances[0][i] || 0),
        });
      }
    }

    return results;
  }
}

export const vectorStoreService = new VectorStoreService(); 