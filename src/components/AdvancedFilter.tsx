import { useState } from 'react';
import { Filter, X, Plus, Trash2, Search } from 'lucide-react';

export interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'notEquals' | 'isEmpty' | 'isNotEmpty' | 'between';
  value: string;
  value2?: string; // For 'between' operator
}

export interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
}

export interface FilterConfig {
  groups: FilterGroup[];
  groupLogic: 'AND' | 'OR'; // Logic between groups
}

interface AdvancedFilterProps {
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    options?: Array<{ value: string; label: string }>;
  }>;
  onApplyFilter: (config: FilterConfig) => void;
  onClearFilter: () => void;
}

export function AdvancedFilter({ fields, onApplyFilter, onClearFilter }: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([
    {
      id: '1',
      conditions: [
        {
          id: '1',
          field: fields[0]?.key || '',
          operator: 'contains',
          value: ''
        }
      ],
      logic: 'AND'
    }
  ]);
  const [groupLogic, setGroupLogic] = useState<'AND' | 'OR'>('AND');

  const getOperatorsForField = (fieldKey: string) => {
    const field = fields.find(f => f.key === fieldKey);
    
    if (!field) return [];

    switch (field.type) {
      case 'text':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'startsWith', label: 'Starts With' },
          { value: 'endsWith', label: 'Ends With' },
          { value: 'notEquals', label: 'Not Equals' },
          { value: 'isEmpty', label: 'Is Empty' },
          { value: 'isNotEmpty', label: 'Is Not Empty' }
        ];
      case 'number':
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Not Equals' },
          { value: 'greaterThan', label: 'Greater Than' },
          { value: 'lessThan', label: 'Less Than' },
          { value: 'greaterThanOrEqual', label: 'Greater Than or Equal' },
          { value: 'lessThanOrEqual', label: 'Less Than or Equal' },
          { value: 'between', label: 'Between' },
          { value: 'isEmpty', label: 'Is Empty' },
          { value: 'isNotEmpty', label: 'Is Not Empty' }
        ];
      case 'select':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Not Equals' },
          { value: 'isEmpty', label: 'Is Empty' },
          { value: 'isNotEmpty', label: 'Is Not Empty' }
        ];
      default:
        return [];
    }
  };

  const addCondition = (groupId: string) => {
    setFilterGroups(filterGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [
            ...group.conditions,
            {
              id: Date.now().toString(),
              field: fields[0]?.key || '',
              operator: 'contains',
              value: ''
            }
          ]
        };
      }
      return group;
    }));
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    setFilterGroups(filterGroups.map(group => {
      if (group.id === groupId) {
        const newConditions = group.conditions.filter(c => c.id !== conditionId);
        if (newConditions.length === 0) {
          // If removing last condition, keep one empty condition
          return {
            ...group,
            conditions: [{
              id: Date.now().toString(),
              field: fields[0]?.key || '',
              operator: 'contains',
              value: ''
            }]
          };
        }
        return { ...group, conditions: newConditions };
      }
      return group;
    }));
  };

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    setFilterGroups(filterGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.map(condition => {
            if (condition.id === conditionId) {
              return { ...condition, ...updates };
            }
            return condition;
          })
        };
      }
      return group;
    }));
  };

  const addGroup = () => {
    setFilterGroups([
      ...filterGroups,
      {
        id: Date.now().toString(),
        conditions: [
          {
            id: Date.now().toString() + '_1',
            field: fields[0]?.key || '',
            operator: 'contains',
            value: ''
          }
        ],
        logic: 'AND'
      }
    ]);
  };

  const removeGroup = (groupId: string) => {
    if (filterGroups.length > 1) {
      setFilterGroups(filterGroups.filter(g => g.id !== groupId));
    }
  };

  const updateGroupLogicInternal = (groupId: string, logic: 'AND' | 'OR') => {
    setFilterGroups(filterGroups.map(group => {
      if (group.id === groupId) {
        return { ...group, logic };
      }
      return group;
    }));
  };

  const handleApply = () => {
    // Validate that all conditions have values (except isEmpty/isNotEmpty)
    const hasInvalidConditions = filterGroups.some(group =>
      group.conditions.some(condition => 
        !['isEmpty', 'isNotEmpty'].includes(condition.operator) && 
        !condition.value.trim()
      )
    );

    if (hasInvalidConditions) {
      alert('Please fill in all filter values or remove empty conditions.');
      return;
    }

    const config: FilterConfig = {
      groups: filterGroups,
      groupLogic: groupLogic
    };
    onApplyFilter(config);
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilterGroups([
      {
        id: '1',
        conditions: [
          {
            id: '1',
            field: fields[0]?.key || '',
            operator: 'contains',
            value: ''
          }
        ],
        logic: 'AND'
      }
    ]);
    setGroupLogic('AND');
    onClearFilter();
    setIsOpen(false);
  };

  const getActiveFilterCount = () => {
    return filterGroups.reduce((count, group) => {
      return count + group.conditions.filter(c => c.value.trim() !== '').length;
    }, 0);
  };

  const activeCount = getActiveFilterCount();

  const renderValueInput = (group: FilterGroup, condition: FilterCondition) => {
    const field = fields.find(f => f.key === condition.field);
    
    if (!field) return null;

    // No value input needed for isEmpty/isNotEmpty
    if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
      return null;
    }

    // Between operator needs two inputs
    if (condition.operator === 'between') {
      return (
        <div className="flex gap-2 items-center">
          <input
            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
            value={condition.value}
            onChange={(e) => updateCondition(group.id, condition.id, { value: e.target.value })}
            placeholder="From"
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
          />
          <span style={{ color: 'var(--color-mercury-grey)' }}>to</span>
          <input
            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
            value={condition.value2 || ''}
            onChange={(e) => updateCondition(group.id, condition.id, { value2: e.target.value })}
            placeholder="To"
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
          />
        </div>
      );
    }

    // Select field
    if (field.type === 'select' && field.options) {
      return (
        <select
          value={condition.value}
          onChange={(e) => updateCondition(group.id, condition.id, { value: e.target.value })}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
        >
          <option value="">Select value</option>
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    // Regular input
    return (
      <input
        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
        value={condition.value}
        onChange={(e) => updateCondition(group.id, condition.id, { value: e.target.value })}
        placeholder="Enter value"
        className="px-3 py-2 rounded-lg text-sm"
        style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
      />
    );
  };

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
        style={{
          backgroundColor: activeCount > 0 ? 'var(--color-teal-tint)' : 'white',
          border: activeCount > 0 ? '1px solid var(--color-teal)' : '1px solid var(--color-silver)',
          color: activeCount > 0 ? 'var(--color-teal)' : 'var(--color-mercury-grey)'
        }}
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm">Advanced Filter</span>
        {activeCount > 0 && (
          <span 
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: 'var(--color-teal)', color: 'white' }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Filter Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            {/* Header */}
            <div 
              className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-teal-tint)' }}
                >
                  <Filter className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                </div>
                <div>
                  <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>Advanced Filter</h2>
                  <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                    Create complex filter conditions with AND/OR logic
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 rounded-lg transition-colors" 
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Groups Logic Selector */}
              {filterGroups.length > 1 && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                    Join filter groups with:
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGroupLogic('AND')}
                      className="px-3 py-1 rounded text-sm transition-colors"
                      style={{
                        backgroundColor: groupLogic === 'AND' ? 'var(--color-teal-tint)' : 'white',
                        border: groupLogic === 'AND' ? '1px solid var(--color-teal)' : '1px solid var(--color-silver)',
                        color: groupLogic === 'AND' ? 'var(--color-teal)' : 'var(--color-mercury-grey)'
                      }}
                    >
                      AND
                    </button>
                    <button
                      onClick={() => setGroupLogic('OR')}
                      className="px-3 py-1 rounded text-sm transition-colors"
                      style={{
                        backgroundColor: groupLogic === 'OR' ? 'var(--color-teal-tint)' : 'white',
                        border: groupLogic === 'OR' ? '1px solid var(--color-teal)' : '1px solid var(--color-silver)',
                        color: groupLogic === 'OR' ? 'var(--color-teal)' : 'var(--color-mercury-grey)'
                      }}
                    >
                      OR
                    </button>
                  </div>
                </div>
              )}

              {/* Filter Groups */}
              {filterGroups.map((group, groupIndex) => (
                <div key={group.id}>
                  {/* Group Separator */}
                  {groupIndex > 0 && (
                    <div className="flex items-center justify-center my-4">
                      <div className="flex-1" style={{ height: '1px', backgroundColor: 'var(--color-silver)' }}></div>
                      <span 
                        className="px-3 py-1 rounded text-xs mx-3"
                        style={{ backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' }}
                      >
                        {groupLogic}
                      </span>
                      <div className="flex-1" style={{ height: '1px', backgroundColor: 'var(--color-silver)' }}></div>
                    </div>
                  )}

                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--color-cloud)', border: '1px solid var(--color-silver)' }}
                  >
                    {/* Group Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                          Filter Group {groupIndex + 1}
                        </span>
                        {group.conditions.length > 1 && (
                          <>
                            <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>-</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateGroupLogicInternal(group.id, 'AND')}
                                className="px-2 py-0.5 rounded text-xs transition-colors"
                                style={{
                                  backgroundColor: group.logic === 'AND' ? 'var(--color-teal)' : 'white',
                                  color: group.logic === 'AND' ? 'white' : 'var(--color-mercury-grey)',
                                  border: '1px solid var(--color-silver)'
                                }}
                              >
                                AND
                              </button>
                              <button
                                onClick={() => updateGroupLogicInternal(group.id, 'OR')}
                                className="px-2 py-0.5 rounded text-xs transition-colors"
                                style={{
                                  backgroundColor: group.logic === 'OR' ? 'var(--color-teal)' : 'white',
                                  color: group.logic === 'OR' ? 'white' : 'var(--color-mercury-grey)',
                                  border: '1px solid var(--color-silver)'
                                }}
                              >
                                OR
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      {filterGroups.length > 1 && (
                        <button
                          onClick={() => removeGroup(group.id)}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--color-error)' }}
                          title="Remove Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Conditions */}
                    <div className="space-y-3">
                      {group.conditions.map((condition, conditionIndex) => (
                        <div key={condition.id}>
                          {/* Condition Logic Indicator */}
                          {conditionIndex > 0 && (
                            <div className="flex items-center gap-2 my-2 ml-4">
                              <div className="w-8" style={{ height: '1px', backgroundColor: 'var(--color-silver)' }}></div>
                              <span 
                                className="px-2 py-0.5 rounded text-xs"
                                style={{ backgroundColor: 'white', color: 'var(--color-teal)', border: '1px solid var(--color-teal)' }}
                              >
                                {group.logic}
                              </span>
                              <div className="flex-1" style={{ height: '1px', backgroundColor: 'var(--color-silver)' }}></div>
                            </div>
                          )}

                          {/* Condition Row */}
                          <div className="grid grid-cols-12 gap-3 items-start">
                            {/* Field Selector */}
                            <div className="col-span-3">
                              <select
                                value={condition.field}
                                onChange={(e) => updateCondition(group.id, condition.id, { 
                                  field: e.target.value,
                                  operator: 'contains',
                                  value: ''
                                })}
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                              >
                                {fields.map(field => (
                                  <option key={field.key} value={field.key}>
                                    {field.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Operator Selector */}
                            <div className="col-span-3">
                              <select
                                value={condition.operator}
                                onChange={(e) => updateCondition(group.id, condition.id, { 
                                  operator: e.target.value as any,
                                  value: '',
                                  value2: undefined
                                })}
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
                              >
                                {getOperatorsForField(condition.field).map(op => (
                                  <option key={op.value} value={op.value}>
                                    {op.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Value Input */}
                            <div className="col-span-5">
                              {renderValueInput(group, condition)}
                            </div>

                            {/* Remove Button */}
                            <div className="col-span-1 flex items-center justify-center">
                              <button
                                onClick={() => removeCondition(group.id, condition.id)}
                                className="p-2 rounded transition-colors"
                                style={{ color: 'var(--color-error)' }}
                                title="Remove Condition"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Condition Button */}
                    <button
                      onClick={() => addCondition(group.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm mt-3 transition-colors"
                      style={{ 
                        backgroundColor: 'white', 
                        border: '1px solid var(--color-teal)',
                        color: 'var(--color-teal)'
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Condition
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Group Button */}
              <button
                onClick={addGroup}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ 
                  backgroundColor: 'white', 
                  border: '1px solid var(--color-teal)',
                  color: 'var(--color-teal)'
                }}
              >
                <Plus className="w-4 h-4" />
                Add Filter Group
              </button>
            </div>

            {/* Footer */}
            <div 
              className="border-t px-6 py-4 flex justify-between items-center gap-3 flex-shrink-0"
              style={{ borderColor: 'var(--color-silver)' }}
            >
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ 
                  border: '1px solid var(--color-silver)', 
                  color: 'var(--color-mercury-grey)', 
                  backgroundColor: 'white' 
                }}
              >
                Clear All
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="px-4 py-2 rounded-lg text-sm transition-colors" 
                  style={{ 
                    border: '1px solid var(--color-silver)', 
                    color: 'var(--color-mercury-grey)', 
                    backgroundColor: 'white' 
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleApply} 
                  className="px-4 py-2 rounded-lg text-white text-sm transition-colors" 
                  style={{ backgroundColor: 'var(--color-teal)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}