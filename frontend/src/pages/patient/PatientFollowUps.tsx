import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { followUpsApi, doctorsApi } from '../../api';
import type { FollowUp } from '../../types';
import { Card, PageHeader, Badge } from '../../components/ui';

type DoctorUser = { id: string; first_name: string; last_name: string; facility?: { id: string; name: string } };

export const PatientFollowUps = () => {
  const { token } = useAuth();
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowUps = async () => {
      if (!token) return;
      try {
        const [data, docs] = await Promise.all([
          followUpsApi.getAll(token),
          doctorsApi.getAll(token)
        ]);
        // Sort upcoming first
        const sorted = data.sort((a, b) => a.scheduled_date > b.scheduled_date ? 1 : -1);
        setFollowups(sorted);
        setDoctors(docs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFollowUps();
  }, [token]);

  const getDoctorName = (doctorId: string) => {
    const d = doctors.find(d => d.id === doctorId);
    return d ? `Dr. ${d.first_name} ${d.last_name}` : 'Doctor';
  };
  
  const getFacilityName = (doctorId: string) => {
    return doctors.find(d => d.id === doctorId)?.facility?.name || '';
  };

  const today = new Date().toISOString().split('T')[0];

  if (loading) return (
    <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading follow-ups...</p>
  );

  const upcoming = followups.filter(f => f.status === 'SCHEDULED' && f.scheduled_date >= today);
  const past = followups.filter(f => f.status !== 'SCHEDULED' || f.scheduled_date < today);

  const FollowUpCard = ({ f }: { f: FollowUp }) => {
    const isUpcoming = f.status === 'SCHEDULED' && f.scheduled_date >= today;
    let statusVariant: 'primary' | 'success' | 'danger' | 'warning' | 'neutral' = 'neutral';
    if (f.status === 'COMPLETED') statusVariant = 'success';
    else if (f.status === 'CANCELLED') statusVariant = 'danger';
    else if (f.status === 'SCHEDULED') statusVariant = 'primary';

    return (
      <div style={{
        padding: '16px 20px',
        border: `1px solid ${isUpcoming ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        backgroundColor: isUpcoming ? 'var(--primary-light)' : 'var(--surface)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
              {new Date(f.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { 
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
              })}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500, marginBottom: '4px' }}>
              {f.reason}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {getDoctorName(f.created_by)}
              {getFacilityName(f.created_by) && <span> · {getFacilityName(f.created_by)}</span>}
            </div>
          </div>
          <Badge variant={statusVariant}>{f.status}</Badge>
        </div>
        {f.notes && (
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <strong>Notes:</strong> {f.notes}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader 
        title="My Follow-ups" 
        subtitle="Scheduled follow-up appointments and instructions from your doctor." 
      />

      {followups.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <p style={{ fontWeight: 500, marginBottom: '8px' }}>No follow-ups scheduled.</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              Your doctor may schedule follow-ups after a consultation.
            </p>
          </div>
        </Card>
      ) : (
        <div>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                Upcoming ({upcoming.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {upcoming.map(f => <FollowUpCard key={f.id} f={f} />)}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                Past Follow-ups
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {past.map(f => <FollowUpCard key={f.id} f={f} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
