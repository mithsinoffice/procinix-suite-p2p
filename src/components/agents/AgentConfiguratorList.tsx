import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { mysqlApiRequest } from '../../lib/mysql/client';
import {
  Plus,
  TrendingUp,
  Zap,
  Settings,
  Search,
  ChevronDown,
  TrendingDown,
  Bot,
  Clock,
} from 'lucide-react';

/**
 * AGENT CONFIGURATOR - Enhanced Main Dashboard
 * Build and manage agentic AI workflows across P2P
 */

interface Agent {
  id: string;
  initials: string;
  avatarColor: string;
  name: string;
  form: string;
  module: string;
  fieldRules: number;
  actions: number;
  accuracy: number;
  accuracyTrend: 'up' | 'down' | 'stable';
  active: boolean;
  lastRun: string;
  actionsToday: number;
}

export function AgentConfiguratorList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All modules');
  const [typeFilter, setTypeFilter] = useState('All types');
  const [statusFilter, setStatusFilter] = useState('All status');

  const [agents, setAgents] = useState<Agent[]>([]);

  const colorMap: Record<string, string> = {
    'Accounts Payable': '#00A9B7',
    Procurement: '#10B981',
    Masters: '#F59E0B',
    Payments: '#EAB308',
    'Vendor Management': '#8B5CF6',
    GRN: '#06B6D4',
    Advances: '#EC4899',
    'Debit Notes': '#EF4444',
    Budget: '#6366F1',
  };

  const loadAgents = useCallback(async () => {
    try {
      const res = await mysqlApiRequest<{ success: boolean; data: any[] }>('/agents');
      const dbAgents: Agent[] = (res.data || []).map((a: any) => ({
        id: a.id,
        initials: (a.name || '')
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        avatarColor: colorMap[a.module] || '#00A9B7',
        name: a.name || 'Untitled',
        form: a.form_name || a.module || '',
        module: a.module || '',
        fieldRules: Array.isArray(a.rules) ? a.rules.length : 0,
        actions: Array.isArray(a.actions) ? a.actions.length : 0,
        accuracy: Number(a.accuracy_score) || 0,
        accuracyTrend: 'stable' as const,
        active: a.status === 'Active',
        lastRun: a.updated_at ? new Date(a.updated_at).toLocaleDateString() : '--',
        actionsToday: 0,
      }));
      setAgents(dbAgents);
    } catch (err) {
      console.warn('Failed to load agents:', err);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const activeAgents = agents.filter((a) => a.active).length;
  const avgAccuracy =
    agents.length > 0 ? agents.reduce((sum, a) => sum + a.accuracy, 0) / agents.length : 0;
  const actionsToday = agents.reduce((sum, a) => sum + a.actionsToday, 0);

  const toggleAgent = async (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return;
    try {
      if (agent.active) {
        await mysqlApiRequest(`/agents/${id}`, { method: 'DELETE' });
      } else {
        await mysqlApiRequest(`/agents/${id}/activate`, { method: 'POST' });
      }
      await loadAgents();
    } catch (err) {
      console.warn('Toggle failed:', err);
      await loadAgents();
    }
  };

  const showEmptyState = agents.length === 0;

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>
            Agent configurator
          </h1>
          <p style={{ color: '#6E7A82', fontSize: '13px' }}>
            Build and manage agentic AI workflows across P2P
          </p>
        </div>
        <button
          onClick={() => navigate('/agent-configurator/new')}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: '#007D87' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#006570')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#007D87')}
        >
          <Plus className="w-5 h-5" />
          <span style={{ fontSize: '13px', fontWeight: '600' }}>New agent</span>
        </button>
      </div>

      {!showEmptyState ? (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div
              className="bg-white rounded-lg p-6 cursor-pointer transition-all"
              style={{ border: '1px solid #E1E6EA' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00A9B7';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 169, 183, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E1E6EA';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: '#D6F7F9' }}
                >
                  <Zap className="w-5 h-5" style={{ color: '#00A9B7' }} />
                </div>
                <div>
                  <div
                    style={{
                      color: '#6E7A82',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Active agents
                  </div>
                </div>
              </div>
              <div className="text-4xl mb-1" style={{ color: '#00A9B7', fontWeight: '700' }}>
                {activeAgents}
              </div>
              <div style={{ color: '#6E7A82', fontSize: '13px' }}>Running in production</div>
            </div>

            <div
              className="bg-white rounded-lg p-6 cursor-pointer transition-all"
              style={{ border: '1px solid #E1E6EA' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#10B981';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E1E6EA';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: '#D1FAE5' }}
                >
                  <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
                </div>
                <div>
                  <div
                    style={{
                      color: '#6E7A82',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Avg accuracy
                  </div>
                </div>
              </div>
              <div className="text-4xl mb-1" style={{ color: '#10B981', fontWeight: '700' }}>
                {avgAccuracy.toFixed(1)}%
              </div>
              <div style={{ color: '#6E7A82', fontSize: '13px' }}>Across all agents</div>
            </div>

            <div
              className="bg-white rounded-lg p-6 cursor-pointer transition-all"
              style={{ border: '1px solid #E1E6EA' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00A9B7';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 169, 183, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E1E6EA';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: '#D6F7F9' }}
                >
                  <Settings className="w-5 h-5" style={{ color: '#00A9B7' }} />
                </div>
                <div>
                  <div
                    style={{
                      color: '#6E7A82',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Actions today
                  </div>
                </div>
              </div>
              <div className="text-4xl mb-1" style={{ color: '#0A0F14', fontWeight: '700' }}>
                {actionsToday}
              </div>
              <div style={{ color: '#6E7A82', fontSize: '13px' }}>Automated decisions</div>
            </div>
          </div>

          {/* Search + Filter Row */}
          <div
            className="bg-white rounded-lg p-4 mb-6 flex items-center gap-4"
            style={{ border: '1px solid #E1E6EA' }}
          >
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                style={{ color: '#9AA6AF' }}
              />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg"
                style={{ border: '0.5px solid #E1E6EA', fontSize: '13px' }}
              />
            </div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-4 py-2 rounded-lg"
              style={{ border: '0.5px solid #E1E6EA', fontSize: '13px', minWidth: '150px' }}
            >
              <option>All modules</option>
              <option>Accounts Payable</option>
              <option>Procurement</option>
              <option>Masters</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 rounded-lg"
              style={{ border: '0.5px solid #E1E6EA', fontSize: '13px', minWidth: '150px' }}
            >
              <option>All types</option>
              <option>Validator</option>
              <option>Enricher</option>
              <option>Matcher</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg"
              style={{ border: '0.5px solid #E1E6EA', fontSize: '13px', minWidth: '150px' }}
            >
              <option>All status</option>
              <option>Active</option>
              <option>Draft</option>
              <option>Inactive</option>
            </select>
          </div>

          {/* Agent List */}
          <div
            className="bg-white rounded-lg overflow-hidden"
            style={{ border: '1px solid #E1E6EA' }}
          >
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #E1E6EA' }}>
              <h2 className="text-lg" style={{ color: '#0A0F14', fontWeight: '600' }}>
                All agents
              </h2>
            </div>
            <div>
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="relative flex items-center gap-4 px-6 py-6 transition-colors hover:bg-gray-50"
                  style={{ borderBottom: '1px solid #E1E6EA', marginBottom: '4px' }}
                >
                  {/* Colored Left Border */}
                  <div
                    className="absolute left-0 top-0 bottom-0"
                    style={{ width: '4px', backgroundColor: agent.avatarColor }}
                  />

                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: agent.avatarColor,
                      color: '#FFFFFF',
                      fontWeight: '700',
                      fontSize: '16px',
                    }}
                  >
                    {agent.initials}
                  </div>

                  {/* Agent Info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="mb-1"
                      style={{ color: '#0A0F14', fontWeight: '600', fontSize: '15px' }}
                    >
                      {agent.name}
                    </div>
                    <div className="mb-1" style={{ color: '#6E7A82', fontSize: '13px' }}>
                      {agent.form} · {agent.module} · {agent.fieldRules} field rules ·{' '}
                      {agent.actions} actions
                    </div>
                    <div
                      className="flex items-center gap-2"
                      style={{ color: '#9AA6AF', fontSize: '12px' }}
                    >
                      <Clock className="w-3 h-3" />
                      <span>
                        Last run: {agent.lastRun} · {agent.actionsToday} actions today
                      </span>
                    </div>
                  </div>

                  {/* Accuracy Badge with Trend */}
                  <div className="flex items-center gap-2">
                    <div
                      className="px-4 py-2 rounded-full flex items-center gap-2"
                      style={{
                        backgroundColor: '#D1FAE5',
                        color: '#065F46',
                        fontSize: '13px',
                        fontWeight: '600',
                      }}
                    >
                      <span>{agent.accuracy}% accuracy</span>
                      {agent.accuracyTrend === 'up' && (
                        <TrendingUp className="w-3 h-3" style={{ color: '#10B981' }} />
                      )}
                      {agent.accuracyTrend === 'down' && (
                        <TrendingDown className="w-3 h-3" style={{ color: '#EF4444' }} />
                      )}
                    </div>
                  </div>

                  {/* Configure Button */}
                  <button
                    onClick={() => navigate(`/agent-configurator/edit/${agent.id}`)}
                    className="px-4 py-2 rounded-lg transition-colors"
                    style={{
                      border: '1px solid #00A9B7',
                      color: '#00A9B7',
                      backgroundColor: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#D6F7F9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    Configure
                  </button>

                  {/* Active Toggle with Label */}
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs"
                      style={{ color: '#6E7A82', fontWeight: '600', minWidth: '50px' }}
                    >
                      {agent.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => toggleAgent(agent.id)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      style={{
                        backgroundColor: agent.active ? '#00A9B7' : '#E1E6EA',
                      }}
                    >
                      <span
                        className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        style={{
                          transform: agent.active ? 'translateX(24px)' : 'translateX(4px)',
                        }}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Empty State */
        <div
          className="bg-white rounded-lg p-20 text-center"
          style={{ border: '1px solid #E1E6EA' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: '#D6F7F9' }}
          >
            <Bot className="w-10 h-10" style={{ color: '#00A9B7' }} />
          </div>
          <h3 className="text-xl mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>
            No agents configured yet
          </h3>
          <p className="mb-8" style={{ color: '#6E7A82', fontSize: '13px' }}>
            Build your first AI agent to automate your P2P workflows
          </p>
          <button
            onClick={() => navigate('/agent-configurator/new')}
            className="px-6 py-3 rounded-lg text-white"
            style={{ backgroundColor: '#007D87', fontSize: '13px', fontWeight: '600' }}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create your first agent
          </button>
        </div>
      )}
    </div>
  );
}

export default AgentConfiguratorList;
