import { CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';

interface ComplianceValidationSummaryProps {
  panValidationStatus: 'PENDING' | 'VALIDATED' | 'FAILED';
  cinValidationStatus: 'PENDING' | 'VALIDATED' | 'FAILED';
  udyamValidationStatus: 'PENDING' | 'VALIDATED' | 'FAILED';
  gstValidationStatus: { [key: string]: 'PENDING' | 'VALIDATED' | 'FAILED' };
  section206AB: boolean;
  gstDetails: Array<{ id: string; gstin: string; registeredState: string }>;
  bankAccounts: Array<{ id: string; primary: boolean; accountNumber: string }>;
  lastValidatedOn: string;
  onRunAllChecks: () => void;
  validating: boolean;
  panNumber: string;
  cinNumber: string;
  udyamRegistrationNo: string;
}

export function ComplianceValidationSummary({
  panValidationStatus,
  cinValidationStatus,
  udyamValidationStatus,
  gstValidationStatus,
  section206AB,
  gstDetails,
  bankAccounts,
  lastValidatedOn,
  onRunAllChecks,
  validating,
  panNumber,
  cinNumber,
  udyamRegistrationNo
}: ComplianceValidationSummaryProps) {
  
  const getStatusColor = (status: 'PENDING' | 'VALIDATED' | 'FAILED' | 'MISSING') => {
    switch (status) {
      case 'VALIDATED':
        return { bg: '#E8F5E9', text: '#2E7D32', icon: <CheckCircle className="w-4 h-4" /> };
      case 'FAILED':
        return { bg: '#FFEBEE', text: '#C62828', icon: <XCircle className="w-4 h-4" /> };
      case 'MISSING':
        return { bg: '#FFF3E0', text: '#E65100', icon: <AlertCircle className="w-4 h-4" /> };
      default:
        return { bg: '#FFF3E0', text: '#E65100', icon: <AlertCircle className="w-4 h-4" /> };
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 space-y-4" style={{ border: '1px solid #E1E6EA' }}>
      <h3 className="text-lg mb-4" style={{ color: '#0A0F14' }}>Compliance Validation Summary</h3>
      
      {/* Run Compliance Checks Button */}
      <button
        onClick={onRunAllChecks}
        disabled={validating}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white transition-colors"
        style={{ backgroundColor: validating ? '#6E7A82' : '#00A9B7' }}
        onMouseEnter={(e) => !validating && (e.currentTarget.style.backgroundColor = '#007D87')}
        onMouseLeave={(e) => !validating && (e.currentTarget.style.backgroundColor = '#00A9B7')}
      >
        <CheckCircle className="w-5 h-5" />
        {validating ? 'Running Checks...' : 'Run Compliance Checks'}
      </button>

      <p className="text-sm" style={{ color: '#6E7A82' }}>
        Last Checked: {lastValidatedOn || 'N/A'}
      </p>

      {/* Validation Status Items */}
      <div className="space-y-3">
        {/* PAN/TDS Validation Status */}
        <div 
          className="p-3 rounded-lg flex items-center justify-between"
          style={{ 
            backgroundColor: panNumber ? getStatusColor(panValidationStatus).bg : getStatusColor('MISSING').bg 
          }}
        >
          <div>
            <p className="text-sm" style={{ color: '#0A0F14' }}>PAN/TDS Validation Status</p>
          </div>
          <div className="flex items-center gap-2">
            {!panNumber ? (
              <>
                {getStatusColor('MISSING').icon}
                <span className="text-sm" style={{ color: getStatusColor('MISSING').text }}>
                  PAN Missing
                </span>
              </>
            ) : (
              <>
                {getStatusColor(panValidationStatus).icon}
                <span className="text-sm" style={{ color: getStatusColor(panValidationStatus).text }}>
                  {panValidationStatus === 'PENDING' ? 'Pending Check' : 
                   panValidationStatus === 'VALIDATED' ? 'Validated' : 'Failed'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* CIN/Company Registrar Check */}
        <div 
          className="p-3 rounded-lg flex items-center justify-between"
          style={{ 
            backgroundColor: cinNumber ? getStatusColor(cinValidationStatus).bg : getStatusColor('MISSING').bg 
          }}
        >
          <div>
            <p className="text-sm" style={{ color: '#0A0F14' }}>CIN/Company Registrar Check</p>
          </div>
          <div className="flex items-center gap-2">
            {!cinNumber ? (
              <>
                {getStatusColor('MISSING').icon}
                <span className="text-sm" style={{ color: getStatusColor('MISSING').text }}>
                  CIN Missing
                </span>
              </>
            ) : (
              <>
                {getStatusColor(cinValidationStatus).icon}
                <span className="text-sm" style={{ color: getStatusColor(cinValidationStatus).text }}>
                  {cinValidationStatus === 'PENDING' ? 'Pending Check' : 
                   cinValidationStatus === 'VALIDATED' ? 'Validated' : 'Failed'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Section 206AB Status */}
        <div 
          className="p-3 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: section206AB ? '#FFF3E0' : '#F6F9FC' }}
        >
          <div>
            <p className="text-sm" style={{ color: '#0A0F14' }}>Section 206AB Status (ITR Check)</p>
          </div>
          <div className="flex items-center gap-2">
            {section206AB ? (
              <>
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm" style={{ color: '#E65100' }}>
                  Higher TDS Rate
                </span>
              </>
            ) : (
              <span className="text-sm" style={{ color: '#6E7A82' }}>
                Not Applicable
              </span>
            )}
          </div>
        </div>

        {/* MSME Udyam Registration */}
        <div 
          className="p-3 rounded-lg flex items-center justify-between"
          style={{ 
            backgroundColor: udyamRegistrationNo ? getStatusColor(udyamValidationStatus).bg : '#F6F9FC'
          }}
        >
          <div>
            <p className="text-sm" style={{ color: '#0A0F14' }}>MSME Udyam Registration</p>
          </div>
          <div className="flex items-center gap-2">
            {!udyamRegistrationNo ? (
              <span className="text-sm" style={{ color: '#6E7A82' }}>
                N/A
              </span>
            ) : (
              <>
                {getStatusColor(udyamValidationStatus).icon}
                <span className="text-sm" style={{ color: getStatusColor(udyamValidationStatus).text }}>
                  {udyamValidationStatus === 'PENDING' ? 'Pending Check' : 
                   udyamValidationStatus === 'VALIDATED' ? 'Validated' : 'Failed'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* GSTINs Status Summary */}
        <div className="space-y-2">
          <p className="text-sm" style={{ color: '#0A0F14' }}>GSTINs Status Summary</p>
          {gstDetails.length === 0 ? (
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#F6F9FC' }}
            >
              <span className="text-sm" style={{ color: '#6E7A82' }}>
                No GST registrations added
              </span>
            </div>
          ) : (
            gstDetails.map((gst) => {
              const status = gstValidationStatus[gst.id] || 'PENDING';
              const colors = getStatusColor(status);
              return (
                <div 
                  key={gst.id}
                  className="p-3 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: colors.bg }}
                >
                  <span className="text-sm" style={{ color: '#0A0F14' }}>
                    {gst.gstin || 'Not entered'} ({gst.registeredState || 'State'})
                  </span>
                  <div className="flex items-center gap-2">
                    {colors.icon}
                    <span className="text-sm" style={{ color: colors.text }}>
                      {status === 'PENDING' ? 'Pending' : 
                       status === 'VALIDATED' ? 'Active' : 'Failed'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bank Account Verification */}
        <div className="space-y-2">
          <p className="text-sm" style={{ color: '#0A0F14' }}>Bank Account Verification</p>
          {bankAccounts.length === 0 ? (
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#F6F9FC' }}
            >
              <span className="text-sm" style={{ color: '#6E7A82' }}>
                No bank accounts added
              </span>
            </div>
          ) : (
            bankAccounts
              .filter(bank => bank.primary)
              .map((bank) => (
                <div 
                  key={bank.id}
                  className="p-3 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: '#E8F5E9' }}
                >
                  <span className="text-sm" style={{ color: '#0A0F14' }}>
                    Primary A/C (Penny Drop Check)
                  </span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm" style={{ color: '#2E7D32' }}>
                      Verified & Matched
                    </span>
                  </div>
                </div>
              ))
          )}
          {bankAccounts.length > 0 && !bankAccounts.some(b => b.primary) && (
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#FFF3E0' }}
            >
              <span className="text-sm" style={{ color: '#E65100' }}>
                No primary account selected
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
