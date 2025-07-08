import { LLMService } from './llmService';
import { VectorStoreService } from './vectorStoreService';
import { 
  MCP, 
  Context, 
  ValidationResult, 
  GenerationRequest,
  EnhancementRequest,
  SpecializationRequest,
  MergeRequest,
  BuilderConfig
} from '@/types';

export class MCPBuilderAgent {
  private llmService: LLMService;
  private vectorStoreService: VectorStoreService;
  private config: BuilderConfig;

  constructor(
    llmService: LLMService,
    vectorStoreService: VectorStoreService,
    config: BuilderConfig
  ) {
    this.llmService = llmService;
    this.vectorStoreService = vectorStoreService;
    this.config = config;
  }

  /**
   * Generate a complete MCP based on requirements and context
   */
  async generateMCP(request: GenerationRequest): Promise<MCP> {
    try {
      // Step 1: Extract and process context
      const processedContext = await this.processContext(request.context);
      
      // Step 2: Generate initial MCP structure
      const initialMCP = await this.llmService.generateMCP({
        domain: request.domain,
        goal: request.goal,
        userRole: request.userRole,
        constraints: request.constraints,
        context: processedContext,
      });

      // Step 3: Enhance with examples and references
      const enhancedMCP = await this.enhanceMCP(initialMCP, {
        addExamples: true,
        addReferences: true,
        improveClarity: true,
      });

      // Step 4: Validate and score
      const validation = await this.llmService.validateMCP(enhancedMCP);
      
      // Step 5: Apply improvements if needed
      let finalMCP = enhancedMCP;
      if (validation.score.overall < this.config.minimumQualityScore) {
        finalMCP = await this.improveMCP(enhancedMCP, validation);
      }

      return finalMCP;
    } catch (error) {
      throw new Error(`Failed to generate MCP: ${error}`);
    }
  }

  /**
   * Enhance an existing MCP with additional features
   */
  async enhanceMCP(mcp: MCP, request: EnhancementRequest): Promise<MCP> {
    try {
      let enhancedMCP = { ...mcp };

      // Add examples if requested
      if (request.addExamples && enhancedMCP.examples.length < this.config.minExamples) {
        const examples = await this.llmService.generateExamples(enhancedMCP, {
          count: this.config.minExamples - enhancedMCP.examples.length,
          complexity: 'varied',
        });
        enhancedMCP.examples = [...enhancedMCP.examples, ...examples];
      }

      // Add references if requested
      if (request.addReferences && enhancedMCP.references.length < this.config.minReferences) {
        const references = await this.llmService.generateReferences(enhancedMCP, {
          count: this.config.minReferences - enhancedMCP.references.length,
          types: ['documentation', 'examples', 'standards'],
        });
        enhancedMCP.references = [...enhancedMCP.references, ...references];
      }

      // Improve clarity if requested
      if (request.improveClarity) {
        enhancedMCP = await this.llmService.improveMCP(enhancedMCP, {
          focus: 'clarity',
          targetAudience: enhancedMCP.metadata?.complexity || 'intermediate',
        });
      }

      // Add constraints if missing
      if (request.addConstraints && enhancedMCP.constraints.length < this.config.minConstraints) {
        const constraints = await this.llmService.generateConstraints(enhancedMCP, {
          count: this.config.minConstraints - enhancedMCP.constraints.length,
          types: ['technical', 'business', 'compliance'],
        });
        enhancedMCP.constraints = [...enhancedMCP.constraints, ...constraints];
      }

      return enhancedMCP;
    } catch (error) {
      throw new Error(`Failed to enhance MCP: ${error}`);
    }
  }

  /**
   * Improve an MCP based on validation results
   */
  async improveMCP(mcp: MCP, validation: ValidationResult): Promise<MCP> {
    try {
      let improvedMCP = { ...mcp };

      // Apply suggestions from validation
      for (const suggestion of validation.suggestions) {
        if (suggestion.priority >= this.config.minSuggestionPriority) {
          improvedMCP = await this.llmService.improveMCP(improvedMCP, {
            focus: suggestion.type,
            specificIssue: suggestion.description,
          });
        }
      }

      // Fix critical issues
      const criticalIssues = validation.issues.filter(issue => issue.severity === 'critical');
      for (const issue of criticalIssues) {
        improvedMCP = await this.llmService.improveMCP(improvedMCP, {
          focus: 'fix',
          specificIssue: issue.message,
        });
      }

      return improvedMCP;
    } catch (error) {
      throw new Error(`Failed to improve MCP: ${error}`);
    }
  }

  /**
   * Specialize an MCP for a specific use case
   */
  async specializeMCP(mcp: MCP, request: SpecializationRequest): Promise<MCP> {
    try {
      // Step 1: Analyze current MCP
      const analysis = await this.llmService.analyzeMCP(mcp);

      // Step 2: Generate specialized version
      const specializedMCP = await this.llmService.specializeMCP(mcp, {
        targetDomain: request.targetDomain,
        specificRequirements: request.requirements,
        complexity: request.complexity,
        maintainCompatibility: request.maintainCompatibility,
      });

      // Step 3: Validate specialization
      const validation = await this.llmService.validateMCP(specializedMCP);
      
      // Step 4: Apply improvements if needed
      let finalMCP = specializedMCP;
      if (validation.score.overall < this.config.minimumQualityScore) {
        finalMCP = await this.improveMCP(specializedMCP, validation);
      }

      return finalMCP;
    } catch (error) {
      throw new Error(`Failed to specialize MCP: ${error}`);
    }
  }

