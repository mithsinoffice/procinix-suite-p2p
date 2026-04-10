import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
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
    <div className="bg-white rounded-lg p-6" style={{ border: '1px solid #E1E6EA' }}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm" style={{ color: '#6E7A82' }}>{title}</p>
        <div className="p-2 rounded-lg" style={{ backgroundColor: '#F6F9FC' }}>
          <Icon className="w-5 h-5" style={{ color: '#6E7A82' }} />
        </div>
      </div>
      
      <p className="text-3xl mb-2" style={{ color: '#007D87' }}>{value}</p>
      
      {change && (
        <p className="text-sm" style={{ 
          color: changeType === 'positive' ? '#00A9B7' : '#FF4E5B'
        }}>
          {change}
        </p>
      )}
      
      {subtitle && (
        <p className="text-sm" style={{ color: '#6E7A82' }}>{subtitle}</p>
      )}
    </div>
  );
}