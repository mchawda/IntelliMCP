'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Copy, 
  ExternalLink, 
  FileText, 
  FileJson, 
  FileCode, 
  FileImage,
  Check,
  Loader2,
  AlertCircle,
  Settings,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MCP, ExportFormat, ExportOptions, ExportResult } from '@/types';
import { llmService } from '@/services/llmService';

interface ExporterProps {
  mcp: MCP;
  onExportComplete?: (result: ExportResult) => void;
}

const EXPORT_FORMATS: { value: ExportFormat; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'json',
    label: 'JSON',
    icon: <FileJson className="w-5 h-5" />,
    description: 'Structured data format for APIs and integrations'
  },
  {
    value: 'yaml',
    label: 'YAML',
    icon: <FileCode className="w-5 h-5" />,
    description: 'Human-readable configuration format'
  },
  {
    value: 'markdown',
    label: 'Markdown',
    icon: <FileText className="w-5 h-5" />,
    description: 'Documentation format for wikis and docs'
  },
  {
    value: 'pdf',
    label: 'PDF',
    icon: <FileImage className="w-5 h-5" />,
    description: 'Portable document format for sharing'
  }
];

const DESTINATIONS = [
  { value: 'download', label: 'Download File', icon: <Download className="w-4 h-4" /> },
  { value: 'clipboard', label: 'Copy to Clipboard', icon: <Copy className="w-4 h-4" /> },
  { value: 'notion', label: 'Send to Notion', icon: <ExternalLink className="w-4 h-4" /> }
];

