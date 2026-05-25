import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  onClick?: () => void;
  className?: string;
}

export function ActionCard({
  title,
  description,
  icon: Icon,
  iconColor = "#00A9B7",
  iconBgColor = "#E0F5F7",
  onClick,
  className = "",
}: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-6 bg-white border border-[#E6EEF2] rounded-lg hover:shadow-md hover:border-[#00A9B7] transition-all text-left ${className}`}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBgColor }}
        >
          <Icon className="w-6 h-6" style={{ color: iconColor }} />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[#0A0F14] mb-1">
            {title}
          </h3>
          <p className="text-sm text-[#64748B]">{description}</p>
        </div>
      </div>
    </button>
  );
}
