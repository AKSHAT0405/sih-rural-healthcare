import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  style,
  disabled,
  ...props 
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#e2e8f0';
    switch (variant) {
      case 'primary': return 'var(--primary)';
      case 'secondary': return 'var(--secondary)';
      case 'danger': return 'var(--danger)';
      case 'warning': return 'var(--warning)';
      case 'success': return 'var(--success)';
      case 'info': return 'var(--info)';
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
      default: return 'var(--primary)';
    }
  };

  const getTextColor = () => {
    if (disabled) return '#a0aec0';
    switch (variant) {
      case 'outline':
      case 'ghost':
        return 'var(--primary)';
      case 'warning': return '#212529';
      default: return '#ffffff';
    }
  };

  const getBorder = () => {
    if (variant === 'outline') return '1px solid var(--primary)';
    return '1px solid transparent';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return '4px 12px';
      case 'lg': return '12px 24px';
      default: return '8px 16px';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return '0.875rem';
      case 'lg': return '1.125rem';
      default: return '1rem';
    }
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: getBackgroundColor(),
    color: getTextColor(),
    border: getBorder(),
    borderRadius: 'var(--radius-md)',
    padding: getPadding(),
    fontSize: getFontSize(),
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease-in-out',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.7 : 1,
    ...style,
  };

  return (
    <button style={baseStyle} disabled={disabled} {...props}>
      {children}
    </button>
  );
};
