import type { DragEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, X, GitBranch, Check, AlertCircle, Clock, ChevronDown, ChevronRight, ChevronLeft, DollarSign, Users, ArrowRight, Send, Filter, GripVertical, MousePointer2, Route, ShieldCheck, Sparkles, Bot, Wand2 } from 'lucide-react';
import { isMysqlApiEnabled, mysqlApiRequest } from '../lib/mysql/client';

interface WorkflowStep {
  id: string;
  stepNumber: number;
  approverRole: string;
  isMandatory: boolean;
  allowDelegation: boolean;
}

interface Workflow {
  id: string;
  workflowName: string;
  workflowCategory?: 'Masters' | 'Forms';
  workflowTarget?: string;
  module: string;
  description: string;
  triggerEvent: 'On Record Submission';
  conditions: { field: string; operator: string; value: string }[];
  steps: WorkflowStep[];
  status: 'Active' | 'Inactive' | 'Draft';
  createdDate: string;
}

type WorkflowCategory = 'Masters' | 'Forms';
type DesignerNodeType = 'condition' | 'approval';

interface DesignerNode {
  id: string;
  nodeType: DesignerNodeType;
  refId: string;
}

function ArrowDownConnector() {
  return (
    <div className="flex flex-col items-center" style={{ gap: '4px' }}>
      <div style={{ width: '2px', height: '14px', backgroundColor: '#C7D0D8' }} />
      <ArrowRight
        style={{
          width: '14px',
          height: '14px',
          color: '#6E7A82',
          transform: 'rotate(90deg)',
        }}
      />
      <div style={{ width: '2px', height: '14px', backgroundColor: '#C7D0D8' }} />
    </div>
  );
}

function ArrowRightConnector() {
  return (
    <div className="flex items-center" style={{ gap: '6px', minWidth: '88px', justifyContent: 'center' }}>
      <div
        style={{
          width: '24px',
          height: '2px',
          background: 'linear-gradient(90deg, #B9C6FF 0%, #7C8CFF 100%)',
          borderRadius: '999px',
        }}
      />
      <ArrowRight
        style={{
          width: '14px',
          height: '14px',
          color: '#6677E8',
        }}
      />
      <div
        style={{
          width: '24px',
          height: '2px',
          background: 'linear-gradient(90deg, #7C8CFF 0%, #B9C6FF 100%)',
          borderRadius: '999px',
        }}
      />
    </div>
  );
}

function DropZone({
  isActive,
  label,
  onDragOver,
  onDrop,
}: {
  isActive: boolean;
  label: string;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="rounded-lg flex items-center justify-center"
      style={{
        minHeight: '36px',
        minWidth: '180px',
        border: isActive ? '1px solid #6677E8' : '1px dashed #C7D0D8',
        backgroundColor: isActive ? '#EEF1FF' : '#F8FAFC',
        color: isActive ? '#4053D6' : '#6E7A82',
        fontSize: '12px',
        fontWeight: '500',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </div>
  );
}

function BadgeChip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'cyan' | 'indigo' | 'amber' | 'green';
}) {
  const tones = {
    neutral: {
      background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F7FB 100%)',
      border: '#D8E0F0',
      color: '#516173',
    },
    cyan: {
      background: 'linear-gradient(180deg, #F1FCFF 0%, #E4F8FD 100%)',
      border: '#B6E7F1',
      color: '#0D8097',
    },
    indigo: {
      background: 'linear-gradient(180deg, #F3F5FF 0%, #E8ECFF 100%)',
      border: '#CBD4FF',
      color: '#4B5DDB',
    },
    amber: {
      background: 'linear-gradient(180deg, #FFF8E7 0%, #FFF1C8 100%)',
      border: '#F4D36F',
      color: '#A36A00',
    },
    green: {
      background: 'linear-gradient(180deg, #EEFDF5 0%, #DFF9EA 100%)',
      border: '#BEEBCD',
      color: '#1D7A4A',
    },
  } as const;

  const config = tones[tone];

  return (
    <span
      className="inline-flex items-center rounded-full"
      style={{
        padding: '4px 10px',
        fontSize: '11px',
        fontWeight: '600',
        background: config.background,
        border: `1px solid ${config.border}`,
        color: config.color,
        letterSpacing: '0.01em',
      }}
    >
      {label}
    </span>
  );
}

const mockWorkflows: Workflow[] = [
  {
    id: '1',
    workflowName: 'Standard PO Approval',
    workflowCategory: 'Forms',
    workflowTarget: 'Purchase Orders',
    module: 'Purchase Orders',
    description: 'POs under ₹1,00,000 - Single level approval',
    triggerEvent: 'On Record Submission',
    conditions: [{ field: 'Total Amount', operator: '<', value: '100000' }],
    steps: [
      { id: 's1', stepNumber: 1, approverRole: 'PO Approver', isMandatory: true, allowDelegation: false }
    ],
    status: 'Active',
    createdDate: '2024-01-15'
  },
  {
    id: '2',
    workflowName: 'High Value PO Approval',
    workflowCategory: 'Forms',
    workflowTarget: 'Purchase Orders',
    module: 'Purchase Orders',
    description: 'POs above ₹1,00,000 - Multi-level approval',
    triggerEvent: 'On Record Submission',
    conditions: [{ field: 'Total Amount', operator: '>=', value: '100000' }],
    steps: [
      { id: 's2', stepNumber: 1, approverRole: 'PO Approver', isMandatory: true, allowDelegation: false },
      { id: 's3', stepNumber: 2, approverRole: 'Finance Manager', isMandatory: true, allowDelegation: true },
      { id: 's4', stepNumber: 3, approverRole: 'Admin', isMandatory: false, allowDelegation: false }
    ],
    status: 'Active',
    createdDate: '2024-01-18'
  },
  {
    id: '3',
    workflowName: 'GRN Location Acceptance',
    workflowCategory: 'Forms',
    workflowTarget: 'Goods Receipt',
    module: 'Goods Receipt',
    description: 'Location-wise GRN acceptance workflow',
    triggerEvent: 'On Record Submission',
    conditions: [],
    steps: [
      { id: 's5', stepNumber: 1, approverRole: 'Location Manager', isMandatory: true, allowDelegation: false }
    ],
    status: 'Active',
    createdDate: '2024-01-20'
  },
  {
    id: '4',
    workflowName: 'Vendor Master Changes',
    workflowCategory: 'Masters',
    workflowTarget: 'Vendor Master',
    module: 'Vendor Master',
    description: 'Approval for vendor master updates',
    triggerEvent: 'On Record Submission',
    conditions: [],
    steps: [
      { id: 's6', stepNumber: 1, approverRole: 'Procurement Head', isMandatory: true, allowDelegation: false }
    ],
    status: 'Draft',
    createdDate: '2024-12-10'
  }
];

