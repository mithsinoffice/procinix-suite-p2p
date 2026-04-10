import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, GitBranch, Plus, Search, Eye, PencilLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isMysqlApiEnabled, mysqlApiRequest } from '../lib/mysql/client';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';

interface WorkflowStep {
  id: string;
  stepNumber: number;
  approverRole: string;
  isMandatory: boolean;
  allowDelegation: boolean;
}

interface WorkflowCondition {
  field: string;
  operator: string;
  value: string;
}

interface WorkflowListItem {
  id: string;
  workflowName: string;
  workflowCategory?: 'Masters' | 'Forms';
  workflowTarget?: string;
  module: string;
  description: string;
  conditions: WorkflowCondition[];
  steps: WorkflowStep[];
  status: 'Active' | 'Inactive' | 'Draft';
  createdDate: string;
}

const mockWorkflows: WorkflowListItem[] = [
  {
    id: '1',
    workflowName: 'Standard PO Approval',
    workflowCategory: 'Forms',
    workflowTarget: 'Purchase Orders',
    module: 'Purchase Orders',
    description: 'Standard routing for lower-value PO approvals.',
    conditions: [{ field: 'Total Amount', operator: '<', value: '100000' }],
    steps: [{ id: 's1', stepNumber: 1, approverRole: 'PO Approver', isMandatory: true, allowDelegation: false }],
    status: 'Active',
    createdDate: '2026-04-01',
  },
  {
    id: '2',
    workflowName: 'Vendor Master Changes',
    workflowCategory: 'Masters',
    workflowTarget: 'Vendor Master',
    module: 'Vendor Master',
    description: 'Master-data review flow for vendor onboarding and updates.',
    conditions: [],
    steps: [{ id: 's2', stepNumber: 1, approverRole: 'Procurement Head', isMandatory: true, allowDelegation: false }],
    status: 'Draft',
    createdDate: '2026-04-05',
  },
];

function getStatusStyles(status: WorkflowListItem['status']) {
  if (status === 'Active') {
    return {
      background: 'linear-gradient(180deg, #EEFDF5 0%, #DFF9EA 100%)',
      border: '#BEEBCD',
      color: '#1D7A4A',
      icon: CheckCircle2,
    };
  }

  return {
    background: 'linear-gradient(180deg, #FFF8E7 0%, #FFF1C8 100%)',
    border: '#F4D36F',
    color: '#A36A00',
    icon: Clock3,
  };
}

function getCategoryStyles(category: WorkflowListItem['workflowCategory']) {
  if (category === 'Masters') {
    return {
      background: 'linear-gradient(180deg, #F1FCFF 0%, #E4F8FD 100%)',
      border: '#B6E7F1',
      color: '#0D8097',
    };
  }

  return {
    background: 'linear-gradient(180deg, #F3F5FF 0%, #E8ECFF 100%)',
    border: '#CBD4FF',
    color: '#4B5DDB',
  };
}

function metaChipStyle(tone: 'neutral' | 'info' | 'success') {
  if (tone === 'info') {
    return {
      background: 'linear-gradient(180deg, #EFF7FF 0%, #E2F0FF 100%)',
      border: '1px solid #C7DDFD',
      color: '#2F5FA8',
    };
  }

  if (tone === 'success') {
    return {
      background: 'linear-gradient(180deg, #EEFDF5 0%, #DFF9EA 100%)',
      border: '1px solid #BEEBCD',
      color: '#1D7A4A',
    };
  }

  return {
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F7FB 100%)',
    border: '1px solid #D8E0F0',
    color: '#516173',
  };
}

