'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  Settings, 
  Crown, 
  Shield, 
  User, 
  Eye,
  Mail,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Team, TeamMember, TeamRole, Permission } from '@/types';

interface TeamManagementProps {
  team?: Team;
  onTeamUpdate?: (team: Team) => void;
  onMemberInvite?: (email: string, role: TeamRole) => void;
  onMemberRemove?: (memberId: string) => void;
  onMemberRoleChange?: (memberId: string, role: TeamRole) => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({
  team,
  onTeamUpdate,
  onMemberInvite,
  onMemberRemove,
  onMemberRoleChange
}) => {
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const roleOptions = [
    { value: 'owner', label: 'Owner', icon: Crown, description: 'Full control over team and settings' },
    { value: 'admin', label: 'Admin', icon: Shield, description: 'Manage team members and MCPs' },
    { value: 'member', label: 'Member', icon: User, description: 'Create and edit MCPs' },
    { value: 'viewer', label: 'Viewer', icon: Eye, description: 'View-only access to MCPs' },
  ];

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      setError('Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    setError(null);

    try {
      await onMemberInvite?.(inviteEmail, inviteRole);
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('member');
    } catch (error) {
      setError(`Failed to send invitation: ${error}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      try {
        await onMemberRemove?.(memberId);
        setSuccess('Member removed successfully');
      } catch (error) {
        setError(`Failed to remove member: ${error}`);
      }
    }
  };

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    try {
      await onMemberRoleChange?.(memberId, newRole);
      setSuccess('Member role updated successfully');
    } catch (error) {
      setError(`Failed to update role: ${error}`);
    }
  };

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'member': return <User className="w-4 h-4" />;
      case 'viewer': return <Eye className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: TeamRole) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'member': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const MemberCard = ({ member }: { member: TeamMember }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <Mail className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h4 className="font-medium">{member.email}</h4>
            <p className="text-sm text-gray-600">
              Joined {member.joinedAt.toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`${getRoleColor(member.role)}`}
          >
            <div className="flex items-center gap-1">
              {getRoleIcon(member.role)}
              {member.role}
            </div>
          </Badge>
          
          <Select
            value={member.role}
            onValueChange={(value) => handleRoleChange(member.id, value as TeamRole)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  <div className="flex items-center gap-2">
                    <role.icon className="w-4 h-4" />
                    {role.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveMember(member.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const InviteForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Invite Team Member
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="Enter email address..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as TeamRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center gap-2">
                      <role.icon className="w-4 h-4" />
                      {role.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={handleInviteMember}
            disabled={isInviting || !inviteEmail.trim()}
            className="w-full"
          >
            {isInviting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const TeamSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Team Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={team?.name || ''}
              onChange={(e) => onTeamUpdate?.({ ...team!, name: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="team-description">Description</Label>
            <textarea
              id="team-description"
              className="w-full p-3 border rounded-lg"
              rows={3}
              value={team?.description || ''}
              onChange={(e) => onTeamUpdate?.({ ...team!, description: e.target.value })}
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allow-public-sharing"
                checked={team?.settings.allowPublicSharing || false}
                onChange={(e) => onTeamUpdate?.({
                  ...team!,
                  settings: { ...team!.settings, allowPublicSharing: e.target.checked }
                })}
              />
              <Label htmlFor="allow-public-sharing">Allow public sharing of MCPs</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="require-approval"
                checked={team?.settings.requireApproval || false}
                onChange={(e) => onTeamUpdate?.({
                  ...team!,
                  settings: { ...team!.settings, requireApproval: e.target.checked }
                })}
              />
              <Label htmlFor="require-approval">Require approval for MCP changes</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const RolePermissions = () => (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {roleOptions.map((role) => (
            <div key={role.value} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <role.icon className="w-5 h-5 text-gray-600" />
                <h4 className="font-medium">{role.label}</h4>
                <Badge variant="outline" className={getRoleColor(role.value as TeamRole)}>
                  {role.value}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{role.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (!team) {
    return (
      <div className="text-center space-y-4">
        <Users className="w-12 h-12 text-gray-400 mx-auto" />
        <h3 className="text-lg font-medium">No Team Selected</h3>
        <p className="text-gray-600">Select a team to manage its members and settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {team.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">{team.description}</p>
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                {team.members.length} members
              </Badge>
              <Badge variant="outline">
                Created {team.createdAt.toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {team.members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite Form */}
      <InviteForm />

      {/* Team Settings */}
      <TeamSettings />

      {/* Role Permissions */}
      <RolePermissions />
    </div>
  );
};

export default TeamManagement; 