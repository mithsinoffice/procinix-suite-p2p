import { ArrowLeft, Plus, Trash2, X, Hash, FileText, DollarSign, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { isMysqlApiEnabled, mysqlApiRequest } from '../lib/mysql/client';

interface Workflow {
  id: string;
  workflowName: string;
  minAmount: string;
  maxAmount: string;
  approver: string;
  status: string;
}

export function ApprovalWorkflow() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: '1',
      workflowName: 'Level 1 - Team Lead',
      minAmount: '0',
      maxAmount: '50000',
      approver: 'Team Lead',
      status: 'Active',
    },
    {
      id: '2',
      workflowName: 'Level 2 - Manager',
      minAmount: '50001',
      maxAmount: '200000',
      approver: 'Department Manager',
      status: 'Active',
    },
    {
      id: '3',
      workflowName: 'Level 3 - Director',
      minAmount: '200001',
      maxAmount: '1000000',
      approver: 'Director',
      status: 'Active',
    },
    {
      id: '4',
      workflowName: 'Level 4 - CFO',
      minAmount: '1000001',
      maxAmount: '5000000',
      approver: 'CFO',
      status: 'Active',
    },
    {
      id: '5',
      workflowName: 'Level 5 - CEO',
      minAmount: '5000001',
      maxAmount: 'Unlimited',
      approver: 'CEO',
      status: 'Active',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [approver, setApprover] = useState('');
  const [status, setStatus] = useState('Active');
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    if (!isMysqlApiEnabled()) {
      setIsHydrating(false);
      return;
    }

    mysqlApiRequest<{ success: boolean; data: Workflow[] }>('/workflows/approval-levels')
      .then((response) => {
        if (response.data.length > 0) {
          setWorkflows(response.data);
        }
      })
      .catch((error) => {
        console.warn('Failed to load approval workflows from MySQL API', error);
      })
      .finally(() => {
        setIsHydrating(false);
      });
  }, []);

  useEffect(() => {
    if (!isMysqlApiEnabled() || isHydrating) {
      return;
    }

    mysqlApiRequest('/workflows/approval-levels', {
      method: 'PUT',
      body: JSON.stringify({ workflows }),
    }).catch((error) => {
      console.warn('Failed to save approval workflows to MySQL API', error);
    });
  }, [isHydrating, workflows]);

  const handleSubmit = () => {
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      workflowName,
      minAmount,
      maxAmount,
      approver,
      status,
    };
    setWorkflows([...workflows, newWorkflow]);
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setWorkflowName('');
    setMinAmount('');
    setMaxAmount('');
    setApprover('');
    setStatus('Active');
  };

  const handleDelete = (id: string) => {
    setWorkflows(workflows.filter((wf) => wf.id !== id));
  };

  return (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/workflow-engine')}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-mercury-grey)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: 'var(--color-ink)' }}>
              Approval Workflow
            </h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>
              Configure approval limits and roles
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
        >
          <Plus className="w-5 h-5" />
          Add Workflow
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl">
            <div
              className="border-b px-6 py-4 flex items-center justify-between"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
                Add Approval Workflow
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Workflow Name <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <FileText
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                    <input
                      type="text"
                      value={workflowName}
                      onChange={(e) => setWorkflowName(e.target.value)}
                      placeholder="e.g., Level 6 - Board"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Min Amount <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <DollarSign
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                    <input
                      type="text"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Max Amount <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <DollarSign
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                    <input
                      type="text"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="Unlimited"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Approver <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                    <input
                      type="text"
                      value={approver}
                      onChange={(e) => setApprover(e.target.value)}
                      placeholder="e.g., Board of Directors"
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    Status <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <div className="relative">
                    <FileText
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="border-t px-6 py-4 flex justify-end gap-3"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-lg transition-colors"
                style={{
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-mercury-grey)',
                  backgroundColor: 'white',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: 'var(--color-teal)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
              <tr>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Workflow Name
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Min Amount
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Max Amount
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Approver
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Status
                </th>
                <th
                  className="px-6 py-4 text-left text-sm"
                  style={{ color: 'var(--color-mercury-grey)' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf, index) => (
                <tr
                  key={wf.id}
                  style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)' }}
                >
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {wf.workflowName}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    ₹{wf.minAmount}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    ₹{wf.maxAmount}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-mercury-grey)' }}>
                    {wf.approver}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor:
                          wf.status === 'Active' ? 'var(--color-teal-tint)' : '#FFE8EA',
                        color: wf.status === 'Active' ? 'var(--color-teal)' : 'var(--color-error)',
                      }}
                    >
                      {wf.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(wf.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
