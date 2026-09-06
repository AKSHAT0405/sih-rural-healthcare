import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { patientsApi, facilitiesApi } from '../../api';
import type { Patient, Facility, Consultation, Referral, FollowUp } from '../../types';
import { API_BASE_URL } from '../../api/config';
import { Card, PageHeader, Button, Badge } from '../../components/ui';

export const DoctorPatients = () => {
  const { token } = useAuth();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  
  // Detail view state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientConsultations, setPatientConsultations] = useState<Consultation[]>([]);
  const [patientReferrals, setPatientReferrals] = useState<Referral[]>([]);
  const [patientFollowups, setPatientFollowups] = useState<FollowUp[]>([]);

  useEffect(() => {
    if (token) {
      patientsApi.getAll(token).then(setPatients);
      facilitiesApi.getAll(token).then(setFacilities);
    }
  }, [token]);

  const getFacilityName = (id: string | null | undefined) => {
    if (!id) return 'Unknown';
    return facilities.find(f => f.id === id)?.name || id;
  };

  const fetchPatientHistory = async (patientId: string) => {
    if (!token) return;
    try {
      const [consRes, refRes, fuRes] = await Promise.all([
        fetch(`${API_BASE_URL}/consultations/?patient=${patientId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/referrals/?patient=${patientId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/followups/?patient=${patientId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (consRes.ok) {
        const data = await consRes.json();
        setPatientConsultations(data.results || data);
      }
      if (refRes.ok) {
        const data = await refRes.json();
        setPatientReferrals(data.results || data);
      }
      if (fuRes.ok) {
        const data = await fuRes.json();
        setPatientFollowups(data.results || data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const viewPatientDetails = (id: string) => {
    setSelectedPatientId(id);
    fetchPatientHistory(id);
  };

  if (selectedPatientId) {
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return <p>Patient not found.</p>;

    const timelineEvents: any[] = [];
    patientConsultations.forEach(c => timelineEvents.push({ type: 'Consultation', date: new Date(c.created_at), data: c }));
    patientReferrals.forEach(r => timelineEvents.push({ type: 'Referral', date: new Date(r.created_at), data: r }));
    patientFollowups.forEach(f => timelineEvents.push({ type: 'Follow-up', date: new Date(f.created_at), data: f }));

    timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime()); // Descending

    return (
      <div>
        <PageHeader 
          title={`Patient Journey: ${patient.full_name}`}
          subtitle="View complete chronological history of consultations, referrals, and follow-ups."
          action={<Button variant="outline" onClick={() => setSelectedPatientId(null)}>Back to Patients</Button>}
        />

        <Card style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Gender</span>
              <strong>{patient.gender}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Phone</span>
              <strong>{patient.phone}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Registered Facility</span>
              <strong>{getFacilityName(patient.facility)}</strong>
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
          {/* Timeline */}
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Chronological Timeline</h3>
            <div style={{ borderLeft: '3px solid var(--primary-light)', paddingLeft: '24px', marginLeft: '12px' }}>
              {timelineEvents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No history found.</p>
              ) : (
                timelineEvents.map((evt, idx) => (
                  <div key={idx} style={{ position: 'relative', marginBottom: '24px' }}>
                    {/* Timeline dot */}
                    <div style={{
                      position: 'absolute',
                      left: '-32px',
                      top: '4px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                      border: '2px solid white'
                    }} />
                    
                    <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                          {evt.date.toLocaleDateString()} {evt.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <Badge variant={evt.type === 'Consultation' ? 'primary' : evt.type === 'Referral' ? 'warning' : 'info'}>
                          {evt.type}
                        </Badge>
                      </div>
                      
                      <div style={{ color: 'var(--text)' }}>
                        {evt.type === 'Consultation' && (
                          <>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>{evt.data.chief_complaint}</strong>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                              Facility: {getFacilityName(evt.data.facility)} • Status: {evt.data.status}
                            </div>
                          </>
                        )}
                        {evt.type === 'Referral' && (
                          <>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>Referral to {getFacilityName(evt.data.to_facility)}</strong>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                              Reason: {evt.data.reason} • Status: {evt.data.status}
                            </div>
                          </>
                        )}
                        {evt.type === 'Follow-up' && (
                          <>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>Follow-up Scheduled</strong>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                              For: {evt.data.scheduled_date} • Status: {evt.data.status}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Segmented Records */}
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Segmented Records</h3>
            
            <Card style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0 }}>Consultations</h4>
                <Badge>{patientConsultations.length}</Badge>
              </div>
              <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {patientConsultations.map(c => <li key={c.id} style={{ marginBottom: '8px' }}>{new Date(c.created_at).toLocaleDateString()} — {c.status}</li>)}
                {patientConsultations.length === 0 && <li>None</li>}
              </ul>
            </Card>

            <Card style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0 }}>Referrals</h4>
                <Badge variant="warning">{patientReferrals.length}</Badge>
              </div>
              <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {patientReferrals.map(r => <li key={r.id} style={{ marginBottom: '8px' }}>{new Date(r.created_at).toLocaleDateString()} — To: {getFacilityName(r.to_facility)} ({r.status})</li>)}
                {patientReferrals.length === 0 && <li>None</li>}
              </ul>
            </Card>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0 }}>Follow-ups</h4>
                <Badge variant="info">{patientFollowups.length}</Badge>
              </div>
              <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {patientFollowups.map(f => <li key={f.id} style={{ marginBottom: '8px' }}>{f.scheduled_date} — {f.status}</li>)}
                {patientFollowups.length === 0 && <li>None</li>}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Patient Directory" 
        subtitle="View and search patients registered in the system." 
      />

      <Card noShadow>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Facility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No patients found
                  </td>
                </tr>
              ) : (
                patients.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.full_name}</strong></td>
                    <td>{p.gender}</td>
                    <td>{p.phone}</td>
                    <td>{getFacilityName(p.facility)}</td>
                    <td>
                      <Button size="sm" onClick={() => viewPatientDetails(p.id)}>
                        View History
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
