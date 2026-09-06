import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/ui';
import { consultationsApi, referralsApi, inventoryApi } from '../../api';
import type { Consultation, Referral, InventoryItem } from '../../types';

export const HealthWorkerDashboard = () => {
  const { userFacility, token } = useAuth();
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setLoading(true);
      Promise.all([
        consultationsApi.getAll(token).catch(() => []),
        referralsApi.getAll(token).catch(() => []),
        inventoryApi.getAll(token).catch(() => [])
      ]).then(([consults, refs, inv]) => {
        setConsultations(consults);
        setReferrals(refs);
        setInventory(inv);
        setError(null);
      }).catch(() => {
        setError("Failed to load dashboard data. Please try again later.");
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [token]);

  if (!userFacility) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '16px' }}>No Facility Assigned</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Your account is not currently assigned to a facility. Please contact an administrator.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading facility overview...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-danger)' }}>
        {error}
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysConsults = consultations.filter(c => c.created_at.startsWith(todayStr));
  const pendingIncomingRefs = referrals.filter(r => r.to_facility === userFacility.id && r.status === 'PENDING');
  
  const inventoryAlerts = inventory.filter(i => 
    i.availability_status === 'LOW_STOCK' || 
    i.availability_status === 'OUT_OF_STOCK' || 
    i.availability_status === 'UNAVAILABLE_EQUIPMENT'
  );

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          {userFacility.name}
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Health Worker Dashboard
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Today's Consultations
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>
            {todaysConsults.length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Active & Pending</div>
        </div>

        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Pending Referrals
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>
            {pendingIncomingRefs.length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Incoming to facility</div>
        </div>

        <div style={{ padding: '20px', backgroundColor: inventoryAlerts.length > 0 ? '#fff3cd' : 'var(--surface)', border: `1px solid ${inventoryAlerts.length > 0 ? '#ffeeba' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Inventory Alerts
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: inventoryAlerts.length > 0 ? '#856404' : 'var(--text)' }}>
            {inventoryAlerts.length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Items needing attention</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <Card>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>Inventory Needs</h2>
          {inventoryAlerts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>No urgent inventory alerts at this time.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {inventoryAlerts.slice(0, 4).map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{item.name}</div>
                  <Badge variant="danger">{item.availability_status.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
              {inventoryAlerts.length > 4 && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                  +{inventoryAlerts.length - 4} more alerts
                </div>
              )}
            </div>
          )}
        </Card>

        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Button variant="primary" onClick={() => navigate('/health-worker/patients')} fullWidth>
              Register / View Patients
            </Button>
            <Button variant="outline" onClick={() => navigate('/health-worker/inventory')} fullWidth>
              Manage Inventory
            </Button>
            <Button variant="outline" onClick={() => navigate('/health-worker/consultations')} fullWidth>
              View Consultations
            </Button>
            <Button variant="outline" onClick={() => navigate('/health-worker/referrals')} fullWidth>
              View Referrals
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
