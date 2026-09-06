import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'neutral',
  style,
  ...props 
}) => {
  const getColors = () => {
    switch (variant) {
      case 'primary': return { bg: 'var(--primary-light)', color: 'var(--primary-hover)' };
      case 'success': return { bg: 'var(--success-light)', color: '#155724' };
      case 'danger': return { bg: 'var(--danger-light)', color: '#721c24' };
      case 'warning': return { bg: 'var(--warning-light)', color: '#856404' };
      case 'info': return { bg: 'var(--info-light)', color: '#0c5460' };
      case 'neutral': 
      default:
        return { bg: '#e2e8f0', color: '#4a5568' };
    }
  };

  const colors = getColors();

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: colors.bg,
    color: colors.color,
    ...style,
  };

  return (
    <span style={baseStyle} {...props}>
      {children}
    </span>
  );
};
