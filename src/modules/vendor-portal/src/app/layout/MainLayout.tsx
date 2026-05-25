import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { InsightsPanel } from "./InsightsPanel";

export function MainLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [insightPanelCollapsed, setInsightPanelCollapsed] = useState(false);
  
  // Don't show navigation for portal pages
  if (location.pathname.includes('/portal/')) {
    return <Outlet />;
  }

  // Determine if Insights panel should be shown based on route
  const showInsightsPanel = 
    location.pathname === '/vendors/dashboard' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/implementation-console' ||
    location.pathname.startsWith('/vendors/dashboard');

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: "Vendor Governance", path: "/vendors/dashboard" }];
    
    // Dashboard
    if (pathSegments[0] === "vendors" && pathSegments[1] === "dashboard") {
      breadcrumbs.push({ label: "Dashboard" });
    }
    
    // Operations Group
    else if (pathSegments[0] === "vendors" && pathSegments[1] === "requests") {
      breadcrumbs.push({ label: "Operations" });
      breadcrumbs.push({ label: "Vendor Requests", path: "/vendors/requests" });
    }
    else if (pathSegments[0] === "approval" && pathSegments[1] === "workspace") {
      breadcrumbs.push({ label: "Operations" });
      breadcrumbs.push({ label: "Approval Workspace" });
    }
    else if (pathSegments[0] === "change-requests") {
      breadcrumbs.push({ label: "Operations" });
      breadcrumbs.push({ label: "Change Requests", path: "/change-requests" });
      if (pathSegments[1] === "bank") breadcrumbs.push({ label: "Bank Changes" });
      else if (pathSegments[1] === "tax") breadcrumbs.push({ label: "Tax / GST Changes" });
      else if (pathSegments[1] === "lower-tds") breadcrumbs.push({ label: "Lower TDS" });
      else if (pathSegments[1] === "address") breadcrumbs.push({ label: "Address Updates" });
    }
    else if (pathSegments[0] === "vendors" && pathSegments[1] === "master") {
      breadcrumbs.push({ label: "Operations" });
      breadcrumbs.push({ label: "Vendor Master", path: "/vendors/master" });
      if (pathSegments[2] === "active") breadcrumbs.push({ label: "Active Vendors" });
      else if (pathSegments[2] === "blocked") breadcrumbs.push({ label: "Blocked Vendors" });
      else if (pathSegments[2] === "blacklisted") breadcrumbs.push({ label: "Blacklisted" });
    }
    
    // Vendor Portal
    else if (pathSegments[0] === "vendor-portal") {
      breadcrumbs.push({ label: "Vendor Portal" });
      if (pathSegments[1] === "invitations") {
        breadcrumbs.push({ label: "Invitations" });
      } else if (pathSegments[1] === "users") {
        breadcrumbs.push({ label: "Portal Users" });
      }
    }
    
    // Risk & Compliance
    else if (pathSegments[0] === "risk") {
      breadcrumbs.push({ label: "Risk & Compliance" });
      if (pathSegments[1] === "dashboard") {
        breadcrumbs.push({ label: "Risk Dashboard" });
      } else if (pathSegments[1] === "sanctions") {
        breadcrumbs.push({ label: "Sanctions Monitoring" });
      } else if (pathSegments[1] === "kyc-logs") {
        breadcrumbs.push({ label: "KYC Logs" });
      } else if (pathSegments[1] === "document-expiry") {
        breadcrumbs.push({ label: "Document Expiry" });
      } else if (pathSegments[1] === "factors") {
        breadcrumbs.push({ label: "Risk Factors" });
      } else if (pathSegments[1] === "rules") {
        breadcrumbs.push({ label: "Risk Rules" });
      }
    }
    
    // Integration
    else if (pathSegments[0] === "integration") {
      breadcrumbs.push({ label: "Integration" });
      if (pathSegments[1] === "erp-sync") {
        breadcrumbs.push({ label: "ERP Sync", path: "/integration/erp-sync" });
        if (pathSegments[2] === "logs") breadcrumbs.push({ label: "Sync Logs" });
        else if (pathSegments[2] === "failed") breadcrumbs.push({ label: "Failed Syncs" });
        else if (pathSegments[2] === "mapping") breadcrumbs.push({ label: "ERP Mapping" });
      } else if (pathSegments[1] === "erp-systems") {
        breadcrumbs.push({ label: "ERP Systems" });
      }
    }
    
    // Reports
    else if (pathSegments[0] === "reports") {
      breadcrumbs.push({ label: "Reports" });
    }
    
    // Workflow Engine
    else if (pathSegments[0] === "workflow") {
      breadcrumbs.push({ label: "Workflow Engine" });
      if (pathSegments[1] === "types") {
        breadcrumbs.push({ label: "Workflow Types" });
      } else if (pathSegments[1] === "configuration") {
        breadcrumbs.push({ label: "Workflow Configuration" });
      } else if (pathSegments[1] === "validation-rules") {
        breadcrumbs.push({ label: "Validation Rules" });
      } else if (pathSegments[1] === "sla-rules") {
        breadcrumbs.push({ label: "SLA Rules" });
      } else if (pathSegments[1] === "approval-roles") {
        breadcrumbs.push({ label: "Approval Roles" });
      } else if (pathSegments[1] === "department-matrix") {
        breadcrumbs.push({ label: "Department Matrix" });
      } else if (pathSegments[1] === "change-types") {
        breadcrumbs.push({ label: "Change Types" });
      }
    }
    
    // Implementation Console
    else if (pathSegments[0] === "implementation-console") {
      breadcrumbs.push({ label: "Implementation Console" });
    }
    
    // Configuration (Masters)
    else if (pathSegments[0] === "config") {
      breadcrumbs.push({ label: "Configuration" });
      const configLabel = pathSegments[1]
        ?.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      if (configLabel) breadcrumbs.push({ label: configLabel });
    }
    else if (pathSegments[0] === "masters") {
      breadcrumbs.push({ label: "Configuration" });
      if (pathSegments[1]) {
        const masterLabel = pathSegments[1]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        breadcrumbs.push({ label: masterLabel });
      }
    }
    
    return breadcrumbs;
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Left Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* Main Content Area */}
      <div 
        className="transition-all duration-300"
        style={{ 
          marginLeft: sidebarCollapsed ? '64px' : '260px',
          marginRight: showInsightsPanel ? (insightPanelCollapsed ? '48px' : '320px') : '0px'
        }}
      >
        {/* Top Header */}
        <Header breadcrumbs={generateBreadcrumbs()} />

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>

      {/* Right Insight Panel - Only shown on specific routes */}
      {showInsightsPanel && <InsightsPanel collapsed={insightPanelCollapsed} onToggle={() => setInsightPanelCollapsed(!insightPanelCollapsed)} />}
    </div>
  );
}
