'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Settings, 
  Crown, 
  Shield, 
  User, 
  Mail, 
  Phone,
  Calendar,
  Edit,
  Trash2,
  MoreVertical,
  Check,
  X,
  Loader2,
  AlertCircle,
  Plus,
  Search,
  Filter
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
  Team, 
  TeamMember, 
  TeamRole, 
  TeamInvitation, 
  TeamSettings,
  TeamPermission
} from '@/types';

interface TeamManagementProps {
  team: Team;
  onTeamUpdate?: (team: Team) => void;
  onMemberAdd?: (member: TeamMember) => void;
  onMemberRemove?: (memberId: string) => void;
  onMemberUpdate?: (memberId: string, updates: Partial<TeamMember>) => void;
  onInvitationSend?: (invitation: TeamInvitation) => void;
  onSettingsUpdate?: (settings: TeamSettings) => void;
}

const TEAM_ROLES: { value: TeamRole; label: string; icon: React.ReactNode; description: string; permissions: TeamPermission[] }[] = [
  {
    value: 'owner',
    label: 'Owner',
    icon: <Crown className="w-4 h-4" />,
    description: 'Full control over team and all MCPs',
    permissions: ['manage_team', 'manage_members', 'manage_mcps', 'view_analytics', 'export_data']
  },
  {
    value: 'admin',
    label: 'Admin',
    icon: <Shield className="w-4 h-4" />,
    description: 'Can manage team members and MCPs',
    permissions: ['manage_members', 'manage_mcps', 'view_analytics', 'export_data']
  },
  {
    value: 'editor',
    label: 'Editor',
    icon: <Edit className="w-4 h-4" />,
    description: 'Can create and edit MCPs',
    permissions: ['manage_mcps', 'view_analytics']
  },
  {
    value: 'viewer',
    label: 'Viewer',
    icon: <User className="w-4 h-4" />,
    description: 'Can view MCPs and basic analytics',
    permissions: ['view_mcps', 'view_analytics']
  }
];

