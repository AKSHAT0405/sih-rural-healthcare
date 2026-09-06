import { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui';

export const DashboardLayout = () => {
  const { userEmail, userRole, userFacility, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = () => {
    switch (userRole) {
      case 'PATIENT':
        return [
          { path: '/patient', label: 'My Consultations' },
          { path: '/patient/triage', label: 'New Triage' },
          { path: '/patient/appointments', label: 'My Appointments' },
          { path: '/patient/records', label: 'Medical Records' },
          { path: '/patient/referrals', label: 'My Referrals' },
          { path: '/patient/follow-ups', label: 'Follow-ups' },
        ];
      case 'DOCTOR':
        return [
          { path: '/doctor', label: 'Dashboard' },
          { path: '/doctor/appointments', label: 'Appointments' },
          { path: '/doctor/patients', label: 'Patients' },
          { path: '/doctor/referrals', label: 'Referrals' },
          { path: '/doctor/follow-ups', label: 'Follow-ups' },
          { path: '/doctor/profile', label: 'My Profile' },
        ];
      case 'HEALTH_WORKER':
        return [
          { path: '/health-worker', label: 'Dashboard' },
          { path: '/health-worker/patients', label: 'Patients' },
          { path: '/health-worker/inventory', label: 'Inventory' },
          { path: '/health-worker/consultations', label: 'Consultations' },
          { path: '/health-worker/referrals', label: 'Referrals' },
        ];
      case 'ADMIN':
        return [
          { path: '/admin', label: 'Dashboard' },
          { path: '/admin/users', label: 'Users' },
          { path: '/admin/facilities', label: 'Facilities' },
          { path: '/admin/doctors', label: 'Doctors' },
          { path: '/admin/inventory', label: 'Inventory' },
        ];
      default:
        return [];
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: 'var(--primary)', 
        color: '#fff', 
        padding: '16px 24px', 
        boxShadow: 'var(--shadow-md)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ display: 'block', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}
              className="mobile-menu-btn"
            >
              ☰
            </button>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>Rural Healthcare Platform</h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }} className="hide-on-mobile">
              {userEmail} • {userRole} {userFacility && `• ${userFacility.name}`}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout} style={{ borderColor: '#fff', color: '#fff' }}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div style={{ 
        display: 'flex', 
        flex: 1, 
        maxWidth: '1200px', 
        margin: '0 auto', 
        width: '100%',
        position: 'relative'
      }}>
        {/* Sidebar */}
        <aside 
          className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}
          style={{ 
            width: '240px', 
            backgroundColor: 'var(--surface)', 
            borderRight: '1px solid var(--border)',
            padding: '24px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {navLinks().map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link 
                key={link.path}
                to={link.path} 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: '12px 24px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--primary)' : 'var(--text)',
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  borderRight: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s',
                  display: 'block'
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </aside>

        {/* Main Content */}
        <main style={{ 
          flex: 1, 
          padding: '24px',
          overflowX: 'auto',
          width: '100%'
        }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        .hide-on-mobile {
          display: block;
        }
        .mobile-menu-btn {
          display: none !important;
        }
        
        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .sidebar {
            position: absolute;
            left: -240px;
            top: 0;
            bottom: 0;
            z-index: 9;
            transition: left 0.3s ease;
            box-shadow: var(--shadow-lg);
          }
          .sidebar.open {
            left: 0;
          }
        }
      `}</style>
    </div>
  );
};
