/**
 * Procinix Utility Functions
 * Common helpers for the vendor governance module
 */

// ===========================================
// DATE FORMATTING
// ===========================================

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ===========================================
// RISK LEVEL HELPERS
// ===========================================

export const getRiskColor = (score: number): string => {
  if (score <= 30) return '#16A34A'; // Green
  if (score <= 70) return '#F59E0B'; // Yellow
  return '#DC2626'; // Red
};

export const getRiskLevel = (score: number): 'Low' | 'Medium' | 'High' => {
  if (score <= 30) return 'Low';
  if (score <= 70) return 'Medium';
  return 'High';
};

export const getRiskBadgeStatus = (
  level: 'Low' | 'Medium' | 'High'
): 'success' | 'warning' | 'error' => {
  const map = {
    Low: 'success' as const,
    Medium: 'warning' as const,
    High: 'error' as const,
  };
  return map[level];
};

// ===========================================
// STATUS HELPERS
// ===========================================

export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    Completed: '#16A34A',
    Approved: '#16A34A',
    Synced: '#16A34A',
    Active: '#16A34A',
    'In Progress': '#3B82F6',
    Pending: '#F59E0B',
    Failed: '#DC2626',
    Rejected: '#DC2626',
    'Not Started': '#94A3B8',
  };
  return statusMap[status] || '#94A3B8';
};

export const getStatusBadgeType = (
  status: string
): 'success' | 'warning' | 'error' | 'info' | 'pending' | 'neutral' => {
  const map: Record<string, any> = {
    Completed: 'success',
    Approved: 'success',
    Synced: 'success',
    Active: 'success',
    'In Progress': 'info',
    Pending: 'pending',
    Failed: 'error',
    Rejected: 'error',
    'Not Started': 'neutral',
  };
  return map[status] || 'neutral';
};

// ===========================================
// VALIDATION HELPERS
// ===========================================

export const validatePAN = (pan: string): boolean => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
};

export const validateGST = (gst: string): boolean => {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateIFSC = (ifsc: string): boolean => {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc);
};

// ===========================================
// STRING FORMATTING
// ===========================================

export const formatCurrency = (
  amount: number,
  currency: string = 'USD'
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// ===========================================
// ARRAY HELPERS
// ===========================================

export const sortBy = <T>(
  array: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

export const groupBy = <T>(
  array: T[],
  key: keyof T
): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

// ===========================================
// FILE HELPERS
// ===========================================

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toUpperCase() || '';
};

export const isValidFileType = (
  filename: string,
  allowedTypes: string[]
): boolean => {
  const ext = getFileExtension(filename);
  return allowedTypes.includes(ext);
};

// ===========================================
// DEBOUNCE
// ===========================================

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ===========================================
// LOCAL STORAGE HELPERS
// ===========================================

export const saveToLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// ===========================================
// ID GENERATION
// ===========================================

export const generateRequestId = (prefix: string = 'VR'): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${prefix}-${year}-${random}`;
};

// ===========================================
// VALIDATION SCORE CALCULATION
// ===========================================

export const calculateValidationScore = (checks: {
  taxValid: boolean;
  bankValid: boolean;
  sanctionsClean: boolean;
  duplicateCheck: boolean;
  documentsComplete: boolean;
}): number => {
  let score = 0;
  
  if (!checks.taxValid) score += 25;
  if (!checks.bankValid) score += 20;
  if (!checks.sanctionsClean) score += 30;
  if (!checks.duplicateCheck) score += 15;
  if (!checks.documentsComplete) score += 10;
  
  return score;
};

// ===========================================
// EXPORT HELPERS
// ===========================================

export const exportToCSV = (data: any[], filename: string): void => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => JSON.stringify(row[header] || '')).join(',')
    ),
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// ===========================================
// NOTIFICATION HELPERS (for future integration)
// ===========================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const createNotification = (
  type: NotificationType,
  title: string,
  message: string
): Notification => {
  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    title,
    message,
    timestamp: new Date(),
    read: false,
  };
};
