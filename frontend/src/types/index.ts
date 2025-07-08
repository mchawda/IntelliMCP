// Core MCP Types
export interface MCP {
  id: string;
  name: string;
  description: string;
  version: string;
  domain: Domain;
  systemPrompt: string;
  userGuidance: string;
  inputFormat: InputFormat;
  outputFormat: OutputFormat;
  constraints: Constraint[];
  examples: Example[];
  references: Reference[];
  metadata: MCPMetadata;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  teamId?: string;
  isPublic: boolean;
  tags: string[];
  status: MCPStatus;
}

export interface MCPMetadata {
  complexity: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  requiredSkills: string[];
  industry: string[];
  compliance: ComplianceRequirement[];
  lastValidated?: Date;
  validationScore?: number;
  usageCount: number;
  rating?: number;
  reviewCount: number;
}

export interface InputFormat {
  schema: Record<string, any>;
  required: string[];
  optional: string[];
  description: string;
  examples: Record<string, any>[];
}

export interface OutputFormat {
  schema: Record<string, any>;
  description: string;
  examples: Record<string, any>[];
}

export interface Constraint {
  id: string;
  type: 'technical' | 'business' | 'compliance' | 'security';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enforced: boolean;
}

export interface Example {
  id: string;
  input: Record<string, any>;
  output: Record<string, any>;
  description: string;
  tags: string[];
}

export interface Reference {
  id: string;
  type: 'documentation' | 'api' | 'article' | 'paper' | 'website';
  title: string;
  url?: string;
  description: string;
  relevance: number; // 0-1
}

// Domain and Context Types
export type Domain = 
  | 'business' 
  | 'healthcare' 
  | 'technology' 
  | 'finance' 
  | 'education' 
  | 'legal' 
  | 'marketing' 
  | 'sales' 
  | 'customer-service' 
  | 'research' 
  | 'other';

export interface Context {
  id: string;
  type: 'file' | 'url' | 'text' | 'api';
  content: string;
  metadata: ContextMetadata;
  embeddings?: number[];
  vectorId?: string;
  createdAt: Date;
  mcpId?: string;
}

export interface ContextMetadata {
  source: string;
  size: number;
  format: string;
  language: string;
  summary?: string;
  keywords: string[];
  confidence: number; // 0-1
}

// User and Team Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  lastActive: Date;
  preferences: UserPreferences;
}

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Permission {
  resource: string;
  actions: string[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationSettings;
  defaultDomain: Domain;
  exportFormat: ExportFormat;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  teamUpdates: boolean;
  validationAlerts: boolean;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  members: TeamMember[];
  settings: TeamSettings;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
}

export interface TeamMember {
  userId: string;
  role: UserRole;
  joinedAt: Date;
  invitedBy: string;
  permissions: Permission[];
}

export interface TeamSettings {
  allowPublicSharing: boolean;
  requireApproval: boolean;
  maxMembers: number;
  allowedDomains: Domain[];
  exportRestrictions: ExportFormat[];
}

// Validation and Quality Types
export interface ValidationResult {
  id: string;
  mcpId: string;
  score: ValidationScore;
  issues: ValidationIssue[];
  suggestions: ValidationSuggestion[];
  timestamp: Date;
  validator: string;
}

export interface ValidationScore {
  overall: number; // 0-100
  completeness: number;
  clarity: number;
  actionability: number;
  domainAlignment: number;
  hallucinationRisk: number;
}

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'completeness' | 'clarity' | 'safety' | 'performance';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  suggestion?: string;
}

export interface ValidationSuggestion {
  id: string;
  type: 'improvement' | 'optimization' | 'enhancement';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-5
}

// Version Control Types
export interface Version {
  id: string;
  mcpId: string;
  version: string;
  changes: Change[];
  author: string;
  timestamp: Date;
  message: string;
  tags: string[];
  isMajor: boolean;
}

export interface Change {
  type: 'added' | 'modified' | 'removed';
  path: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}

// Export Types
export type ExportFormat = 'json' | 'yaml' | 'markdown' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeExamples: boolean;
  includeReferences: boolean;
  destination: 'download' | 'clipboard' | 'notion';
  filename?: string;
}

export interface ExportResult {
  id: string;
  mcpId: string;
  format: ExportFormat;
  content: string;
  size: number;
  timestamp: Date;
  destination: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
}

// Wizard and Workflow Types
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  validation?: (data: any) => boolean;
}

export interface WizardData {
  domain: Domain;
  goal: {
    primary: string;
    secondary?: string;
  };
  userRole: {
    primary: string;
    additional?: string[];
  };
  constraints: Constraint[];
  context: Context[];
  review: {
    confirmed: boolean;
    notes?: string;
  };
}

// Analytics and Metrics Types
export interface Analytics {
  mcpId: string;
  usage: UsageMetrics;
  performance: PerformanceMetrics;
  quality: QualityMetrics;
  userFeedback: UserFeedback[];
}

export interface UsageMetrics {
  totalUses: number;
  uniqueUsers: number;
  averageSessionTime: number;
  completionRate: number;
  lastUsed: Date;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  tokenUsage: number;
}

export interface QualityMetrics {
  averageRating: number;
  reviewCount: number;
  validationScore: number;
  improvementSuggestions: number;
}

export interface UserFeedback {
  id: string;
  userId: string;
  rating: number;
  comment?: string;
  category: 'usability' | 'accuracy' | 'performance' | 'other';
  timestamp: Date;
}

// API and Service Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Search and Filter Types
export interface SearchFilters {
  domain?: Domain[];
  status?: MCPStatus[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  author?: string;
  teamId?: string;
  isPublic?: boolean;
}

export interface SearchOptions {
  query: string;
  filters: SearchFilters;
  sortBy: 'relevance' | 'date' | 'name' | 'rating' | 'usage';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

// Status and Enum Types
export type MCPStatus = 'draft' | 'review' | 'published' | 'archived' | 'deprecated';

export type ComplianceRequirement = 
  | 'GDPR' 
  | 'HIPAA' 
  | 'SOX' 
  | 'PCI-DSS' 
  | 'ISO-27001' 
  | 'SOC-2' 
  | 'CCPA';

// Event and Notification Types
export interface Event {
  id: string;
  type: EventType;
  userId: string;
  mcpId?: string;
  teamId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

export type EventType = 
  | 'mcp_created' 
  | 'mcp_updated' 
  | 'mcp_published' 
  | 'mcp_validated' 
  | 'team_member_added' 
  | 'export_completed' 
  | 'validation_failed';

// LLM and AI Types
export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

// Vector Store Types
export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding: number[];
  createdAt: Date;
}

export interface VectorSearchResult {
  document: VectorDocument;
  score: number;
  metadata: Record<string, any>;
}

// Marketplace Types
export interface MarketplaceItem {
  id: string;
  mcp: MCP;
  author: User;
  downloads: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  categories: string[];
  price?: number;
  isFree: boolean;
}

// Test and Validation Types
export interface TestCase {
  id: string;
  mcpId: string;
  name: string;
  description: string;
  input: Record<string, any>;
  expectedOutput: Record<string, any>;
  actualOutput?: Record<string, any>;
  status: 'pending' | 'passed' | 'failed' | 'error';
  executionTime?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestSuite {
  id: string;
  mcpId: string;
  name: string;
  description: string;
  testCases: TestCase[];
  status: 'draft' | 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>; 