import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  className?: string;
}

export function KPICard({ title, value, icon, trend, className = "" }: KPICardProps) {
  return (
    <div className={`bg-white rounded-xl border border-[#E6EEF2] p-6 hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[#64748B] mb-2">{title}</p>
          <p className="text-3xl font-semibold text-[#0A0F14] mb-1">{value}</p>
          {trend && (
            <div className="flex items-center gap-1">
              {trend.direction === "up" ? (
                <TrendingUp className="w-4 h-4 text-[#16A34A]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#DC2626]" />
              )}
              <span className={`text-sm font-medium ${
                trend.direction === "up" ? "text-[#16A34A]" : "text-[#DC2626]"
              }`}>
                {trend.value}%
              </span>
              <span className="text-sm text-[#64748B]">vs last month</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-[#E0F5F7] rounded-xl flex items-center justify-center text-[#00A9B7]">
          {icon}
        </div>
      </div>
    </div>
  );
}