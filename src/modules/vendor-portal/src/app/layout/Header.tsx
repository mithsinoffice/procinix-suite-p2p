import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Bell, HelpCircle, ChevronDown, Building2, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export function Header({ breadcrumbs }: { breadcrumbs: { label: string; path?: string }[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E6EEF2] shadow-sm">
      <div className="flex items-center justify-between h-16 px-8 gap-8">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm min-w-0">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <span className="text-[#94A3B8]">/</span>}
              {crumb.path ? (
                <Link
                  to={crumb.path}
                  className="text-[#64748B] hover:text-[#00A9B7] transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[#0A0F14] font-medium truncate">{crumb.label}</span>
              )}
            </div>
          ))}
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search vendors, requests, ERP codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg text-sm text-[#0A0F14] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7] transition-all"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Entity Switcher */}
          <Select defaultValue="entity-us">
            <SelectTrigger className="w-[200px] h-10 border-[#E6EEF2] bg-[#F6F9FC]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#64748B]" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entity-us">
                <div className="flex flex-col">
                  <span className="font-medium">Procinix USA Inc.</span>
                  <span className="text-xs text-[#64748B]">US Entity</span>
                </div>
              </SelectItem>
              <SelectItem value="entity-uk">
                <div className="flex flex-col">
                  <span className="font-medium">Procinix UK Ltd.</span>
                  <span className="text-xs text-[#64748B]">UK Entity</span>
                </div>
              </SelectItem>
              <SelectItem value="entity-sg">
                <div className="flex flex-col">
                  <span className="font-medium">Procinix Singapore</span>
                  <span className="text-xs text-[#64748B]">SG Entity</span>
                </div>
              </SelectItem>
              <SelectItem value="entity-in">
                <div className="flex flex-col">
                  <span className="font-medium">Procinix India Pvt.</span>
                  <span className="text-xs text-[#64748B]">IN Entity</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Notification Bell */}
          <button className="relative p-2 hover:bg-[#F6F9FC] rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-[#64748B]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DC2626] rounded-full"></span>
          </button>

          {/* Help */}
          <button className="p-2 hover:bg-[#F6F9FC] rounded-lg transition-colors">
            <HelpCircle className="w-5 h-5 text-[#64748B]" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-3 ml-3 border-l border-[#E6EEF2]">
            <div className="text-right">
              <div className="text-sm font-medium text-[#0A0F14]">Sarah Mitchell</div>
              <div className="text-xs text-[#64748B]">Procurement Manager</div>
            </div>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-[#00A9B7] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <ChevronDown className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
