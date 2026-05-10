import { SimpleMasterScreen } from './ui/SimpleMasterScreen';

export function ServiceTypeMaster() {
  return (
    <SimpleMasterScreen
      masterKey="service_type_master"
      masterName="Service Type Master"
      description="Service categories used by Service PRs (IT, Consulting, Logistics, …)."
      extraFields={[{ key: 'defaultTdsSection', label: 'Default TDS', fromPayload: true }]}
    />
  );
}
