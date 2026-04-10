import React, { ReactNode } from 'react';

/**
 * GLOBAL FIELD STANDARDIZATION COMPONENT
 * Reference: Debit Note Date field standard
 * 
 * Enforces identical sizing, spacing, icon placement, and visual alignment
 * across ALL forms and masters in the application.
 */

interface StandardInputProps {
  type?: 'text' | 'date' | 'number' | 'email' | 'password' | 'file';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  icon?: ReactNode;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  accept?: string;
  error?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
  maxLength?: number;
}

export function StandardInput({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  icon,
  min,
  max,
  step,
  accept,
  error = false,
  className = '',
  label,
  required = false,
  maxLength
}: StandardInputProps) {
  const paddingClass = icon ? 'pl-10 pr-3 py-2.5' : 'px-3 py-2.5';
  const borderColor = error ? '#FF4E5B' : '#E1E6EA';
  const bgColor = disabled || readOnly ? '#F6F9FC' : 'white';
  const textColor = disabled || readOnly ? '#6E7A82' : '#0A0F14';

  return (
    <div>
      {label && (
        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
          {label}
          {required && <span style={{ color: '#EF4444' }}> *</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
            style={{ color: '#6E7A82' }}
          >
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          min={min}
          max={max}
          step={step}
          accept={accept}
          maxLength={maxLength}
          className={`w-full ${paddingClass} rounded-lg ${className}`}
          style={{
            border: `1px solid ${borderColor}`,
            backgroundColor: bgColor,
            color: textColor,
            cursor: disabled || readOnly ? 'not-allowed' : 'text'
          }}
        />
      </div>
    </div>
  );
}

interface StandardSelectProps {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children?: ReactNode;
  options?: Array<{ value: string | number; label: string }>;
  disabled?: boolean;
  icon?: ReactNode;
  error?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

export function StandardSelect({
  value,
  onChange,
  children,
  options,
  disabled = false,
  icon,
  error = false,
  className = '',
  label,
  required = false,
  placeholder
}: StandardSelectProps) {
  const paddingClass = icon ? 'pl-10 pr-8 py-2.5' : 'px-3 pr-8 py-2.5';
  const borderColor = error ? '#FF4E5B' : '#E1E6EA';
  const bgColor = disabled ? '#F6F9FC' : 'white';
  const textColor = disabled ? '#6E7A82' : '#0A0F14';

  return (
    <div>
      {label && (
        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
          {label}
          {required && <span style={{ color: '#EF4444' }}> *</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
            style={{ color: '#6E7A82' }}
          >
            {icon}
          </div>
        )}
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full ${paddingClass} rounded-lg ${className}`}
          style={{
            border: `1px solid ${borderColor}`,
            backgroundColor: bgColor,
            color: textColor,
            cursor: disabled ? 'not-allowed' : 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236E7A82' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '12px'
          }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options ? (
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          ) : (
            children
          )}
        </select>
      </div>
    </div>
  );
}

interface StandardTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  icon?: ReactNode;
  rows?: number;
  error?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
}

export function StandardTextarea({
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  icon,
  rows = 3,
  error = false,
  className = '',
  label,
  required = false
}: StandardTextareaProps) {
  const paddingClass = icon ? 'pl-10 pr-3 py-2.5' : 'px-3 py-2.5';
  const borderColor = error ? '#FF4E5B' : '#E1E6EA';
  const bgColor = disabled || readOnly ? '#F6F9FC' : 'white';
  const textColor = disabled || readOnly ? '#6E7A82' : '#0A0F14';

  return (
    <div>
      {label && (
        <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
          {label}
          {required && <span style={{ color: '#EF4444' }}> *</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div 
            className="absolute left-3 top-3 pointer-events-none"
            style={{ color: '#6E7A82' }}
          >
            {icon}
          </div>
        )}
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          className={`w-full ${paddingClass} rounded-lg resize-none ${className}`}
          style={{
            border: `1px solid ${borderColor}`,
            backgroundColor: bgColor,
            color: textColor,
            cursor: disabled || readOnly ? 'not-allowed' : 'text'
          }}
        />
      </div>
    </div>
  );
}