const workflowTargets: Record<WorkflowCategory, string[]> = {
  Masters: [
    'Vendor Master',
    'Category Master',
    'Item Master',
    'Product Master',
    'Employee Master',
    'User Master',
    'Roles Master',
    'Tax Code Master',
    'Department Master',
    'Cost Centre Master',
    'Profit Centre Master',
    'Entity Master',
    'Currency Master',
    'Exchange Rate Master',
  ],
  Forms: [
    'Purchase Requisition',
    'Purchase Orders',
    'Goods Receipt',
    'Vendor Advance',
    'PO Invoice',
    'Non-PO Invoice',
    'Debit Note',
    'Payment Proposal',
  ],
};

const formAliases: Record<string, string> = {
  pr: 'Purchase Requisition',
  requisition: 'Purchase Requisition',
  po: 'Purchase Orders',
  purchaseorder: 'Purchase Orders',
  purchaseorders: 'Purchase Orders',
  grn: 'Goods Receipt',
  goodsreceipt: 'Goods Receipt',
  advance: 'Vendor Advance',
  invoice: 'PO Invoice',
  'non po invoice': 'Non-PO Invoice',
  debitnote: 'Debit Note',
  payment: 'Payment Proposal',
};

function inferWorkflowCategory(module: string): WorkflowCategory {
  if (workflowTargets.Masters.includes(module)) {
    return 'Masters';
  }

  return 'Forms';
}

