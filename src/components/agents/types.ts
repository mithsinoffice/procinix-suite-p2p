/**
 * Agent Configurator — shared types for Registry, Builder, and execution engine.
 */

export type AgentType = 'Validation' | 'Automation' | 'Enrichment' | 'Approval' | 'Ingestion';
export type AgentApplicationOn = 'Form' | 'Master';
export type TriggerEvent = 'On email received' | 'On form submission' | 'On record creation' | 'On status change' | 'Scheduled' | 'Manual';
export type FallbackAction = 'Create exception' | 'Notify admin' | 'Reject' | 'Retry' | 'Skip';
export type AgentStatus = 'Active' | 'Inactive' | 'Draft' | 'Testing';
export type RuleSeverity = 'Error' | 'Warning' | 'Info';

export type RuleType =
  | 'Required'
  | 'Format validation'
  | 'Duplicate check'
  | 'Cross-reference'
  | 'Math validation'
  | 'Threshold check'
  | 'Custom';

export type ActionType =
  | 'Create record'
  | 'Link entity'
  | 'Trigger approval'
  | 'Send notification'
  | 'Update master'
  | 'Call external API'
  | 'Custom action'
  | 'Create exception'
  | 'Notify team'
  | 'Reject'
  | 'Escalate'
  | 'Retry';

export type ActionCondition = 'Always' | 'If valid' | 'If confidence > N%' | 'If amount > N' | 'Custom';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  purpose: string;
  module: string;
  formName: string;
  entityScope: string;
  triggerEvent: TriggerEvent;
  targetAccuracy: number;
  fallbackAction: FallbackAction;
  status: AgentStatus;
  accuracyScore: number;
  applicationOn: AgentApplicationOn;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentFieldRule {
  id: string;
  agentId: string;
  fieldName: string;
  fieldType: string;
  ruleType: RuleType;
  ruleConfig: Record<string, unknown>;
  logicDescription: string;
  aiGenerated: boolean;
  severity: RuleSeverity;
  createdAt: string;
}

export interface AgentAction {
  id: string;
  agentId: string;
  triggerCondition: ActionCondition;
  actionType: ActionType;
  actionConfig: Record<string, unknown>;
  executionOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface AgentRunLog {
  id: string;
  agentId: string;
  triggerData: Record<string, unknown>;
  results: AgentRunResult;
  accuracyScore: number;
  touchless: boolean;
  durationMs: number;
  createdAt: string;
}

export interface AgentRunResult {
  passed: boolean;
  confidence: number;
  results: RuleResult[];
  exceptions: string[];
  actionsTaken: string[];
}

export interface RuleResult {
  field: string;
  rule: string;
  passed: boolean;
  value: unknown;
  error?: string;
}

export interface AgentWithDetails extends Agent {
  fieldRules: AgentFieldRule[];
  actions: AgentAction[];
}

export interface TestResult {
  overallAccuracy: number;
  touchlessRate: number;
  ruleResults: Array<{
    fieldName: string;
    ruleType: string;
    passCount: number;
    failCount: number;
    totalRecords: number;
  }>;
  sampleResults: AgentRunResult[];
  aiRecommendations?: string[];
}

export interface AISuggestion {
  id: string;
  type: 'rule' | 'action';
  description: string;
  confidence: number;
  suggested: Record<string, unknown>;
  status: 'pending' | 'accepted' | 'rejected';
}

/** Wizard step state */
export interface AgentBuilderState {
  step: 1 | 2 | 3 | 4;
  identity: Omit<Agent, 'id' | 'accuracyScore' | 'status' | 'createdBy' | 'createdAt' | 'updatedAt'>;
  fieldRules: Omit<AgentFieldRule, 'id' | 'agentId' | 'createdAt'>[];
  actions: Omit<AgentAction, 'id' | 'agentId' | 'createdAt'>[];
  testResult?: TestResult;
}

/** Module/form options for the builder dropdowns */
export const MODULE_OPTIONS = [
  'Procurement',
  'Accounts Payable',
  'Vendor Management',
  'Payments',
  'Advances',
  'Debit Notes',
  'GRN',
  'Masters',
  'Budget',
  'Cash Flow',
] as const;

export const FORM_OPTIONS: Record<string, string[]> = {
  'Procurement': ['Purchase Requisition', 'Purchase Order'],
  'Accounts Payable': ['PO Invoice', 'Non-PO Invoice', 'Direct Invoice'],
  'Vendor Management': ['Vendor Onboarding', 'Vendor Review'],
  'Payments': ['Payment Proposal', 'Payment Batch'],
  'Advances': ['Advance Request', 'Advance Utilization'],
  'Debit Notes': ['Debit Note'],
  'GRN': ['Goods Receipt Note'],
  'Masters': [
    'Entity Master', 'Department Master', 'Employee Master', 'User Master',
    'Roles Master', 'Vendor Master', 'Category Master', 'Item Master',
    'Product Master', 'SKU Master', 'Tax Code Master', 'Cost Centre Master',
    'Profit Centre Master', 'Country Master', 'State Master', 'Currency Master',
    'Exchange Rate Master', 'UOM Master', 'Contract Master',
  ],
  'Budget': ['Budget Planning', 'Budget Transfer'],
  'Cash Flow': ['Cash Position', 'Forecast'],
};
