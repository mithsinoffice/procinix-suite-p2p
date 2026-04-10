import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Milestone {
  id: string;
  name: string;
  type: 'Fabric Sourcing' | 'Production';
  estimatedDate: string;
  actualDate: string;
}

export function POUpdate() {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: '1',
      name: 'Fabric Sourcing',
      type: 'Fabric Sourcing',
      estimatedDate: '2025-01-15',
      actualDate: ''
    },
    {
      id: '2',
      name: 'Production Phase 1',
      type: 'Production',
      estimatedDate: '2025-02-01',
      actualDate: ''
    }
  ]);

  const handleAddMilestone = (type: 'Fabric Sourcing' | 'Production') => {
    const milestone: Milestone = {
      id: Date.now().toString(),
      name: type,
      type: type,
      estimatedDate: '',
      actualDate: ''
    };
    setMilestones([...milestones, milestone]);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleMilestoneChange = (id: string, field: keyof Milestone, value: string) => {
    setMilestones(milestones.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const calculateMilestoneDelay = (estimatedDate: string, actualDate: string) => {
    if (!estimatedDate) return 0;
    const today = new Date();
    const estimated = new Date(estimatedDate);
    const actual = actualDate ? new Date(actualDate) : today;
    const diffTime = actual.getTime() - estimated.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculateOverallDelay = () => {
    return milestones.reduce((total, m) => {
      return total + calculateMilestoneDelay(m.estimatedDate, m.actualDate);
    }, 0);
  };

  const getMilestoneStatus = (estimatedDate: string, actualDate: string) => {
    if (!estimatedDate) return { label: 'Not Set', color: '#6E7A82' };
    if (actualDate) return { label: 'Completed', color: '#4CAF50' };
    
    const today = new Date();
    const estimated = new Date(estimatedDate);
    const diffTime = estimated.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', color: '#FF4E5B' };
    if (diffDays <= 7) return { label: 'Due Soon', color: '#FF9800' };
    return { label: 'Pending', color: '#00A9B7' };
  };

  const handleSaveAndNotify = () => {
    // Simulate save and notification
    alert('Milestone updates saved successfully!\n\nNotifications sent to:\n• Procurement Manager\n• Approver\n• Finance Team\n• Vendor');
  };

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/purchase-orders')}
          className="flex items-center gap-2 mb-4 transition-colors"
          style={{ color: '#6E7A82' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#00A9B7'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#6E7A82'}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-2" style={{ color: '#0A0F14' }}>PO Milestone Update</h1>
            <p style={{ color: '#6E7A82' }}>Update delivery milestone progress and notify stakeholders</p>
          </div>
        </div>
      </div>

      {/* PO Summary Card */}
      <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '1px solid #E1E6EA' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl" style={{ color: '#0A0F14' }}>Purchase Order Summary</h2>
          <span 
            className="px-3 py-1 rounded-full text-sm"
            style={{ backgroundColor: '#E3F2FD', color: '#00A9B7' }}
          >
            PO-2024-001
          </span>
        </div>
        
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Vendor</p>
            <p style={{ color: '#0A0F14' }}>Acme Supplies Ltd</p>
          </div>
          <div>
            <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>PO Date</p>
            <p style={{ color: '#0A0F14' }}>2024-12-10</p>
          </div>
          <div>
            <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>PO Value</p>
            <p style={{ color: '#0A0F14' }}>₹1,25,000.00</p>
          </div>
          <div>
            <p className="text-sm mb-1" style={{ color: '#6E7A82' }}>Status</p>
            <p style={{ color: '#00A9B7' }}>Issued</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div 
        className="flex items-start gap-3 p-4 rounded-lg mb-6"
        style={{ backgroundColor: '#E3F2FD', border: '1px solid #00A9B7' }}
      >
        <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: '#00A9B7' }} />
        <div>
          <p style={{ color: '#0A0F14' }}>
            <strong>Update Delivery Milestones:</strong> Use this screen to track actual completion dates for sourcing and production milestones.
          </p>
          <p className="text-sm mt-1" style={{ color: '#6E7A82' }}>
            After updating, click "Save & Notify Stakeholders" to automatically calculate delays and send email notifications to all relevant parties.
          </p>
        </div>
      </div>

      {/* Delivery Milestone Tracking */}
      <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '1px solid #E1E6EA' }}>
        <div className="flex items-start gap-3 mb-6">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8EAF6', color: '#5E35B1' }}>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl mb-1" style={{ color: '#0A0F14' }}>Delivery Milestone Tracking</h2>
            <p className="text-sm" style={{ color: '#5E35B1' }}>Update actual completion dates and track delays in real-time</p>
          </div>
        </div>

        {milestones.length === 0 ? (
          <div className="text-center py-8 mb-6">
            <p style={{ color: '#6E7A82' }} className="mb-4">
              No milestones have been set for this PO yet. Use the buttons below to add milestones.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-4">
              {milestones.map((milestone) => {
                const status = getMilestoneStatus(milestone.estimatedDate, milestone.actualDate);
                const delay = calculateMilestoneDelay(milestone.estimatedDate, milestone.actualDate);
                
                return (
                  <div 
                    key={milestone.id} 
                    className="p-4 rounded-lg" 
                    style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span style={{ color: '#0A0F14' }}>{milestone.name}</span>
                        <span 
                          className="px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: 'white', color: status.color, border: `1px solid ${status.color}` }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveMilestone(milestone.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: '#FF4E5B' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          Milestone Name
                        </label>
                        <input
                          type="text"
                          value={milestone.name}
                          onChange={(e) => handleMilestoneChange(milestone.id, 'name', e.target.value)}
                          placeholder={milestone.type}
                          className="w-full px-3 py-2 rounded-lg"
                          style={{ 
                            border: '1px solid #E1E6EA',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          Estimated Completion Date
                        </label>
                        <input
                          type="date"
                          value={milestone.estimatedDate}
                          onChange={(e) => handleMilestoneChange(milestone.id, 'estimatedDate', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg"
                          style={{ 
                            border: '1px solid #E1E6EA',
                            backgroundColor: '#FFF8E1',
                            color: '#0A0F14'
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                          Actual Completion Date <span style={{ color: '#FF4E5B' }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={milestone.actualDate}
                          onChange={(e) => handleMilestoneChange(milestone.id, 'actualDate', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg"
                          style={{ 
                            border: '2px solid #00A9B7',
                            backgroundColor: 'white',
                            color: '#0A0F14'
                          }}
                        />
                      </div>
                    </div>
                    
                    {milestone.estimatedDate && (
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm" style={{ color: '#6E7A82' }}>
                            Delay: <span style={{ color: delay > 0 ? '#FF4E5B' : '#4CAF50' }}>
                              {delay > 0 ? `${delay} days` : 'On Track'}
                            </span>
                          </span>
                          {!milestone.actualDate && milestone.estimatedDate && (
                            <span className="text-xs" style={{ color: '#6E7A82' }}>
                              Expected: {new Date(milestone.estimatedDate).toLocaleDateString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Overall Delay Summary */}
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFE082' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <span style={{ color: '#0A0F14' }}>Overall Cumulative Delay:</span>
                  <span style={{ color: '#FF4E5B' }} className="text-2xl">
                    {calculateOverallDelay()} Days
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: '#6E7A82' }}>
                    {milestones.filter(m => m.actualDate).length} of {milestones.length} milestones completed
                  </p>
                </div>
              </div>
              <p className="text-xs" style={{ color: '#6E7A82' }}>
                This delay metric is automatically calculated based on estimated vs actual completion dates
              </p>
            </div>
          </>
        )}

        {/* Add Milestone Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => handleAddMilestone('Fabric Sourcing')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#4CAF50' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#388E3C'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
          >
            <Plus className="w-4 h-4" />
            Add Fabric Sourcing
          </button>
          <button
            onClick={() => handleAddMilestone('Production')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#4CAF50' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#388E3C'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
          >
            <Plus className="w-4 h-4" />
            Add Production
          </button>
        </div>

        {/* Action Buttons */}
        <div 
          className="flex items-center justify-between pt-6"
          style={{ borderTop: '1px solid #E1E6EA' }}
        >
          <p className="text-sm" style={{ color: '#6E7A82' }}>
            <strong style={{ color: '#0A0F14' }}>Notification Recipients:</strong> Procurement Manager, Approver, Finance Team & Vendor
          </p>
          <button
            onClick={handleSaveAndNotify}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#00A9B7' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Save & Notify Stakeholders
          </button>
        </div>
      </div>
    </div>
  );
}