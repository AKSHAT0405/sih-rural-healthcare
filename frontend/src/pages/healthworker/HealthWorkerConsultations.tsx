import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { consultationsApi } from '../../api';
import type { Consultation } from '../../types';
import { Card, Badge } from '../../components/ui';

export const HealthWorkerConsultations = () => {
  const { token } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      consultationsApi.getAll(token)
        .then(setConsultations)
        .catch(() => setError('Failed to load consultations.'))
        .finally(() => setLoading(false));
    }
  }, [token]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading consultations...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-danger)' }}>{error}</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          Facility Consultations
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          View all consultations for your facility, including the triage queue.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {consultations.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No consultations found at this facility.</p>
        ) : (
          consultations.map(c => (
            <Card key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: `4px solid ${
              c.priority === 'EMERGENCY' ? 'var(--danger)' : 
              c.priority === 'URGENT' ? 'var(--warning)' : 'var(--primary)'
            }`}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '4px' }}>
                    {c.chief_complaint}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Created: {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Badge variant={c.priority === 'EMERGENCY' ? 'danger' : c.priority === 'URGENT' ? 'warning' : 'primary'}>
                    {c.priority}
                  </Badge>
                  <Badge variant={c.status === 'COMPLETED' ? 'success' : c.status === 'CANCELLED' ? 'neutral' : 'warning'}>
                    {c.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
              <div style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>
                <strong>Patient ID:</strong> {c.patient}
              </div>
              {c.doctor && (
                <div style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>
                  <strong>Assigned Doctor ID:</strong> {c.doctor}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