export function WorkflowManagement() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>(mockWorkflows);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  useEffect(() => {
    if (!isMysqlApiEnabled()) {
      return;
    }

    mysqlApiRequest<{ success: boolean; data: WorkflowListItem[] }>('/workflows/configurations')
      .then((response) => {
        if (Array.isArray(response.data) && response.data.length > 0) {
          setWorkflows(response.data);
        }
      })
      .catch((error) => {
        console.warn('Failed to load workflow listing', error);
      });
  }, []);

  const filteredWorkflows = workflows.filter((workflow) => {
    const haystack = [
      workflow.workflowName,
      workflow.workflowTarget ?? workflow.module,
      workflow.description,
      workflow.status,
    ]
      .join(' ')
      .toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(workflow.workflowCategory ?? 'Forms');
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(workflow.status);
    return matchesSearch && matchesCategory && matchesStatus;
  });
  const hasActiveFilters = searchTerm.trim().length > 0 || categoryFilter.length > 0 || statusFilter.length > 0;

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl mb-2" style={{ color: '#0A0F14' }}>Workflow Listing</h1>
          <p style={{ color: '#6E7A82' }}>
            Review existing workflows and open the designer to create or refine approval logic.
          </p>
        </div>

        <button
          onClick={() => navigate('/workflow-engine/designer')}
          className="inline-flex items-center gap-2 rounded-lg transition-all"
          style={{
            padding: '12px 18px',
            background: 'linear-gradient(135deg, #00A9B7 0%, #007D87 100%)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 10px 22px rgba(0, 169, 183, 0.18)',
          }}
        >
          <Plus className="w-4 h-4" />
          Design Workflow
        </button>
      </div>

      <div
        className="rounded-xl p-4 mb-5"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FBFD 100%)',
          border: '1px solid #E1E6EA',
          boxShadow: '0 12px 24px rgba(34, 51, 84, 0.06)',
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div
            className="rounded-xl flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
              color: '#4D5DF0',
              flexShrink: 0,
            }}
          >
            <GitBranch className="w-6 h-6" />
          </div>

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="inline-flex items-center rounded-full"
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: 'linear-gradient(180deg, #F3F5FF 0%, #E8ECFF 100%)',
                  border: '1px solid #CBD4FF',
                  color: '#4B5DDB',
                }}
              >
                Workflow Engine
              </span>
              <span
                className="inline-flex items-center rounded-full"
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: 'linear-gradient(180deg, #EEFDF5 0%, #DFF9EA 100%)',
                  border: '1px solid #BEEBCD',
                  color: '#1D7A4A',
                }}
              >
                {filteredWorkflows.length} Listed
              </span>
            </div>
            <h2 className="text-lg" style={{ color: '#0A0F14', margin: 0 }}>Central Workflow Register</h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center rounded-full"
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: '600',
                ...metaChipStyle('neutral'),
              }}
            >
              Compact View
            </span>
            <span
              className="inline-flex items-center rounded-full"
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: '600',
                ...metaChipStyle('info'),
              }}
            >
              {workflows.filter((workflow) => workflow.status === 'Active').length} Active
            </span>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E1E6EA',
          boxShadow: '0 10px 20px rgba(34, 51, 84, 0.05)',
        }}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div
              className="grid gap-4 px-5 py-4"
              style={{
                gridTemplateColumns: '2.4fr 1.2fr 1.2fr 1.2fr 1fr 0.9fr',
                borderBottom: '1px solid #E1E6EA',
              }}
            >
              <div className="space-y-2">
                <div className="relative">
                  <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#6E7A82' }} />
                  <input
                    type="text"
                    placeholder="Search workflow..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      padding: '0 14px 0 42px',
                      border: '1px solid #D7E3EA',
                      borderRadius: '16px',
                      fontSize: '14px',
                      color: '#0A0F14',
                      backgroundColor: '#F8FBFD',
                      outline: 'none',
                    }}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter([]);
                      setStatusFilter([]);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style={{
                      backgroundColor: '#FFF5F5',
                      border: '1px solid #FED7D7',
                      color: '#C53030',
                      fontWeight: 600,
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Category"
                  options={['Masters', 'Forms']}
                  selected={categoryFilter}
                  onToggle={(value) => setCategoryFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div />
              <div />
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Status"
                  options={['Active', 'Inactive', 'Draft']}
                  selected={statusFilter}
                  onToggle={(value) => setStatusFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div />
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'linear-gradient(180deg, #FBFCFE 0%, #F5F8FB 100%)', borderBottom: '1px solid #E1E6EA' }}>
                  <th className="px-5 py-3 text-left" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6E7A82', width: '28%' }}>
                    Workflow
                  </th>
                  <th className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6E7A82', width: '18%' }}>
                    Scope
                  </th>
                  <th className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6E7A82', width: '16%' }}>
                    Routing
                  </th>
                  <th className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6E7A82', width: '12%' }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6E7A82', width: '14%' }}>
                    Created
                  </th>
                  <th className="px-5 py-3 text-right" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6E7A82', width: '12%' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
              {filteredWorkflows.map((workflow) => {
                const statusStyles = getStatusStyles(workflow.status);
                const categoryStyles = getCategoryStyles(workflow.workflowCategory);
                const StatusIcon = statusStyles.icon;

                return (
                  <tr
                    key={workflow.id}
                    onClick={() => navigate('/workflow-engine/designer')}
                    style={{
                      borderBottom: '1px solid #EEF2F6',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = '#FBFEFF';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className="inline-flex items-center rounded-full"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: categoryStyles.background,
                            border: `1px solid ${categoryStyles.border}`,
                            color: categoryStyles.color,
                          }}
                        >
                          {workflow.workflowCategory ?? 'Forms'}
                        </span>
                        <span
                          className="inline-flex items-center rounded-full"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: '600',
                            ...metaChipStyle('neutral'),
                          }}
                        >
                          {workflow.workflowTarget ?? workflow.module}
                        </span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0A0F14', marginBottom: '4px' }}>
                        {workflow.workflowName}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#6E7A82',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          maxWidth: '340px',
                        }}
                      >
                        {workflow.description}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className="inline-flex items-center rounded-full"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: '600',
                            ...metaChipStyle('info'),
                          }}
                        >
                          {workflow.workflowCategory ?? 'Forms'}
                        </span>
                        <span
                          className="inline-flex items-center rounded-full"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: '600',
                            ...metaChipStyle('neutral'),
                          }}
                        >
                          {workflow.workflowTarget ?? workflow.module}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className="inline-flex items-center rounded-full"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: '600',
                            ...metaChipStyle('neutral'),
                          }}
                        >
                          {workflow.steps.length} Step{workflow.steps.length === 1 ? '' : 's'}
                        </span>
                        <span
                          className="inline-flex items-center rounded-full"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: '600',
                            ...metaChipStyle(workflow.conditions.length > 0 ? 'info' : 'neutral'),
                          }}
                        >
                          {workflow.conditions.length} Condition{workflow.conditions.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className="inline-flex items-center gap-1 rounded-full"
                        style={{
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: statusStyles.background,
                          border: `1px solid ${statusStyles.border}`,
                          color: statusStyles.color,
                        }}
                      >
                        <StatusIcon className="w-4 h-4" />
                        {workflow.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className="inline-flex items-center rounded-full"
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          ...metaChipStyle('neutral'),
                        }}
                      >
                        {workflow.createdDate}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <PremiumActionButton
                          label="View workflow"
                          icon={<Eye className="w-4 h-4" />}
                          tone="teal"
                          onClick={() => navigate('/workflow-engine/designer')}
                        />
                        <PremiumActionButton
                          label="Edit workflow"
                          icon={<PencilLine className="w-4 h-4" />}
                          tone="violet"
                          onClick={() => navigate('/workflow-engine/designer')}
                        />
                        <PremiumActionButton
                          label="Open workflow"
                          icon={<ArrowUpRight className="w-4 h-4" />}
                          tone="blue"
                          onClick={() => navigate('/workflow-engine/designer')}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
