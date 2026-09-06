import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { consultationsApi, patientsApi, referralsApi, facilitiesApi, appointmentsApi } from '../../api';
import type { Consultation, Patient, Referral, Facility, Appointment } from '../../types';
import { API_BASE_URL } from '../../api/config';
import { Card, PageHeader, Button, Badge, Toast, Select, Textarea } from '../../components/ui';

export const DoctorDashboard = () => {
  const { token, userId, userFacility } = useAuth();
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);

  // Walk-in consultation state
  const [newConsultationPatient, setNewConsultationPatient] = useState('');
  const [newConsultationComplaint, setNewConsultationComplaint] = useState('');
  const [newConsultationPriority, setNewConsultationPriority] = useState('NORMAL');

  const refreshData = () => {
    if (token) {
      consultationsApi.getAll(token).then(setConsultations);
      appointmentsApi.getAll(token).then(setAppointments);
    }
  };

  useEffect(() => {
    if (token) {
      consultationsApi.getAll(token).then(setConsultations);
      appointmentsApi.getAll(token).then(setAppointments);
      patientsApi.getAll(token).then(setPatients);
      referralsApi.getAll(token, undefined, userFacility?.id).then(setReferrals);
      facilitiesApi.getAll(token).then(setFacilities);
    }
  }, [token, userFacility]);

  const getPatientName = (id: string) => {
    const p = patients.find(p => p.id === id);
    return p ? p.full_name : id;
  };
  const getFacilityName = (id: string | null | undefined) => {
    if (!id) return 'Unknown';
    const f = facilities.find(fac => fac.id === id);
    return f ? f.name : id;
  };

  const handleCreateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const payload: any = {
        patient: newConsultationPatient,
        chief_complaint: newConsultationComplaint,
        priority: newConsultationPriority,
        doctor: userId
      };
      const res = await fetch(`${API_BASE_URL}/consultations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Consultation created successfully!', type: 'success' });
        refreshData();
        setNewConsultationPatient('');
        setNewConsultationComplaint('');
      } else {
        setToast({ message: 'Error: ' + JSON.stringify(data), type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to create consultation.', type: 'error' });
    }
  };

  const handleStartConsultation = async (consultationId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/consultations/${consultationId}/start/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        navigate(`/doctor/workspace/${consultationId}`);
      } else {
        const data = await res.json();
        // Parse the error into a user-friendly message
        const detail = data?.detail || data?.status || JSON.stringify(data);
        if (detail.includes('assigned doctor')) {
          setToast({ message: 'You are not the assigned doctor for this consultation.', type: 'error' });
        } else if (detail.includes('SCHEDULED')) {
          setToast({ message: 'This consultation is not in a SCHEDULED state.', type: 'warning' });
        } else {
          setToast({ message: 'Cannot start consultation: ' + detail, type: 'error' });
        }
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Network error starting consultation.', type: 'error' });
    }
  };

  // My consultations = where I am the assigned doctor
  const myConsultations = consultations.filter(c => c.doctor === userId);
  // Emergency/urgent anywhere at my facility (so doctor is aware)
  const emergencyConsultations = myConsultations.filter(
    c => (c.priority === 'EMERGENCY' || c.priority === 'URGENT') && c.status !== 'COMPLETED' && c.status !== 'CANCELLED'
  );
  const activeConsultations = myConsultations.filter(
    c => c.status === 'IN_PROGRESS' || c.status === 'SCHEDULED'
  );
  const incomingPendingReferrals = referrals.filter(
    r => r.to_facility === userFacility?.id && r.status === 'PENDING'
  );

  // Today's appointments for this doctor
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(
    a => a.scheduled_date === today && a.status === 'SCHEDULED'
  );

  return (
    <div>
      <PageHeader 
        title="Doctor Dashboard" 
        subtitle="Manage your active consultations, appointments, and referrals." 
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        
        <div 
          style={{ 
            backgroundColor: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '20px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/doctor/appointments')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>My Active Consultations</span>
            <Badge variant={activeConsultations.length > 0 ? 'primary' : 'neutral'}>{activeConsultations.length}</Badge>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{activeConsultations.length}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>Scheduled or In Progress</div>
        </div>

        <div 
          style={{ 
            backgroundColor: emergencyConsultations.length > 0 ? 'var(--danger-light)' : 'var(--surface)', 
            border: `1px solid ${emergencyConsultations.length > 0 ? 'var(--danger)' : 'var(--border)'}`, 
            borderRadius: 'var(--radius-lg)', 
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: emergencyConsultations.length > 0 ? '#721c24' : 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Emergency / Urgent</span>
            <Badge variant={emergencyConsultations.length > 0 ? 'danger' : 'neutral'}>{emergencyConsultations.length}</Badge>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: emergencyConsultations.length > 0 ? '#721c24' : 'var(--text)' }}>{emergencyConsultations.length}</div>
          <div style={{ fontSize: '0.875rem', color: emergencyConsultations.length > 0 ? '#721c24' : 'var(--text-muted)', marginTop: '4px', opacity: 0.8 }}>
            {emergencyConsultations.length > 0 ? 'Requires immediate attention' : 'No urgent cases'}
          </div>
        </div>

        <div 
          style={{ 
            backgroundColor: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '20px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/doctor/referrals')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Pending Referrals</span>
            <Badge variant={incomingPendingReferrals.length > 0 ? 'warning' : 'neutral'}>{incomingPendingReferrals.length}</Badge>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{incomingPendingReferrals.length}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>Incoming to your facility</div>
        </div>

        <div 
          style={{ 
            backgroundColor: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '20px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/doctor/appointments')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Today's Appointments</span>
            <Badge variant={todayAppointments.length > 0 ? 'primary' : 'neutral'}>{todayAppointments.length}</Badge>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{todayAppointments.length}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>Scheduled for today</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Active consultations quick list */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Active Consultations</h3>
            <Button size="sm" variant="outline" onClick={() => navigate('/doctor/appointments')}>View All</Button>
          </div>
          {activeConsultations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No active consultations at this time.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeConsultations.slice(0, 4).map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>{getPatientName(c.patient)}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.chief_complaint.slice(0, 40)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant={c.status === 'IN_PROGRESS' ? 'primary' : 'neutral'}>{c.status}</Badge>
                    {c.status === 'SCHEDULED' ? (
                      <Button size="sm" onClick={() => handleStartConsultation(c.id)}>Start</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/doctor/workspace/${c.id}`)}>Open</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Incoming referrals */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Incoming Referrals</h3>
            <Button size="sm" variant="outline" onClick={() => navigate('/doctor/referrals')}>View All</Button>
          </div>
          {incomingPendingReferrals.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No incoming referrals pending.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {incomingPendingReferrals.slice(0, 4).map(r => (
                <div key={r.id} style={{ padding: '10px', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{getPatientName(r.patient)}</strong>
                    <Badge variant={r.priority === 'EMERGENCY' ? 'danger' : r.priority === 'URGENT' ? 'warning' : 'neutral'}>{r.priority}</Badge>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>From: {getFacilityName(r.from_facility)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Walk-in consultation form */}
      <Card style={{ marginBottom: '32px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '4px' }}>Start Walk-in Consultation</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 0, marginBottom: '20px' }}>
          For patients presenting in person without a prior appointment.
        </p>
        <form onSubmit={handleCreateConsultation} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <Select 
            label="Select Patient" 
            value={newConsultationPatient} 
            onChange={e => setNewConsultationPatient(e.target.value)} 
            required
          >
            <option value="">Select Patient...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.gender})</option>)}
          </Select>
          <Textarea 
            label="Chief Complaint"
            value={newConsultationComplaint} 
            onChange={e => setNewConsultationComplaint(e.target.value)} 
            required 
          />
          <Select 
            label="Priority"
            value={newConsultationPriority} 
            onChange={e => setNewConsultationPriority(e.target.value)}
          >
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Urgent</option>
            <option value="EMERGENCY">Emergency</option>
          </Select>
          <div>
            <Button type="submit" fullWidth>Create Consultation</Button>
          </div>
        </form>
      </Card>

      {/* All consultations table */}
      <Card noShadow>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>My Consultations</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Complaint</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myConsultations.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No consultations assigned to you</td></tr>
              ) : (
                myConsultations.map(c => (
                  <tr key={c.id} style={{ backgroundColor: c.priority === 'EMERGENCY' ? 'var(--danger-light)' : c.priority === 'URGENT' ? 'var(--warning-light)' : 'inherit' }}>
                    <td><strong>{getPatientName(c.patient)}</strong></td>
                    <td style={{ maxWidth: '200px' }}>{c.chief_complaint}</td>
                    <td>
                      <Badge variant={c.priority === 'EMERGENCY' ? 'danger' : c.priority === 'URGENT' ? 'warning' : 'neutral'}>
                        {c.priority}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={c.status === 'COMPLETED' ? 'success' : c.status === 'IN_PROGRESS' ? 'primary' : 'neutral'}>
                        {c.status}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {c.status === 'SCHEDULED' && (
                          <Button size="sm" onClick={() => handleStartConsultation(c.id)}>Start</Button>
                        )}
                        {(c.status === 'IN_PROGRESS' || c.status === 'SCHEDULED') && (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/doctor/workspace/${c.id}`)}>Workspace</Button>
                        )}
                      </div>
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
