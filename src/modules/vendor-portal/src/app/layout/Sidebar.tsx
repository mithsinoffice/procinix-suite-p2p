import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import procinixLogo from "../../assets/procinix-logo.png";
import {
  LayoutDashboard,
  FileText,
  Globe,
  Users,
  GitBranch,
  ShieldAlert,
  RefreshCw,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Building2,
  AlertCircle,
  UserCheck,
  Ban,
  Landmark,
  FileEdit,
  TrendingDown,
  MapPin,
  Activity,
  Eye,
  FileWarning,
  Calendar,
  Database,
  AlertTriangle,
  Map,
  BookOpen,
  Sliders,
  Shield,
  Users2,
  DollarSign,
  CreditCard,
  FileCheck,
  Target,
  Bell,
  TrendingUp,
  CheckCircle,
  Mail,
  CheckCircle2,
  Package,
  Zap,
  Clock,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
    path: "/vendors/dashboard",
  },
  {
    label: "Operations",
    icon: <Package className="w-4 h-4" />,
    children: [
      {
        label: "Vendor Requests",
        icon: <FileText className="w-4 h-4" />,
        path: "/vendors/requests",
      },
      {
        label: "Approval Workspace",
        icon: <CheckCircle className="w-4 h-4" />,
        path: "/approval/workspace",
      },
      {
        label: "Change Requests",
        icon: <GitBranch className="w-4 h-4" />,
        path: "/change-requests",
        children: [
          {
            label: "Bank Changes",
            icon: <Landmark className="w-4 h-4" />,
            path: "/change-requests/bank",
          },
          {
            label: "Tax / GST Changes",
            icon: <FileWarning className="w-4 h-4" />,
            path: "/change-requests/tax",
          },
          {
            label: "Lower TDS",
            icon: <TrendingDown className="w-4 h-4" />,
            path: "/change-requests/lower-tds",
          },
          {
            label: "Address Updates",
            icon: <MapPin className="w-4 h-4" />,
            path: "/change-requests/address",
          },
        ],
      },
      {
        label: "Vendor Master",
        icon: <Building2 className="w-4 h-4" />,
        path: "/vendors/master",
        children: [
          {
            label: "Active Vendors",
            icon: <CheckCircle2 className="w-4 h-4" />,
            path: "/vendors/master/active",
          },
          {
            label: "Blocked Vendors",
            icon: <Ban className="w-4 h-4" />,
            path: "/vendors/master/blocked",
          },
          {
            label: "Blacklisted",
            icon: <AlertTriangle className="w-4 h-4" />,
            path: "/vendors/master/blacklisted",
          },
        ],
      },
    ],
  },
  {
    label: "Vendor Portal",
    icon: <Globe className="w-4 h-4" />,
    children: [
      {
        label: "Home",
        icon: <LayoutDashboard className="w-4 h-4" />,
        path: "/vendor-portal/home",
      },
      {
        label: "Invitations",
        icon: <Mail className="w-4 h-4" />,
        path: "/vendor-portal/invitations",
      },
      {
        label: "Portal Users",
        icon: <Users className="w-4 h-4" />,
        path: "/vendor-portal/users",
      },
    ],
  },
  {
    label: "Risk & Compliance",
    icon: <ShieldAlert className="w-4 h-4" />,
    children: [
      {
        label: "Risk Dashboard",
        icon: <Activity className="w-4 h-4" />,
        path: "/risk/dashboard",
      },
      {
        label: "Sanctions Monitoring",
        icon: <Shield className="w-4 h-4" />,
        path: "/risk/sanctions",
      },
      {
        label: "KYC Logs",
        icon: <BookOpen className="w-4 h-4" />,
        path: "/risk/kyc-logs",
      },
      {
        label: "Document Expiry",
        icon: <Calendar className="w-4 h-4" />,
        path: "/risk/document-expiry",
      },
      {
        label: "Risk Factors",
        icon: <Target className="w-4 h-4" />,
        path: "/risk/factors",
      },
      {
        label: "Risk Rules",
        icon: <Activity className="w-4 h-4" />,
        path: "/risk/rules",
      },
    ],
  },
  {
    label: "Integration",
    icon: <RefreshCw className="w-4 h-4" />,
    children: [
      {
        label: "ERP Sync",
        icon: <Database className="w-4 h-4" />,
        path: "/integration/erp-sync",
        children: [
          {
            label: "Sync Logs",
            icon: <BookOpen className="w-4 h-4" />,
            path: "/integration/erp-sync/logs",
          },
          {
            label: "Failed Syncs",
            icon: <AlertTriangle className="w-4 h-4" />,
            path: "/integration/erp-sync/failed",
          },
          {
            label: "ERP Mapping",
            icon: <Map className="w-4 h-4" />,
            path: "/integration/erp-sync/mapping",
          },
        ],
      },
      {
        label: "ERP Systems",
        icon: <Database className="w-4 h-4" />,
        path: "/integration/erp-systems",
      },
    ],
  },
  {
    label: "Reports",
    icon: <BarChart3 className="w-4 h-4" />,
    path: "/reports",
  },
  {
    label: "Workflow Engine",
    icon: <Zap className="w-4 h-4" />,
    children: [
      {
        label: "Workflow Types",
        icon: <GitBranch className="w-4 h-4" />,
        path: "/workflow/types",
      },
      {
        label: "Workflow Configuration",
        icon: <Sliders className="w-4 h-4" />,
        path: "/workflow/configuration",
      },
      {
        label: "Validation Rules",
        icon: <FileCheck className="w-4 h-4" />,
        path: "/workflow/validation-rules",
      },
      {
        label: "SLA Rules",
        icon: <Clock className="w-4 h-4" />,
        path: "/workflow/sla-rules",
      },
      {
        label: "Approval Roles",
        icon: <Users className="w-4 h-4" />,
        path: "/workflow/approval-roles",
      },
      {
        label: "Department Matrix",
        icon: <Users2 className="w-4 h-4" />,
        path: "/workflow/department-matrix",
      },
      {
        label: "Change Types",
        icon: <FileEdit className="w-4 h-4" />,
        path: "/workflow/change-types",
      },
    ],
  },
  {
    label: "Implementation Console",
    icon: <Activity className="w-4 h-4" />,
    path: "/implementation-console",
  },
  {
    label: "Configuration",
    icon: <Settings className="w-4 h-4" />,
    children: [
      // Foundation Masters
      {
        label: "Vendor Type",
        icon: <Building2 className="w-4 h-4" />,
        path: "/config/vendor-type",
      },
      {
        label: "Vendor Category",
        icon: <FileText className="w-4 h-4" />,
        path: "/config/vendor-category",
      },
      {
        label: "Country",
        icon: <Globe className="w-4 h-4" />,
        path: "/config/country",
      },
      {
        label: "Address Type",
        icon: <MapPin className="w-4 h-4" />,
        path: "/config/address-type",
      },
      {
        label: "Currency",
        icon: <DollarSign className="w-4 h-4" />,
        path: "/config/currency",
      },
      {
        label: "Payment Method",
        icon: <CreditCard className="w-4 h-4" />,
        path: "/config/payment-method",
      },
      {
        label: "Payment Terms",
        icon: <Calendar className="w-4 h-4" />,
        path: "/config/payment-terms",
      },
      // Compliance Masters
      {
        label: "Tax Identifier Types",
        icon: <FileCheck className="w-4 h-4" />,
        path: "/config/tax-identifiers",
      },
      {
        label: "Compliance Docs",
        icon: <FileText className="w-4 h-4" />,
        path: "/config/compliance-docs",
      },
      {
        label: "Sanctions Sources",
        icon: <ShieldAlert className="w-4 h-4" />,
        path: "/config/sanctions-sources",
      },
      {
        label: "KYC Sources",
        icon: <Eye className="w-4 h-4" />,
        path: "/config/kyc-sources",
      },
      {
        label: "TDS Categories",
        icon: <TrendingUp className="w-4 h-4" />,
        path: "/config/tds-categories",
      },
      // Platform Masters
      {
        label: "Entities",
        icon: <Building2 className="w-4 h-4" />,
        path: "/config/entities",
      },
      {
        label: "Departments",
        icon: <Users className="w-4 h-4" />,
        path: "/config/departments",
      },
      {
        label: "Notification Templates",
        icon: <Bell className="w-4 h-4" />,
        path: "/config/notification-templates",
      },
      {
        label: "Audit Events",
        icon: <Activity className="w-4 h-4" />,
        path: "/config/audit-events",
      },
    ],
  },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  
  // Auto-expand menus based on current path
  const getInitialExpandedItems = () => {
    const expanded: string[] = [];
    
    // Operations group
    if (location.pathname.startsWith("/vendors/requests") || 
        location.pathname.startsWith("/approval/workspace") ||
        location.pathname.startsWith("/change-requests") ||
        location.pathname.startsWith("/vendors/master")) {
      expanded.push("Operations");
    }
    
    // Sub-menus within Operations
    if (location.pathname.startsWith("/change-requests")) {
      expanded.push("Change Requests");
    }
    if (location.pathname.startsWith("/vendors/master")) {
      expanded.push("Vendor Master");
    }
    
    // Vendor Portal
    if (location.pathname.startsWith("/vendor-portal")) {
      expanded.push("Vendor Portal");
    }
    
    // Risk & Compliance
    if (location.pathname.startsWith("/risk")) {
      expanded.push("Risk & Compliance");
    }
    
    // Integration
    if (location.pathname.startsWith("/integration")) {
      expanded.push("Integration");
      if (location.pathname.startsWith("/integration/erp-sync")) {
        expanded.push("ERP Sync");
      }
    }
    
    // Workflow Engine
    if (location.pathname.startsWith("/workflow")) {
      expanded.push("Workflow Engine");
    }
    
    // Configuration
    if (location.pathname.startsWith("/config") || location.pathname.startsWith("/masters")) {
      expanded.push("Configuration");
    }
    
    return expanded;
  };
  
  const [expandedItems, setExpandedItems] = useState<string[]>(getInitialExpandedItems());

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isParentActive = (item: NavItem): boolean => {
    if (item.path && isActive(item.path)) return true;
    if (item.children) {
      return item.children.some((child) => {
        if (isActive(child.path)) return true;
        if (child.children) {
          return child.children.some((subChild) => isActive(subChild.path));
        }
        return false;
      });
    }
    return false;
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#0A0F14] border-r border-[#1A1F24] flex flex-col transition-all duration-300 z-50 ${
        collapsed ? "w-16" : "w-[260px]"
      }`}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1A1F24]">
        {!collapsed && (
          <Link to="/" className="flex items-center">
            <img src={procinixLogo} alt="Procinix" className="h-8 w-auto object-contain" />
          </Link>
        )}
        {collapsed && (
          <Link to="/" className="flex items-center justify-center w-full">
            <img src={procinixLogo} alt="Procinix" className="h-7 w-auto object-contain" />
          </Link>
        )}
      </div>

      {/* Toggle Button */}
      <div className="px-4 py-3 border-b border-[#1A1F24]">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 hover:bg-[#1A1F24] rounded-lg transition-colors text-[#94A3B8]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        {!collapsed && (
          <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider px-3 mb-3">
            Vendor Governance
          </div>
        )}

        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button
                    onClick={() => !collapsed && toggleExpanded(item.label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                      isParentActive(item)
                        ? "bg-[#00A9B7]/10 text-[#00A9B7]"
                        : "text-[#94A3B8] hover:text-white hover:bg-[#1A1F24]"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    {isParentActive(item) && !collapsed && (
                      <div className="absolute left-0 w-1 h-8 bg-[#00A9B7] rounded-r" />
                    )}
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left font-medium">{item.label}</span>
                        {expandedItems.includes(item.label) ? (
                          <ChevronDown className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        )}
                      </>
                    )}
                  </button>
                  {!collapsed && expandedItems.includes(item.label) && item.children && (
                    <div className="ml-3 mt-1 space-y-1 border-l border-[#1A1F24] pl-3">
                      {item.children.map((child) => (
                        <div key={child.label}>
                          {child.children ? (
                            <>
                              <button
                                onClick={() => toggleExpanded(child.label)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                                  isParentActive(child)
                                    ? "bg-[#00A9B7]/10 text-[#00A9B7] font-medium"
                                    : "text-[#94A3B8] hover:text-white hover:bg-[#1A1F24]"
                                }`}
                              >
                                <span className="flex-shrink-0">{child.icon}</span>
                                <span className="flex-1 text-left">{child.label}</span>
                                {expandedItems.includes(child.label) ? (
                                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                )}
                              </button>
                              {expandedItems.includes(child.label) && child.children && (
                                <div className="ml-3 mt-1 space-y-1 border-l border-[#1A1F24] pl-3">
                                  {child.children.map((subChild) => (
                                    <Link
                                      key={subChild.label}
                                      to={subChild.path || "#"}
                                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                                        isActive(subChild.path)
                                          ? "bg-[#00A9B7]/10 text-[#00A9B7] font-medium"
                                          : "text-[#94A3B8] hover:text-white hover:bg-[#1A1F24]"
                                      }`}
                                    >
                                      <span className="flex-shrink-0">{subChild.icon}</span>
                                      <span>{subChild.label}</span>
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <Link
                              to={child.path || "#"}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                                isActive(child.path)
                                  ? "bg-[#00A9B7]/10 text-[#00A9B7] font-medium"
                                  : "text-[#94A3B8] hover:text-white hover:bg-[#1A1F24]"
                              }`}
                            >
                              <span className="flex-shrink-0">{child.icon}</span>
                              <span>{child.label}</span>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path || "#"}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative group ${
                    isActive(item.path)
                      ? "bg-[#00A9B7]/10 text-[#00A9B7]"
                      : "text-[#94A3B8] hover:text-white hover:bg-[#1A1F24]"
                  } ${collapsed ? "justify-center" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive(item.path) && !collapsed && (
                    <div className="absolute left-0 w-1 h-8 bg-[#00A9B7] rounded-r" />
                  )}
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-[#1A1F24]">
          <div className="text-xs text-[#64748B] text-center">
            <div>Procinix ERP v2.4.1</div>
            <div className="mt-1">© 2026 Procinix</div>
          </div>
        </div>
      )}
    </aside>
  );
}
