'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Code, 
  CheckCircle, 
  AlertCircle, 
  Format, 
  Save,
  Undo,
  Redo,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

interface SchemaEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  onValidate?: (value: string) => boolean;
  placeholder?: string;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  showLineNumbers?: boolean;
  showMinimap?: boolean;
  fontSize?: number;
}

const SchemaEditor: React.FC<SchemaEditorProps> = ({
  value,
  onChange,
  onSave,
  onValidate,
  placeholder = 'Enter JSON schema...',
  readOnly = false,
  theme = 'light',
  showLineNumbers = true,
  showMinimap = false,
  fontSize = 14
}) => {
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormatted, setIsFormatted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const validateJSON = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch (error) {
      return false;
    }
  };

  const formatJSON = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    
    // Validate JSON
    const valid = validateJSON(newValue);
    setIsValid(valid);
    
    if (!valid) {
      try {
        JSON.parse(newValue);
      } catch (error: any) {
        setError(error.message);
      }
    } else {
      setError(null);
    }
    
    onChange(newValue);
  };

  const handleFormat = () => {
    const formatted = formatJSON(localValue);
    setLocalValue(formatted);
    setIsFormatted(true);
    onChange(formatted);
    
    setTimeout(() => setIsFormatted(false), 2000);
  };

  const handleSave = () => {
    if (isValid) {
      onSave?.(localValue);
    }
  };

  const handleUndo = () => {
    // In a real implementation, you'd use a proper undo/redo system
    console.log('Undo');
  };

  const handleRedo = () => {
    // In a real implementation, you'd use a proper undo/redo system
    console.log('Redo');
  };

  const getLineNumbers = (text: string) => {
    const lines = text.split('\n');
    return lines.map((_, index) => index + 1).join('\n');
  };

  const highlightSyntax = (text: string) => {
    // Simple syntax highlighting - in a real app, you'd use a proper library
    return text
      .replace(/"([^"]+)":/g, '<span class="text-blue-600">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="text-green-600">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="text-purple-600">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="text-orange-600">$1</span>')
      .replace(/(\{|\}|\[|\]|,)/g, '<span class="text-gray-600">$1</span>');
  };

  const renderCode = () => {
    const lines = localValue.split('\n');
    const lineNumbers = getLineNumbers(localValue);
    const highlightedCode = highlightSyntax(localValue);

    return (
      <div className="relative">
        {showLineNumbers && (
          <div className="absolute left-0 top-0 w-12 bg-gray-100 text-gray-500 text-xs font-mono p-2 select-none">
            <pre className="whitespace-pre">{lineNumbers}</pre>
          </div>
        )}
        <div 
          className={`font-mono text-sm ${showLineNumbers ? 'pl-12' : ''}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          <pre 
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isValid ? "default" : "destructive"}>
            {isValid ? "Valid JSON" : "Invalid JSON"}
          </Badge>
          {isFormatted && (
            <Badge variant="secondary">
              <CheckCircle className="w-3 h-3 mr-1" />
              Formatted
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={readOnly}
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={readOnly}
          >
            <Redo className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFormat}
            disabled={readOnly}
          >
            <Format className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
          {onSave && (
            <Button
              onClick={handleSave}
              disabled={!isValid || readOnly}
              size="sm"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border rounded-lg p-4 bg-gray-50"
        >
          <h4 className="font-medium mb-3">Editor Settings</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Theme</label>
              <select 
                className="w-full p-2 border rounded text-sm"
                value={theme}
                onChange={(e) => console.log('Theme changed:', e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Font Size</label>
              <input
                type="range"
                min="10"
                max="20"
                value={fontSize}
                onChange={(e) => console.log('Font size changed:', e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Line Numbers</label>
              <input
                type="checkbox"
                checked={showLineNumbers}
                onChange={(e) => console.log('Line numbers changed:', e.target.checked)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Minimap</label>
              <input
                type="checkbox"
                checked={showMinimap}
                onChange={(e) => console.log('Minimap changed:', e.target.checked)}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            JSON Schema Editor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Schema</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {localValue.split('\n').length} lines
                  </span>
                  <span className="text-xs text-gray-500">
                    {localValue.length} characters
                  </span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              {readOnly ? (
                <div className="p-4 bg-gray-50">
                  {renderCode()}
                </div>
              ) : (
                <textarea
                  value={localValue}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder={placeholder}
                  className={`w-full p-4 font-mono text-sm resize-none focus:outline-none ${
                    theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'
                  }`}
                  style={{ 
                    fontSize: `${fontSize}px`,
                    minHeight: '400px',
                    lineHeight: '1.5'
                  }}
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Minimap */}
      {showMinimap && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Minimap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded p-2 bg-gray-50 max-h-32 overflow-auto">
              <pre className="text-xs font-mono text-gray-600">
                {localValue}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SchemaEditor; 