export const TeamManagement: React.FC<TeamManagementProps> = ({
  team,
  onTeamUpdate,
  onMemberAdd,
  onMemberRemove,
  onMemberUpdate,
  onInvitationSend,
  onSettingsUpdate,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<TeamRole>('viewer');

  // Invitation state
  const [invitationEmail, setInvitationEmail] = useState('');
  const [invitationRole, setInvitationRole] = useState<TeamRole>('viewer');
  const [invitationMessage, setInvitationMessage] = useState('');

  // Settings state
  const [settings, setSettings] = useState<TeamSettings>(team.settings || {
    allowPublicMCPs: false,
    requireApproval: true,
    maxMembers: 50,
    defaultRole: 'viewer',
    notifications: {
      memberJoined: true,
      memberLeft: true,
      mcpCreated: true,
      mcpUpdated: true,
    }
  });

  const handleSendInvitation = useCallback(async () => {
    if (!invitationEmail.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const invitation: TeamInvitation = {
        id: `invitation_${Date.now()}`,
        teamId: team.id,
        email: invitationEmail,
        role: invitationRole,
        message: invitationMessage,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      await onInvitationSend?.(invitation);
      setSuccess('Invitation sent successfully');
      setInvitationEmail('');
      setInvitationMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  }, [invitationEmail, invitationRole, invitationMessage, team.id, onInvitationSend]);

  const handleMemberRoleUpdate = useCallback(async (memberId: string, newRole: TeamRole) => {
    setIsLoading(true);
    setError(null);

    try {
      await onMemberUpdate?.(memberId, { role: newRole });
      setSuccess('Member role updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role');
    } finally {
      setIsLoading(false);
    }
  }, [onMemberUpdate]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;

    setIsLoading(true);
    setError(null);

    try {
      await onMemberRemove?.(memberId);
      setSuccess('Member removed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setIsLoading(false);
    }
  }, [onMemberRemove]);

  const handleSettingsUpdate = useCallback(async (updates: Partial<TeamSettings>) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedSettings = { ...settings, ...updates };
      setSettings(updatedSettings);
      await onSettingsUpdate?.(updatedSettings);
      setSuccess('Settings updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  }, [settings, onSettingsUpdate]);

  const filteredMembers = team.members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: TeamRole) => {
    const roleConfig = TEAM_ROLES.find(r => r.value === role);
    return roleConfig?.icon || <User className="w-4 h-4" />;
  };

  const getRoleColor = (role: TeamRole) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'editor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h2>
        <p className="text-gray-600">
          Manage your team members, roles, and settings
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
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Team Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Total Members</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{team.members.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Owners</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {team.members.filter(m => m.role === 'owner').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  <span className="font-medium">Admins</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {team.members.filter(m => m.role === 'admin').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Created</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {team.createdAt.toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Info */}
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Team Name</Label>
                  <p className="text-lg">{team.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-gray-600">{team.description}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm text-gray-600">{team.createdAt.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Updated</Label>
                    <p className="text-sm text-gray-600">{team.updatedAt.toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {team.recentActivity?.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.timestamp.toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          {/* Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage team members and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as TeamRole)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {TEAM_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                {filteredMembers.map((member) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full" />
                        ) : (
                          <User className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getRoleIcon(member.role)}
                          <Badge className={getRoleColor(member.role)}>
                            {member.role}
                          </Badge>
                          {member.joinedAt && (
                            <span className="text-xs text-gray-500">
                              Joined {member.joinedAt.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleMemberRoleUpdate(member.id, value as TeamRole)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEAM_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={isLoading || member.role === 'owner'}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Invitation</CardTitle>
              <CardDescription>
                Invite new members to join your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="invitation-email">Email Address</Label>
                  <Input
                    id="invitation-email"
                    type="email"
                    placeholder="Enter email address"
                    value={invitationEmail}
                    onChange={(e) => setInvitationEmail(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="invitation-role">Role</Label>
                  <Select value={invitationRole} onValueChange={(value) => setInvitationRole(value as TeamRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            {role.icon}
                            <div>
                              <div className="font-medium">{role.label}</div>
                              <div className="text-sm text-gray-500">{role.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="invitation-message">Personal Message (Optional)</Label>
                  <Textarea
                    id="invitation-message"
                    placeholder="Add a personal message to your invitation..."
                    value={invitationMessage}
                    onChange={(e) => setInvitationMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSendInvitation}
                  disabled={!invitationEmail.trim() || isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {isLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {team.invitations && team.invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.invitations
                    .filter(inv => inv.status === 'pending')
                    .map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getRoleColor(invitation.role)}>
                              {invitation.role}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Sent {invitation.createdAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Pending</Badge>
                          <Button variant="ghost" size="sm">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Settings</CardTitle>
              <CardDescription>
                Configure team preferences and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* General Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Allow Public MCPs</Label>
                        <p className="text-sm text-gray-600">Allow team members to create public MCPs</p>
                      </div>
                      <Checkbox
                        checked={settings.allowPublicMCPs}
                        onCheckedChange={(checked) =>
                          handleSettingsUpdate({ allowPublicMCPs: !!checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Require Approval</Label>
                        <p className="text-sm text-gray-600">Require admin approval for new MCPs</p>
                      </div>
                      <Checkbox
                        checked={settings.requireApproval}
                        onCheckedChange={(checked) =>
                          handleSettingsUpdate({ requireApproval: !!checked })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="max-members">Maximum Members</Label>
                      <Input
                        id="max-members"
                        type="number"
                        value={settings.maxMembers}
                        onChange={(e) =>
                          handleSettingsUpdate({ maxMembers: parseInt(e.target.value) })
                        }
                        className="w-32"
                      />
                    </div>

                    <div>
                      <Label htmlFor="default-role">Default Role for New Members</Label>
                      <Select
                        value={settings.defaultRole}
                        onValueChange={(value) =>
                          handleSettingsUpdate({ defaultRole: value as TeamRole })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEAM_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Member Joined</Label>
                        <p className="text-sm text-gray-600">Notify when new members join</p>
                      </div>
                      <Checkbox
                        checked={settings.notifications.memberJoined}
                        onCheckedChange={(checked) =>
                          handleSettingsUpdate({
                            notifications: { ...settings.notifications, memberJoined: !!checked }
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Member Left</Label>
                        <p className="text-sm text-gray-600">Notify when members leave</p>
                      </div>
                      <Checkbox
                        checked={settings.notifications.memberLeft}
                        onCheckedChange={(checked) =>
                          handleSettingsUpdate({
                            notifications: { ...settings.notifications, memberLeft: !!checked }
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">MCP Created</Label>
                        <p className="text-sm text-gray-600">Notify when new MCPs are created</p>
                      </div>
                      <Checkbox
                        checked={settings.notifications.mcpCreated}
                        onCheckedChange={(checked) =>
                          handleSettingsUpdate({
                            notifications: { ...settings.notifications, mcpCreated: !!checked }
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">MCP Updated</Label>
                        <p className="text-sm text-gray-600">Notify when MCPs are updated</p>
                      </div>
                      <Checkbox
                        checked={settings.notifications.mcpUpdated}
                        onCheckedChange={(checked) =>
                          handleSettingsUpdate({
                            notifications: { ...settings.notifications, mcpUpdated: !!checked }
                          })
                        }
                      />
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