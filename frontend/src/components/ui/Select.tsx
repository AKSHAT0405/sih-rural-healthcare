import React, { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  fullWidth = true,
  style,
  children,
  ...props
}, ref) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: fullWidth ? '100%' : 'auto',
    marginBottom: '16px',
    ...style,
  };

  const selectStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: error ? '1px solid var(--danger)' : '1px solid var(--border)',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: props.disabled ? '#f8fafc' : '#ffffff',
    cursor: props.disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <div style={containerStyle}>
      {label && (
        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
          {label}
        </label>
      )}
      <select 
        ref={ref}
        style={selectStyle} 
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = 'var(--primary)';
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = 'var(--border)';
        }}
        {...props} 
      >
        {children}
      </select>
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
});
