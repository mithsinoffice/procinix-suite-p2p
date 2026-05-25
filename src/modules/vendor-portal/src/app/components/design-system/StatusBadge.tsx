import { ReactNode } from "react";

type StatusType = "success" | "warning" | "error" | "info" | "pending" | "neutral";

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const statusStyles: Record<StatusType, string> = {
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-orange-50 text-orange-700 border-orange-200",
  neutral: "bg-gray-50 text-gray-700 border-gray-200",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
  lg: "px-4 py-1.5 text-base",
};

export function StatusBadge({ status, label, icon, size = "md" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${statusStyles[status]} ${sizeStyles[size]}`}
    >
      {icon}
      {label}
    </span>
  );
}
