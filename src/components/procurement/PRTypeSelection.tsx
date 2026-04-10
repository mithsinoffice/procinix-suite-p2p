import { useNavigate } from 'react-router-dom';
import { ShoppingCart, FileText, Briefcase, ArrowRight, Check, ArrowLeft, Package, Building2, RefreshCw, FileCheck, Zap } from 'lucide-react';

/**
 * PR TYPE SELECTION - ENTERPRISE SCENARIOS
 * Multiple procurement scenarios to handle different business cases
 */

export function PRTypeSelection() {
  const navigate = useNavigate();

  const prTypes = [
    {
      id: 'catalogue',
      title: 'Catalogue PR',
      subtitle: 'Pre-approved catalog items',
      icon: ShoppingCart,
      color: '#00A9B7',
      bgColor: '#E8F7F8',
      route: '/procurement/pr/create/catalogue',
      description: 'Create PR from pre-approved vendor catalogs with fixed pricing',
      useCases: [
        'Office supplies & stationery',
        'IT accessories from approved vendors',
        'Standard consumables'
      ],
      constraints: [
        'Vendor & rates pre-fixed',
        'No price negotiation allowed',
        'Auto-approval if within budget'
      ],
      bestFor: 'Quick procurement of standard items',
      implemented: true
    },
    {
      id: 'regular',
      title: 'Regular PR',
      subtitle: 'Multi-item, multi-vendor procurement',
      icon: FileText,
      color: '#2E7D32',
      bgColor: '#E8F5E9',
      route: '/procurement/pr/create/regular',
      description: 'Standard PR for multiple independent items from different vendors',
      useCases: [
        'Multiple items from different vendors',
        'Items not in catalog',
        'Price comparison required'
      ],
      constraints: [
        'Requires vendor selection',
        'Price variance alerts',
        'Budget approval needed'
      ],
      bestFor: 'General procurement needs',
      implemented: true
    },
    {
      id: 'kit-bundle',
      title: 'Kit/Bundle PR',
      subtitle: 'Products with multiple SKUs',
      icon: Package,
      color: '#1976D2',
      bgColor: '#E3F2FD',
      route: '/procurement/pr/create/kit-bundle',
      description: 'For products that comprise multiple SKUs (e.g., Laptop Kit = Laptop + Charger + Mouse + Bag)',
      useCases: [
        'Laptop/Desktop kits with accessories',
        'Onboarding kits (laptop + peripherals)',
        'Bundled products sold as one unit'
      ],
      constraints: [
        'All SKUs must be from same vendor',
        'Cannot split bundle items',
        'Pricing shown for bundle & individual SKUs'
      ],
      bestFor: 'Multi-SKU product procurement',
      implemented: true
    },
    {
      id: 'service',
      title: 'Service PR',
      subtitle: 'Professional services & consulting',
      icon: Briefcase,
      color: '#F57C00',
      bgColor: '#FFF3E0',
      route: '/procurement/pr/create/service',
      description: 'For professional services, consulting, AMC, and service contracts',
      useCases: [
        'Professional consulting',
        'AMC & maintenance contracts',
        'Training & development programs'
      ],
      constraints: [
        'Requires GL account mapping',
        'SoW/Contract document mandatory',
        'Milestone-based payments'
      ],
      bestFor: 'Service-based procurement',
      implemented: true
    },
    {
      id: 'asset-capex',
      title: 'Asset/CAPEX PR',
      subtitle: 'High-value capital assets',
      icon: Building2,
      color: '#7B1FA2',
      bgColor: '#F3E5F5',
      route: '/procurement/pr/create/asset-capex',
      description: 'For high-value capital assets requiring asset tagging and depreciation',
      useCases: [
        'Machinery & equipment (&gt;₹50L)',
        'Vehicles & infrastructure',
        'IT hardware assets requiring tagging'
      ],
      constraints: [
        'Budget approval mandatory',
        'Asset tag assignment required',
        'Depreciation schedule needed'
      ],
      bestFor: 'Capital expenditure items',
      implemented: true
    },
    {
      id: 'blanket',
      title: 'Blanket PR',
      subtitle: 'Recurring orders with release schedule',
      icon: RefreshCw,
      color: '#C62828',
      bgColor: '#FFEBEE',
      route: '/procurement/pr/create/blanket',
      description: 'For recurring orders with planned release schedule over a period',
      useCases: [
        'Monthly/quarterly consumables',
        'Recurring raw material orders',
        'Scheduled deliveries over time'
      ],
      constraints: [
        'Total quantity & value defined upfront',
        'Release schedule must be specified',
        'Valid for specific time period'
      ],
      bestFor: 'Planned recurring procurement',
      implemented: true
    },
    {
      id: 'contract-based',
      title: 'Contract-based PR',
      subtitle: 'Based on existing contracts/AMCs',
      icon: FileCheck,
      color: '#00695C',
      bgColor: '#E0F2F1',
      route: '/procurement/pr/create/contract-based',
      description: 'Create PR against existing contracts, AMCs, or rate contracts',
      useCases: [
        'Call-off orders from rate contracts',
        'AMC renewal/continuation',
        'Pre-negotiated framework agreements'
      ],
      constraints: [
        'Contract must be active',
        'Cannot exceed contract limits',
        'Rates locked as per contract'
      ],
      bestFor: 'Contract-based ordering',
      implemented: false
    },
    {
      id: 'emergency',
      title: 'Emergency PR',
      subtitle: 'Urgent fast-track procurement',
      icon: Zap,
      color: '#D84315',
      bgColor: '#FBE9E7',
      route: '/procurement/pr/create/emergency',
      description: 'Fast-track approval for emergency/urgent procurement needs',
      useCases: [
        'Emergency breakdown repairs',
        'Critical production requirements',
        'Urgent client deliverables'
      ],
      constraints: [
        'Justification mandatory',
        'Single-level approval',
        'Post-facto approval tracking'
      ],
      bestFor: 'Emergency situations only',
      implemented: false
    }
  ];

  return (
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      <div className="bg-white px-8 py-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => navigate('/procurement/pr/my-prs')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: '#6E7A82' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl mb-1" style={{ color: '#0A0F14', margin: 0 }}>Create Purchase Requisition</h1>
            <p className="text-sm" style={{ color: '#6E7A82', margin: 0 }}>Select the type of PR based on your procurement scenario</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Help Section */}
        <div className="bg-white p-6 rounded-lg mb-8" style={{ border: '1px solid #E1E6EA' }}>
          <h3 className="text-base mb-3" style={{ color: '#0A0F14', fontWeight: '600' }}>📋 How to Choose the Right PR Type?</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>
                <strong style={{ color: '#0A0F14' }}>Catalogue PR:</strong> Use when ordering from pre-approved vendor catalogs
              </p>
              <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>
                <strong style={{ color: '#0A0F14' }}>Regular PR:</strong> Use for general procurement with multiple items/vendors
              </p>
              <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>
                <strong style={{ color: '#0A0F14' }}>Kit/Bundle PR:</strong> Use when a product has multiple SKUs (e.g., laptop kit)
              </p>
              <p className="text-sm" style={{ color: '#6E7A82' }}>
                <strong style={{ color: '#0A0F14' }}>Service PR:</strong> Use for consulting, AMC, training, or service contracts
              </p>
            </div>
            <div>
              <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>
                <strong style={{ color: '#0A0F14' }}>Asset/CAPEX PR:</strong> Use for high-value capital assets (&gt;₹50L)
              </p>
              <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>
                <strong style={{ color: '#0A0F14' }}>Blanket PR:</strong> Use for recurring orders with planned delivery schedule
              </p>
              <p className="text-sm mb-2" style={{ color: '#6E7A82' }}>
                <strong style={{ color: '#0A0F14' }}>Contract-based PR:</strong> Use for orders against existing contracts/AMCs
              </p>
              <p className="text-sm" style={{ color: '#6E7A82' }}>
                <strong style={{ color: '#0A0F14' }}>Emergency PR:</strong> Use only for urgent/emergency procurement needs
              </p>
            </div>
          </div>
        </div>

        {/* PR Type Cards */}
        <div className="grid grid-cols-2 gap-6">
          {prTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.id}
                className="bg-white rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg"
                style={{ 
                  border: `2px solid ${type.implemented ? type.color : '#E1E6EA'}`,
                  opacity: type.implemented ? 1 : 0.6,
                  position: 'relative'
                }}
                onClick={() => type.implemented && navigate(type.route)}
              >
                {!type.implemented && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs" style={{ backgroundColor: '#FFF3E0', color: '#F57C00' }}>
                    Coming Soon
                  </div>
                )}
                
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: type.bgColor }}>
                    <Icon className="w-6 h-6" style={{ color: type.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg mb-1" style={{ color: '#0A0F14', fontWeight: '600' }}>{type.title}</h3>
                    <p className="text-sm" style={{ color: '#6E7A82' }}>{type.subtitle}</p>
                  </div>
                  {type.implemented && (
                    <ArrowRight className="w-5 h-5" style={{ color: type.color }} />
                  )}
                </div>

                <p className="text-sm mb-4" style={{ color: '#6E7A82' }}>{type.description}</p>

                <div className="mb-4">
                  <p className="text-xs mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>USE CASES:</p>
                  <ul className="space-y-1">
                    {type.useCases.map((useCase, idx) => (
                      <li key={idx} className="text-xs flex items-start gap-2" style={{ color: '#6E7A82' }}>
                        <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: type.color }} />
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4">
                  <p className="text-xs mb-2" style={{ color: '#0A0F14', fontWeight: '600' }}>CONSTRAINTS:</p>
                  <ul className="space-y-1">
                    {type.constraints.map((constraint, idx) => (
                      <li key={idx} className="text-xs" style={{ color: '#6E7A82' }}>
                        • {constraint}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4" style={{ borderTop: '1px solid #E1E6EA' }}>
                  <p className="text-xs" style={{ color: '#6E7A82' }}>
                    <strong style={{ color: type.color }}>Best for:</strong> {type.bestFor}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}