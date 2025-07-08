import { MCP, ContextData } from '@/types';
import { llmService } from '@/services/llmService';

interface MCPBuilderAgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  enableContextIntegration: boolean;
  enableValidation: boolean;
  enableExamples: boolean;
}

class MCPBuilderAgent {
  private config: MCPBuilderAgentConfig;

  constructor(config: Partial<MCPBuilderAgentConfig> = {}) {
    this.config = {
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 4000,
      enableContextIntegration: true,
      enableValidation: true,
      enableExamples: true,
      ...config,
    };
  }

  /**
   * Build a complete MCP from requirements and context
   */
  async buildMCP(
    domain: string,
    goal: string,
    userRole: string,
    constraints: string[],
    context: ContextData[],
    options?: {
      includeExamples?: boolean;
      includeValidation?: boolean;
      customPrompts?: Record<string, string>;
    }
  ): Promise<MCP> {
    try {
      // Step 1: Analyze context and extract relevant information
      const contextAnalysis = await this.analyzeContext(context);
      
      // Step 2: Generate initial MCP structure
      const baseMCP = await this.generateBaseMCP(domain, goal, userRole, constraints);
      
      // Step 3: Integrate context into the MCP
      const contextEnhancedMCP = await this.integrateContext(baseMCP, contextAnalysis);
      
      // Step 4: Generate examples if requested
      let finalMCP = contextEnhancedMCP;
      if (options?.includeExamples !== false) {
        finalMCP = await this.generateExamples(finalMCP);
      }
      
      // Step 5: Validate the MCP if requested
      if (options?.includeValidation !== false) {
        await this.validateMCP(finalMCP);
      }
      
      return finalMCP;
    } catch (error) {
      throw new Error(`MCP generation failed: ${error}`);
    }
  }

