import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientsApi } from '../../api';
import type { Patient } from '../../types';
import { Card, Button } from '../../components/ui';

export const HealthWorkerPatients = () => {
  const { token, userFacility } = useAuth();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientDob, setNewPatientDob] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('MALE');
  const [newPatientPhone, setNewPatientPhone] = useState('');

  const fetchPatients = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await patientsApi.getAll(token);
      setPatients(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to load patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [token]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setSubmitting(true);
      await patientsApi.create(token, {
        full_name: newPatientName,
        date_of_birth: newPatientDob,
        gender: newPatientGender,
        phone: newPatientPhone,
        facility: userFacility?.id 
      });
      alert('Patient registered successfully');
      setNewPatientName('');
      setNewPatientDob('');
      setNewPatientGender('MALE');
      setNewPatientPhone('');
      await fetchPatients();
    } catch (err) {
      console.error(err);
      alert('Failed to register patient. Check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading patients...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-danger)' }}>{error}</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          Patient Management
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Register new patients and view existing records.
        </p>
      </div>

      <Card style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>Register New Patient</h2>
        <form onSubmit={handleCreatePatient} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{flex: '1 1 200px'}}>
            <label style={{display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px'}}>Full Name</label>
            <input type="text" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} required style={{width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}} />
          </div>
          <div style={{flex: '1 1 150px'}}>
            <label style={{display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px'}}>Date of Birth</label>
            <input type="date" value={newPatientDob} onChange={e => setNewPatientDob(e.target.value)} required style={{width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}} />
          </div>
          <div style={{flex: '1 1 120px'}}>
            <label style={{display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px'}}>Gender</label>
            <select value={newPatientGender} onChange={e => setNewPatientGender(e.target.value)} required style={{width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div style={{flex: '1 1 150px'}}>
            <label style={{display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px'}}>Phone Number</label>
            <input type="tel" value={newPatientPhone} onChange={e => setNewPatientPhone(e.target.value)} required style={{width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}} />
          </div>
          <div style={{flex: '1 1 150px'}}>
            <Button type="submit" variant="primary" fullWidth disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Patient'}
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>All Patients</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {patients.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No patients found.</p>
          ) : (
            patients.map(p => (
              <Card key={p.id}>
                <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '4px' }}>
                  {p.full_name}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  {p.gender}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>
                  📞 {p.phone}
                </div>
                {p.has_account && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Has Account
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
