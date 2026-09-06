import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { referralsApi, facilitiesApi } from '../../api';
import type { Referral, Facility } from '../../types';
import { Card, PageHeader, Badge } from '../../components/ui';

export const PatientReferrals = () => {
  const { token } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const [refs, facs] = await Promise.all([
          referralsApi.getAll(token),
          facilitiesApi.getAll(token)
        ]);
        setReferrals(refs);
        setFacilities(facs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const getFacilityName = (id: string | null | undefined) => {
    if (!id) return '—';
    const f = facilities.find(f => f.id === id);
    return f?.name || id;
  };

  if (loading) return (
    <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading referrals...</p>
  );

  return (
    <div>
      <PageHeader 
        title="My Referrals" 
        subtitle="Referrals are issued by your doctor when specialist or facility care is needed." 
      />

      {referrals.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <p style={{ fontWeight: 500, marginBottom: '8px' }}>No referrals yet.</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              If your doctor issues a referral, it will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {referrals.map(r => {
            let statusVariant: 'primary' | 'success' | 'danger' | 'warning' | 'neutral' = 'primary';
            if (r.status === 'COMPLETED') statusVariant = 'success';
            else if (r.status === 'CANCELLED') statusVariant = 'danger';
            else if (r.status === 'PENDING') statusVariant = 'warning';

            return (
              <div key={r.id} style={{
                padding: '18px 20px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                      Referral to {getFacilityName(r.to_facility)}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Badge variant={r.priority === 'EMERGENCY' ? 'danger' : r.priority === 'URGENT' ? 'warning' : 'neutral'}>
                      {r.priority}
                    </Badge>
                    <Badge variant={statusVariant}>{r.status}</Badge>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>From</span>
                    <span>{getFacilityName(r.from_facility)}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>To</span>
                    <span>{getFacilityName(r.to_facility)}</span>
                  </div>
                  {r.reason && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Reason</span>
                      <span>{r.reason}</span>
                    </div>
                  )}
                </div>
                
                {r.referral_notes && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {r.referral_notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
