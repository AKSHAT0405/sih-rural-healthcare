import React, { useEffect, useState } from 'react';
import { Card, Badge, Button } from '../../components/ui';
import { patientsApi, facilitiesApi } from '../../api';
import type { Patient, Facility } from '../../types';

export const AdminUsers = () => {
  const token = localStorage.getItem('token') || '';
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Portal Account Creation State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [createAccountEmail, setCreateAccountEmail] = useState('');
  const [createAccountPassword, setCreateAccountPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [pats, facs] = await Promise.all([
        patientsApi.getAll(token),
        facilitiesApi.getAll(token)
      ]);
      setPatients(pats);
      setFacilities(facs);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to load patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedPatientId) return;

    try {
      setSubmitting(true);
      await patientsApi.createAccount(token, selectedPatientId, {
        email: createAccountEmail,
        password: createAccountPassword
      });
      alert('Patient portal account created successfully!');
      setSelectedPatientId(null);
      setCreateAccountEmail('');
      setCreateAccountPassword('');
      await fetchData(); // Refresh to update has_account status
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to create patient account.');
    } finally {
      setSubmitting(false);
    }
  };

  const getFacilityName = (id: string) => facilities.find(f => f.id === id)?.name || id;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-danger)' }}>{error}</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          User Management (Patients)
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Manage patient records and provision portal access.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {patients.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No patients found.</p>
        ) : (
          patients.map(p => (
            <Card key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--text)' }}>{p.full_name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{p.gender}</div>
                </div>
                {p.has_account ? (
                  <Badge variant="success">Portal Active</Badge>
                ) : (
                  <Badge variant="neutral">No Portal Access</Badge>
                )}
              </div>

              <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                📞 {p.phone}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                🏥 {getFacilityName(p.facility)}
              </div>

              {!p.has_account && (
                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  {selectedPatientId === p.id ? (
                    <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input 
                        type="email" 
                        placeholder="Patient Email" 
                        value={createAccountEmail} 
                        onChange={e => setCreateAccountEmail(e.target.value)} 
                        required 
                        style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%' }}
                      />
                      <input 
                        type="password" 
                        placeholder="Temporary Password" 
                        value={createAccountPassword} 
                        onChange={e => setCreateAccountPassword(e.target.value)} 
                        required 
                        minLength={8}
                        style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button type="submit" variant="primary" style={{ flex: 1 }} disabled={submitting}>
                          {submitting ? 'Creating...' : 'Create'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setSelectedPatientId(null)} style={{ flex: 1 }}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button variant="outline" fullWidth onClick={() => setSelectedPatientId(p.id)}>
                      Provision Portal Account
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