  /**
   * Analyze uploaded context to extract relevant information
   */
  private async analyzeContext(context: ContextData[]): Promise<{
    keyConcepts: string[];
    rules: string[];
    examples: string[];
    constraints: string[];
    terminology: string[];
  }> {
    if (context.length === 0) {
      return {
        keyConcepts: [],
        rules: [],
        examples: [],
        constraints: [],
        terminology: [],
      };
    }

    const contextText = context.map(c => `${c.title}:\n${c.content}`).join('\n\n');
    
    const analysisPrompt = `Analyze the following context and extract:
1. Key concepts and definitions
2. Important rules and guidelines
3. Relevant examples or case studies
4. Critical constraints or limitations
5. Domain-specific terminology

Context:
${contextText}

Return the analysis as JSON:
{
  "keyConcepts": ["concept1", "concept2"],
  "rules": ["rule1", "rule2"],
  "examples": ["example1", "example2"],
  "constraints": ["constraint1", "constraint2"],
  "terminology": ["term1", "term2"]
}`;

    try {
      const response = await llmService.makeRequest('/chat/completions', {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing context and extracting structured information for MCP generation.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      return JSON.parse(response.content);
    } catch (error) {
      console.error('Context analysis failed:', error);
      return {
        keyConcepts: [],
        rules: [],
        examples: [],
        constraints: [],
        terminology: [],
      };
    }
  }

  /**
   * Generate the base MCP structure
   */
  private async generateBaseMCP(
    domain: string,
    goal: string,
    userRole: string,
    constraints: string[]
  ): Promise<MCP> {
    const prompt = `Create a comprehensive Model Context Protocol (MCP) with the following requirements:

Domain: ${domain}
Goal: ${goal}
User Role: ${userRole}
Constraints: ${constraints.join(', ')}

Generate a complete MCP with:
1. Clear system prompt that guides the AI
2. User guidance for interaction
3. Structured input/output formats
4. Domain-specific constraints
5. Professional metadata

Return as JSON with this structure:
{
  "name": "MCP Name",
  "description": "Clear description",
  "systemPrompt": "Detailed system prompt",
  "userGuidance": "User interaction guidance",
  "inputFormat": {
    "type": "text|json|structured",
    "schema": {},
    "required": [],
    "optional": [],
    "description": "Input format description"
  },
  "outputFormat": {
    "type": "text|json|structured",
    "schema": {},
    "description": "Output format description"
  },
  "constraints": ["constraint1", "constraint2"],
  "tags": ["tag1", "tag2"],
  "metadata": {
    "version": "1.0.0",
    "author": "MCPMaker",
    "license": "MIT",
    "category": "${domain}",
    "difficulty": "intermediate",
    "estimatedTime": "5-10 minutes",
    "dependencies": []
  }
}`;

    const response = await llmService.makeRequest('/chat/completions', {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in creating Model Context Protocols (MCPs). Generate comprehensive, well-structured MCPs that are practical and actionable.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });

    const mcpData = JSON.parse(response.content);
    
    return {
      id: crypto.randomUUID(),
      ...mcpData,
      domain,
      goal,
      userRole,
      examples: [],
      references: [],
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      isPublic: false,
      status: 'draft',
    };
  }

  /**
   * Integrate context analysis into the MCP
   */
  private async integrateContext(
    mcp: MCP,
    contextAnalysis: {
      keyConcepts: string[];
      rules: string[];
      examples: string[];
      constraints: string[];
      terminology: string[];
    }
  ): Promise<MCP> {
    const enhancedPrompt = `Enhance the following MCP by integrating the context analysis:

Original MCP:
${JSON.stringify(mcp, null, 2)}

Context Analysis:
- Key Concepts: ${contextAnalysis.keyConcepts.join(', ')}
- Rules: ${contextAnalysis.rules.join(', ')}
- Examples: ${contextAnalysis.examples.join(', ')}
- Constraints: ${contextAnalysis.constraints.join(', ')}
- Terminology: ${contextAnalysis.terminology.join(', ')}

Enhance the MCP by:
1. Incorporating key concepts into the system prompt
2. Adding domain-specific rules and guidelines
3. Including relevant examples
4. Merging context constraints with existing ones
5. Using proper domain terminology

Return the enhanced MCP as JSON.`;

    const response = await llmService.makeRequest('/chat/completions', {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at enhancing MCPs with context-specific information.'
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      temperature: 0.5,
      max_tokens: this.config.maxTokens,
    });

    const enhancedData = JSON.parse(response.content);
    
    return {
      ...mcp,
      ...enhancedData,
      updatedAt: new Date(),
    };
  }

  /**
   * Generate examples for the MCP
   */
  private async generateExamples(mcp: MCP): Promise<MCP> {
    const examples = await llmService.generateExamples(mcp, 5);
    
    return {
      ...mcp,
      examples: examples.map((example, index) => ({
        id: crypto.randomUUID(),
        input: example.input,
        output: example.output,
        description: example.description,
      })),
    };
  }

  /**
   * Validate the generated MCP
   */
  private async validateMCP(mcp: MCP): Promise<void> {
    const validationResult = await llmService.validateMCP(mcp);
    
    if (validationResult.overallScore < 60) {
      throw new Error(`MCP validation failed with score ${validationResult.overallScore}. Issues: ${validationResult.issues.map(i => i.message).join(', ')}`);
    }
  }

  /**
   * Improve an existing MCP based on feedback
   */
  async improveMCP(mcp: MCP, feedback: string): Promise<MCP> {
    return await llmService.improveMCP(mcp, feedback);
  }

  /**
   * Generate documentation for an MCP
   */
  async generateDocumentation(mcp: MCP, format: 'markdown' | 'html' | 'pdf'): Promise<string> {
    return await llmService.generateDocumentation(mcp, format);
  }

  /**
   * Create a specialized MCP for a specific use case
   */
  async createSpecializedMCP(
    baseMCP: MCP,
    specialization: {
      useCase: string;
      requirements: string[];
      targetAudience: string;
    }
  ): Promise<MCP> {
    const prompt = `Specialize the following MCP for a specific use case:

Base MCP:
${JSON.stringify(baseMCP, null, 2)}

Specialization Requirements:
- Use Case: ${specialization.useCase}
- Requirements: ${specialization.requirements.join(', ')}
- Target Audience: ${specialization.targetAudience}

Create a specialized version that:
1. Adapts the system prompt for the specific use case
2. Modifies input/output formats as needed
3. Adds use case-specific examples
4. Updates constraints and guidelines
5. Maintains the core functionality while being more specific

Return the specialized MCP as JSON.`;

    const response = await llmService.makeRequest('/chat/completions', {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at specializing MCPs for specific use cases while maintaining their core functionality.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: this.config.maxTokens,
    });

    const specializedData = JSON.parse(response.content);
    
    return {
      ...baseMCP,
      ...specializedData,
      id: crypto.randomUUID(),
      version: this.incrementVersion(baseMCP.version),
      updatedAt: new Date(),
    };
  }

  /**
   * Merge multiple MCPs into a comprehensive one
   */
  async mergeMCPs(mcps: MCP[], mergeStrategy: 'union' | 'intersection' | 'custom' = 'union'): Promise<MCP> {
    const prompt = `Merge the following MCPs into a comprehensive one:

MCPs to merge:
${mcps.map((mcp, index) => `MCP ${index + 1}:\n${JSON.stringify(mcp, null, 2)}`).join('\n\n')}

Merge Strategy: ${mergeStrategy}

Create a merged MCP that:
1. Combines the best elements from all MCPs
2. Resolves conflicts appropriately
3. Maintains consistency and coherence
4. Includes examples from all sources
5. Merges constraints and guidelines

Return the merged MCP as JSON.`;

    const response = await llmService.makeRequest('/chat/completions', {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at merging multiple MCPs into a comprehensive, coherent protocol.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: this.config.maxTokens,
    });

    const mergedData = JSON.parse(response.content);
    
    return {
      ...mergedData,
      id: crypto.randomUUID(),
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      isPublic: false,
      status: 'draft',
    };
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1]);
    const patch = parseInt(parts[2]) + 1;
    return `${major}.${minor}.${patch}`;
  }
}

export const mcpBuilderAgent = new MCPBuilderAgent(); 