  /**
   * Merge multiple MCPs into a single comprehensive MCP
   */
  async mergeMCPs(mcps: MCP[], request: MergeRequest): Promise<MCP> {
    try {
      // Step 1: Analyze all MCPs
      const analyses = await Promise.all(
        mcps.map(mcp => this.llmService.analyzeMCP(mcp))
      );

      // Step 2: Generate merged MCP
      const mergedMCP = await this.llmService.mergeMCPs(mcps, {
        mergeStrategy: request.strategy,
        conflictResolution: request.conflictResolution,
        preserveUniqueFeatures: request.preserveUniqueFeatures,
      });

      // Step 3: Validate merged result
      const validation = await this.llmService.validateMCP(mergedMCP);
      
      // Step 4: Apply improvements if needed
      let finalMCP = mergedMCP;
      if (validation.score.overall < this.config.minimumQualityScore) {
        finalMCP = await this.improveMCP(mergedMCP, validation);
      }

      return finalMCP;
    } catch (error) {
      throw new Error(`Failed to merge MCPs: ${error}`);
    }
  }

  /**
   * Process and enhance context for MCP generation
   */
  private async processContext(context: Context[]): Promise<Context[]> {
    try {
      const processedContext: Context[] = [];

      for (const ctx of context) {
        // Extract key information
        const extraction = await this.llmService.extractContext(ctx.content, ctx.type);
        
        // Store in vector database
        const vectorId = await this.vectorStoreService.storeContext({
          ...ctx,
          metadata: {
            ...ctx.metadata,
            summary: extraction.summary,
            keywords: extraction.keywords,
            confidence: extraction.confidence,
          },
        });

        processedContext.push({
          ...ctx,
          vectorId,
          metadata: {
            ...ctx.metadata,
            summary: extraction.summary,
            keywords: extraction.keywords,
            confidence: extraction.confidence,
          },
        });
      }

      return processedContext;
    } catch (error) {
      throw new Error(`Failed to process context: ${error}`);
    }
  }

  /**
   * Generate multiple MCPs for comparison
   */
  async generateMultipleMCPs(request: GenerationRequest, count: number = 3): Promise<MCP[]> {
    try {
      const mcps: MCP[] = [];

      for (let i = 0; i < count; i++) {
        const mcp = await this.generateMCP({
          ...request,
          // Add slight variations for diversity
          constraints: [
            ...request.constraints,
            {
              id: `variation_${i}`,
              type: 'technical',
              description: `Variation ${i + 1} of ${count}`,
              severity: 'low',
              enforced: false,
            },
          ],
        });
        mcps.push(mcp);
      }

      return mcps;
    } catch (error) {
      throw new Error(`Failed to generate multiple MCPs: ${error}`);
    }
  }

  /**
   * Compare multiple MCPs and provide recommendations
   */
  async compareMCPs(mcps: MCP[]): Promise<{
    comparison: any;
    recommendations: string[];
    bestMCP: MCP;
  }> {
    try {
      // Validate all MCPs
      const validations = await Promise.all(
        mcps.map(mcp => this.llmService.validateMCP(mcp))
      );

      // Compare MCPs
      const comparison = await this.llmService.compareMCPs(mcps);

      // Generate recommendations
      const recommendations = await this.llmService.generateRecommendations(mcps, validations);

      // Find best MCP based on validation scores
      const bestMCPIndex = validations.reduce(
        (bestIndex, validation, index) =>
          validation.score.overall > validations[bestIndex].score.overall ? index : bestIndex,
        0
      );

      return {
        comparison,
        recommendations,
        bestMCP: mcps[bestMCPIndex],
      };
    } catch (error) {
      throw new Error(`Failed to compare MCPs: ${error}`);
    }
  }

  /**
   * Generate documentation for an MCP
   */
  async generateDocumentation(mcp: MCP, format: 'markdown' | 'html' | 'pdf' = 'markdown'): Promise<string> {
    try {
      return await this.llmService.generateDocumentation(mcp, format);
    } catch (error) {
      throw new Error(`Failed to generate documentation: ${error}`);
    }
  }

  /**
   * Create a test suite for an MCP
   */
  async createTestSuite(mcp: MCP): Promise<{
    testCases: any[];
    testFramework: string;
    instructions: string;
  }> {
    try {
      return await this.llmService.createTestSuite(mcp);
    } catch (error) {
      throw new Error(`Failed to create test suite: ${error}`);
    }
  }

  /**
   * Update builder configuration
   */
  updateConfig(newConfig: Partial<BuilderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current builder configuration
   */
  getConfig(): BuilderConfig {
    return { ...this.config };
  }
} 