import { SimpleMasterScreen } from './ui/SimpleMasterScreen';

export function AssetCategoryMaster() {
  return (
    <SimpleMasterScreen
      masterKey="asset_category_master"
      masterName="Asset Category Master"
      description="Categories used by Asset/CAPEX PRs (e.g. Machinery, IT Hardware)."
      extraFields={[
        { key: 'depreciationDefault', label: 'Default Method', fromPayload: true },
        {
          key: 'usefulLifeYears',
          label: 'Useful Life (yrs)',
          type: 'number',
          fromPayload: true,
        },
      ]}
    />
  );
}
