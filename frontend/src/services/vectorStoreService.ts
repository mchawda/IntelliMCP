import { config } from '@/lib/config';
import { 
  Context, 
  ContextMetadata, 
  VectorDocument, 
  VectorSearchResult,
  SearchFilters
} from '@/types';

export class VectorStoreService {
  private baseUrl: string;
  private collectionName: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.vectorStore.url || 'http://localhost:8000';
    this.collectionName = 'mcpmaker_contexts';
    this.apiKey = config.OPENAI_API_KEY;
  }

  /**
   * Store context with embeddings in the vector database
   */
  async storeContext(context: Context): Promise<string> {
    try {
      // Generate embeddings using OpenAI
      const embeddings = await this.generateEmbeddings(context.content);
      
      // Prepare document for storage
      const document: VectorDocument = {
        id: context.id,
        content: context.content,
        metadata: {
          type: context.type,
          source: context.metadata.source,
          size: context.metadata.size,
          format: context.metadata.format,
          language: context.metadata.language,
          summary: context.metadata.summary,
          keywords: context.metadata.keywords,
          confidence: context.metadata.confidence,
          mcpId: context.mcpId,
          createdAt: context.createdAt.toISOString(),
        },
        embedding: embeddings,
        createdAt: context.createdAt,
      };

      // Store in vector database
      const response = await fetch(`${this.baseUrl}/api/vector/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          collection: this.collectionName,
          document,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to store context: ${response.statusText}`);
      }

      const result = await response.json();
      return result.vectorId || context.id;
    } catch (error) {
      console.error('Error storing context:', error);
      throw new Error(`Failed to store context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for similar contexts using semantic similarity
   */
  async searchContexts(
    query: string,
    filters: SearchFilters = {},
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    try {
      // Generate embeddings for the query
      const queryEmbeddings = await this.generateEmbeddings(query);

      // Prepare search request
      const searchRequest = {
        collection: this.collectionName,
        queryEmbeddings,
        filters: this.buildSearchFilters(filters),
        limit,
        includeMetadata: true,
      };

      const response = await fetch(`${this.baseUrl}/api/vector/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(searchRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to search contexts: ${response.statusText}`);
      }

      const results = await response.json();
      return results.documents.map((doc: any) => ({
        document: {
          id: doc.id,
          content: doc.content,
          metadata: doc.metadata,
          embedding: doc.embedding,
          createdAt: new Date(doc.createdAt),
        },
        score: doc.score,
        metadata: doc.metadata,
      }));
    } catch (error) {
      console.error('Error searching contexts:', error);
      throw new Error(`Failed to search contexts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve context by ID
   */
  async getContext(contextId: string): Promise<Context | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/vector/get/${contextId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to retrieve context: ${response.statusText}`);
      }

      const document = await response.json();
      
      return {
        id: document.id,
        type: document.metadata.type,
        content: document.content,
        metadata: {
          source: document.metadata.source,
          size: document.metadata.size,
          format: document.metadata.format,
          language: document.metadata.language,
          summary: document.metadata.summary,
          keywords: document.metadata.keywords,
          confidence: document.metadata.confidence,
        },
        embeddings: document.embedding,
        vectorId: document.id,
        createdAt: new Date(document.metadata.createdAt),
        mcpId: document.metadata.mcpId,
      };
    } catch (error) {
      console.error('Error retrieving context:', error);
      throw new Error(`Failed to retrieve context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update context in the vector store
   */
  async updateContext(contextId: string, updates: Partial<Context>): Promise<void> {
    try {
      const existingContext = await this.getContext(contextId);
      if (!existingContext) {
        throw new Error('Context not found');
      }

      // Merge updates with existing context
      const updatedContext = { ...existingContext, ...updates };
      
      // Regenerate embeddings if content changed
      if (updates.content && updates.content !== existingContext.content) {
        updatedContext.embeddings = await this.generateEmbeddings(updates.content);
      }

      // Update in vector store
      const response = await fetch(`${this.baseUrl}/api/vector/update/${contextId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          collection: this.collectionName,
          document: {
            id: updatedContext.id,
            content: updatedContext.content,
            metadata: {
              type: updatedContext.type,
              source: updatedContext.metadata.source,
              size: updatedContext.metadata.size,
              format: updatedContext.metadata.format,
              language: updatedContext.metadata.language,
              summary: updatedContext.metadata.summary,
              keywords: updatedContext.metadata.keywords,
              confidence: updatedContext.metadata.confidence,
              mcpId: updatedContext.mcpId,
              createdAt: updatedContext.createdAt.toISOString(),
              updatedAt: new Date().toISOString(),
            },
            embedding: updatedContext.embeddings,
            createdAt: updatedContext.createdAt,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update context: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating context:', error);
      throw new Error(`Failed to update context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete context from the vector store
   */
  async deleteContext(contextId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/vector/delete/${contextId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          collection: this.collectionName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete context: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting context:', error);
      throw new Error(`Failed to delete context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get contexts by MCP ID
   */
  async getContextsByMCP(mcpId: string): Promise<Context[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/vector/by-mcp/${mcpId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to retrieve contexts by MCP: ${response.statusText}`);
      }

      const documents = await response.json();
      
      return documents.map((doc: any) => ({
        id: doc.id,
        type: doc.metadata.type,
        content: doc.content,
        metadata: {
          source: doc.metadata.source,
          size: doc.metadata.size,
          format: doc.metadata.format,
          language: doc.metadata.language,
          summary: doc.metadata.summary,
          keywords: doc.metadata.keywords,
          confidence: doc.metadata.confidence,
        },
        embeddings: doc.embedding,
        vectorId: doc.id,
        createdAt: new Date(doc.metadata.createdAt),
        mcpId: doc.metadata.mcpId,
      }));
    } catch (error) {
      console.error('Error retrieving contexts by MCP:', error);
      throw new Error(`Failed to retrieve contexts by MCP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get statistics about the vector store
   */
  async getStatistics(): Promise<{
    totalDocuments: number;
    collectionSize: number;
    averageDocumentSize: number;
    lastUpdated: Date;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/vector/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get statistics: ${response.statusText}`);
      }

      const stats = await response.json();
      
      return {
        totalDocuments: stats.totalDocuments || 0,
        collectionSize: stats.collectionSize || 0,
        averageDocumentSize: stats.averageDocumentSize || 0,
        lastUpdated: new Date(stats.lastUpdated || Date.now()),
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw new Error(`Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings using OpenAI API
   */
  private async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build search filters for vector search
   */
  private buildSearchFilters(filters: SearchFilters): Record<string, any> {
    const searchFilters: Record<string, any> = {};

    if (filters.domain) {
      searchFilters.domain = filters.domain;
    }

    if (filters.status) {
      searchFilters.status = filters.status;
    }

    if (filters.tags) {
      searchFilters.tags = filters.tags;
    }

    if (filters.author) {
      searchFilters.author = filters.author;
    }

    if (filters.teamId) {
      searchFilters.teamId = filters.teamId;
    }

    if (filters.isPublic !== undefined) {
      searchFilters.isPublic = filters.isPublic;
    }

    if (filters.dateRange) {
      searchFilters.dateRange = {
        start: filters.dateRange.start.toISOString(),
        end: filters.dateRange.end.toISOString(),
      };
    }

    return searchFilters;
  }

  /**
   * Batch store multiple contexts
   */
  async batchStoreContexts(contexts: Context[]): Promise<string[]> {
    try {
      const documents = await Promise.all(
        contexts.map(async (context) => {
          const embeddings = await this.generateEmbeddings(context.content);
          
          return {
            id: context.id,
            content: context.content,
            metadata: {
              type: context.type,
              source: context.metadata.source,
              size: context.metadata.size,
              format: context.metadata.format,
              language: context.metadata.language,
              summary: context.metadata.summary,
              keywords: context.metadata.keywords,
              confidence: context.metadata.confidence,
              mcpId: context.mcpId,
              createdAt: context.createdAt.toISOString(),
            },
            embedding: embeddings,
            createdAt: context.createdAt,
          };
        })
      );

      const response = await fetch(`${this.baseUrl}/api/vector/batch-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          collection: this.collectionName,
          documents,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to batch store contexts: ${response.statusText}`);
      }

      const result = await response.json();
      return result.vectorIds || contexts.map(c => c.id);
    } catch (error) {
      console.error('Error batch storing contexts:', error);
      throw new Error(`Failed to batch store contexts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all contexts for a specific MCP
   */
  async clearMCPContexts(mcpId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/vector/clear-mcp/${mcpId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          collection: this.collectionName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to clear MCP contexts: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error clearing MCP contexts:', error);
      throw new Error(`Failed to clear MCP contexts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const vectorStoreService = new VectorStoreService(); 