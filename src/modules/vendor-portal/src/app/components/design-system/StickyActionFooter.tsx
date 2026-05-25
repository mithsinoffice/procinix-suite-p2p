import { ReactNode } from "react";
import { Button } from "../ui/button";

interface StickyActionFooterProps {
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  tertiaryAction?: {
    label: string;
    onClick: () => void;
  };
  customActions?: ReactNode;
  className?: string;
}

export function StickyActionFooter({
  primaryAction,
  secondaryAction,
  tertiaryAction,
  customActions,
  className = "",
}: StickyActionFooterProps) {
  return (
    <div className={`sticky bottom-0 bg-white border-t border-[#E6EEF2] shadow-lg z-40 ${className}`}>
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {tertiaryAction && (
            <Button
              variant="ghost"
              onClick={tertiaryAction.onClick}
            >
              {tertiaryAction.label}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {customActions}
          
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}

          {primaryAction && (
            <Button
              className="bg-[#00A9B7] hover:bg-[#008A96]"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
            >
              {primaryAction.loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                primaryAction.label
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
