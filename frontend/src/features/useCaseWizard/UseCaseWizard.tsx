'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Upload, Link, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Domain, WizardData, Constraint, Context } from '@/types';

interface UseCaseWizardProps {
  onComplete: (data: WizardData) => void;
  onCancel: () => void;
}

const DOMAINS: { value: Domain; label: string; description: string; icon: string }[] = [
  { value: 'business', label: 'Business', description: 'Business processes, strategy, and operations', icon: '🏢' },
  { value: 'healthcare', label: 'Healthcare', description: 'Medical, clinical, and patient care', icon: '🏥' },
  { value: 'technology', label: 'Technology', description: 'Software, IT, and technical systems', icon: '💻' },
  { value: 'finance', label: 'Finance', description: 'Banking, investment, and financial services', icon: '💰' },
  { value: 'education', label: 'Education', description: 'Learning, training, and academic processes', icon: '🎓' },
  { value: 'legal', label: 'Legal', description: 'Legal processes, compliance, and regulations', icon: '⚖️' },
  { value: 'marketing', label: 'Marketing', description: 'Marketing, advertising, and customer engagement', icon: '📢' },
  { value: 'sales', label: 'Sales', description: 'Sales processes and customer acquisition', icon: '📈' },
  { value: 'customer-service', label: 'Customer Service', description: 'Support and customer experience', icon: '🎧' },
  { value: 'research', label: 'Research', description: 'Research, analysis, and data processing', icon: '🔬' },
  { value: 'other', label: 'Other', description: 'Other domains and use cases', icon: '📋' },
];

const CONSTRAINT_TYPES = [
  { value: 'technical', label: 'Technical', description: 'Technical limitations and requirements' },
  { value: 'business', label: 'Business', description: 'Business rules and processes' },
  { value: 'compliance', label: 'Compliance', description: 'Regulatory and compliance requirements' },
  { value: 'security', label: 'Security', description: 'Security and privacy requirements' },
];

export const UseCaseWizard: React.FC<UseCaseWizardProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({
    domain: 'business',
    goal: { primary: '', secondary: '' },
    userRole: { primary: '', additional: [] },
    constraints: [],
    context: [],
    review: { confirmed: false, notes: '' },
  });

  const steps = [
    { id: 0, title: 'Domain Selection', description: 'Choose your primary domain' },
    { id: 1, title: 'Goal Definition', description: 'Define your primary and secondary goals' },
    { id: 2, title: 'User Role', description: 'Define the user role and responsibilities' },
    { id: 3, title: 'Constraints', description: 'Add any constraints or requirements' },
    { id: 4, title: 'Context Ingestion', description: 'Upload or provide context information' },
    { id: 5, title: 'Review & Confirm', description: 'Review and confirm your selections' },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    onComplete(wizardData);
  }, [wizardData, onComplete]);

  const addConstraint = useCallback(() => {
    const newConstraint: Constraint = {
      id: `constraint_${Date.now()}`,
      type: 'technical',
      description: '',
      severity: 'medium',
      enforced: true,
    };
    updateWizardData({ constraints: [...wizardData.constraints, newConstraint] });
  }, [wizardData.constraints, updateWizardData]);

  const updateConstraint = useCallback((index: number, updates: Partial<Constraint>) => {
    const updatedConstraints = [...wizardData.constraints];
    updatedConstraints[index] = { ...updatedConstraints[index], ...updates };
    updateWizardData({ constraints: updatedConstraints });
  }, [wizardData.constraints, updateWizardData]);

  const removeConstraint = useCallback((index: number) => {
    const updatedConstraints = wizardData.constraints.filter((_, i) => i !== index);
    updateWizardData({ constraints: updatedConstraints });
  }, [wizardData.constraints, updateWizardData]);

  const addContext = useCallback((context: Context) => {
    updateWizardData({ context: [...wizardData.context, context] });
  }, [wizardData.context, updateWizardData]);

  const removeContext = useCallback((index: number) => {
    const updatedContext = wizardData.context.filter((_, i) => i !== index);
    updateWizardData({ context: updatedContext });
  }, [wizardData.context, updateWizardData]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <DomainSelectionStep data={wizardData} onUpdate={updateWizardData} />;
      case 1:
        return <GoalDefinitionStep data={wizardData} onUpdate={updateWizardData} />;
      case 2:
        return <UserRoleStep data={wizardData} onUpdate={updateWizardData} />;
      case 3:
        return (
          <ConstraintsStep
            data={wizardData}
            onUpdate={updateWizardData}
            onAddConstraint={addConstraint}
            onUpdateConstraint={updateConstraint}
            onRemoveConstraint={removeConstraint}
          />
        );
      case 4:
        return (
          <ContextIngestionStep
            data={wizardData}
            onAddContext={addContext}
            onRemoveContext={removeContext}
          />
        );
      case 5:
        return <ReviewStep data={wizardData} onUpdate={updateWizardData} />;
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return wizardData.domain !== '';
      case 1:
        return wizardData.goal.primary.trim() !== '';
      case 2:
        return wizardData.userRole.primary.trim() !== '';
      case 3:
        return true; // Constraints are optional
      case 4:
        return true; // Context is optional
      case 5:
        return wizardData.review.confirmed;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MCP Use Case Wizard</h1>
          <p className="text-gray-600">Create a comprehensive Model Context Protocol in 6 simple steps</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                    index <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className="text-xs text-center max-w-20">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleComplete}
                disabled={!canProceed()}
                className="flex items-center gap-2"
              >
                Complete
                <Check className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
