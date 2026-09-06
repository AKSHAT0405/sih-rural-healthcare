import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentsApi, patientsApi } from '../../api';
import { API_BASE_URL } from '../../api/config';
import type { Appointment, Patient } from '../../types';
import { Card, PageHeader, Toast, Button, Badge } from '../../components/ui';

export const DoctorAppointments = () => {
  const { token, userId } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);

  const fetchAppointments = () => {
    if (token) {
      appointmentsApi.getAll(token).then(data => {
        // Filter to this doctor's appointments only
        setAppointments(data.filter(a => a.doctor === userId));
      });
    }
  };

  useEffect(() => {
    if (token) {
      fetchAppointments();
      patientsApi.getAll(token).then(setPatients);
    }
  }, [token, userId]);

  const getPatientName = (id: string) => {
    const p = patients.find(p => p.id === id);
    return p ? p.full_name : id;
  };

  const handleStartConsultation = async (consultationId: string | null | undefined) => {
    if (!token) return;
    if (!consultationId) {
      setToast({ message: 'This appointment has no linked consultation record.', type: 'error' });
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/consultations/${consultationId}/start/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        navigate(`/doctor/workspace/${consultationId}`);
      } else {
        const data = await res.json();
        const detail = data?.detail || data?.status || JSON.stringify(data);
        if (detail.includes('assigned doctor')) {
          setToast({ message: 'You are not the assigned doctor for this consultation. Only the assigned doctor can start it.', type: 'error' });
        } else if (detail.includes('SCHEDULED')) {
          setToast({ message: 'This consultation must be in SCHEDULED status before it can be started.', type: 'warning' });
        } else if (detail.includes('appointment')) {
          setToast({ message: 'The related appointment is not in SCHEDULED status.', type: 'warning' });
        } else {
          setToast({ message: 'Cannot start consultation: ' + detail, type: 'error' });
        }
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    }
  };

  const handleUpdateAppointmentStatus = async (id: string, status: string) => {
    if (!token) return;
    try {
      await appointmentsApi.updateStatus(token, id, status);
      fetchAppointments();
      setToast({ message: `Appointment ${status.toLowerCase()}.`, type: 'info' });
    } catch (err) {
      console.error(err);
      setToast({ message: `Failed to update appointment status.`, type: 'error' });
    }
  };

  // Sort: upcoming first
  const sorted = [...appointments].sort((a, b) => {
    if (a.scheduled_date !== b.scheduled_date) return a.scheduled_date > b.scheduled_date ? 1 : -1;
    return a.start_time > b.start_time ? 1 : -1;
  });

  return (
    <div>
      <PageHeader 
        title="My Appointments" 
        subtitle="View your upcoming and past appointments. Use Start Consultation to enter the clinical workspace." 
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Card noShadow>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Patient</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No appointments found
                  </td>
                </tr>
              ) : (
                sorted.map(a => {
                  let badgeVariant: 'primary' | 'success' | 'danger' | 'warning' | 'neutral' = 'neutral';
                  if (a.status === 'SCHEDULED') badgeVariant = 'primary';
                  else if (a.status === 'COMPLETED') badgeVariant = 'success';
                  else if (a.status === 'NO_SHOW') badgeVariant = 'danger';
                  else if (a.status === 'CANCELLED') badgeVariant = 'warning';

                  return (
                    <tr key={a.id}>
                      <td><strong>{new Date(a.scheduled_date + 'T00:00:00').toLocaleDateString()}</strong></td>
                      <td>{a.start_time.slice(0,5)} – {a.end_time.slice(0,5)}</td>
                      <td>{getPatientName(a.patient)}</td>
                      <td>{a.mode === 'TELEMEDICINE' ? 'Online' : 'In-Person'}</td>
                      <td>
                        <Badge variant={badgeVariant}>{a.status}</Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {a.status === 'SCHEDULED' && (
                            <>
                              <Button size="sm" onClick={() => handleStartConsultation(a.consultation)}>
                                Start Consultation
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  if (window.confirm('Mark this appointment as No Show?')) {
                                    handleUpdateAppointmentStatus(a.id, 'NO_SHOW');
                                  }
                                }}
                              >
                                No Show
                              </Button>
                            </>
                          )}
                          {a.status === 'IN_PROGRESS' && (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/doctor/workspace/${a.consultation}`)}>
                              Open Workspace
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
