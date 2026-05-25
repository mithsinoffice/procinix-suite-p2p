import { useState } from "react";
import {
  PanelRightClose,
  PanelRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  PlayCircle,
  Mail,
  GitBranch,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/design-system/StatusBadge";

export function InsightsPanel({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  if (collapsed) {
    return (
      <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-12 bg-white border-l border-[#E6EEF2] flex items-start justify-center pt-4 z-30">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-[#F6F9FC] rounded-lg transition-colors text-[#64748B]"
          title="Show insights"
        >
          <PanelRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-[320px] bg-white border-l border-[#E6EEF2] overflow-y-auto z-30">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-[#E6EEF2] p-4 flex items-center justify-between">
        <h3 className="font-semibold text-[#0A0F14]">Insights</h3>
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-[#F6F9FC] rounded-lg transition-colors text-[#64748B]"
          title="Hide insights"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Validation Summary */}
        <div>
          <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
            Validation Summary
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                <span className="text-sm text-[#0A0F14]">Completed</span>
              </div>
              <span className="text-sm font-semibold text-[#16A34A]">12</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#FEF3C7] rounded-lg border border-[#FDE68A]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-sm text-[#0A0F14]">In Progress</span>
              </div>
              <span className="text-sm font-semibold text-[#F59E0B]">8</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#FEE2E2] rounded-lg border border-[#FECACA]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                <span className="text-sm text-[#0A0F14]">Blocked</span>
              </div>
              <span className="text-sm font-semibold text-[#DC2626]">3</span>
            </div>
          </div>
        </div>

        {/* High-Risk Alerts */}
        <div>
          <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
            High-Risk Alerts
          </h4>
          <div className="space-y-3">
            <div className="p-3 bg-[#FEF2F2] rounded-lg border border-[#FEE2E2]">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#0A0F14] mb-1">
                    Sanctions Match
                  </div>
                  <div className="text-xs text-[#64748B]">
                    GlobalTech Industries - PEP match detected
                  </div>
                </div>
              </div>
              <StatusBadge status="error" label="Critical" size="sm" />
            </div>

            <div className="p-3 bg-[#FEF2F2] rounded-lg border border-[#FEE2E2]">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#0A0F14] mb-1">
                    Document Expiry
                  </div>
                  <div className="text-xs text-[#64748B]">
                    TechCore Solutions - Tax cert expires in 5 days
                  </div>
                </div>
              </div>
              <StatusBadge status="warning" label="Urgent" size="sm" />
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div>
          <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
            Pending Approvals
          </h4>
          <div className="p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#64748B]">Awaiting Your Action</span>
              <span className="text-2xl font-bold text-[#00A9B7]">5</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Level 1 Approval</span>
                <span className="font-medium text-[#0A0F14]">2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Level 2 Approval</span>
                <span className="font-medium text-[#0A0F14]">3</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent ERP Sync */}
        <div>
          <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
            Recent ERP Sync
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                <span className="text-xs text-[#0A0F14]">Successful</span>
              </div>
              <span className="text-xs font-medium text-[#64748B]">2 min ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#FEE2E2] rounded-lg border border-[#FECACA]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                <span className="text-xs text-[#0A0F14]">3 Failed</span>
              </div>
              <span className="text-xs font-medium text-[#64748B]">15 min ago</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
            Quick Actions
          </h4>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2 h-10 text-sm">
              <PlayCircle className="w-4 h-4" />
              Run Validation
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 h-10 text-sm">
              <Mail className="w-4 h-4" />
              Send Reminder
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 h-10 text-sm">
              <GitBranch className="w-4 h-4" />
              Create Change Request
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 h-10 text-sm">
              <RefreshCw className="w-4 h-4" />
              Sync to ERP
            </Button>
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
            Recent Activity
          </h4>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E0F5F7] flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-[#00A9B7]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#0A0F14] font-medium">Validation completed</p>
                <p className="text-xs text-[#64748B] truncate">GlobalTech Industries</p>
                <p className="text-xs text-[#94A3B8] mt-1">5 min ago</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F0FDF4] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#0A0F14] font-medium">Approval granted</p>
                <p className="text-xs text-[#64748B] truncate">Acme Corporation</p>
                <p className="text-xs text-[#94A3B8] mt-1">12 min ago</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#0A0F14] font-medium">Risk score updated</p>
                <p className="text-xs text-[#64748B] truncate">TechCore Solutions</p>
                <p className="text-xs text-[#94A3B8] mt-1">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
