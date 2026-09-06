import { useEffect, useState } from 'react';
import { Card, Badge } from '../../components/ui';
import { facilitiesApi } from '../../api';
import type { Facility } from '../../types';

export const AdminFacilities = () => {
  const token = localStorage.getItem('token') || '';
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      facilitiesApi.getAll(token)
        .then(setFacilities)
        .catch(() => setError('Failed to load facilities.'))
        .finally(() => setLoading(false));
    }
  }, [token]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading facilities...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-danger)' }}>{error}</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          Platform Facilities
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Overview of all registered healthcare facilities in the network.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {facilities.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No facilities found.</p>
        ) : (
          facilities.map(f => (
            <Card key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--text)' }}>
                  {f.name}
                </div>
                <Badge variant="primary">{f.type}</Badge>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                System ID: {f.id.slice(0, 8)}...
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
