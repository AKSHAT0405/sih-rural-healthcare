import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: '16px',
      marginBottom: '24px'
    }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-h)' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '1rem' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
