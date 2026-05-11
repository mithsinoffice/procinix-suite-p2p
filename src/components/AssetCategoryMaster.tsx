import { Boxes } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

const config: MasterV2Config = {
  title: 'Asset Category Master',
  subtitle: 'Categories used by Asset/CAPEX PRs (e.g. Machinery, IT Hardware).',
  icon: Boxes,
  masterKey: 'asset_category_master',
  columns: [
    { key: 'depreciationDefault', label: 'Default Method', fromPayload: true },
    {
      key: 'usefulLifeYears',
      label: 'Useful Life (yrs)',
      fromPayload: true,
    },
  ],
  formSections: [
    {
      id: 'attributes',
      title: 'Attributes',
      subtitle: 'Default depreciation method and useful life applied to assets in this category.',
      stripe: 'blue',
      fields: [
        {
          key: 'depreciationDefault',
          label: 'Default Method',
          type: 'select',
          fromPayload: true,
          options: ['SLM', 'WDV', 'DDB', 'Units of Production'],
        },
        {
          key: 'usefulLifeYears',
          label: 'Useful Life (years)',
          type: 'number',
          fromPayload: true,
        },
      ],
    },
  ],
};

export function AssetCategoryMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
