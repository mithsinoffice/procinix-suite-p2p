import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const isSelected = (item: T) =>
    selectedItems.some((selected) => selected === item);

  const toggleSelection = (item: T) => {
    if (!onSelectionChange) return;
    
    if (isSelected(item)) {
      onSelectionChange(selectedItems.filter((selected) => selected !== item));
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedItems.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
          <tr>
            {selectable && (
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedItems.length === data.length && data.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-[#E6EEF2]"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-[#E6EEF2]">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-6 py-12 text-center text-sm text-[#64748B]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={index}
                className={`hover:bg-[#F6F9FC] transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {selectable && (
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected(item)}
                      onChange={() => toggleSelection(item)}
                      className="rounded border-[#E6EEF2]"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4">
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
