import { Construction } from 'lucide-react';

interface ComingSoonProps {
  label: string;
  description?: string;
}

export function ComingSoon({ label, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="w-16 h-16 rounded-full bg-cloud flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-mercury-grey" />
      </div>
      <h2 className="text-xl font-semibold text-ink mb-2">{label}</h2>
      <p className="text-sm text-mercury-grey text-center max-w-md">
        {description ?? 'This screen is on the roadmap. Check back soon.'}
      </p>
    </div>
  );
}
