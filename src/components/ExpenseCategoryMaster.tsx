import { SimpleMasterScreen } from './ui/SimpleMasterScreen';

export function ExpenseCategoryMaster() {
  return (
    <SimpleMasterScreen
      masterKey="expense_category_master"
      masterName="Expense Category Master"
      description="Expense categories used by Non-PO Invoice form (Travel, Marketing, Utilities, …)."
      extraFields={[{ key: 'defaultGl', label: 'Default GL', fromPayload: true }]}
    />
  );
}