const DomainSelectionStep: React.FC<{
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Select your primary domain</Label>
        <p className="text-sm text-gray-600 mt-1">
          Choose the domain that best represents your use case
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOMAINS.map((domain) => (
          <Card
            key={domain.value}
            className={`cursor-pointer transition-all hover:shadow-md ${
              data.domain === domain.value
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onUpdate({ domain: domain.value })}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{domain.icon}</span>
                <div>
                  <h3 className="font-medium">{domain.label}</h3>
                  <p className="text-sm text-gray-600">{domain.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const GoalDefinitionStep: React.FC<{
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="primary-goal" className="text-base font-medium">
          Primary Goal
        </Label>
        <Textarea
          id="primary-goal"
          placeholder="Describe your main objective..."
          value={data.goal.primary}
          onChange={(e) => onUpdate({ goal: { ...data.goal, primary: e.target.value } })}
          className="mt-2"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="secondary-goal" className="text-base font-medium">
          Secondary Goal (Optional)
        </Label>
        <Textarea
          id="secondary-goal"
          placeholder="Describe any additional objectives..."
          value={data.goal.secondary}
          onChange={(e) => onUpdate({ goal: { ...data.goal, secondary: e.target.value } })}
          className="mt-2"
          rows={2}
        />
      </div>
    </div>
  );
};

const UserRoleStep: React.FC<{
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}> = ({ data, onUpdate }) => {
  const [additionalRole, setAdditionalRole] = useState('');

  const addAdditionalRole = () => {
    if (additionalRole.trim() && !data.userRole.additional.includes(additionalRole.trim())) {
      onUpdate({
        userRole: {
          ...data.userRole,
          additional: [...data.userRole.additional, additionalRole.trim()],
        },
      });
      setAdditionalRole('');
    }
  };

  const removeAdditionalRole = (role: string) => {
    onUpdate({
      userRole: {
        ...data.userRole,
        additional: data.userRole.additional.filter((r) => r !== role),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="primary-role" className="text-base font-medium">
          Primary User Role
        </Label>
        <Input
          id="primary-role"
          placeholder="e.g., Business Analyst, Developer, Manager..."
          value={data.userRole.primary}
          onChange={(e) => onUpdate({ userRole: { ...data.userRole, primary: e.target.value } })}
          className="mt-2"
        />
      </div>

      <div>
        <Label className="text-base font-medium">Additional Roles (Optional)</Label>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Add additional role..."
            value={additionalRole}
            onChange={(e) => setAdditionalRole(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addAdditionalRole()}
          />
          <Button onClick={addAdditionalRole} variant="outline">
            Add
          </Button>
        </div>

        {data.userRole.additional.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {data.userRole.additional.map((role) => (
              <Badge key={role} variant="secondary" className="cursor-pointer">
                {role}
                <button
                  onClick={() => removeAdditionalRole(role)}
                  className="ml-1 hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ConstraintsStep: React.FC<{
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onAddConstraint: () => void;
  onUpdateConstraint: (index: number, updates: Partial<Constraint>) => void;
  onRemoveConstraint: (index: number) => void;
}> = ({ data, onAddConstraint, onUpdateConstraint, onRemoveConstraint }) => {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Constraints & Requirements</Label>
        <p className="text-sm text-gray-600 mt-1">
          Add any technical, business, compliance, or security constraints
        </p>
      </div>

      {data.constraints.map((constraint, index) => (
        <Card key={constraint.id} className="p-4">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={constraint.type}
                      onValueChange={(value) =>
                        onUpdateConstraint(index, { type: value as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONSTRAINT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Severity</Label>
                    <Select
                      value={constraint.severity}
                      onValueChange={(value) =>
                        onUpdateConstraint(index, { severity: value as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the constraint..."
                    value={constraint.description}
                    onChange={(e) =>
                      onUpdateConstraint(index, { description: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveConstraint(index)}
                className="text-red-600 hover:text-red-700"
              >
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <Button onClick={onAddConstraint} variant="outline" className="w-full">
        Add Constraint
      </Button>
    </div>
  );
};

const ContextIngestionStep: React.FC<{
  data: WizardData;
  onAddContext: (context: Context) => void;
  onRemoveContext: (index: number) => void;
}> = ({ data, onAddContext, onRemoveContext }) => {
  const [activeTab, setActiveTab] = useState('file');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const context: Context = {
          id: `context_${Date.now()}`,
          type: 'file',
          content,
          metadata: {
            source: file.name,
            size: file.size,
            format: file.type || 'unknown',
            language: 'en',
            keywords: [],
            confidence: 0.8,
          },
          createdAt: new Date(),
        };
        onAddContext(context);
      };
      reader.readAsText(file);
    }
  };

  const handleUrlSubmit = (url: string) => {
    const context: Context = {
      id: `context_${Date.now()}`,
      type: 'url',
      content: `Content from: ${url}`,
      metadata: {
        source: url,
        size: 0,
        format: 'url',
        language: 'en',
        keywords: [],
        confidence: 0.7,
      },
      createdAt: new Date(),
    };
    onAddContext(context);
  };

  const handleTextSubmit = (text: string) => {
    const context: Context = {
      id: `context_${Date.now()}`,
      type: 'text',
      content: text,
      metadata: {
        source: 'Manual input',
        size: text.length,
        format: 'text',
        language: 'en',
        keywords: [],
        confidence: 0.9,
      },
      createdAt: new Date(),
    };
    onAddContext(context);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Context Information</Label>
        <p className="text-sm text-gray-600 mt-1">
          Upload files, provide URLs, or enter text to provide context for your MCP
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="file" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            File Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            URL
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-4" />
            <Label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-700">Click to upload</span> or drag and drop
            </Label>
            <input
              id="file-upload"
              type="file"
              accept=".txt,.md,.json,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <p className="text-sm text-gray-500 mt-2">
              Supports TXT, MD, JSON, and PDF files
            </p>
          </div>
        </TabsContent>

        <TabsContent value="url" className="space-y-4">
          <div className="space-y-2">
            <Label>URL</Label>
            <div className="flex gap-2">
              <Input placeholder="https://example.com/document" />
              <Button variant="outline">Extract</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          <div className="space-y-2">
            <Label>Text Content</Label>
            <Textarea
              placeholder="Enter or paste your context information..."
              rows={6}
            />
            <Button variant="outline">Add Text</Button>
          </div>
        </TabsContent>
      </Tabs>

      {data.context.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-medium">Uploaded Context</Label>
          {data.context.map((context, index) => (
            <Card key={context.id} className="p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{context.type}</Badge>
                    <span className="text-sm text-gray-600">{context.metadata.source}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {context.content.substring(0, 100)}...
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveContext(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const ReviewStep: React.FC<{
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}> = ({ data, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Review Your Selections</Label>
        <p className="text-sm text-gray-600 mt-1">
          Review all the information before creating your MCP
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-medium mb-2">Domain</h3>
          <Badge variant="outline">
            {DOMAINS.find(d => d.value === data.domain)?.label}
          </Badge>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-2">Goals</h3>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Primary:</span> {data.goal.primary}
            </div>
            {data.goal.secondary && (
              <div>
                <span className="font-medium">Secondary:</span> {data.goal.secondary}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-2">User Role</h3>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Primary:</span> {data.userRole.primary}
            </div>
            {data.userRole.additional.length > 0 && (
              <div>
                <span className="font-medium">Additional:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.userRole.additional.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {data.constraints.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium mb-2">Constraints</h3>
            <div className="space-y-2">
              {data.constraints.map((constraint) => (
                <div key={constraint.id} className="flex items-center gap-2">
                  <Badge variant="outline">{constraint.type}</Badge>
                  <Badge variant={constraint.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {constraint.severity}
                  </Badge>
                  <span className="text-sm">{constraint.description}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {data.context.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium mb-2">Context</h3>
            <div className="space-y-2">
              {data.context.map((context) => (
                <div key={context.id} className="flex items-center gap-2">
                  <Badge variant="outline">{context.type}</Badge>
                  <span className="text-sm">{context.metadata.source}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="notes" className="text-base font-medium">
            Additional Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Add any additional notes or requirements..."
            value={data.review.notes}
            onChange={(e) =>
              onUpdate({ review: { ...data.review, notes: e.target.value } })
            }
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="confirm"
            checked={data.review.confirmed}
            onChange={(e) =>
              onUpdate({ review: { ...data.review, confirmed: e.target.checked } })
            }
            className="rounded"
          />
          <Label htmlFor="confirm" className="text-sm">
            I confirm that all information is correct and I'm ready to create my MCP
          </Label>
        </div>
      </div>
    </div>
  );
}; 