'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  GitCommit, 
  GitMerge, 
  GitPullRequest,
  History,
  RotateCcw,
  Eye,
  Plus,
  MessageSquare,
  Calendar,
  User,
  Tag,
  ArrowUpDown,
  Check,
  X,
  Loader2,
  AlertCircle,
  Diff,
  FileText,
  Code
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
import { 
  MCP, 
  Version, 
  Commit, 
  DiffResult,
  VersionHistory
} from '@/types';

interface VersionControlProps {
  mcp: MCP;
  versions: Version[];
  onCommit?: (commit: Commit) => void;
  onRevert?: (versionId: string) => void;
  onCompare?: (version1Id: string, version2Id: string) => Promise<DiffResult>;
  onTag?: (versionId: string, tag: string) => void;
}

export const VersionControl: React.FC<VersionControlProps> = ({
  mcp,
  versions,
  onCommit,
  onRevert,
  onCompare,
  onTag,
}) => {
  const [activeTab, setActiveTab] = useState('history');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Commit state
  const [commitMessage, setCommitMessage] = useState('');
  const [commitDescription, setCommitDescription] = useState('');
  const [commitType, setCommitType] = useState<'feature' | 'fix' | 'refactor' | 'docs' | 'style'>('feature');
  
  // Compare state
  const [compareFrom, setCompareFrom] = useState<string>('');
  const [compareTo, setCompareTo] = useState<string>('');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  
  // Tag state
  const [tagName, setTagName] = useState('');
  const [tagDescription, setTagDescription] = useState('');

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const commit: Commit = {
        id: `commit_${Date.now()}`,
        mcpId: mcp.id,
        message: commitMessage,
        description: commitDescription,
        type: commitType,
        author: 'Current User', // In real app, get from auth
        timestamp: new Date(),
        changes: {
          added: [],
          modified: [],
          removed: []
        }
      };

      await onCommit?.(commit);
      setSuccess('Changes committed successfully');
      setCommitMessage('');
      setCommitDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit changes');
    } finally {
      setIsLoading(false);
    }
  }, [commitMessage, commitDescription, commitType, mcp.id, onCommit]);

  const handleRevert = useCallback(async (versionId: string) => {
    if (!confirm('Are you sure you want to revert to this version? This will create a new version with the old content.')) return;

    setIsLoading(true);
    setError(null);

    try {
      await onRevert?.(versionId);
      setSuccess('Successfully reverted to selected version');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revert version');
    } finally {
      setIsLoading(false);
    }
  }, [onRevert]);

  const handleCompare = useCallback(async () => {
    if (!compareFrom || !compareTo || compareFrom === compareTo) return;

    setIsComparing(true);
    setError(null);

    try {
      const result = await onCompare?.(compareFrom, compareTo);
      setDiffResult(result || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare versions');
    } finally {
      setIsComparing(false);
    }
  }, [compareFrom, compareTo, onCompare]);

  const handleTag = useCallback(async (versionId: string) => {
    if (!tagName.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await onTag?.(versionId, tagName);
      setSuccess(`Tag '${tagName}' created successfully`);
      setTagName('');
      setTagDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setIsLoading(false);
    }
  }, [tagName, onTag]);

  const getCommitTypeIcon = (type: string) => {
    switch (type) {
      case 'feature': return <Plus className="w-4 h-4" />;
      case 'fix': return <Check className="w-4 h-4" />;
      case 'refactor': return <Code className="w-4 h-4" />;
      case 'docs': return <FileText className="w-4 h-4" />;
      case 'style': return <MessageSquare className="w-4 h-4" />;
      default: return <GitCommit className="w-4 h-4" />;
    }
  };

  const getCommitTypeColor = (type: string) => {
    switch (type) {
      case 'feature': return 'bg-green-100 text-green-800 border-green-200';
      case 'fix': return 'bg-red-100 text-red-800 border-red-200';
      case 'refactor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'docs': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'style': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDiff = (diff: string) => {
    return diff.split('\n').map((line, index) => {
      if (line.startsWith('+')) {
        return <div key={index} className="text-green-600 bg-green-50 p-1">{line}</div>;
      } else if (line.startsWith('-')) {
        return <div key={index} className="text-red-600 bg-red-50 p-1">{line}</div>;
      } else {
        return <div key={index} className="text-gray-600 p-1">{line}</div>;
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Version Control</h2>
        <p className="text-gray-600">
          Track changes, manage versions, and compare different iterations of your MCP
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="commit">Commit</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-6">
          {/* Version History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Version History
              </CardTitle>
              <CardDescription>
                View all versions and changes of your MCP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {versions.map((version, index) => (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <GitCommit className="w-4 h-4 text-gray-500" />
                          <span className="font-mono text-sm text-gray-600">
                            {version.commitId.substring(0, 8)}
                          </span>
                          {version.commit && (
                            <Badge className={getCommitTypeColor(version.commit.type)}>
                              {getCommitTypeIcon(version.commit.type)}
                              {version.commit.type}
                            </Badge>
                          )}
                          {version.isLatest && (
                            <Badge variant="outline">Latest</Badge>
                          )}
                        </div>
                        
                        {version.commit && (
                          <div className="mb-2">
                            <p className="font-medium">{version.commit.message}</p>
                            {version.commit.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {version.commit.description}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.commit?.author || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {version.timestamp.toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            v{version.version}
                          </span>
                        </div>
                        
                        {version.tags && version.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {version.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCompareFrom(version.id)}
                          disabled={isLoading}
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        {!version.isLatest && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevert(version.id)}
                            disabled={isLoading}
                          >
                            <RotateCcw className="w-4 h-4" />
                            Revert
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCommit className="w-5 h-5" />
                Commit Changes
              </CardTitle>
              <CardDescription>
                Create a new version with your current changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="commit-type">Commit Type</Label>
                  <Select value={commitType} onValueChange={(value) => setCommitType(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Feature
                        </div>
                      </SelectItem>
                      <SelectItem value="fix">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Fix
                        </div>
                      </SelectItem>
                      <SelectItem value="refactor">
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4" />
                          Refactor
                        </div>
                      </SelectItem>
                      <SelectItem value="docs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Documentation
                        </div>
                      </SelectItem>
                      <SelectItem value="style">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Style
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="commit-message">Commit Message</Label>
                  <Input
                    id="commit-message"
                    placeholder="Brief description of changes..."
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="commit-description">Description (Optional)</Label>
                  <Textarea
                    id="commit-description"
                    placeholder="Detailed description of changes..."
                    value={commitDescription}
                    onChange={(e) => setCommitDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleCommit}
                  disabled={!commitMessage.trim() || isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <GitCommit className="w-4 h-4" />
                  )}
                  {isLoading ? 'Committing...' : 'Commit Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Diff className="w-5 h-5" />
                Compare Versions
              </CardTitle>
              <CardDescription>
                Compare two versions to see differences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="compare-from">From Version</Label>
                    <Select value={compareFrom} onValueChange={setCompareFrom}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((version) => (
                          <SelectItem key={version.id} value={version.id}>
                            v{version.version} - {version.commit?.message || 'No message'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="compare-to">To Version</Label>
                    <Select value={compareTo} onValueChange={setCompareTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((version) => (
                          <SelectItem key={version.id} value={version.id}>
                            v{version.version} - {version.commit?.message || 'No message'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleCompare}
                  disabled={!compareFrom || !compareTo || compareFrom === compareTo || isComparing}
                  className="flex items-center gap-2"
                >
                  {isComparing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUpDown className="w-4 h-4" />
                  )}
                  {isComparing ? 'Comparing...' : 'Compare Versions'}
                </Button>

                {diffResult && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Differences</h3>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                      <pre className="text-sm font-mono">
                        {formatDiff(diffResult.diff)}
                      </pre>
                    </div>
                    <div className="mt-4 flex gap-4 text-sm text-gray-600">
                      <span>Added: {diffResult.stats.added}</span>
                      <span>Modified: {diffResult.stats.modified}</span>
                      <span>Removed: {diffResult.stats.removed}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Manage Tags
              </CardTitle>
              <CardDescription>
                Create and manage version tags for important releases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tag-version">Select Version</Label>
                  <Select value={compareFrom} onValueChange={setCompareFrom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version to tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          v{version.version} - {version.commit?.message || 'No message'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tag-name">Tag Name</Label>
                  <Input
                    id="tag-name"
                    placeholder="e.g., v1.0.0, release-2024-01"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="tag-description">Tag Description (Optional)</Label>
                  <Textarea
                    id="tag-description"
                    placeholder="Description of this tagged version..."
                    value={tagDescription}
                    onChange={(e) => setTagDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button
                  onClick={() => handleTag(compareFrom)}
                  disabled={!compareFrom || !tagName.trim() || isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Tag className="w-4 h-4" />
                  )}
                  {isLoading ? 'Creating Tag...' : 'Create Tag'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {versions
                  .filter(version => version.tags && version.tags.length > 0)
                  .map((version) => (
                    <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">v{version.version}</p>
                        <p className="text-sm text-gray-600">
                          {version.commit?.message || 'No message'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {version.tags?.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 