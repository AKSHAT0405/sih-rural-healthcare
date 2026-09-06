import React from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#d4edda';
      case 'error': return '#f8d7da';
      case 'warning': return '#fff3cd';
      case 'info': return '#d1ecf1';
      default: return '#e2e8f0';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success': return '#155724';
      case 'error': return '#721c24';
      case 'warning': return '#856404';
      case 'info': return '#0c5460';
      default: return '#4a5568';
    }
  };

  return (
    <div style={{
      backgroundColor: getBackgroundColor(),
      color: getTextColor(),
      padding: '12px 16px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: `1px solid ${getTextColor()}40` // 25% opacity border
    }}>
      <span style={{ fontWeight: 500 }}>{message}</span>
      {onClose && (
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            lineHeight: 1,
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.7
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
};
