'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Code, 
  Check, 
  AlertTriangle, 
  Settings, 
  Download, 
  Upload,
  Copy,
  RotateCcw,
  Eye,
  EyeOff,
  Play,
  Save,
  Loader2,
  AlertCircle,
  FileText,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { JSONSchema, ValidationError, SchemaSettings } from '@/types';

interface JSONSchemaEditorProps {
  schema: JSONSchema;
  onSchemaChange?: (schema: JSONSchema) => void;
  onValidate?: (schema: JSONSchema) => Promise<ValidationError[]>;
  onFormat?: (schema: JSONSchema) => JSONSchema;
  onExport?: (schema: JSONSchema, format: string) => void;
  onImport?: (content: string) => Promise<JSONSchema>;
}

export const JSONSchemaEditor: React.FC<JSONSchemaEditorProps> = ({
  schema,
  onSchemaChange,
  onValidate,
  onFormat,
  onExport,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Editor state
  const [schemaText, setSchemaText] = useState(JSON.stringify(schema, null, 2));
  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoFormat, setAutoFormat] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState<SchemaSettings>({
    theme: 'light',
    fontSize: 14,
    tabSize: 2,
    showLineNumbers: true,
    autoFormat: true,
    wordWrap: false,
    validateOnChange: true,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSchemaChange = useCallback((newText: string) => {
    setSchemaText(newText);
    setError(null);
    
    try {
      const parsedSchema = JSON.parse(newText);
      setIsValid(true);
      
      if (settings.validateOnChange) {
        validateSchema(parsedSchema);
      }
      
      onSchemaChange?.(parsedSchema);
    } catch (err) {
      setIsValid(false);
      setValidationErrors([{
        path: '',
        message: 'Invalid JSON syntax',
        severity: 'error'
      }]);
    }
  }, [settings.validateOnChange, onSchemaChange]);

  const validateSchema = useCallback(async (schemaToValidate: JSONSchema) => {
    if (!onValidate) return;

    setIsLoading(true);
    setError(null);

    try {
      const errors = await onValidate(schemaToValidate);
      setValidationErrors(errors);
      setIsValid(errors.length === 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsLoading(false);
    }
  }, [onValidate]);

  const handleFormat = useCallback(() => {
    try {
      const parsedSchema = JSON.parse(schemaText);
      const formattedSchema = onFormat?.(parsedSchema) || parsedSchema;
      const formattedText = JSON.stringify(formattedSchema, null, settings.tabSize);
      setSchemaText(formattedText);
      setSuccess('Schema formatted successfully');
    } catch (err) {
      setError('Failed to format schema');
    }
  }, [schemaText, onFormat, settings.tabSize]);

  const handleValidate = useCallback(async () => {
    try {
      const parsedSchema = JSON.parse(schemaText);
      await validateSchema(parsedSchema);
      setSuccess('Schema validation completed');
    } catch (err) {
      setError('Failed to validate schema');
    }
  }, [schemaText, validateSchema]);

  const handleExport = useCallback(async (format: string) => {
    try {
      const parsedSchema = JSON.parse(schemaText);
      await onExport?.(parsedSchema, format);
      setSuccess(`Schema exported as ${format.toUpperCase()}`);
    } catch (err) {
      setError('Failed to export schema');
    }
  }, [schemaText, onExport]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const importedSchema = await onImport?.(content);
      if (importedSchema) {
        const formattedText = JSON.stringify(importedSchema, null, settings.tabSize);
        setSchemaText(formattedText);
        setSuccess('Schema imported successfully');
      }
    } catch (err) {
      setError('Failed to import schema');
    }
  }, [onImport, settings.tabSize]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(schemaText);
      setSuccess('Schema copied to clipboard');
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  }, [schemaText]);

  const getErrorIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'info': return <Eye className="w-4 h-4 text-blue-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getErrorColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const renderLineNumbers = () => {
    const lines = schemaText.split('\n');
    return (
      <div className="font-mono text-xs text-gray-500 pr-3 border-r border-gray-200 select-none">
        {lines.map((_, index) => (
          <div key={index} className="text-right">
            {index + 1}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">JSON Schema Editor</h2>
        <p className="text-gray-600">
          Edit, validate, and format JSON schemas with syntax highlighting
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          {/* Toolbar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={isValid ? 'default' : 'destructive'}>
                    {isValid ? 'Valid' : 'Invalid'}
                  </Badge>
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFormat}
                    className="flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Format
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleValidate}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Validate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToClipboard}
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Schema Editor
              </CardTitle>
              <CardDescription>
                Edit your JSON schema with syntax highlighting and validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <div className="flex">
                  {showLineNumbers && renderLineNumbers()}
                  <div className="flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={schemaText}
                      onChange={(e) => handleSchemaChange(e.target.value)}
                      className={`font-mono text-sm border-0 resize-none focus:ring-0 ${
                        wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
                      }`}
                      style={{
                        fontSize: `${settings.fontSize}px`,
                        lineHeight: '1.5',
                        padding: '1rem',
                        minHeight: '400px',
                        backgroundColor: settings.theme === 'dark' ? '#1f2937' : '#ffffff',
                        color: settings.theme === 'dark' ? '#f9fafb' : '#111827',
                      }}
                      placeholder="Enter your JSON schema here..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import/Export */}
          <Card>
            <CardHeader>
              <CardTitle>Import & Export</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Import Schema</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="file"
                      accept=".json,.jsonschema"
                      onChange={handleImport}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1">
                  <Label>Export Schema</Label>
                  <div className="flex gap-2 mt-2">
                    <Select onValueChange={(value) => handleExport(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="yaml">YAML</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                Validation Results
              </CardTitle>
              <CardDescription>
                View validation errors and warnings for your schema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {validationErrors.length === 0 ? (
                <div className="text-center py-8">
                  <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600">No validation errors found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {validationErrors.map((error, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border rounded-lg p-3 ${getErrorColor(error.severity)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getErrorIcon(error.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={error.severity === 'error' ? 'destructive' : 'secondary'}>
                              {error.severity}
                            </Badge>
                            {error.path && (
                              <span className="text-sm font-mono text-gray-600">
                                {error.path}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{error.message}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schema Info */}
          <Card>
            <CardHeader>
              <CardTitle>Schema Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {schemaText.split('\n').length}
                  </div>
                  <div className="text-sm text-gray-600">Lines</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {schemaText.length}
                  </div>
                  <div className="text-sm text-gray-600">Characters</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {validationErrors.filter(e => e.severity === 'error').length}
                  </div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {validationErrors.filter(e => e.severity === 'warning').length}
                  </div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Editor Settings
              </CardTitle>
              <CardDescription>
                Customize the editor appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Appearance Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Appearance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="theme">Theme</Label>
                      <Select
                        value={settings.theme}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, theme: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="font-size">Font Size</Label>
                      <Select
                        value={settings.fontSize.toString()}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, fontSize: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12px</SelectItem>
                          <SelectItem value="14">14px</SelectItem>
                          <SelectItem value="16">16px</SelectItem>
                          <SelectItem value="18">18px</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="tab-size">Tab Size</Label>
                      <Select
                        value={settings.tabSize.toString()}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, tabSize: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 spaces</SelectItem>
                          <SelectItem value="4">4 spaces</SelectItem>
                          <SelectItem value="8">8 spaces</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Editor Options */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Editor Options</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-line-numbers"
                        checked={settings.showLineNumbers}
                        onCheckedChange={(checked) => {
                          setSettings(prev => ({ ...prev, showLineNumbers: !!checked }));
                          setShowLineNumbers(!!checked);
                        }}
                      />
                      <Label htmlFor="show-line-numbers">Show line numbers</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="auto-format"
                        checked={settings.autoFormat}
                        onCheckedChange={(checked) => {
                          setSettings(prev => ({ ...prev, autoFormat: !!checked }));
                          setAutoFormat(!!checked);
                        }}
                      />
                      <Label htmlFor="auto-format">Auto-format on save</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="word-wrap"
                        checked={settings.wordWrap}
                        onCheckedChange={(checked) => {
                          setSettings(prev => ({ ...prev, wordWrap: !!checked }));
                          setWordWrap(!!checked);
                        }}
                      />
                      <Label htmlFor="word-wrap">Word wrap</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="validate-on-change"
                        checked={settings.validateOnChange}
                        onCheckedChange={(checked) => {
                          setSettings(prev => ({ ...prev, validateOnChange: !!checked }));
                        }}
                      />
                      <Label htmlFor="validate-on-change">Validate on change</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 