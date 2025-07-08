'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Link, FileText, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Context, ContextMetadata } from '@/types';
import { vectorStoreService } from '@/services/vectorStoreService';
import { llmService } from '@/services/llmService';

interface ContextIngestorProps {
  onContextAdded: (context: Context) => void;
  onContextRemoved: (contextId: string) => void;
  contexts: Context[];
  mcpId?: string;
}

export const ContextIngestor: React.FC<ContextIngestorProps> = ({
  onContextAdded,
  onContextRemoved,
  contexts,
  mcpId,
}) => {
  const [activeTab, setActiveTab] = useState('file');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processContext = useCallback(async (content: string, type: 'file' | 'url' | 'text', metadata: Partial<ContextMetadata>) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      // Step 1: Extract context using LLM
      setProcessingProgress(25);
      const extraction = await llmService.extractContext(content, type);
      
      // Step 2: Create context object
      setProcessingProgress(50);
      const context: Context = {
        id: `context_${Date.now()}`,
        type,
        content,
        metadata: {
          source: metadata.source || 'Unknown',
          size: content.length,
          format: metadata.format || type,
          language: 'en',
          summary: extraction.summary,
          keywords: extraction.keywords,
          confidence: extraction.confidence,
        },
        createdAt: new Date(),
        mcpId,
      };

      // Step 3: Store in vector database
      setProcessingProgress(75);
      const vectorId = await vectorStoreService.storeContext(context);
      context.vectorId = vectorId;

      // Step 4: Complete
      setProcessingProgress(100);
      onContextAdded(context);

      return context;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process context');
      throw err;
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [onContextAdded, mcpId]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      await processContext(content, 'file', {
        source: file.name,
        size: file.size,
        format: file.type || 'unknown',
      });
    } catch (err) {
      console.error('Error processing file:', err);
    }
  }, [processContext]);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) return;

    try {
      // For now, we'll simulate URL content extraction
      // In a real implementation, you'd fetch the URL content
      const content = `Content extracted from: ${urlInput}\n\nThis is a placeholder for the actual content that would be extracted from the URL.`;
      
      await processContext(content, 'url', {
        source: urlInput,
        format: 'url',
      });
      
      setUrlInput('');
    } catch (err) {
      console.error('Error processing URL:', err);
    }
  }, [urlInput, processContext]);

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;

    try {
      await processContext(textInput, 'text', {
        source: 'Manual input',
        format: 'text',
      });
      
      setTextInput('');
    } catch (err) {
      console.error('Error processing text:', err);
    }
  }, [textInput, processContext]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const content = await file.text();
        await processContext(content, 'file', {
          source: file.name,
          size: file.size,
          format: file.type || 'unknown',
        });
      } catch (err) {
        console.error('Error processing dropped file:', err);
      }
    }
  }, [processContext]);

  const removeContext = useCallback(async (contextId: string) => {
    try {
      await vectorStoreService.deleteContext(contextId);
      onContextRemoved(contextId);
    } catch (err) {
      console.error('Error removing context:', err);
      setError('Failed to remove context');
    }
  }, [onContextRemoved]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Context Ingestion</h2>
        <p className="text-gray-600">
          Upload files, extract content from URLs, or enter text to provide context for your MCP
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Processing context...</span>
            </div>
            <Progress value={processingProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Input Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="file" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            File Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            URL Extraction
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Text Input
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Files</CardTitle>
              <CardDescription>
                Upload documents, text files, or other content files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </Label>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".txt,.md,.json,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Supports TXT, MD, JSON, PDF, DOC, and DOCX files (max 10MB)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Extract from URL</CardTitle>
              <CardDescription>
                Extract content from web pages or online documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="url-input">URL</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="url-input"
                      type="url"
                      placeholder="https://example.com/document"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={isProcessing}
                    />
                    <Button
                      onClick={handleUrlSubmit}
                      disabled={!urlInput.trim() || isProcessing}
                      className="flex items-center gap-2"
                    >
                      <Link className="w-4 h-4" />
                      Extract
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Enter a URL to extract and process its content
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enter Text</CardTitle>
              <CardDescription>
                Paste or type your context information directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="text-input">Text Content</Label>
                  <Textarea
                    id="text-input"
                    placeholder="Paste or type your context information here..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    rows={8}
                    disabled={isProcessing}
                    className="mt-2"
                  />
                </div>
                <Button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim() || isProcessing}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Add Text
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Context List */}
      {contexts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Processed Context
              <Badge variant="secondary">{contexts.length}</Badge>
            </CardTitle>
            <CardDescription>
              Context items that have been processed and stored
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contexts.map((context) => (
                <motion.div
                  key={context.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="border rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{context.type}</Badge>
                        <span className="text-sm text-gray-600">
                          {context.metadata.source}
                        </span>
                        {context.vectorId && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Stored
                          </Badge>
                        )}
                      </div>
                      
                      {context.metadata.summary && (
                        <p className="text-sm text-gray-700 mb-2">
                          {context.metadata.summary}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Size: {context.metadata.size} chars</span>
                        <span>Confidence: {Math.round(context.metadata.confidence * 100)}%</span>
                        <span>Added: {context.createdAt.toLocaleDateString()}</span>
                      </div>
                      
                      {context.metadata.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {context.metadata.keywords.slice(0, 5).map((keyword) => (
                            <Badge key={keyword} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {context.metadata.keywords.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{context.metadata.keywords.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContext(context.id)}
                      className="text-red-600 hover:text-red-700"
                      disabled={isProcessing}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {contexts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Context Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{contexts.length}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {contexts.filter(c => c.vectorId).length}
                </div>
                <div className="text-sm text-gray-600">Stored</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    contexts.reduce((sum, c) => sum + c.metadata.confidence, 0) / contexts.length * 100
                  )}%
                </div>
                <div className="text-sm text-gray-600">Avg Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {contexts.reduce((sum, c) => sum + c.metadata.size, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Characters</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 