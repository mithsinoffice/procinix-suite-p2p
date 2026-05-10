import { SimpleMasterScreen } from './ui/SimpleMasterScreen';

export function DepreciationMethodMaster() {
  return (
    <SimpleMasterScreen
      masterKey="depreciation_method_master"
      masterName="Depreciation Method Master"
      description="SLM / WDV / DDB / UOP — referenced by Asset/CAPEX PRs."
      extraFields={[{ key: 'shortCode', label: 'Short Code', fromPayload: true }]}
    />
  );
}