export function WorkflowConfigurator() {
  const navigate = useNavigate();
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [designerNodes, setDesignerNodes] = useState<DesignerNode[]>([
    { id: 'node-step-1', nodeType: 'approval', refId: '1' }
  ]);
  const [draggedPaletteType, setDraggedPaletteType] = useState<DesignerNodeType | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dragOverZoneId, setDragOverZoneId] = useState<string | null>(null);
  const [workflowPrompt, setWorkflowPrompt] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('Describe the business rule in plain language and I will draft the workflow conditions and approver chain for you.');
  const [formData, setFormData] = useState<Workflow>({
    id: '',
    workflowName: '',
    workflowCategory: 'Masters',
    workflowTarget: '',
    module: '',
    description: '',
    triggerEvent: 'On Record Submission',
    conditions: [],
    steps: [{ id: '1', stepNumber: 1, approverRole: '', isMandatory: true, allowDelegation: false }],
    status: 'Draft',
    createdDate: ''
  });

  const roles = ['PO Approver', 'Finance Manager', 'Admin', 'Procurement Head', 'Location Manager', 'Department Head'];
  const availableTargets = workflowTargets[formData.workflowCategory ?? 'Masters'];

  const buildDesignerNodes = (workflow: Workflow): DesignerNode[] => [
    ...workflow.conditions.map((condition, index) => ({
      id: `node-condition-${condition.field || 'new'}-${index}`,
      nodeType: 'condition' as const,
      refId: `${index}`,
    })),
    ...workflow.steps.map((step) => ({
      id: `node-step-${step.id}`,
      nodeType: 'approval' as const,
      refId: step.id,
    })),
  ];

  useEffect(() => {
    if (!isMysqlApiEnabled()) {
      setIsHydrating(false);
      return;
    }

    mysqlApiRequest<{ success: boolean; data: Workflow[] }>('/workflows/configurations')
      .then((response) => {
        if (response.data.length > 0) {
          setWorkflows(response.data);
        }
      })
      .catch((error) => {
        console.warn('Failed to load workflow configurations from MySQL API', error);
      })
      .finally(() => {
        setIsHydrating(false);
      });
  }, []);

  useEffect(() => {
    if (!isMysqlApiEnabled() || isHydrating) {
      return;
    }

    mysqlApiRequest('/workflows/configurations', {
      method: 'PUT',
      body: JSON.stringify({ workflows }),
    }).catch((error) => {
      console.warn('Failed to save workflow configurations to MySQL API', error);
    });
  }, [isHydrating, workflows]);

  const filteredWorkflows = workflows.filter(wf =>
    wf.workflowName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wf.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wf.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const laneMinWidth = Math.max(1400, 480 + designerNodes.length * 700);

  const scrollCanvasBy = (delta: number) => {
    canvasScrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const fieldStyle = {
    width: '100%',
    height: '48px',
    padding: '0 14px',
    border: '1px solid #E1E6EA',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#0A0F14',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  } as const;

  const fieldLabelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#0A0F14',
    marginBottom: '8px',
  } as const;

  const hasInvalidCanvas =
    !formData.workflowName.trim() ||
    !formData.workflowTarget ||
    !formData.description.trim() ||
    formData.steps.length === 0 ||
    formData.steps.some((step) => !step.approverRole.trim()) ||
    formData.conditions.some((condition) =>
      !condition.field.trim() || !condition.operator.trim() || !condition.value.trim()
    );

  const normaliseText = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const inferTargetFromPrompt = (prompt: string): { workflowCategory: WorkflowCategory; workflowTarget: string } => {
    const normalized = normaliseText(prompt);

    const matchedMaster = workflowTargets.Masters.find((target) =>
      normalized.includes(normaliseText(target))
    );
    if (matchedMaster) {
      return { workflowCategory: 'Masters', workflowTarget: matchedMaster };
    }

    const matchedAlias = Object.entries(formAliases).find(([key]) => normalized.includes(key));
    if (matchedAlias) {
      return { workflowCategory: 'Forms', workflowTarget: matchedAlias[1] };
    }

    const matchedForm = workflowTargets.Forms.find((target) =>
      normalized.includes(normaliseText(target))
    );
    if (matchedForm) {
      return { workflowCategory: 'Forms', workflowTarget: matchedForm };
    }

    return { workflowCategory: 'Masters', workflowTarget: 'Vendor Master' };
  };

  const inferConditionsFromPrompt = (prompt: string) => {
    const normalized = normaliseText(prompt);
    const conditions: { field: string; operator: string; value: string }[] = [];

    const amountMatch = normalized.match(/(?:above|over|greater than|more than)\s*(?:rs|inr)?\s*([0-9]+(?:,[0-9]{3})*)/);
    if (amountMatch) {
      conditions.push({ field: 'Total Amount', operator: '>=', value: amountMatch[1].replace(/,/g, '') });
    }

    const belowMatch = normalized.match(/(?:below|under|less than)\s*(?:rs|inr)?\s*([0-9]+(?:,[0-9]{3})*)/);
    if (belowMatch) {
      conditions.push({ field: 'Total Amount', operator: '<=', value: belowMatch[1].replace(/,/g, '') });
    }

    const entityMatch = workflowTargets.Masters.find((target) => normalized.includes(normaliseText(target)));
    if (normalized.includes('entity') && !entityMatch) {
      conditions.push({ field: 'Entity', operator: '=', value: 'Selected Entity' });
    }

    const departmentKeywords = ['procurement', 'finance', 'warehouse', 'quality', 'admin'];
    const matchedDepartment = departmentKeywords.find((keyword) => normalized.includes(keyword));
    if (matchedDepartment) {
      conditions.push({ field: 'Department', operator: '=', value: matchedDepartment.charAt(0).toUpperCase() + matchedDepartment.slice(1) });
    }

    return conditions;
  };

  const inferStepsFromPrompt = (prompt: string): WorkflowStep[] => {
    const normalized = normaliseText(prompt);
    const orderedRoles = roles.filter((role) => normalized.includes(normaliseText(role)));
    const fallbackRoles = normalized.includes('vendor')
      ? ['Procurement Head', 'Finance Manager']
      : normalized.includes('employee')
        ? ['Department Head', 'Admin']
        : normalized.includes('purchase') || normalized.includes('po')
          ? ['PO Approver', 'Finance Manager']
          : ['Department Head'];

    const finalRoles = (orderedRoles.length > 0 ? orderedRoles : fallbackRoles).slice(0, 4);

    return finalRoles.map((role, index) => ({
      id: `${Date.now()}-${index + 1}`,
      stepNumber: index + 1,
      approverRole: role,
      isMandatory: true,
      allowDelegation: index > 0,
    }));
  };

  const generateWorkflowFromPrompt = () => {
    const prompt = workflowPrompt.trim();
    if (!prompt) {
      setAssistantMessage('Add a workflow description first, and I will generate a draft for review.');
      return;
    }

    const targetDetails = inferTargetFromPrompt(prompt);
    const generatedConditions = inferConditionsFromPrompt(prompt);
    const generatedSteps = inferStepsFromPrompt(prompt);
    const generatedName = prompt.length > 48 ? `${prompt.slice(0, 48).trim()}...` : prompt;

    const nextWorkflow: Workflow = {
      ...formData,
      workflowName: formData.workflowName || generatedName,
      workflowCategory: targetDetails.workflowCategory,
      workflowTarget: targetDetails.workflowTarget,
      module: targetDetails.workflowTarget,
      description: formData.description || `Auto-generated from workflow request: ${prompt}`,
      conditions: generatedConditions,
      steps: generatedSteps,
    };

    setFormData(nextWorkflow);
    setDesignerNodes(buildDesignerNodes(nextWorkflow));
    setAssistantMessage(
      `Draft ready for ${targetDetails.workflowTarget}. I added ${generatedConditions.length || 0} condition${generatedConditions.length === 1 ? '' : 's'} and ${generatedSteps.length} approval step${generatedSteps.length === 1 ? '' : 's'}. Please review, adjust if needed, and then submit.`
    );
  };

  const handleCreate = () => {
    if (hasInvalidCanvas) {
      return;
    }

    const newWorkflow: Workflow = {
      ...formData,
      module: formData.workflowTarget || formData.module,
      id: Date.now().toString(),
      createdDate: new Date().toISOString().split('T')[0]
    };
    setWorkflows([...workflows, newWorkflow]);
    setShowCreateModal(false);
    resetForm();
  };

  const handleEdit = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setFormData({
      ...workflow,
      workflowCategory: workflow.workflowCategory ?? inferWorkflowCategory(workflow.workflowTarget ?? workflow.module),
      workflowTarget: workflow.workflowTarget ?? workflow.module,
    });
    setDesignerNodes(buildDesignerNodes(workflow));
    setShowCreateModal(true);
  };

  const handleUpdate = () => {
    if (hasInvalidCanvas) {
      return;
    }

    if (selectedWorkflow) {
      setWorkflows(workflows.map(wf => wf.id === selectedWorkflow.id ? {
        ...formData,
        module: formData.workflowTarget || formData.module,
      } : wf));
      setShowCreateModal(false);
      setSelectedWorkflow(null);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      workflowName: '',
      workflowCategory: 'Masters',
      workflowTarget: '',
      module: '',
      description: '',
      triggerEvent: 'On Record Submission',
      conditions: [],
      steps: [{ id: '1', stepNumber: 1, approverRole: '', isMandatory: true, allowDelegation: false }],
      status: 'Draft',
      createdDate: ''
    });
    setDesignerNodes([{ id: 'node-step-1', nodeType: 'approval', refId: '1' }]);
    setWorkflowPrompt('');
    setAssistantMessage('Describe the business rule in plain language and I will draft the workflow conditions and approver chain for you.');
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      stepNumber: formData.steps.length + 1,
      approverRole: '',
      isMandatory: true,
      allowDelegation: false
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
    setDesignerNodes((current) => [...current, { id: `node-step-${newStep.id}`, nodeType: 'approval', refId: newStep.id }]);
  };

  const removeStep = (stepId: string) => {
    setFormData({ 
      ...formData, 
      steps: formData.steps.filter(s => s.id !== stepId).map((s, idx) => ({ ...s, stepNumber: idx + 1 }))
    });
    setDesignerNodes((current) => current.filter((node) => !(node.nodeType === 'approval' && node.refId === stepId)));
  };

  const updateStep = (stepId: string, field: keyof WorkflowStep, value: any) => {
    setFormData({
      ...formData,
      steps: formData.steps.map(s => s.id === stepId ? { ...s, [field]: value } : s)
    });
  };

  const addCondition = () => {
    const conditionIndex = formData.conditions.length;
    setFormData({
      ...formData,
      conditions: [...formData.conditions, { field: '', operator: '=', value: '' }]
    });
    setDesignerNodes((current) => [...current, { id: `node-condition-${Date.now()}`, nodeType: 'condition', refId: `${conditionIndex}` }]);
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, idx) => idx !== index)
    });
    setDesignerNodes((current) => current.filter((node) => !(node.nodeType === 'condition' && node.refId === `${index}`))
      .map((node) => node.nodeType === 'condition' && Number(node.refId) > index
        ? { ...node, refId: `${Number(node.refId) - 1}` }
        : node));
  };

  const updateCondition = (index: number, field: string, value: string) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.map((c, idx) => idx === index ? { ...c, [field]: value } : c)
    });
  };

  const reorderDesignerNodes = (sourceId: string, targetId: string | null) => {
    setDesignerNodes((current) => {
      const sourceIndex = current.findIndex((node) => node.id === sourceId);
      if (sourceIndex === -1) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);

      if (!targetId) {
        next.push(moved);
      } else {
        const targetIndex = next.findIndex((node) => node.id === targetId);
        if (targetIndex === -1) {
          next.push(moved);
        } else {
          next.splice(targetIndex, 0, moved);
        }
      }

      const orderedConditionIndices = next.filter((node) => node.nodeType === 'condition').map((node) => Number(node.refId));
      const orderedConditions = orderedConditionIndices.map((index) => formData.conditions[index]).filter(Boolean);
      const reindexedNodes = next.map((node) => {
        if (node.nodeType !== 'condition') {
          return node;
        }

        const newIndex = orderedConditionIndices.indexOf(Number(node.refId));
        return { ...node, refId: `${newIndex}` };
      });

      const orderedStepIds = next.filter((node) => node.nodeType === 'approval').map((node) => node.refId);
      const orderedSteps = orderedStepIds
        .map((stepId) => formData.steps.find((step) => step.id === stepId))
        .filter((step): step is WorkflowStep => Boolean(step))
        .map((step, index) => ({ ...step, stepNumber: index + 1 }));

      setFormData((currentForm) => ({
        ...currentForm,
        conditions: orderedConditions,
        steps: orderedSteps,
      }));

      return reindexedNodes;
    });
  };

  const handlePaletteDrop = (targetNodeId: string | null = null) => {
    if (!draggedPaletteType) {
      return;
    }

    if (draggedPaletteType === 'condition') {
      const newIndex = formData.conditions.length;
      const newConditionId = `node-condition-${Date.now()}`;
      setFormData((current) => ({
        ...current,
        conditions: [...current.conditions, { field: '', operator: '=', value: '' }],
      }));
      setDesignerNodes((current) => {
        const next = [...current];
        const newNode: DesignerNode = { id: newConditionId, nodeType: 'condition', refId: `${newIndex}` };
        if (!targetNodeId) {
          next.push(newNode);
        } else {
          const targetIndex = next.findIndex((node) => node.id === targetNodeId);
          next.splice(targetIndex === -1 ? next.length : targetIndex, 0, newNode);
        }
        return next;
      });
    }

    if (draggedPaletteType === 'approval') {
      const newStep: WorkflowStep = {
        id: Date.now().toString(),
        stepNumber: formData.steps.length + 1,
        approverRole: '',
        isMandatory: true,
        allowDelegation: false,
      };
      setFormData((current) => ({
        ...current,
        steps: [...current.steps, newStep],
      }));
      setDesignerNodes((current) => {
        const next = [...current];
        const newNode: DesignerNode = { id: `node-step-${newStep.id}`, nodeType: 'approval', refId: newStep.id };
        if (!targetNodeId) {
          next.push(newNode);
        } else {
          const targetIndex = next.findIndex((node) => node.id === targetNodeId);
          next.splice(targetIndex === -1 ? next.length : targetIndex, 0, newNode);
        }
        return next;
      });
    }

    setDraggedPaletteType(null);
    setDragOverNodeId(null);
    setDragOverZoneId(null);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      'Active': { bg: '#E8F7F0', text: '#0A7E4A', icon: Check },
      'Inactive': { bg: '#FFE5E5', text: '#D32F2F', icon: AlertCircle },
      'Draft': { bg: '#FFF9E6', text: '#D97706', icon: Clock }
    };
    const config = styles[status] || styles['Draft'];
    const Icon = config.icon;
    return (
      <span 
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full" 
        style={{ backgroundColor: config.bg, color: config.text, fontSize: '12px', fontWeight: '500' }}
      >
        <Icon style={{ width: '14px', height: '14px' }} />
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <button
            onClick={() => navigate('/workflow-engine')}
            className="mb-3 text-sm"
            style={{ color: '#6E7A82', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            ← Back to Workflow Engine
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
            Workflow Configurator
          </h1>
          <p style={{ fontSize: '14px', color: '#6E7A82', margin: '4px 0 0 0' }}>
            Design and manage approval workflows triggered on record submission
          </p>
        </div>
        <button
          onClick={() => { setSelectedWorkflow(null); setShowCreateModal(true); }}
          className="flex items-center gap-2 rounded-lg transition-all"
          style={{
            padding: '12px 20px',
            backgroundColor: '#00A9B7',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
        >
          <Plus style={{ width: '18px', height: '18px' }} />
          Create Workflow
        </button>
      </div>

      {!showCreateModal && (
        <>
          {/* Info Banner */}
          <div 
            className="rounded-lg flex items-start gap-3"
            style={{ 
              backgroundColor: '#E8F7F8', 
              border: '1px solid #00A9B7',
              padding: '16px',
              marginBottom: '16px'
            }}
          >
            <Send style={{ width: '20px', height: '20px', color: '#00A9B7', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0A0F14', margin: '0 0 4px 0' }}>
                Workflow Trigger: Record Submission
              </h3>
              <p style={{ fontSize: '13px', color: '#6E7A82', margin: 0, lineHeight: '1.5' }}>
                All workflows are <strong>automatically triggered when a submitter submits a record for approval</strong>. 
                Use conditions to route submissions to the appropriate workflow based on field values (e.g., amount thresholds, categories, departments). 
                If multiple workflows match, the first active workflow with matching conditions will be applied.
              </p>
            </div>
          </div>

          {/* Search */}
          <div 
            className="rounded-lg" 
            style={{ 
              backgroundColor: '#FFFFFF', 
              border: '1px solid #E1E6EA',
              padding: '16px',
              marginBottom: '16px'
            }}
          >
            <div className="flex items-center gap-2" style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '12px', width: '18px', height: '18px', color: '#6E7A82' }} />
              <input
                type="text"
                placeholder="Search by workflow name, module, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 10px 10px 40px',
                  border: '1px solid #E1E6EA',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#0A0F14',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Workflows List */}
          <div className="space-y-3">
        {filteredWorkflows.map((workflow) => (
          <div 
            key={workflow.id}
            className="rounded-lg" 
            style={{ 
              backgroundColor: '#FFFFFF', 
              border: '1px solid #E1E6EA',
              overflow: 'hidden'
            }}
          >
            {/* Workflow Header */}
            <div 
              className="flex items-center justify-between cursor-pointer"
              style={{ padding: '16px', borderBottom: expandedWorkflow === workflow.id ? '1px solid #E1E6EA' : 'none' }}
              onClick={() => setExpandedWorkflow(expandedWorkflow === workflow.id ? null : workflow.id)}
            >
              <div className="flex items-center gap-4 flex-1">
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00A9B7' }}>
                  {expandedWorkflow === workflow.id ? <ChevronDown style={{ width: '20px', height: '20px' }} /> : <ChevronRight style={{ width: '20px', height: '20px' }} />}
                </button>
                <div className="flex items-center gap-2">
                  <GitBranch style={{ width: '20px', height: '20px', color: '#00A9B7' }} />
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
                      {workflow.workflowName}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6E7A82', margin: '2px 0 0 0' }}>
                      {(workflow.workflowCategory ?? inferWorkflowCategory(workflow.workflowTarget ?? workflow.module))} • {(workflow.workflowTarget ?? workflow.module)} • {workflow.steps.length} Step{workflow.steps.length > 1 ? 's' : ''}
                      {workflow.conditions.length > 0 && ` • ${workflow.conditions.length} Condition${workflow.conditions.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(workflow.status)}
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(workflow); }}
                  className="p-2 rounded-lg transition-all"
                  style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E1E6EA'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                >
                  <Edit style={{ width: '16px', height: '16px', color: '#00A9B7' }} />
                </button>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedWorkflow === workflow.id && (
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: '14px', color: '#6E7A82', marginBottom: '16px' }}>
                  {workflow.description}
                </p>

                {/* Conditions */}
                {workflow.conditions.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0A0F14', marginBottom: '8px' }}>
                      Trigger Conditions:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {workflow.conditions.map((condition, idx) => (
                        <span 
                          key={idx}
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: '#E8F7F8', color: '#00A9B7', fontSize: '13px', fontWeight: '500' }}
                        >
                          {condition.field} {condition.operator} {condition.value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approval Steps */}
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0A0F14', marginBottom: '12px' }}>
                    Approval Flow:
                  </h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    {workflow.steps.map((step, idx) => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div 
                          className="rounded-lg"
                          style={{ 
                            padding: '12px 16px',
                            backgroundColor: '#F6F9FC',
                            border: '1px solid #E1E6EA'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span 
                              className="rounded-full flex items-center justify-center"
                              style={{
                                width: '24px',
                                height: '24px',
                                backgroundColor: '#00A9B7',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              {step.stepNumber}
                            </span>
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: '500', color: '#0A0F14', margin: 0 }}>
                                {step.approverRole}
                              </p>
                              <p style={{ fontSize: '11px', color: '#6E7A82', margin: '2px 0 0 0' }}>
                                {step.isMandatory ? 'Mandatory' : 'Optional'}
                                {step.allowDelegation && ' • Can Delegate'}
                              </p>
                            </div>
                          </div>
                        </div>
                        {idx < workflow.steps.length - 1 && (
                          <ArrowRight style={{ width: '16px', height: '16px', color: '#6E7A82' }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
          </div>
        </>
      )}

      {/* Create/Edit Workspace */}
      {showCreateModal && (
        <div
          className="rounded-xl"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E1E6EA',
            boxShadow: '0px 12px 32px rgba(10, 15, 20, 0.08)',
            marginTop: '8px',
            overflow: 'visible',
          }}
        >
          <div 
            className="w-full"
            style={{
              width: '100%',
              minHeight: 'calc(100vh - 180px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Workspace Header */}
            <div className="flex items-center justify-between" style={{ padding: '20px', borderBottom: '1px solid #E1E6EA' }}>
              <div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mb-2 text-sm"
                  style={{ color: '#6E7A82', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  ← Back to Workflow List
                </button>
                <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
                  {selectedWorkflow ? 'Edit Workflow Builder' : 'Create Workflow Builder'}
                </h2>
                <p style={{ fontSize: '13px', color: '#6E7A82', margin: '6px 0 0 0' }}>
                  Use the full workspace to design routing conditions and approval steps visually.
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px', color: '#6E7A82' }} />
              </button>
            </div>

            {/* Workspace Body */}
            <div style={{ padding: '24px', flex: 1 }}>
              {/* Basic Info */}
              <div className="grid grid-cols-[1.15fr_0.85fr] gap-5" style={{ marginBottom: '20px' }}>
                <div
                  className="rounded-lg"
                  style={{ border: '1px solid #E1E6EA', backgroundColor: '#FFFFFF', padding: '20px' }}
                >
                  <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
                    <Wand2 style={{ width: '18px', height: '18px', color: '#00A9B7' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
                      Workflow Basics
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '16px', alignItems: 'start' }}>
                    <div>
                      <label style={fieldLabelStyle}>
                        Workflow Name <span style={{ color: '#FF4E5B' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.workflowName}
                        onChange={(e) => setFormData({ ...formData, workflowName: e.target.value })}
                        placeholder="e.g., High Value PO Approval"
                        style={fieldStyle}
                      />
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>
                        Workflow Type <span style={{ color: '#FF4E5B' }}>*</span>
                      </label>
                      <select
                        value={formData.workflowCategory ?? 'Masters'}
                        onChange={(e) => setFormData({
                          ...formData,
                          workflowCategory: e.target.value as WorkflowCategory,
                          workflowTarget: '',
                          module: '',
                        })}
                        style={fieldStyle}
                      >
                        <option value="Masters">Masters</option>
                        <option value="Forms">Forms</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '16px', alignItems: 'start' }}>
                    <div>
                      <label style={fieldLabelStyle}>
                        {formData.workflowCategory === 'Masters' ? 'Select Master' : 'Select Form'} <span style={{ color: '#FF4E5B' }}>*</span>
                      </label>
                      <select
                        value={formData.workflowTarget ?? ''}
                        onChange={(e) => setFormData({ ...formData, workflowTarget: e.target.value, module: e.target.value })}
                        style={fieldStyle}
                      >
                        <option value="">{formData.workflowCategory === 'Masters' ? 'Select Master' : 'Select Form'}</option>
                        {availableTargets.map((target) => (
                          <option key={target} value={target}>{target}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>
                        Suggested Trigger
                      </label>
                      <div
                        className="flex items-center"
                        style={{
                          ...fieldStyle,
                          backgroundColor: '#F9FBFC',
                          color: '#6E7A82',
                          boxSizing: 'border-box',
                        }}
                      >
                        Workflow runs automatically on record submission.
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>
                      Description <span style={{ color: '#FF4E5B' }}>*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe when this workflow should be triggered"
                      rows={4}
                      style={{
                        width: '100%',
                        minHeight: '104px',
                        padding: '12px 14px',
                        border: '1px solid #E1E6EA',
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: '#0A0F14',
                        outline: 'none',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div
                  className="rounded-lg"
                  style={{ border: '1px solid #D7EEF1', backgroundColor: '#F8FDFF', padding: '20px' }}
                >
                  <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
                    <Bot style={{ width: '18px', height: '18px', color: '#00A9B7' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
                      Workflow Assistant
                    </h3>
                  </div>

                  <p style={{ fontSize: '13px', color: '#6E7A82', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                    Tell the system what workflow you want in plain English. It will draft conditions and approver steps for review.
                  </p>

                  <div
                    className="rounded-lg"
                    style={{ border: '1px solid #D7EEF1', backgroundColor: '#FFFFFF', padding: '12px', marginBottom: '12px' }}
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles style={{ width: '16px', height: '16px', color: '#00A9B7', flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ fontSize: '12px', color: '#0A0F14', margin: 0, lineHeight: '1.6' }}>
                        {assistantMessage}
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={workflowPrompt}
                    onChange={(e) => setWorkflowPrompt(e.target.value)}
                    placeholder="Example: Create a purchase order workflow where POs above 100000 need PO Approver first, then Finance Manager, and vendor workflows should go to Procurement Head."
                    rows={7}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #E1E6EA',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#0A0F14',
                      outline: 'none',
                      resize: 'vertical',
                      backgroundColor: '#FFFFFF',
                    }}
                  />

                  <div className="flex items-center justify-between" style={{ marginTop: '12px' }}>
                    <p style={{ fontSize: '12px', color: '#6E7A82', margin: 0 }}>
                      Draft first, review the canvas, then submit or refine manually.
                    </p>
                    <button
                      onClick={generateWorkflowFromPrompt}
                      className="flex items-center gap-2 rounded-lg transition-all"
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#00A9B7',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
                    >
                      <Sparkles style={{ width: '15px', height: '15px' }} />
                      Generate Draft
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditions */}
              <div style={{ marginBottom: '20px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#0A0F14' }}>
                    Visual Workflow Canvas <span style={{ color: '#FF4E5B' }}>*</span>
                  </label>
                  <div className="flex items-center gap-2" style={{ fontSize: '12px', color: '#6E7A82' }}>
                    <MousePointer2 style={{ width: '14px', height: '14px' }} />
                    Drag blocks into the canvas and reorder them visually
                  </div>
                </div>

                <div className="space-y-4">
                  <div
                    className="rounded-lg"
                    style={{
                      border: '1px solid #E6EAF2',
                      background: 'linear-gradient(180deg, #F8FBFF 0%, #F4F7FB 100%)',
                      padding: '16px',
                      boxShadow: '0 12px 24px rgba(65, 85, 140, 0.08)',
                    }}
                  >
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#0A0F14', margin: '0 0 12px 0' }}>
                      Drag Blocks
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                      <div
                        draggable
                        onDragStart={() => {
                          setDraggedPaletteType('condition');
                          setDraggedNodeId(null);
                        }}
                        className="rounded-lg"
                        style={{
                          border: '1px dashed #55B8D9',
                          background: 'linear-gradient(135deg, #FFFFFF 0%, #F4FBFF 100%)',
                          padding: '14px',
                          cursor: 'grab',
                          boxShadow: '0 8px 18px rgba(42, 153, 190, 0.08)',
                          minHeight: '112px',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <BadgeChip label="Logic" tone="cyan" />
                          <BadgeChip label="Drag" tone="neutral" />
                        </div>
                        <div className="flex items-center gap-2" style={{ marginTop: '10px' }}>
                          <Filter style={{ width: '16px', height: '16px', color: '#00A9B7' }} />
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#0A0F14' }}>Condition Block</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#6E7A82', margin: '8px 0 0 0', lineHeight: '1.6' }}>
                          Add amount, department, entity, or field-based routing rules.
                        </p>
                      </div>

                      <div
                        draggable
                        onDragStart={() => {
                          setDraggedPaletteType('approval');
                          setDraggedNodeId(null);
                        }}
                        className="rounded-lg"
                        style={{
                          border: '1px dashed #7C8CFF',
                          background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F6FF 100%)',
                          padding: '14px',
                          cursor: 'grab',
                          boxShadow: '0 8px 18px rgba(102, 119, 232, 0.08)',
                          minHeight: '112px',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <BadgeChip label="Approval" tone="indigo" />
                          <BadgeChip label="Drag" tone="neutral" />
                        </div>
                        <div className="flex items-center gap-2" style={{ marginTop: '10px' }}>
                          <ShieldCheck style={{ width: '16px', height: '16px', color: '#4D5DF0' }} />
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#0A0F14' }}>Approval Step</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#6E7A82', margin: '8px 0 0 0', lineHeight: '1.6' }}>
                          Add approver roles and arrange the approval chain visually.
                        </p>
                      </div>

                      <div
                        className="rounded-lg"
                        style={{
                          border: '1px solid #E6EAF2',
                          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFD 100%)',
                          padding: '14px',
                          minHeight: '112px',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2" style={{ marginBottom: '8px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
                            Builder Guidance
                          </p>
                          <BadgeChip label="Tips" tone="amber" />
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#6E7A82', fontSize: '12px', lineHeight: '1.6' }}>
                          <li>Start with conditions only when routing depends on values.</li>
                          <li>Add one or more approval steps in the exact execution order.</li>
                          <li>Drag blocks and review the flow from left to right.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-lg"
                    style={{
                      border: '1px solid #E6EAF2',
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFCFF 100%)',
                      padding: '20px',
                      minHeight: '680px',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
                      overflow: 'visible',
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handlePaletteDrop(null)}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                      <div className="flex items-center gap-2">
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
                          Workflow Canvas
                        </p>
                        <BadgeChip label="Live Preview" tone="indigo" />
                        <BadgeChip label={`${designerNodes.length} Blocks`} tone="neutral" />
                        <BadgeChip label="Conditions" tone="cyan" />
                        <BadgeChip label="Approval Levels" tone="indigo" />
                        <BadgeChip label="Final Outcome" tone="green" />
                      </div>
                      <div className="flex items-center gap-3">
                        <p style={{ fontSize: '12px', color: '#6E7A82', margin: 0 }}>
                          Conditions route first, then approval steps execute left to right.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => scrollCanvasBy(-360)}
                            className="rounded-lg flex items-center justify-center"
                            style={{
                              width: '34px',
                              height: '34px',
                              border: '1px solid #D8E0F0',
                              background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F7FB 100%)',
                              color: '#425466',
                              cursor: 'pointer',
                              boxShadow: '0 6px 14px rgba(15, 23, 42, 0.06)',
                            }}
                          >
                            <ChevronLeft style={{ width: '16px', height: '16px' }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollCanvasBy(360)}
                            className="rounded-lg flex items-center justify-center"
                            style={{
                              width: '34px',
                              height: '34px',
                              border: '1px solid #D8E0F0',
                              background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F7FB 100%)',
                              color: '#425466',
                              cursor: 'pointer',
                              boxShadow: '0 6px 14px rgba(15, 23, 42, 0.06)',
                            }}
                          >
                            <ChevronRight style={{ width: '16px', height: '16px' }} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                      ref={canvasScrollRef}
                      className="rounded-lg"
                      style={{
                        border: '1px solid #E8EEF2',
                        background: 'radial-gradient(circle at top left, #F4F8FF 0%, #FBFCFD 45%, #F8FBFF 100%)',
                        padding: '18px',
                        overflowX: 'scroll',
                        overflowY: 'hidden',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#AAB6FF #EEF2FF',
                        WebkitOverflowScrolling: 'touch',
                        width: '100%',
                        maxWidth: '100%',
                        display: 'block',
                      }}
                    >
                      {designerNodes.length === 0 ? (
                        <div
                          className="rounded-lg flex items-center justify-center"
                          style={{ minHeight: '220px', border: '1px dashed #C7D0D8', backgroundColor: '#F9FBFC' }}
                        >
                          <div style={{ textAlign: 'center' }}>
                            <Route style={{ width: '28px', height: '28px', color: '#00A9B7', margin: '0 auto 12px auto' }} />
                            <p style={{ fontSize: '14px', color: '#0A0F14', margin: 0 }}>Drop blocks here to build the workflow</p>
                            <p style={{ fontSize: '12px', color: '#6E7A82', margin: '6px 0 0 0' }}>
                              Start with a condition or jump straight to approval steps.
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <div
                        className="flex items-stretch"
                        style={{
                          gap: '0px',
                          minWidth: `${laneMinWidth}px`,
                          alignItems: 'stretch',
                          paddingBottom: '10px',
                        }}
                      >
                        <div className="flex flex-col items-center" style={{ minWidth: '220px' }}>
                          <div
                            className="rounded-lg flex items-center justify-center"
                            style={{
                              width: '220px',
                              minHeight: '76px',
                              border: '1px solid #D9E3F5',
                              background: 'linear-gradient(135deg, #FFFFFF 0%, #F6F9FF 100%)',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#20304A',
                              padding: '12px',
                              boxShadow: '0 10px 24px rgba(86, 103, 160, 0.08)',
                            }}
                          >
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ marginBottom: '8px' }}>
                                <BadgeChip label="Start" tone="neutral" />
                              </div>
                              <div>Record Submitted</div>
                            </div>
                          </div>
                        </div>

                        <ArrowRightConnector />

                        <div className="flex flex-col items-center" style={{ minWidth: '200px' }}>
                          <DropZone
                            isActive={dragOverZoneId === 'start'}
                            label="Insert first block"
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDragOverZoneId('start');
                              setDragOverNodeId(null);
                            }}
                            onDrop={() => {
                              if (draggedPaletteType) {
                                handlePaletteDrop(designerNodes[0]?.id ?? null);
                              } else if (draggedNodeId) {
                                reorderDesignerNodes(draggedNodeId, designerNodes[0]?.id ?? null);
                                setDraggedNodeId(null);
                              }
                              setDragOverZoneId(null);
                            }}
                          />
                        </div>

                        {designerNodes.map((node, nodeIndex) => {
                          const conditionIndex = node.nodeType === 'condition' ? Number(node.refId) : -1;
                          const condition = node.nodeType === 'condition' ? formData.conditions[conditionIndex] : null;
                          const step = node.nodeType === 'approval' ? formData.steps.find((item) => item.id === node.refId) : null;

                          return (
                            <div key={node.id} className="flex items-center" style={{ gap: '0px' }}>
                              <ArrowRightConnector />
                              <div
                                draggable
                                onDragStart={() => {
                                  setDraggedNodeId(node.id);
                                  setDraggedPaletteType(null);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setDragOverNodeId(node.id);
                                  setDragOverZoneId(null);
                                }}
                                onDrop={() => {
                                  if (draggedPaletteType) {
                                    handlePaletteDrop(node.id);
                                  } else if (draggedNodeId) {
                                    reorderDesignerNodes(draggedNodeId, node.id);
                                    setDraggedNodeId(null);
                                    setDragOverNodeId(null);
                                  }
                                }}
                                onDragEnd={() => {
                                  setDraggedNodeId(null);
                                  setDraggedPaletteType(null);
                                  setDragOverNodeId(null);
                                  setDragOverZoneId(null);
                                }}
                                className="rounded-lg"
                              style={{
                                width: node.nodeType === 'condition' ? '420px' : '360px',
                                minHeight: '180px',
                                padding: '14px',
                                background: node.nodeType === 'condition'
                                  ? 'linear-gradient(180deg, #F3FCFF 0%, #EAF7FC 100%)'
                                  : 'linear-gradient(180deg, #F4F6FF 0%, #ECEFFE 100%)',
                                border: dragOverNodeId === node.id
                                  ? '1px solid #6677E8'
                                  : node.nodeType === 'condition'
                                    ? '1px solid #BEE8F3'
                                    : '1px solid #CCD5FF',
                                flexShrink: 0,
                                boxShadow: dragOverNodeId === node.id
                                  ? '0 16px 36px rgba(102, 119, 232, 0.16)'
                                  : '0 12px 28px rgba(34, 51, 84, 0.08)',
                              }}
                            >
                                <div className="flex items-start gap-3">
                                  <div
                                    className="rounded-lg flex items-center justify-center"
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      backgroundColor: '#FFFFFF',
                                      border: '1px solid #E1E6EA',
                                      cursor: 'grab',
                                      flexShrink: 0,
                                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                                    }}
                                  >
                                    <GripVertical style={{ width: '16px', height: '16px', color: '#6E7A82' }} />
                                  </div>

                                  <div
                                    className="rounded-full flex items-center justify-center"
                                    style={{
                                      width: '30px',
                                      height: '30px',
                                      background: node.nodeType === 'condition'
                                        ? 'linear-gradient(135deg, #18B6C9 0%, #0E8DA5 100%)'
                                        : 'linear-gradient(135deg, #6E7FFF 0%, #4D5DF0 100%)',
                                      color: '#FFFFFF',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {nodeIndex + 1}
                                  </div>

                                  <div style={{ flex: 1 }}>
                                    {node.nodeType === 'condition' && condition && (
                                      <>
                                        <div className="flex items-center justify-between gap-2" style={{ marginBottom: '10px' }}>
                                          <div className="flex items-center gap-2">
                                          <Filter style={{ width: '16px', height: '16px', color: '#0E8DA5' }} />
                                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#0A0F14' }}>Condition Block</span>
                                          </div>
                                          <BadgeChip label="Routing Rule" tone="cyan" />
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '10px' }}>
                                          <BadgeChip label="Field" tone="neutral" />
                                          <BadgeChip label="Operator" tone="neutral" />
                                          <BadgeChip label="Value" tone="neutral" />
                                        </div>
                                        <div className="grid grid-cols-[1fr_90px_1fr] gap-2">
                                          <input
                                            type="text"
                                            value={condition.field}
                                            onChange={(e) => updateCondition(conditionIndex, 'field', e.target.value)}
                                            placeholder="Field"
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E1E6EA', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                          />
                                          <select
                                            value={condition.operator}
                                            onChange={(e) => updateCondition(conditionIndex, 'operator', e.target.value)}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E1E6EA', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                          >
                                            <option value="=">=</option>
                                            <option value="!=">!=</option>
                                            <option value="<">&lt;</option>
                                            <option value=">">&gt;</option>
                                            <option value="<=">≤</option>
                                            <option value=">=">≥</option>
                                          </select>
                                          <input
                                            type="text"
                                            value={condition.value}
                                            onChange={(e) => updateCondition(conditionIndex, 'value', e.target.value)}
                                            placeholder="Value"
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E1E6EA', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                          />
                                        </div>
                                      </>
                                    )}

                                    {node.nodeType === 'approval' && step && (
                                      <>
                                        <div className="flex items-center justify-between gap-2" style={{ marginBottom: '10px' }}>
                                          <div className="flex items-center gap-2">
                                          <ShieldCheck style={{ width: '16px', height: '16px', color: '#4D5DF0' }} />
                                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#0A0F14' }}>Approval Step</span>
                                          </div>
                                          <BadgeChip label={`Step ${nodeIndex + 1}`} tone="indigo" />
                                        </div>
                                        <div style={{ marginBottom: '10px' }}>
                                          <select
                                            value={step.approverRole}
                                            onChange={(e) => updateStep(step.id, 'approverRole', e.target.value)}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E1E6EA', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                          >
                                            <option value="">Select Approver Role</option>
                                            {roles.map((role) => (
                                              <option key={role} value={role}>{role}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <label className="flex items-center gap-2" style={{ fontSize: '13px', color: '#6E7A82' }}>
                                            <input
                                              type="checkbox"
                                              checked={step.isMandatory}
                                              onChange={(e) => updateStep(step.id, 'isMandatory', e.target.checked)}
                                              style={{ width: '16px', height: '16px', accentColor: '#00A9B7' }}
                                            />
                                            <BadgeChip label="Mandatory" tone={step.isMandatory ? 'green' : 'neutral'} />
                                          </label>
                                          <label className="flex items-center gap-2" style={{ fontSize: '13px', color: '#6E7A82' }}>
                                            <input
                                              type="checkbox"
                                              checked={step.allowDelegation}
                                              onChange={(e) => updateStep(step.id, 'allowDelegation', e.target.checked)}
                                              style={{ width: '16px', height: '16px', accentColor: '#00A9B7' }}
                                            />
                                            <BadgeChip label="Delegation" tone={step.allowDelegation ? 'amber' : 'neutral'} />
                                          </label>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => node.nodeType === 'condition' ? removeCondition(conditionIndex) : step && removeStep(step.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                                  >
                                    <X style={{ width: '16px', height: '16px', color: '#FF4E5B' }} />
                                  </button>
                                </div>
                              </div>

                              <ArrowRightConnector />

                              <div className="flex flex-col items-center" style={{ minWidth: '200px' }}>
                                <DropZone
                                  isActive={dragOverZoneId === `between-${node.id}`}
                                  label={nodeIndex === designerNodes.length - 1 ? 'Add next block' : 'Insert between'}
                                  onDragOver={(event) => {
                                    event.preventDefault();
                                    setDragOverZoneId(`between-${node.id}`);
                                    setDragOverNodeId(null);
                                  }}
                                  onDrop={() => {
                                    const nextNodeId = designerNodes[nodeIndex + 1]?.id ?? null;
                                    if (draggedPaletteType) {
                                      handlePaletteDrop(nextNodeId);
                                    } else if (draggedNodeId) {
                                      reorderDesignerNodes(draggedNodeId, nextNodeId);
                                      setDraggedNodeId(null);
                                    }
                                    setDragOverZoneId(null);
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}

                        <ArrowRightConnector />

                        <div className="flex flex-col items-center" style={{ minWidth: '220px' }}>
                          <div
                            className="rounded-lg flex items-center justify-center"
                            style={{
                              width: '220px',
                              minHeight: '76px',
                              border: '1px solid #BEEBCD',
                              background: 'linear-gradient(135deg, #F6FFF9 0%, #EAFBF0 100%)',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#185B37',
                              padding: '12px',
                              boxShadow: '0 12px 28px rgba(29, 122, 74, 0.12)',
                            }}
                          >
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ marginBottom: '8px' }}>
                                <BadgeChip label="End" tone="green" />
                              </div>
                              <div>Final Outcome</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" style={{ marginTop: '12px' }}>
                      <button
                        onClick={addCondition}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg transition-all"
                        style={{ backgroundColor: '#E8F7F8', border: '1px solid #00A9B7', color: '#00A9B7', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                      >
                        <Plus style={{ width: '14px', height: '14px' }} />
                        Add Condition
                      </button>
                      <button
                        onClick={addStep}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg transition-all"
                        style={{ backgroundColor: '#E8F7F8', border: '1px solid #00A9B7', color: '#00A9B7', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                      >
                        <Plus style={{ width: '14px', height: '14px' }} />
                        Add Step
                      </button>
                    </div>

                    {hasInvalidCanvas && (
                      <div
                        className="rounded-lg flex items-start gap-2"
                        style={{
                          marginTop: '12px',
                          padding: '12px',
                          backgroundColor: '#FFF9E6',
                          border: '1px solid #F5D97B',
                        }}
                      >
                        <AlertCircle style={{ width: '16px', height: '16px', color: '#D97706', flexShrink: 0, marginTop: '1px' }} />
                        <div style={{ fontSize: '12px', color: '#7A5B00', lineHeight: '1.5' }}>
                          Complete the workflow name, target, description, every condition, and at least one approval step before saving.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Workspace Footer */}
            <div className="flex items-center justify-end gap-3" style={{ padding: '20px 24px', borderTop: '1px solid #E1E6EA', backgroundColor: '#FFFFFF' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E1E6EA',
                  color: '#6E7A82',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              >
                Cancel
              </button>
              <button
                onClick={selectedWorkflow ? handleUpdate : handleCreate}
                disabled={hasInvalidCanvas}
                className="px-6 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: hasInvalidCanvas ? '#9BD5DA' : '#00A9B7',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: hasInvalidCanvas ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!hasInvalidCanvas) {
                    e.currentTarget.style.backgroundColor = '#007D87';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = hasInvalidCanvas ? '#9BD5DA' : '#00A9B7';
                }}
              >
                {selectedWorkflow ? 'Update Workflow' : 'Create Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
