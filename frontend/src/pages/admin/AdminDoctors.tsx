import { useEffect, useState } from 'react';
import { Card, Badge } from '../../components/ui';
import { doctorsApi } from '../../api';

export const AdminDoctors = () => {
  const token = localStorage.getItem('token') || '';
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      doctorsApi.getAll(token)
        .then(setDoctors)
        .catch(() => setError('Failed to load doctors.'))
        .finally(() => setLoading(false));
    }
  }, [token]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading doctors...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-danger)' }}>{error}</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          Platform Doctors
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Overview of all registered doctors across facilities.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {doctors.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No doctors found.</p>
        ) : (
          doctors.map(d => (
            <Card key={d.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--text)' }}>
                  Dr. {d.first_name} {d.last_name}
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {d.email}
              </div>
              
              <div style={{ marginTop: '8px', padding: '12px', backgroundColor: 'var(--background)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Assigned Facility
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                  {d.facility?.name || 'Unassigned'}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
