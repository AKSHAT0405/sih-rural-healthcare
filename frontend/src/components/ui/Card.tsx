import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  noShadow?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  padding = 'md',
  noShadow = false,
  style,
  ...props 
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none': return '0';
      case 'sm': return '12px';
      case 'lg': return '32px';
      default: return '20px';
    }
  };

  const baseStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    boxShadow: noShadow ? 'none' : 'var(--shadow-sm)',
    border: '1px solid var(--border)',
    padding: getPadding(),
    ...style,
  };

  return (
    <div style={baseStyle} {...props}>
      {children}
    </div>
  );
};
