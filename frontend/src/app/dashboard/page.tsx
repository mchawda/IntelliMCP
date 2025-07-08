'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  Search, 
  Filter,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  Share2,
  Calendar,
  Clock,
  Star,
  Activity,
  Zap,
  Target,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Upload,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MCP, 
  MCPStatus
} from '@/types';

// Define missing types
interface DashboardStats {
  totalMCPs: number;
  activeMCPs: number;
  teamMembers: number;
  monthlyGrowth: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  user: string;
  details?: string;
}

interface DashboardProps {
  mcps?: MCP[];
  stats?: DashboardStats;
  recentActivity?: RecentActivity[];
  onMCPSelect?: (mcp: MCP) => void;
  onMCPCreate?: () => void;
  onMCPEdit?: (mcp: MCP) => void;
  onMCPDelete?: (mcpId: string) => void;
  onMCPExport?: (mcp: MCP) => void;
  onMCPShare?: (mcp: MCP) => void;
}

export default function Dashboard({
  mcps = [],
  stats = {
    totalMCPs: 0,
    activeMCPs: 0,
    teamMembers: 0,
    monthlyGrowth: 0
  },
  recentActivity = [],
  onMCPSelect,
  onMCPCreate,
  onMCPEdit,
  onMCPDelete,
  onMCPExport,
  onMCPShare,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<MCPStatus | 'all'>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt' | 'status'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedMCP, setSelectedMCP] = useState<MCP | null>(null);

  // Filter and sort MCPs with null check
  const filteredMCPs = (mcps || [])
    .filter(mcp => {
      const matchesSearch = mcp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          mcp.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || mcp.status === selectedStatus;
      const matchesDomain = selectedDomain === 'all' || mcp.domain === selectedDomain;
      return matchesSearch && matchesStatus && matchesDomain;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'updatedAt':
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.updatedAt;
          bValue = b.updatedAt;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStatusIcon = (status: MCPStatus) => {
    switch (status) {
      case 'published': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'draft': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'archived': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: MCPStatus) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'intermediate': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'advanced': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleMCPAction = useCallback((action: string, mcp: MCP) => {
    switch (action) {
      case 'view':
        onMCPSelect?.(mcp);
        break;
      case 'edit':
        onMCPEdit?.(mcp);
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this MCP?')) {
          onMCPDelete?.(mcp.id);
        }
        break;
      case 'export':
        onMCPExport?.(mcp);
        break;
      case 'share':
        onMCPShare?.(mcp);
        break;
    }
  }, [onMCPSelect, onMCPEdit, onMCPDelete, onMCPExport, onMCPShare]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Manage and monitor your MCPs</p>
        </div>
        <Button onClick={onMCPCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create MCP
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mcps">MCPs</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total MCPs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalMCPs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Published MCPs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeMCPs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Team Members</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.teamMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.monthlyGrowth}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto p-4">
                  <Plus className="w-6 h-6" />
                  <span>Create MCP</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto p-4">
                  <Upload className="w-6 h-6" />
                  <span>Import MCP</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto p-4">
                  <BarChart3 className="w-6 h-6" />
                  <span>View Analytics</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto p-4">
                  <Settings className="w-6 h-6" />
                  <span>Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcps" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search MCPs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Domains</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="createdAt">Created</SelectItem>
                    <SelectItem value="updatedAt">Updated</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* MCPs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMCPs.map((mcp) => (
              <motion.div
                key={mcp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{mcp.name}</CardTitle>
                        <p className="text-sm text-gray-600 line-clamp-2">{mcp.description}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMCPAction('view', mcp)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMCPAction('edit', mcp)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMCPAction('export', mcp)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMCPAction('share', mcp)}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(mcp.status)}
                        <Badge className={getStatusColor(mcp.status)}>
                          {mcp.status}
                        </Badge>
                        {mcp.metadata?.complexity && (
                          <Badge className={getComplexityColor(mcp.metadata.complexity)}>
                            {mcp.metadata.complexity}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>v{mcp.version}</span>
                        <span>{formatDate(mcp.updatedAt)}</span>
                      </div>
                      
                      {mcp.tags && mcp.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {mcp.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {mcp.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{mcp.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredMCPs.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No MCPs Found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedStatus !== 'all' || selectedDomain !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first MCP to get started'}
                </p>
                <Button onClick={onMCPCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create MCP
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Activity className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-gray-600">{formatDate(activity.timestamp)}</p>
                      {activity.details && (
                        <p className="text-sm text-gray-500 mt-1">{activity.details}</p>
                      )}
                    </div>
                    <Badge variant="outline">{activity.type}</Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 