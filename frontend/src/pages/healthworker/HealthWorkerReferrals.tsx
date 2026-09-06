import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { referralsApi } from '../../api';
import type { Referral } from '../../types';
import { Card, Badge } from '../../components/ui';

export const HealthWorkerReferrals = () => {
  const { token, userFacility } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');

  useEffect(() => {
    if (token) {
      referralsApi.getAll(token)
        .then(setReferrals)
        .catch(() => setError('Failed to load referrals.'))
        .finally(() => setLoading(false));
    }
  }, [token]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading referrals...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-danger)' }}>{error}</div>;

  const filteredReferrals = referrals.filter(r => {
    if (!userFacility) return true;
    if (filter === 'INCOMING') return r.to_facility === userFacility.id;
    if (filter === 'OUTGOING') return r.from_facility === userFacility.id;
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          Facility Referrals
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          View incoming and outgoing patient referrals.
        </p>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => setFilter('ALL')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)', backgroundColor: filter === 'ALL' ? 'var(--primary)' : 'var(--surface)', color: filter === 'ALL' ? '#fff' : 'var(--text)', cursor: 'pointer' }}
        >
          All
        </button>
        <button 
          onClick={() => setFilter('INCOMING')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)', backgroundColor: filter === 'INCOMING' ? 'var(--primary)' : 'var(--surface)', color: filter === 'INCOMING' ? '#fff' : 'var(--text)', cursor: 'pointer' }}
        >
          Incoming
        </button>
        <button 
          onClick={() => setFilter('OUTGOING')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)', backgroundColor: filter === 'OUTGOING' ? 'var(--primary)' : 'var(--surface)', color: filter === 'OUTGOING' ? '#fff' : 'var(--text)', cursor: 'pointer' }}
        >
          Outgoing
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredReferrals.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No referrals found matching the filter.</p>
        ) : (
          filteredReferrals.map(r => (
            <Card key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '4px' }}>
                    Patient ID: {r.patient}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Created: {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Badge variant={r.priority === 'EMERGENCY' ? 'danger' : r.priority === 'URGENT' ? 'warning' : 'primary'}>
                    {r.priority}
                  </Badge>
                  <Badge variant={r.status === 'COMPLETED' ? 'success' : r.status === 'ACCEPTED' ? 'primary' : r.status === 'CANCELLED' ? 'neutral' : 'warning'}>
                    {r.status}
                  </Badge>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', backgroundColor: 'var(--background)', borderRadius: 'var(--radius)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>From Facility</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{r.from_facility}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>To Facility</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{r.to_facility}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>
                <strong>Reason:</strong> {r.reason}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
