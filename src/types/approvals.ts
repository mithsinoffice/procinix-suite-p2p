export interface ApprovalKPIs {
  total_approvals_ytd: number;
  on_time_rate: number;
  on_time_count: number;
  avg_hours_per_approval: number;
  faster_than_team_percent: number;
  total_rejections: number;
  rejection_rate: number;
  total_value_approved: number;
  avg_approvals_per_month: number;
  total_pending: number;
  sla_breached_count: number;
  aging_count: number;
  pending_value: number;
  approved_today: number;
  msme_pending_count: number;
  msme_deadline_alerts: number;
}

export interface MSMEInfo {
  invoice_date: string;
  deadline_date: string;
  days_remaining: number;
  days_used: number;
  percent_used: number;
  is_overdue: boolean;
  is_critical: boolean;
  is_warning: boolean;
  msme_category: 'micro' | 'small' | 'medium';
  legal_note: string;
}

export interface SLAInfo {
  sla_hours: number;
  age_hours: number;
  hours_remaining: number;
  percent_used: number;
  breached: boolean;
  breach_in_hours: number;
}

export interface ApprovalItem {
  id: string;
  module: string;
  reference_id: string;
  status: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  priority_reason: string | null;
  created_at: string;
  age_hours: number;
  invoice_number?: string;
  invoice_date?: string;
  po_number?: string;
  vendor_legal_name?: string;
  entity_name?: string;
  submitted_by_name?: string;
  display_amount?: number;
  currency?: string;
  msme_info: MSMEInfo | null;
  sla_info: SLAInfo;
  msme_category?: string;
}

export interface ModuleCounts {
  all: number;
  ap_invoice: number;
  non_po_invoice: number;
  purchase_order: number;
  payment: number;
  master_update: number;
  vendor_onboarding: number;
  vendor_advance: number;
}
