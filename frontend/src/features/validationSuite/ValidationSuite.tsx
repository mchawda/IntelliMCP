'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  TrendingUp, 
  Target, 
  Zap, 
  Shield,
  Eye,
  Play,
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  MCP, 
  ValidationResult, 
  ValidationScore, 
  ValidationIssue, 
  ValidationSuggestion,
  TestCase
} from '@/types';
import { llmService } from '@/services/llmService';

interface ValidationSuiteProps {
  mcp: MCP;
  onValidationComplete?: (result: ValidationResult) => void;
}

export const ValidationSuite: React.FC<ValidationSuiteProps> = ({
  mcp,
  onValidationComplete,
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const runValidation = useCallback(async () => {
    setIsValidating(true);
    setError(null);

    try {
      const result = await llmService.validateMCP(mcp);
      setValidationResult(result);
      onValidationComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  }, [mcp, onValidationComplete]);

  const runTest = useCallback(async () => {
    if (!testInput.trim()) return;

    setIsTesting(true);
    setTestOutput('');

    try {
      // Simulate MCP execution with test input
      const response = await fetch('/api/mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mcpId: mcp.id,
          input: testInput,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setTestOutput(JSON.stringify(result.output, null, 2));
      } else {
        setTestOutput('Error: Failed to execute test');
      }
    } catch (err) {
      setTestOutput('Error: Test execution failed');
    } finally {
      setIsTesting(false);
    }
  }, [mcp.id, testInput]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'improvement': return <TrendingUp className="w-4 h-4" />;
      case 'optimization': return <Zap className="w-4 h-4" />;
      case 'enhancement': return <Target className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Validation Suite</h2>
          <p className="text-gray-600">
            Comprehensive quality assessment and testing for your MCP
          </p>
        </div>
        <Button
          onClick={runValidation}
          disabled={isValidating}
          className="flex items-center gap-2"
        >
          {isValidating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isValidating ? 'Validating...' : 'Run Validation'}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Validation Results */}
      {validationResult && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overall Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getScoreIcon(validationResult.score.overall)}
                  Overall Quality Score
                </CardTitle>
                <CardDescription>
                  Comprehensive assessment of your MCP's quality and readiness
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className={`text-6xl font-bold ${getScoreColor(validationResult.score.overall)}`}>
                    {validationResult.score.overall}
                  </div>
                  <div className="text-lg text-gray-600">out of 100</div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(validationResult.score).map(([key, score]) => {
                    if (key === 'overall') return null;
                    return (
                      <Card key={key} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                            {score}
                          </span>
                        </div>
                        <Progress value={score} className="h-2" />
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="font-medium">Issues Found</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {validationResult.issues.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Suggestions</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {validationResult.suggestions.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Risk Level</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {validationResult.score.hallucinationRisk < 30 ? 'Low' : 
                     validationResult.score.hallucinationRisk < 60 ? 'Medium' : 'High'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Issues & Problems</CardTitle>
                <CardDescription>
                  Issues found during validation that need attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {validationResult.issues.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <p className="text-gray-600">No issues found! Your MCP looks good.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {validationResult.issues.map((issue) => (
                      <motion.div
                        key={issue.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
                      >
                        <div className="flex items-start gap-3">
                          {getIssueIcon(issue.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{issue.category}</Badge>
                              <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}>
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="font-medium mb-1">{issue.message}</p>
                            {issue.suggestion && (
                              <p className="text-sm opacity-80">{issue.suggestion}</p>
                            )}
                            {issue.location && (
                              <p className="text-xs opacity-60 mt-2">Location: {issue.location}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Improvement Suggestions</CardTitle>
                <CardDescription>
                  Recommendations to enhance your MCP's quality and effectiveness
                </CardDescription>
              </CardHeader>
              <CardContent>
                {validationResult.suggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">No suggestions at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {validationResult.suggestions.map((suggestion) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-start gap-3">
                          {getSuggestionIcon(suggestion.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{suggestion.type}</Badge>
                              <Badge variant="secondary">Impact: {suggestion.impact}</Badge>
                              <Badge variant="secondary">Effort: {suggestion.effort}</Badge>
                              <Badge variant="outline">Priority: {suggestion.priority}/5</Badge>
                            </div>
                            <p className="font-medium mb-1">{suggestion.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Your MCP</CardTitle>
                <CardDescription>
                  Test your MCP with sample inputs to verify functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="test-input">Test Input</Label>
                    <Textarea
                      id="test-input"
                      placeholder="Enter test input in the format expected by your MCP..."
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={runTest}
                      disabled={!testInput.trim() || isTesting}
                      className="flex items-center gap-2"
                    >
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {isTesting ? 'Testing...' : 'Run Test'}
                    </Button>
                    <Button variant="outline" onClick={() => setTestInput('')}>
                      Clear
                    </Button>
                  </div>

                  {testOutput && (
                    <div>
                      <Label>Test Output</Label>
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                        <pre className="text-sm overflow-x-auto">{testOutput}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Example Test Cases */}
            <Card>
              <CardHeader>
                <CardTitle>Example Test Cases</CardTitle>
                <CardDescription>
                  Pre-defined test cases to help you validate your MCP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mcp.examples.slice(0, 3).map((example, index) => (
                    <div
                      key={example.id}
                      className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setTestInput(JSON.stringify(example.input, null, 2))}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Example {index + 1}</p>
                          <p className="text-sm text-gray-600">{example.description}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Initial State */}
      {!validationResult && !isValidating && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Ready to Validate</h3>
            <p className="text-gray-600 mb-4">
              Run a comprehensive validation to assess your MCP's quality, identify issues, and get improvement suggestions.
            </p>
            <Button onClick={runValidation} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Start Validation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isValidating && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium mb-2">Validating MCP</h3>
            <p className="text-gray-600">
              Analyzing your MCP for quality, completeness, and potential issues...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 