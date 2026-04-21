import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export function KPICard({ 
  title, 
  value, 
  change, 
  changeType, 
  subtitle, 
  icon: Icon,
  iconBg,
  iconColor 
}: KPICardProps) {
  return (
    <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{title}</p>
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-cloud)' }}>
          <Icon className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
        </div>
      </div>
      
      <p className="text-3xl mb-2" style={{ color: 'var(--color-teal-dark)' }}>{value}</p>
      
      {change && (
        <p className="text-sm" style={{ 
          color:
            changeType === 'positive'
              ? 'var(--color-teal)'
              : changeType === 'negative'
                ? 'var(--color-error)'
                : 'var(--color-mercury-grey)'
        }}>
          {change}
        </p>
      )}
      
      {subtitle && (
        <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>{subtitle}</p>
      )}
    </div>
  );
}
