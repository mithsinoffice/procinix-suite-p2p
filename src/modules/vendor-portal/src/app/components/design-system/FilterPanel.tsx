import { ReactNode, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: "select" | "multiselect" | "daterange";
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterPanelProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (filterId: string, value: any) => void;
  onReset: () => void;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
}

export function FilterPanel({
  filters,
  values,
  onChange,
  onReset,
  isCollapsible = false,
  defaultExpanded = true,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasActiveFilters = Object.values(values).some(
    (value) => value && value !== "all" && value !== ""
  );

  return (
    <div className="bg-white border border-[#E6EEF2] rounded-lg">
      {isCollapsible && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#F6F9FC] transition-colors border-b border-[#E6EEF2]"
        >
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-[#0A0F14]">Filters</h3>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-[#00A9B7] text-white text-xs rounded-full">
                Active
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#64748B]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#64748B]" />
          )}
        </button>
      )}

      {(!isCollapsible || isExpanded) && (
        <div className="p-4 space-y-4">
          {filters.map((filter) => (
            <div key={filter.id} className="space-y-2">
              <Label htmlFor={filter.id} className="text-[#64748B]">
                {filter.label}
              </Label>
              
              {filter.type === "select" && filter.options && (
                <Select
                  value={values[filter.id] || "all"}
                  onValueChange={(value) => onChange(filter.id, value)}
                >
                  <SelectTrigger id={filter.id}>
                    <SelectValue placeholder={filter.placeholder || "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All {filter.label}
                    </SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}

          {hasActiveFilters && (
            <Button
              variant="outline"
              className="w-full gap-2 text-[#DC2626] border-[#DC2626] hover:bg-red-50"
              onClick={onReset}
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