export const Exporter: React.FC<ExporterProps> = ({ mcp, onExportComplete }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [selectedDestination, setSelectedDestination] = useState<'download' | 'clipboard' | 'notion'>('download');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeMetadata: true,
    includeExamples: true,
    includeReferences: true,
    destination: 'download',
    filename: `${mcp.name.replace(/\s+/g, '_')}_${mcp.version}`
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');

  const generateExportContent = useCallback(async (format: ExportFormat, options: ExportOptions): Promise<string> => {
    const content: any = {
      name: mcp.name,
      description: mcp.description,
      version: mcp.version,
      domain: mcp.domain,
      systemPrompt: mcp.systemPrompt,
      userGuidance: mcp.userGuidance,
      inputFormat: mcp.inputFormat,
      outputFormat: mcp.outputFormat,
      constraints: mcp.constraints,
      tags: mcp.tags,
      status: mcp.status,
      createdAt: mcp.createdAt.toISOString(),
      updatedAt: mcp.updatedAt.toISOString(),
    };

    if (options.includeMetadata) {
      content.metadata = mcp.metadata;
    }

    if (options.includeExamples) {
      content.examples = mcp.examples;
    }

    if (options.includeReferences) {
      content.references = mcp.references;
    }

    switch (format) {
      case 'json':
        return JSON.stringify(content, null, 2);
      
      case 'yaml':
        // Simple YAML conversion - in production, use a proper YAML library
        return convertToYAML(content);
      
      case 'markdown':
        return generateMarkdown(content);
      
      case 'pdf':
        return generatePDFContent(content);
      
      default:
        return JSON.stringify(content, null, 2);
    }
  }, [mcp]);

  const convertToYAML = (obj: any, indent: number = 0): string => {
    const spaces = '  '.repeat(indent);
    let yaml = '';
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n${convertToYAML(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}- ${convertToYAML(item, indent + 1).trim()}\n`;
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        }
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }
    
    return yaml;
  };

  const generateMarkdown = (content: any): string => {
    let markdown = `# ${content.name}\n\n`;
    markdown += `**Version:** ${content.version}\n`;
    markdown += `**Domain:** ${content.domain}\n`;
    markdown += `**Status:** ${content.status}\n\n`;
    
    markdown += `## Description\n\n${content.description}\n\n`;
    
    markdown += `## System Prompt\n\n\`\`\`\n${content.systemPrompt}\n\`\`\`\n\n`;
    
    markdown += `## User Guidance\n\n${content.userGuidance}\n\n`;
    
    markdown += `## Input Format\n\n\`\`\`json\n${JSON.stringify(content.inputFormat, null, 2)}\n\`\`\`\n\n`;
    
    markdown += `## Output Format\n\n\`\`\`json\n${JSON.stringify(content.outputFormat, null, 2)}\n\`\`\`\n\n`;
    
    if (content.constraints && content.constraints.length > 0) {
      markdown += `## Constraints\n\n`;
      for (const constraint of content.constraints) {
        markdown += `- **${constraint.type}** (${constraint.severity}): ${constraint.description}\n`;
      }
      markdown += '\n';
    }
    
    if (content.examples && content.examples.length > 0) {
      markdown += `## Examples\n\n`;
      for (const example of content.examples) {
        markdown += `### ${example.description}\n\n`;
        markdown += `**Input:**\n\`\`\`json\n${JSON.stringify(example.input, null, 2)}\n\`\`\`\n\n`;
        markdown += `**Output:**\n\`\`\`json\n${JSON.stringify(example.output, null, 2)}\n\`\`\`\n\n`;
      }
    }
    
    if (content.references && content.references.length > 0) {
      markdown += `## References\n\n`;
      for (const ref of content.references) {
        markdown += `- [${ref.title}](${ref.url || '#'}) - ${ref.description}\n`;
      }
      markdown += '\n';
    }
    
    return markdown;
  };

  const generatePDFContent = (content: any): string => {
    // This would typically generate HTML that can be converted to PDF
    // For now, return a simplified version
    return `PDF Export for ${content.name}\n\n${content.description}`;
  };

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);
    setError(null);
    setSuccess(null);

    try {
      // Step 1: Generate content
      setExportProgress(25);
      const content = await generateExportContent(selectedFormat, exportOptions);
      
      // Step 2: Handle destination
      setExportProgress(50);
      let result: ExportResult;
      
      switch (selectedDestination) {
        case 'download':
          result = await handleDownload(content, selectedFormat);
          break;
        case 'clipboard':
          result = await handleClipboard(content);
          break;
        case 'notion':
          result = await handleNotion(content);
          break;
        default:
          throw new Error('Invalid destination');
      }
      
      setExportProgress(100);
      setSuccess(`Successfully exported to ${selectedDestination}`);
      onExportComplete?.(result);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [selectedFormat, selectedDestination, exportOptions, generateExportContent, onExportComplete]);

  const handleDownload = async (content: string, format: ExportFormat): Promise<ExportResult> => {
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 
            format === 'yaml' ? 'text/yaml' : 
            format === 'markdown' ? 'text/markdown' : 'application/pdf' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportOptions.filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return {
      id: `export_${Date.now()}`,
      mcpId: mcp.id,
      format,
      content,
      size: content.length,
      timestamp: new Date(),
      destination: 'download',
      status: 'success'
    };
  };

  const handleClipboard = async (content: string): Promise<ExportResult> => {
    await navigator.clipboard.writeText(content);
    
    return {
      id: `export_${Date.now()}`,
      mcpId: mcp.id,
      format: selectedFormat,
      content,
      size: content.length,
      timestamp: new Date(),
      destination: 'clipboard',
      status: 'success'
    };
  };

  const handleNotion = async (content: string): Promise<ExportResult> => {
    // Simulate Notion integration
    // In production, this would use the Notion API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: `export_${Date.now()}`,
      mcpId: mcp.id,
      format: selectedFormat,
      content,
      size: content.length,
      timestamp: new Date(),
      destination: 'notion',
      status: 'success'
    };
  };

  const generatePreview = useCallback(async () => {
    try {
      const content = await generateExportContent(selectedFormat, exportOptions);
      setPreviewContent(content);
    } catch (err) {
      setError('Failed to generate preview');
    }
  }, [selectedFormat, exportOptions, generateExportContent]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Export MCP</h2>
        <p className="text-gray-600">
          Export your MCP in various formats for sharing, documentation, or integration
        </p>
      </div>

      {/* Error/Success Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Export Progress */}
      {isExporting && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Exporting...</span>
            </div>
            <Progress value={exportProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="format" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="format">Format & Destination</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="format" className="space-y-6">
          {/* Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Export Format</CardTitle>
              <CardDescription>
                Choose the format that best suits your needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXPORT_FORMATS.map((format) => (
                  <Card
                    key={format.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedFormat === format.value
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedFormat(format.value);
                      setExportOptions(prev => ({ ...prev, format: format.value }));
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {format.icon}
                        <div>
                          <h3 className="font-medium">{format.label}</h3>
                          <p className="text-sm text-gray-600">{format.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Destination Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Export Destination</CardTitle>
              <CardDescription>
                Choose where to send your exported MCP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DESTINATIONS.map((destination) => (
                  <div
                    key={destination.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedDestination === destination.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedDestination(destination.value);
                      setExportOptions(prev => ({ ...prev, destination: destination.value }));
                    }}
                  >
                    {destination.icon}
                    <span className="font-medium">{destination.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center gap-2"
            size="lg"
          >
            {isExporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {isExporting ? 'Exporting...' : 'Export MCP'}
          </Button>
        </TabsContent>

        <TabsContent value="options" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>
                Customize what to include in your export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-metadata"
                    checked={exportOptions.includeMetadata}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeMetadata: !!checked }))
                    }
                  />
                  <Label htmlFor="include-metadata">Include metadata (complexity, skills, etc.)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-examples"
                    checked={exportOptions.includeExamples}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeExamples: !!checked }))
                    }
                  />
                  <Label htmlFor="include-examples">Include examples</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-references"
                    checked={exportOptions.includeReferences}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeReferences: !!checked }))
                    }
                  />
                  <Label htmlFor="include-references">Include references</Label>
                </div>

                <div>
                  <Label htmlFor="filename">Filename</Label>
                  <Input
                    id="filename"
                    value={exportOptions.filename}
                    onChange={(e) =>
                      setExportOptions(prev => ({ ...prev, filename: e.target.value }))
                    }
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Preview
                <Button
                  onClick={generatePreview}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Generate Preview
                </Button>
              </CardTitle>
              <CardDescription>
                Preview your export before downloading
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewContent ? (
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                  <pre className="text-sm whitespace-pre-wrap">{previewContent}</pre>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Click "Generate Preview" to see your export content
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export</CardTitle>
          <CardDescription>
            Export with common presets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFormat('json');
                setSelectedDestination('download');
                setExportOptions(prev => ({ ...prev, format: 'json', destination: 'download' }));
                handleExport();
              }}
              className="flex items-center gap-2"
            >
              <FileJson className="w-4 h-4" />
              JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFormat('markdown');
                setSelectedDestination('clipboard');
                setExportOptions(prev => ({ ...prev, format: 'markdown', destination: 'clipboard' }));
                handleExport();
              }}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Markdown
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFormat('yaml');
                setSelectedDestination('download');
                setExportOptions(prev => ({ ...prev, format: 'yaml', destination: 'download' }));
                handleExport();
              }}
              className="flex items-center gap-2"
            >
              <FileCode className="w-4 h-4" />
              YAML
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 