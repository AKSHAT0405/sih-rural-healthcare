import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentsApi, doctorsApi } from '../../api';
import type { Appointment } from '../../types';
import { Card, Button, PageHeader, Toast, Badge } from '../../components/ui';


type DoctorUser = { id: string; first_name: string; last_name: string; specialization?: string; facility?: { id: string; name: string } };

export const PatientAppointments = () => {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);

  const fetchAppointments = async () => {
    if (!token) return;
    try {
      const data = await appointmentsApi.getAll(token);
      // Sort: upcoming first, then by date
      const sorted = data.sort((a, b) => {
        if (a.status === 'SCHEDULED' && b.status !== 'SCHEDULED') return -1;
        if (b.status === 'SCHEDULED' && a.status !== 'SCHEDULED') return 1;
        return a.scheduled_date > b.scheduled_date ? 1 : -1;
      });
      setAppointments(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    if (token) doctorsApi.getAll(token).then(setDoctors);
  }, [token]);

  const getDoctorName = (doctorId: string) => {
    const d = doctors.find(d => d.id === doctorId);
    return d ? `Dr. ${d.first_name} ${d.last_name}` : 'Doctor';
  };
  const getDoctorSpecialization = (doctorId: string) => {
    return doctors.find(d => d.id === doctorId)?.specialization || '';
  };
  const getFacilityName = (doctorId: string) => {
    return doctors.find(d => d.id === doctorId)?.facility?.name || '';
  };

  const handleCancel = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) return;
    try {
      await appointmentsApi.updateStatus(token, id, 'CANCELLED');
      setToast({ message: 'Appointment cancelled.', type: 'success' });
      fetchAppointments();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to cancel appointment. Please try again.', type: 'error' });
    }
  };

  const upcoming = appointments.filter(a => a.status === 'SCHEDULED');
  const past = appointments.filter(a => a.status !== 'SCHEDULED');

  if (loading) return (
    <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading appointments...</p>
  );

  const AppointmentCard = ({ a }: { a: Appointment }) => {
    const isUpcoming = a.status === 'SCHEDULED';
    let statusVariant: 'primary' | 'success' | 'danger' | 'warning' | 'neutral' = 'neutral';
    if (a.status === 'SCHEDULED') statusVariant = 'primary';
    else if (a.status === 'COMPLETED') statusVariant = 'success';
    else if (a.status === 'NO_SHOW') statusVariant = 'danger';
    else if (a.status === 'CANCELLED') statusVariant = 'warning';

    return (
      <div style={{
        padding: '16px 20px',
        border: `1px solid ${isUpcoming ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        backgroundColor: isUpcoming ? 'var(--primary-light)' : 'var(--surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
              {new Date(a.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>at {a.start_time.slice(0, 5)}</span>
          </div>
          <div style={{ marginBottom: '4px', fontWeight: 500 }}>{getDoctorName(a.doctor)}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {getDoctorSpecialization(a.doctor) && <span>{getDoctorSpecialization(a.doctor)}</span>}
            {getFacilityName(a.doctor) && <span>· {getFacilityName(a.doctor)}</span>}
            <span>· {a.mode === 'TELEMEDICINE' ? 'Online Consultation' : 'In-Person Visit'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <Badge variant={statusVariant}>{a.status === 'NO_SHOW' ? 'No Show' : a.status}</Badge>
          {isUpcoming && (
            <Button size="sm" variant="outline" onClick={() => handleCancel(a.id)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader 
        title="My Appointments" 
        subtitle="View and manage your upcoming and past appointments."
      />
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {upcoming.length === 0 && past.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '16px' }}>You have no appointments yet.</p>
            <p style={{ fontSize: '0.875rem' }}>Submit a triage request to get started.</p>
          </div>
        </Card>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
            Upcoming ({upcoming.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcoming.map(a => <AppointmentCard key={a.id} a={a} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
            Past Appointments
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {past.map(a => <AppointmentCard key={a.id} a={a} />)}
          </div>
        </div>
      )}
    </div>
  );
};
