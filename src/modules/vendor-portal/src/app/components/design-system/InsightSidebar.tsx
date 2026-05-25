import { ReactNode } from "react";
import { Card } from "../ui/card";

interface SidebarSection {
  title: string;
  content: ReactNode;
}

interface InsightSidebarProps {
  sections: SidebarSection[];
  className?: string;
}

export function InsightSidebar({ sections, className = "" }: InsightSidebarProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {sections.map((section, index) => (
        <Card key={index} className="p-6 border-[#E6EEF2]">
          <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
            {section.title}
          </h3>
          {section.content}
        </Card>
      ))}
    </div>
  );
}
