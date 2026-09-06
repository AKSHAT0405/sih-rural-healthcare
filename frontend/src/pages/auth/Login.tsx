import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

type RoleHint = 'PATIENT' | 'DOCTOR';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [roleHint, setRoleHint] = useState<RoleHint>('PATIENT');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await authApi.login(email, password);
      login(data.access, data);
      
      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else {
        if (data.role === 'PATIENT') navigate('/patient', { replace: true });
        else if (data.role === 'DOCTOR') navigate('/doctor', { replace: true });
        else if (data.role === 'ADMIN') navigate('/admin', { replace: true });
        else if (data.role === 'HEALTH_WORKER') navigate('/health-worker', { replace: true });
        else navigate('/', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    border: 'none',
    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: active ? 'var(--primary)' : 'var(--text-muted)',
    fontWeight: active ? 600 : 400,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '0.9375rem',
    color: 'var(--text)',
    backgroundColor: 'var(--surface)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      backgroundColor: 'var(--bg)',
      padding: '24px'
    }}>
      <div style={{ 
        backgroundColor: 'var(--surface)', 
        border: '1px solid var(--border)',
        borderRadius: '12px', 
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)', 
        width: '100%', 
        maxWidth: '380px',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
            backgroundColor: 'var(--primary)', 
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="white"/>
            </svg>
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
            Rural Healthcare Platform
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Sign in to access your portal
          </p>
        </div>

        {/* Role tabs */}
        <div style={{ display: 'flex', padding: '0 28px', borderBottom: '1px solid var(--border)' }}>
          <button 
            type="button" 
            style={tabStyle(roleHint === 'PATIENT')} 
            onClick={() => setRoleHint('PATIENT')}
          >
            Patient
          </button>
          <button 
            type="button" 
            style={tabStyle(roleHint === 'DOCTOR')} 
            onClick={() => setRoleHint('DOCTOR')}
          >
            Doctor / Staff
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Role hint message */}
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {roleHint === 'PATIENT' 
              ? 'Enter your patient account credentials to access your health records and appointments.'
              : 'Enter your credentials to access the clinical dashboard and manage consultations.'
            }
          </p>

          {error && (
            <div style={{ 
              padding: '10px 12px', 
              backgroundColor: 'var(--danger-light)', 
              color: '#721c24', 
              borderRadius: '6px', 
              fontSize: '0.875rem',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>Email</label>
            <input 
              type="email" 
              placeholder="you@example.com"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
              style={inputStyle}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              padding: '11px', 
              backgroundColor: isLoading ? 'var(--secondary)' : 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: isLoading ? 'not-allowed' : 'pointer', 
              fontWeight: 600,
              fontSize: '0.9375rem',
              marginTop: '4px',
              transition: 'background-color 0.15s ease',
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
