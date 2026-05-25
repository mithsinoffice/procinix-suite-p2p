import {  } from "react";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

interface ApprovalTimelineItem {
  department: string;
  approver: string;
  status: "approved" | "pending" | "rejected" | "waiting";
  timestamp?: string;
  comment?: string;
}

interface ApprovalTimelineProps {
  items: ApprovalTimelineItem[];
}

const statusConfig = {
  approved: {
    icon: CheckCircle2,
    color: "text-[#16A34A]",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  pending: {
    icon: Clock,
    color: "text-[#F59E0B]",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  rejected: {
    icon: XCircle,
    color: "text-[#DC2626]",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  waiting: {
    icon: AlertCircle,
    color: "text-[#64748B]",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
};

export function ApprovalTimeline({ items }: ApprovalTimelineProps) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const config = statusConfig[item.status];
        const Icon = config.icon;
        
        return (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor} ${config.color} border-2 ${config.borderColor}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              {index < items.length - 1 && (
                <div className="w-0.5 h-full min-h-[40px] bg-[#E6EEF2] my-2" />
              )}
            </div>
            
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-semibold text-[#0A0F14]">{item.department}</p>
                  <p className="text-sm text-[#64748B]">{item.approver}</p>
                </div>
                {item.timestamp && (
                  <span className="text-xs text-[#64748B]">{item.timestamp}</span>
                )}
              </div>
              
              {item.comment && (
                <div className="mt-2 p-3 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                  <p className="text-sm text-[#0A0F14]">{item.comment}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
