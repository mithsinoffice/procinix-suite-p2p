import { FilterConfig } from '../components/AdvancedFilter';

/**
 * Apply filter conditions to a dataset
 */
export function applyFilters<T>(data: T[], filterConfig: FilterConfig | null): T[] {
  if (!filterConfig || !filterConfig.groups || filterConfig.groups.length === 0) {
    return data;
  }

  return data.filter((item) => {
    // Evaluate each group
    const groupResults = filterConfig.groups.map((group) => {
      // Evaluate each condition in the group
      const conditionResults = group.conditions.map((condition) => {
        const fieldValue = getNestedValue(item, condition.field);
        return evaluateCondition(fieldValue, condition.operator, condition.value, condition.value2);
      });

      // Combine conditions based on group logic
      if (group.logic === 'AND') {
        return conditionResults.every((result) => result);
      } else {
        return conditionResults.some((result) => result);
      }
    });

    // Combine groups based on groupLogic
    if (filterConfig.groupLogic === 'AND') {
      return groupResults.every((result) => result);
    } else {
      return groupResults.some((result) => result);
    }
  });
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Evaluate a single filter condition
 */
function evaluateCondition(
  fieldValue: any,
  operator: string,
  value: string,
  value2?: string
): boolean {
  // Handle null/undefined field values
  if (fieldValue === null || fieldValue === undefined) {
    if (operator === 'isEmpty') return true;
    if (operator === 'isNotEmpty') return false;
    return false;
  }

  // Convert field value to string for comparison
  const fieldStr = String(fieldValue).toLowerCase();
  const valueStr = value?.toLowerCase() || '';
  const value2Str = value2?.toLowerCase() || '';

  switch (operator) {
    case 'equals':
      return fieldStr === valueStr;

    case 'notEquals':
      return fieldStr !== valueStr;

    case 'contains':
      return fieldStr.includes(valueStr);

    case 'startsWith':
      return fieldStr.startsWith(valueStr);

    case 'endsWith':
      return fieldStr.endsWith(valueStr);

    case 'greaterThan':
      if (isDate(fieldValue) && isDate(value)) {
        return new Date(fieldValue) > new Date(value);
      }
      return parseFloat(fieldValue) > parseFloat(value);

    case 'lessThan':
      if (isDate(fieldValue) && isDate(value)) {
        return new Date(fieldValue) < new Date(value);
      }
      return parseFloat(fieldValue) < parseFloat(value);

    case 'greaterThanOrEqual':
      if (isDate(fieldValue) && isDate(value)) {
        return new Date(fieldValue) >= new Date(value);
      }
      return parseFloat(fieldValue) >= parseFloat(value);

    case 'lessThanOrEqual':
      if (isDate(fieldValue) && isDate(value)) {
        return new Date(fieldValue) <= new Date(value);
      }
      return parseFloat(fieldValue) <= parseFloat(value);

    case 'between':
      if (!value2) return false;
      if (isDate(fieldValue) && isDate(value) && isDate(value2)) {
        const fieldDate = new Date(fieldValue);
        return fieldDate >= new Date(value) && fieldDate <= new Date(value2);
      }
      {
        const fieldNum = parseFloat(fieldValue);
        return fieldNum >= parseFloat(value) && fieldNum <= parseFloat(value2);
      }

    case 'isEmpty':
      return fieldStr === '' || fieldStr === 'null' || fieldStr === 'undefined';

    case 'isNotEmpty':
      return fieldStr !== '' && fieldStr !== 'null' && fieldStr !== 'undefined';

    default:
      return false;
  }
}

/**
 * Check if a value is a valid date
 */
function isDate(value: any): boolean {
  if (value instanceof Date) return true;
  if (typeof value === 'string') {
    // Check if string matches date pattern (YYYY-MM-DD or similar)
    const datePattern = /^\d{4}-\d{2}-\d{2}/;
    return datePattern.test(value);
  }
  return false;
}

/**
 * Export filter state to JSON (for saving/loading)
 */
export function exportFilters(filterConfig: FilterConfig): string {
  return JSON.stringify(filterConfig, null, 2);
}

/**
 * Import filter state from JSON
 */
export function importFilters(json: string): FilterConfig {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to import filters:', error);
    return { groups: [], groupLogic: 'AND' };
  }
}
