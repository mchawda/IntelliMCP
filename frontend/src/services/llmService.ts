import { config } from '@/lib/config';
import { 
  LLMRequest, 
  LLMResponse, 
  LLMMessage, 
  MCP, 
  Context, 
  ValidationResult,
  ValidationScore,
  ValidationIssue,
  ValidationSuggestion,
  Domain,
  Constraint,
  Example,
  Reference
} from '@/types';

export class LLMService {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = config.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
    this.defaultModel = config.llm.model;
  }

  /**
   * Generate a complete MCP based on domain, context, and requirements
   */
  async generateMCP(params: {
    domain: Domain;
    goal: string;
    userRole: string;
    context: Context[];
    constraints: Constraint[];
  }): Promise<MCP> {
    const systemPrompt = this.buildMCPGenerationPrompt(params);
    
    const response = await this.makeRequest({
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Generate a complete MCP for the following requirements:
Domain: ${params.domain}
Goal: ${params.goal}
User Role: ${params.userRole}
Constraints: ${params.constraints.map(c => c.description).join(', ')}
Context: ${params.context.map(c => c.content.substring(0, 500)).join('\n')}`
        }
      ],
      temperature: 0.7,
      maxTokens: config.llm.maxTokens,
      topP: config.llm.topP
    });

    return this.parseMCPResponse(response.content);
  }

  /**
   * Validate an MCP and return comprehensive validation results
   */
  async validateMCP(mcp: MCP): Promise<ValidationResult> {
    const systemPrompt = this.buildValidationPrompt();
    
    const response = await this.makeRequest({
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Validate the following MCP and provide detailed feedback:
${JSON.stringify(mcp, null, 2)}`
        }
      ],
      temperature: 0.3,
      maxTokens: config.llm.maxTokens,
      topP: 0.9
    });

    return this.parseValidationResponse(response.content, mcp.id);
  }

  /**
   * Extract context and key information from uploaded content
   */
  async extractContext(content: string, type: 'file' | 'url' | 'text'): Promise<{
    summary: string;
    keywords: string[];
    confidence: number;
    relevantSections: string[];
  }> {
    const systemPrompt = `You are an expert at analyzing and extracting key information from various types of content. 
Extract the most relevant information for MCP creation, including:
- Main topics and themes
- Key concepts and definitions
- Important constraints or requirements
- Technical specifications
- Business rules or processes

Provide a structured summary that can be used to inform MCP generation.`;

    const response = await this.makeRequest({
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Analyze the following ${type} content and extract relevant context:
${content.substring(0, 4000)}`
        }
      ],
      temperature: 0.5,
      maxTokens: 2000,
      topP: 0.9
    });

    return this.parseContextExtractionResponse(response.content);
  }

  /**
   * Generate examples for MCP inputs and outputs
   */
  async generateExamples(mcp: MCP, count: number = 3): Promise<Example[]> {
    const systemPrompt = `You are an expert at creating realistic examples for MCP inputs and outputs.
Generate diverse, realistic examples that demonstrate the MCP's capabilities.
Each example should be practical and representative of real-world usage.`;

    const response = await this.makeRequest({
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Generate ${count} examples for the following MCP:
${JSON.stringify({
  systemPrompt: mcp.systemPrompt,
  inputFormat: mcp.inputFormat,
  outputFormat: mcp.outputFormat,
  domain: mcp.domain
}, null, 2)}`
        }
      ],
      temperature: 0.7,
      maxTokens: 3000,
      topP: 0.9
    });

    return this.parseExamplesResponse(response.content);
  }

  /**
   * Improve an existing MCP based on validation feedback
   */
  async improveMCP(mcp: MCP, validationResult: ValidationResult): Promise<MCP> {
    const systemPrompt = `You are an expert at improving MCPs based on validation feedback.
Address the identified issues and suggestions to create a better, more robust MCP.
Maintain the original intent while improving quality, clarity, and completeness.`;

    const response = await this.makeRequest({
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Improve the following MCP based on the validation feedback:
Original MCP: ${JSON.stringify(mcp, null, 2)}
Validation Issues: ${JSON.stringify(validationResult.issues, null, 2)}
Suggestions: ${JSON.stringify(validationResult.suggestions, null, 2)}`
        }
      ],
      temperature: 0.6,
      maxTokens: config.llm.maxTokens,
      topP: 0.9
    });

    return this.parseMCPResponse(response.content);
  }

  /**
   * Generate documentation for an MCP
   */
  async generateDocumentation(mcp: MCP): Promise<{
    overview: string;
    usageGuide: string;
    apiReference: string;
    troubleshooting: string;
  }> {
    const systemPrompt = `You are an expert technical writer specializing in MCP documentation.
Create comprehensive, clear documentation that helps users understand and implement the MCP effectively.
Include practical examples and common use cases.`;

    const response = await this.makeRequest({
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Generate comprehensive documentation for the following MCP:
${JSON.stringify(mcp, null, 2)}`
        }
      ],
      temperature: 0.5,
      maxTokens: 4000,
      topP: 0.9
    });

    return this.parseDocumentationResponse(response.content);
  }

  /**
   * Specialize an MCP for a specific use case or industry
   */
  async specializeMCP(mcp: MCP, specialization: {
    industry: string;
    useCase: string;
    requirements: string[];
  }): Promise<MCP> {
    const systemPrompt = `You are an expert at specializing MCPs for specific industries and use cases.
Adapt the MCP to meet the specific requirements while maintaining its core functionality.
Add industry-specific terminology, constraints, and examples.`;

    const response = await this.makeRequest({
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Specialize the following MCP for the specified industry and use case:
Original MCP: ${JSON.stringify(mcp, null, 2)}
Industry: ${specialization.industry}
Use Case: ${specialization.useCase}
Requirements: ${specialization.requirements.join(', ')}`
        }
      ],
      temperature: 0.7,
      maxTokens: config.llm.maxTokens,
      topP: 0.9
    });

    return this.parseMCPResponse(response.content);
  }

  /**
   * Merge multiple MCPs into a comprehensive solution
   */
  async mergeMCPs(mcps: MCP[], mergeStrategy: 'comprehensive' | 'selective' | 'hybrid'): Promise<MCP> {
    const systemPrompt = `You are an expert at merging multiple MCPs into a comprehensive solution.
Create a unified MCP that combines the best features of all input MCPs while eliminating redundancy.
Ensure the merged MCP is coherent, complete, and practical.`;

    const response = await this.makeRequest({
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Merge the following MCPs using a ${mergeStrategy} strategy:
${JSON.stringify(mcps, null, 2)}`
        }
      ],
      temperature: 0.6,
      maxTokens: config.llm.maxTokens,
      topP: 0.9
    });

    return this.parseMCPResponse(response.content);
  }

  // Private helper methods

  private async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          top_p: request.topP,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        finishReason: data.choices[0].finish_reason,
      };
    } catch (error) {
      console.error('LLM Service Error:', error);
      throw new Error(`Failed to make LLM request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildMCPGenerationPrompt(params: {
    domain: Domain;
    goal: string;
    userRole: string;
    context: Context[];
    constraints: Constraint[];
  }): string {
    return `You are an expert at creating Model Context Protocols (MCPs) for enterprise applications.

Your task is to generate a complete, production-ready MCP that includes:

1. SYSTEM PROMPT: A comprehensive system prompt that defines the AI's role, capabilities, and behavior
2. USER GUIDANCE: Clear instructions for users on how to interact with the MCP
3. INPUT FORMAT: Structured JSON schema defining required and optional input fields
4. OUTPUT FORMAT: Structured JSON schema defining the expected output format
5. CONSTRAINTS: Technical, business, and compliance constraints
6. EXAMPLES: Realistic input/output examples
7. REFERENCES: Relevant documentation and resources

Domain: ${params.domain}
Goal: ${params.goal}
User Role: ${params.userRole}
Context: ${params.context.map(c => c.content.substring(0, 200)).join('\n')}
Constraints: ${params.constraints.map(c => c.description).join(', ')}

Generate a complete MCP in valid JSON format with all required fields.`;
  }

  private buildValidationPrompt(): string {
    return `You are an expert MCP validator. Analyze the provided MCP and provide comprehensive validation feedback.

Evaluate the MCP on the following criteria:
1. COMPLETENESS (0-100): Does it include all necessary components?
2. CLARITY (0-100): Are instructions and formats clear and unambiguous?
3. ACTIONABILITY (0-100): Can users easily implement and use this MCP?
4. DOMAIN ALIGNMENT (0-100): Does it properly address the specified domain?
5. HALLUCINATION RISK (0-100): How likely is the AI to generate incorrect information?

For each issue found, provide:
- Type: error, warning, or info
- Category: completeness, clarity, safety, or performance
- Message: Detailed description of the issue
- Severity: low, medium, high, or critical
- Suggestion: How to fix the issue

For suggestions, provide:
- Type: improvement, optimization, or enhancement
- Description: What improvement to make
- Impact: low, medium, or high
- Effort: low, medium, or high
- Priority: 1-5 (5 being highest)

Return the validation results in valid JSON format.`;
  }

  private parseMCPResponse(content: string): MCP {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const mcpData = JSON.parse(jsonMatch[0]);
      
      // Create a complete MCP object with defaults
      return {
        id: mcpData.id || `mcp_${Date.now()}`,
        name: mcpData.name || 'Generated MCP',
        description: mcpData.description || '',
        version: mcpData.version || '1.0.0',
        domain: mcpData.domain || 'other',
        systemPrompt: mcpData.systemPrompt || '',
        userGuidance: mcpData.userGuidance || '',
        inputFormat: mcpData.inputFormat || {
          schema: {},
          required: [],
          optional: [],
          description: '',
          examples: []
        },
        outputFormat: mcpData.outputFormat || {
          schema: {},
          description: '',
          examples: []
        },
        constraints: mcpData.constraints || [],
        examples: mcpData.examples || [],
        references: mcpData.references || [],
        metadata: mcpData.metadata || {
          complexity: 'intermediate',
          estimatedTime: 30,
          requiredSkills: [],
          industry: [],
          compliance: [],
          usageCount: 0,
          reviewCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        isPublic: false,
        tags: mcpData.tags || [],
        status: 'draft'
      };
    } catch (error) {
      console.error('Error parsing MCP response:', error);
      throw new Error('Failed to parse MCP response');
    }
  }

  private parseValidationResponse(content: string, mcpId: string): ValidationResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in validation response');
      }

      const validationData = JSON.parse(jsonMatch[0]);
      
      return {
        id: `validation_${Date.now()}`,
        mcpId,
        score: {
          overall: validationData.score?.overall || 0,
          completeness: validationData.score?.completeness || 0,
          clarity: validationData.score?.clarity || 0,
          actionability: validationData.score?.actionability || 0,
          domainAlignment: validationData.score?.domainAlignment || 0,
          hallucinationRisk: validationData.score?.hallucinationRisk || 0,
        },
        issues: validationData.issues || [],
        suggestions: validationData.suggestions || [],
        timestamp: new Date(),
        validator: 'openai-gpt-4'
      };
    } catch (error) {
      console.error('Error parsing validation response:', error);
      throw new Error('Failed to parse validation response');
    }
  }

  private parseContextExtractionResponse(content: string): {
    summary: string;
    keywords: string[];
    confidence: number;
    relevantSections: string[];
  } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback to parsing from text
        return {
          summary: content.substring(0, 500),
          keywords: content.match(/\b\w+\b/g)?.slice(0, 10) || [],
          confidence: 0.7,
          relevantSections: [content.substring(0, 200)]
        };
      }

      const data = JSON.parse(jsonMatch[0]);
      return {
        summary: data.summary || '',
        keywords: data.keywords || [],
        confidence: data.confidence || 0.7,
        relevantSections: data.relevantSections || []
      };
    } catch (error) {
      console.error('Error parsing context extraction response:', error);
      return {
        summary: content.substring(0, 500),
        keywords: [],
        confidence: 0.5,
        relevantSections: []
      };
    }
  }

  private parseExamplesResponse(content: string): Example[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON array found in examples response');
      }

      const examples = JSON.parse(jsonMatch[0]);
      return examples.map((example: any, index: number) => ({
        id: `example_${Date.now()}_${index}`,
        input: example.input || {},
        output: example.output || {},
        description: example.description || '',
        tags: example.tags || []
      }));
    } catch (error) {
      console.error('Error parsing examples response:', error);
      return [];
    }
  }

  private parseDocumentationResponse(content: string): {
    overview: string;
    usageGuide: string;
    apiReference: string;
    troubleshooting: string;
  } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          overview: content.substring(0, 1000),
          usageGuide: '',
          apiReference: '',
          troubleshooting: ''
        };
      }

      const data = JSON.parse(jsonMatch[0]);
      return {
        overview: data.overview || '',
        usageGuide: data.usageGuide || '',
        apiReference: data.apiReference || '',
        troubleshooting: data.troubleshooting || ''
      };
    } catch (error) {
      console.error('Error parsing documentation response:', error);
      return {
        overview: content.substring(0, 1000),
        usageGuide: '',
        apiReference: '',
        troubleshooting: ''
      };
    }
  }
}

// Export singleton instance
export const llmService = new LLMService(); 