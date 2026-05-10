import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Sliders,
  Target,
  Shield,
  Database,
  Brain,
  GitBranch,
  History,
  ChevronRight,
  Edit2,
  Power,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

/**
 * AGENT CONFIGURATION MASTER
 * Enterprise-grade agent configuration and rules engine
 * Located under Masters / Admin / Automation / Agent Configuration
 */

type ConfigCategory =
  | 'registry'
  | 'field-matching'
  | 'vendor-matching'
  | 'item-matching'
  | 'duplicate-detection'
  | 'po-grn-matching'
  | 'tax-validation'
  | 'confidence-thresholds'
  | 'routing-rules'
  | 'learning-rules'
  | 'human-review'
  | 'explainability'
  | 'version-history';

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  scope: string;
  version: string;
  lastUpdated: string;
  owner: string;
}

interface Rule {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
  threshold?: number;
}

export function AgentConfigurationMaster() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<ConfigCategory>('registry');

  const configCategories = [
    { id: 'registry', name: 'Agent Registry', icon: Database },
    { id: 'field-matching', name: 'Field Matching Rules', icon: Target },
    { id: 'vendor-matching', name: 'Vendor Matching Rules', icon: Shield },
    { id: 'item-matching', name: 'Item Matching Rules', icon: Settings },
    { id: 'duplicate-detection', name: 'Duplicate Detection Rules', icon: AlertCircle },
    { id: 'po-grn-matching', name: 'PO / GRN Match Rules', icon: CheckCircle },
    { id: 'tax-validation', name: 'Tax Validation Rules', icon: TrendingUp },
    { id: 'confidence-thresholds', name: 'Confidence Thresholds', icon: Sliders },
    { id: 'routing-rules', name: 'Routing Rules', icon: GitBranch },
    { id: 'learning-rules', name: 'Learning Rules', icon: Brain },
    { id: 'human-review', name: 'Human Review Rules', icon: Shield },
    { id: 'explainability', name: 'Explainability Rules', icon: Settings },
    { id: 'version-history', name: 'Version History', icon: History },
  ];

  const agents: Agent[] = [
    {
      id: '1',
      name: 'Intake Agent',
      status: 'active',
      scope: 'Document Classification',
      version: 'v2.3.1',
      lastUpdated: '2024-12-08',
      owner: 'System Admin',
    },
    {
      id: '2',
      name: 'Extraction Agent',
      status: 'active',
      scope: 'Data Extraction',
      version: 'v3.1.0',
      lastUpdated: '2024-12-10',
      owner: 'System Admin',
    },
    {
      id: '3',
      name: 'Vendor Match Agent',
      status: 'active',
      scope: 'Vendor Validation',
      version: 'v2.5.2',
      lastUpdated: '2024-12-05',
      owner: 'System Admin',
    },
    {
      id: '4',
      name: 'Duplicate Agent',
      status: 'active',
      scope: 'Duplicate Detection',
      version: 'v1.8.4',
      lastUpdated: '2024-11-28',
      owner: 'System Admin',
    },
    {
      id: '5',
      name: 'Match Agent',
      status: 'active',
      scope: 'PO/GRN Matching',
      version: 'v2.1.3',
      lastUpdated: '2024-12-01',
      owner: 'System Admin',
    },
    {
      id: '6',
      name: 'Tax Agent',
      status: 'active',
      scope: 'Tax Validation',
      version: 'v1.9.1',
      lastUpdated: '2024-12-07',
      owner: 'System Admin',
    },
    {
      id: '7',
      name: 'Coding Agent',
      status: 'active',
      scope: 'GL Coding',
      version: 'v2.0.5',
      lastUpdated: '2024-11-22',
      owner: 'System Admin',
    },
    {
      id: '8',
      name: 'Routing Agent',
      status: 'active',
      scope: 'Workflow Routing',
      version: 'v1.7.2',
      lastUpdated: '2024-12-03',
      owner: 'System Admin',
    },
    {
      id: '9',
      name: 'Learning Agent',
      status: 'inactive',
      scope: 'Continuous Learning',
      version: 'v0.9.0',
      lastUpdated: '2024-11-15',
      owner: 'System Admin',
    },
  ];

  const vendorMatchRules: Rule[] = [
    { id: '1', name: 'GSTIN Exact Match', weight: 40, enabled: true, threshold: 100 },
    { id: '2', name: 'Legal Name Fuzzy Match', weight: 30, enabled: true, threshold: 85 },
    { id: '3', name: 'Email Domain Match', weight: 15, enabled: true, threshold: 90 },
    { id: '4', name: 'Bank Account Match', weight: 10, enabled: true, threshold: 100 },
    { id: '5', name: 'Historical Alias Match', weight: 5, enabled: true, threshold: 95 },
  ];

  const confidenceThresholds = [
    { category: 'Header Extraction', autoPost: 95, lightReview: 80, exception: 80 },
    { category: 'Line Extraction', autoPost: 92, lightReview: 75, exception: 75 },
    { category: 'Vendor Match', autoPost: 90, lightReview: 70, exception: 70 },
    { category: 'Item Match', autoPost: 85, lightReview: 65, exception: 65 },
    { category: 'Duplicate Risk', autoPost: 95, lightReview: 80, exception: 80 },
    { category: 'Tax Confidence', autoPost: 90, lightReview: 75, exception: 75 },
    { category: 'Overall Readiness', autoPost: 92, lightReview: 78, exception: 78 },
  ];

  const routingRules = [
    {
      id: '1',
      condition: 'Vendor match score below threshold',
      threshold: 70,
      action: 'Assign to AP Review',
      assignee: 'AP Team',
    },
    {
      id: '2',
      condition: 'Duplicate risk high',
      threshold: 80,
      action: 'Send to Fraud/Compliance',
      assignee: 'Compliance Team',
    },
    {
      id: '3',
      condition: 'Tax mismatch detected',
      threshold: 75,
      action: 'Route to Tax Desk',
      assignee: 'Tax Team',
    },
    {
      id: '4',
      condition: 'PO missing',
      threshold: null,
      action: 'Route to Procurement',
      assignee: 'Procurement Team',
    },
    {
      id: '5',
      condition: 'Line match weak',
      threshold: 60,
      action: 'Assign to AP Analyst',
      assignee: 'AP Analyst',
    },
    {
      id: '6',
      condition: 'Bank mismatch detected',
      threshold: null,
      action: 'Block & Escalate',
      assignee: 'Finance Controller',
    },
  ];

  const renderAgentRegistry = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Agent Registry
          </h3>
          <p className="text-sm" style={{ color: '#6E7A82' }}>
            Manage all AI agents and their configurations
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-white text-sm"
          style={{ backgroundColor: '#00A9B7' }}
        >
          Add New Agent
        </button>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E1E6EA' }}>
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: '#F6F9FC', borderBottom: '1px solid #E1E6EA' }}>
              <th
                className="text-left px-6 py-4 text-sm"
                style={{ color: '#6E7A82', fontWeight: '600' }}
              >
                Agent Name
              </th>
              <th
                className="text-left px-6 py-4 text-sm"
                style={{ color: '#6E7A82', fontWeight: '600' }}
              >
                Status
              </th>
              <th
                className="text-left px-6 py-4 text-sm"
                style={{ color: '#6E7A82', fontWeight: '600' }}
              >
                Scope
              </th>
              <th
                className="text-left px-6 py-4 text-sm"
                style={{ color: '#6E7A82', fontWeight: '600' }}
              >
                Version
              </th>
              <th
                className="text-left px-6 py-4 text-sm"
                style={{ color: '#6E7A82', fontWeight: '600' }}
              >
                Last Updated
              </th>
              <th
                className="text-left px-6 py-4 text-sm"
                style={{ color: '#6E7A82', fontWeight: '600' }}
              >
                Owner
              </th>
              <th
                className="text-center px-6 py-4 text-sm"
                style={{ color: '#6E7A82', fontWeight: '600' }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id} style={{ borderBottom: '1px solid #E1E6EA' }}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5" style={{ color: '#00A9B7' }} />
                    <span style={{ color: '#0A0F14', fontWeight: '600' }}>{agent.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className="px-3 py-1 rounded-full text-xs inline-flex items-center gap-2"
                    style={{
                      backgroundColor: agent.status === 'active' ? '#D1FAE5' : '#F3F4F6',
                      color: agent.status === 'active' ? '#065F46' : '#6E7A82',
                      fontWeight: '600',
                    }}
                  >
                    <Power className="w-3 h-3" />
                    {agent.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                  {agent.scope}
                </td>
                <td className="px-6 py-4">
                  <span
                    className="px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: '#D6F7F9', color: '#007D87', fontWeight: '600' }}
                  >
                    {agent.version}
                  </span>
                </td>
                <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                  {agent.lastUpdated}
                </td>
                <td className="px-6 py-4" style={{ color: '#6E7A82' }}>
                  {agent.owner}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => navigate(`/masters/agent-config/detail/${agent.id}`)}
                    className="px-3 py-1.5 rounded-lg text-xs text-white"
                    style={{ backgroundColor: '#00A9B7' }}
                  >
                    <Edit2 className="w-3 h-3 inline mr-1" />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderVendorMatchingRules = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Vendor Matching Rules
          </h3>
          <p className="text-sm" style={{ color: '#6E7A82' }}>
            Configure weighted rules for vendor matching and validation
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '1px solid #E1E6EA' }}>
        <h4 className="text-sm mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>
          Matching Rules & Weights
        </h4>
        <div className="space-y-4">
          {vendorMatchRules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 rounded-lg"
              style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={rule.enabled} className="w-4 h-4" readOnly />
                  <span style={{ color: '#0A0F14', fontWeight: '600' }}>{rule.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm" style={{ color: '#6E7A82' }}>
                    Weight:{' '}
                    <span style={{ color: '#00A9B7', fontWeight: '600' }}>{rule.weight}%</span>
                  </div>
                  <button className="p-1 rounded hover:bg-white">
                    <Edit2 className="w-4 h-4" style={{ color: '#6E7A82' }} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: '#6E7A82' }}>
                  Threshold:
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rule.threshold}
                  className="flex-1"
                  readOnly
                />
                <span className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>
                  {rule.threshold}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #E1E6EA' }}>
        <h4 className="text-sm mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>
          Thresholds
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: '#D1FAE5', border: '1px solid #059669' }}
          >
            <div className="text-xs mb-2" style={{ color: '#065F46', fontWeight: '600' }}>
              AUTO-VERIFY THRESHOLD
            </div>
            <input
              type="number"
              value="90"
              className="w-full px-3 py-2 rounded-lg text-lg"
              style={{ border: '1px solid #059669', fontWeight: '700', color: '#065F46' }}
              readOnly
            />
            <div className="text-xs mt-2" style={{ color: '#065F46' }}>
              ≥ 90% → Auto-verify vendor
            </div>
          </div>
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B' }}
          >
            <div className="text-xs mb-2" style={{ color: '#92400E', fontWeight: '600' }}>
              REVIEW THRESHOLD
            </div>
            <input
              type="number"
              value="70"
              className="w-full px-3 py-2 rounded-lg text-lg"
              style={{ border: '1px solid #F59E0B', fontWeight: '700', color: '#92400E' }}
              readOnly
            />
            <div className="text-xs mt-2" style={{ color: '#92400E' }}>
              70% - 89% → Needs review
            </div>
          </div>
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: '#FEE2E2', border: '1px solid #EF4444' }}
          >
            <div className="text-xs mb-2" style={{ color: '#991B1B', fontWeight: '600' }}>
              REJECTION THRESHOLD
            </div>
            <input
              type="number"
              value="70"
              className="w-full px-3 py-2 rounded-lg text-lg"
              style={{ border: '1px solid #EF4444', fontWeight: '700', color: '#991B1B' }}
              readOnly
            />
            <div className="text-xs mt-2" style={{ color: '#991B1B' }}>
              &lt; 70% → Auto-reject
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfidenceThresholds = () => (
    <div>
      <div className="mb-6">
        <h3 className="text-xl mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
          Confidence Thresholds
        </h3>
        <p className="text-sm" style={{ color: '#6E7A82' }}>
          Configure thresholds for auto-posting, review, and exception routing
        </p>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E1E6EA' }}>
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: '#F6F9FC', borderBottom: '1px solid #E1E6EA' }}>
              <th
                className="text-left px-6 py-4 text-sm"
                style={{ color: '#6E7A82', fontWeight: '600' }}
              >
                Category
              </th>
              <th
                className="text-center px-6 py-4 text-sm"
                style={{ color: '#065F46', fontWeight: '600' }}
              >
                Auto-Post (≥)
              </th>
              <th
                className="text-center px-6 py-4 text-sm"
                style={{ color: '#92400E', fontWeight: '600' }}
              >
                Light Review
              </th>
              <th
                className="text-center px-6 py-4 text-sm"
                style={{ color: '#991B1B', fontWeight: '600' }}
              >
                Exception (&lt;)
              </th>
            </tr>
          </thead>
          <tbody>
            {confidenceThresholds.map((threshold, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #E1E6EA' }}>
                <td className="px-6 py-4" style={{ color: '#0A0F14', fontWeight: '600' }}>
                  {threshold.category}
                </td>
                <td className="px-6 py-4 text-center">
                  <div
                    className="inline-block px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#D1FAE5', color: '#065F46', fontWeight: '700' }}
                  >
                    {threshold.autoPost}%
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div
                    className="inline-block px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: '700' }}
                  >
                    {threshold.lightReview}%
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div
                    className="inline-block px-4 py-2 rounded-lg"
                    style={{ backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: '700' }}
                  >
                    &lt; {threshold.exception}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-white rounded-xl p-6" style={{ border: '1px solid #E1E6EA' }}>
        <h4 className="text-sm mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>
          Processing Lanes Visualization
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: '#D1FAE5', border: '2px solid #059669' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5" style={{ color: '#065F46' }} />
              <span style={{ color: '#065F46', fontWeight: '700' }}>AUTO-POST LANE</span>
            </div>
            <p className="text-xs mb-2" style={{ color: '#065F46' }}>
              High confidence invoices that meet all criteria
            </p>
            <div className="text-2xl" style={{ color: '#065F46', fontWeight: '700' }}>
              ≥ 92%
            </div>
          </div>
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: '#FEF3C7', border: '2px solid #F59E0B' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5" style={{ color: '#92400E' }} />
              <span style={{ color: '#92400E', fontWeight: '700' }}>LIGHT-TOUCH REVIEW</span>
            </div>
            <p className="text-xs mb-2" style={{ color: '#92400E' }}>
              Medium confidence - quick human verification
            </p>
            <div className="text-2xl" style={{ color: '#92400E', fontWeight: '700' }}>
              78-91%
            </div>
          </div>
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: '#FEE2E2', border: '2px solid #EF4444' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5" style={{ color: '#991B1B' }} />
              <span style={{ color: '#991B1B', fontWeight: '700' }}>EXCEPTION LANE</span>
            </div>
            <p className="text-xs mb-2" style={{ color: '#991B1B' }}>
              Low confidence - detailed investigation required
            </p>
            <div className="text-2xl" style={{ color: '#991B1B', fontWeight: '700' }}>
              &lt; 78%
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoutingRules = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Routing Rules
          </h3>
          <p className="text-sm" style={{ color: '#6E7A82' }}>
            Configure automated routing based on validation outcomes
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-white text-sm"
          style={{ backgroundColor: '#00A9B7' }}
        >
          Add Routing Rule
        </button>
      </div>

      <div className="space-y-4">
        {routingRules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white rounded-xl p-5"
            style={{ border: '1px solid #E1E6EA' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <GitBranch className="w-5 h-5" style={{ color: '#00A9B7' }} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>
                      IF:
                    </span>
                    <span
                      className="px-3 py-1.5 rounded-lg text-sm"
                      style={{
                        backgroundColor: '#F6F9FC',
                        color: '#0A0F14',
                        border: '1px solid #E1E6EA',
                      }}
                    >
                      {rule.condition}
                    </span>
                    {rule.threshold && (
                      <>
                        <span className="text-sm" style={{ color: '#6E7A82' }}>
                          &lt;
                        </span>
                        <span
                          className="px-3 py-1.5 rounded-lg text-sm"
                          style={{
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                            fontWeight: '600',
                          }}
                        >
                          {rule.threshold}%
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm" style={{ color: '#0A0F14', fontWeight: '600' }}>
                      THEN:
                    </span>
                    <span
                      className="px-3 py-1.5 rounded-lg text-sm"
                      style={{ backgroundColor: '#D6F7F9', color: '#007D87', fontWeight: '600' }}
                    >
                      {rule.action}
                    </span>
                    <ChevronRight className="w-4 h-4" style={{ color: '#6E7A82' }} />
                    <span className="text-sm" style={{ color: '#6E7A82' }}>
                      Assignee:{' '}
                      <span style={{ color: '#0A0F14', fontWeight: '600' }}>{rule.assignee}</span>
                    </span>
                  </div>
                </div>
              </div>
              <button className="p-2 rounded hover:bg-gray-100">
                <Edit2 className="w-4 h-4" style={{ color: '#6E7A82' }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLearningRules = () => (
    <div>
      <div className="mb-6">
        <h3 className="text-xl mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
          Learning Rules
        </h3>
        <p className="text-sm" style={{ color: '#6E7A82' }}>
          Configure how the system learns from human corrections
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #E1E6EA' }}>
          <h4 className="text-sm mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Learning Eligibility
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" defaultChecked />
              <span className="text-sm" style={{ color: '#0A0F14' }}>
                Vendor name corrections
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" defaultChecked />
              <span className="text-sm" style={{ color: '#0A0F14' }}>
                Item description mappings
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" defaultChecked />
              <span className="text-sm" style={{ color: '#0A0F14' }}>
                GL code assignments
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm" style={{ color: '#0A0F14' }}>
                Tax rate corrections
              </span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #E1E6EA' }}>
          <h4 className="text-sm mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Learning Scope
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="radio" name="scope" className="w-4 h-4" defaultChecked />
              <span className="text-sm" style={{ color: '#0A0F14' }}>
                Vendor-specific learning (recommended)
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input type="radio" name="scope" className="w-4 h-4" />
              <span className="text-sm" style={{ color: '#0A0F14' }}>
                Global pattern learning
              </span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #E1E6EA' }}>
          <h4 className="text-sm mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Governance Controls
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" defaultChecked />
              <span className="text-sm" style={{ color: '#0A0F14' }}>
                Require approval before activation
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" defaultChecked />
              <span className="text-sm" style={{ color: '#0A0F14' }}>
                Ignore low-frequency corrections
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm" style={{ color: '#0A0F14' }}>
                Human overrides impact future scoring
              </span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #E1E6EA' }}>
          <h4 className="text-sm mb-4" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Learning Activation
          </h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs mb-2 block" style={{ color: '#6E7A82' }}>
                Minimum corrections before learning
              </label>
              <input
                type="number"
                defaultValue="3"
                className="w-full px-3 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA' }}
              />
            </div>
            <div>
              <label className="text-xs mb-2 block" style={{ color: '#6E7A82' }}>
                Confidence boost factor
              </label>
              <input
                type="number"
                defaultValue="5"
                className="w-full px-3 py-2 rounded-lg"
                style={{ border: '1px solid #E1E6EA' }}
              />
              <div className="text-xs mt-1" style={{ color: '#9AA6AF' }}>
                % increase per successful pattern match
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (selectedCategory) {
      case 'registry':
        return renderAgentRegistry();
      case 'vendor-matching':
        return renderVendorMatchingRules();
      case 'confidence-thresholds':
        return renderConfidenceThresholds();
      case 'routing-rules':
        return renderRoutingRules();
      case 'learning-rules':
        return renderLearningRules();
      default:
        return (
          <div className="text-center py-20">
            <Settings className="w-16 h-16 mx-auto mb-4" style={{ color: '#9AA6AF' }} />
            <p style={{ color: '#6E7A82' }}>Configuration for {selectedCategory} coming soon</p>
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex" style={{ backgroundColor: '#F6F9FC' }}>
      {/* Left Configuration Navigator */}
      <div
        className="bg-white overflow-auto"
        style={{ width: '280px', borderRight: '1px solid #E1E6EA' }}
      >
        <div className="p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
          <h2 className="text-lg mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Agent Configuration
          </h2>
          <p className="text-xs" style={{ color: '#6E7A82' }}>
            Platform-level AI controls
          </p>
        </div>
        <div className="p-4">
          <nav className="space-y-1">
            {configCategories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id as ConfigCategory)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left"
                  style={{
                    backgroundColor: isActive ? '#D6F7F9' : 'transparent',
                    color: isActive ? '#007D87' : '#6E7A82',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: isActive ? '#00A9B7' : '#9AA6AF' }} />
                  <span className="text-sm" style={{ fontWeight: isActive ? '600' : '400' }}>
                    {category.name}
                  </span>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto" style={{ color: '#00A9B7' }} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Right Detail Configuration Workspace */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{renderContent()}</div>
      </div>
    </div>
  );
}

export default AgentConfigurationMaster;
