import {  } from "react";

interface RiskMeterProps {
  score: number; // 0-100
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function RiskMeter({ score, label, size = "md" }: RiskMeterProps) {
  const getRiskLevel = (score: number): { level: string; color: string; bgColor: string } => {
    if (score <= 30) return { level: "Low Risk", color: "#16A34A", bgColor: "#E0F5E9" };
    if (score <= 70) return { level: "Medium Risk", color: "#F59E0B", bgColor: "#FEF3E2" };
    return { level: "High Risk", color: "#DC2626", bgColor: "#FEE2E2" };
  };

  const { level, color, bgColor } = getRiskLevel(score);
  
  const sizeMap = {
    sm: { container: "w-32 h-32", text: "text-xl", label: "text-xs" },
    md: { container: "w-40 h-40", text: "text-2xl", label: "text-sm" },
    lg: { container: "w-48 h-48", text: "text-3xl", label: "text-base" },
  };
  
  const { container, text, label: labelSize } = sizeMap[size];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`${container} relative`}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="#E6EEF2"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${score * 2.827} 282.7`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${text} font-bold`} style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-[#64748B]">Risk Score</span>
        </div>
      </div>
      <div className="text-center">
        <div
          className={`inline-flex px-4 py-1.5 rounded-full ${labelSize} font-semibold`}
          style={{ backgroundColor: bgColor, color }}
        >
          {level}
        </div>
        {label && <p className="text-sm text-[#64748B] mt-2">{label}</p>}
      </div>
    </div>
  );
}
