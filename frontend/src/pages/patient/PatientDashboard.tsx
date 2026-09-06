import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/ui';
import { appointmentsApi, consultationsApi } from '../../api';
import type { Appointment, Consultation } from '../../types';

export const PatientDashboard = () => {
  const { userEmail, token } = useAuth();
  const navigate = useNavigate();

  const [upcomingAppts, setUpcomingAppts] = useState<Appointment[]>([]);
  const [activeConsults, setActiveConsults] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive patient first name from email for a friendlier greeting
  const firstName = userEmail ? userEmail.split('@')[0].split('.')[0] : 'there';
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  useEffect(() => {
    if (token) {
      Promise.all([
        appointmentsApi.getAll(token),
        consultationsApi.getAll(token)
      ]).then(([appts, consults]) => {
        setUpcomingAppts(appts.filter(a => a.status === 'SCHEDULED'));
        setActiveConsults(consults.filter(c => c.status !== 'COMPLETED' && c.status !== 'CANCELLED'));
      }).catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [token]);

  const nextAppt = upcomingAppts.sort((a, b) => 
    a.scheduled_date > b.scheduled_date ? 1 : a.scheduled_date < b.scheduled_date ? -1 :
    a.start_time > b.start_time ? 1 : -1
  )[0];

  const mostRecentConsult = activeConsults[0];

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
      Loading your health overview...
    </div>
  );

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          Welcome back, {displayName}
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Your healthcare overview
        </p>
      </div>

      {/* Status summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        
        {/* Active request */}
        <div style={{
          padding: '20px',
          backgroundColor: mostRecentConsult ? 'var(--primary-light)' : 'var(--surface)',
          border: `1px solid ${mostRecentConsult ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Active Health Request
          </div>
          {mostRecentConsult ? (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                {mostRecentConsult.chief_complaint.slice(0, 50)}{mostRecentConsult.chief_complaint.length > 50 ? '…' : ''}
              </div>
              <Badge variant={
                mostRecentConsult.priority === 'EMERGENCY' ? 'danger' : 
                mostRecentConsult.priority === 'URGENT' ? 'warning' : 
                mostRecentConsult.status === 'IN_PROGRESS' ? 'primary' : 'neutral'
              }>
                {mostRecentConsult.status === 'IN_PROGRESS' ? 'In Progress' : 
                 mostRecentConsult.status === 'PENDING_TRIAGE' ? 'Awaiting Triage' : 
                 mostRecentConsult.status}
              </Badge>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No active health requests.
            </div>
          )}
        </div>

        {/* Next appointment */}
        <div style={{
          padding: '20px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Next Appointment
          </div>
          {nextAppt ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text)', marginBottom: '4px' }}>
                {new Date(nextAppt.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {nextAppt.start_time.slice(0, 5)} · {nextAppt.mode === 'TELEMEDICINE' ? 'Online Consultation' : 'In-Person Visit'}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No upcoming appointments.
            </div>
          )}
        </div>

        {/* Counts */}
        <div style={{
          padding: '20px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Appointments
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>
            {upcomingAppts.length}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Scheduled
          </div>
        </div>
      </div>

      {/* What should I do next */}
      {mostRecentConsult && (
        <Card style={{ marginBottom: '24px', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '0.9375rem', fontWeight: 600 }}>What to do next</h3>
          {mostRecentConsult.status === 'PENDING_TRIAGE' && mostRecentConsult.priority !== 'EMERGENCY' && (
            <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Your symptom request has been evaluated. You can now book an appointment with a doctor.
            </p>
          )}
          {mostRecentConsult.status === 'PENDING_TRIAGE' && mostRecentConsult.priority === 'EMERGENCY' && (
            <p style={{ margin: '0 0 12px', color: '#721c24', fontWeight: 600, fontSize: '0.875rem' }}>
              ⚠ Your symptoms indicate an emergency. Please go to the nearest emergency department immediately.
            </p>
          )}
          {mostRecentConsult.status === 'SCHEDULED' && (
            <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Your appointment is confirmed. Please arrive on time or join online at the scheduled time.
            </p>
          )}
          {mostRecentConsult.status === 'IN_PROGRESS' && (
            <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Your consultation is currently in progress with the doctor.
            </p>
          )}
          {mostRecentConsult.status === 'PENDING_TRIAGE' && mostRecentConsult.priority !== 'EMERGENCY' && (
            <Button size="sm" onClick={() => navigate('/patient/triage')}>
              Book Appointment
            </Button>
          )}
        </Card>
      )}

      {/* Quick actions */}
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <Button variant="primary" onClick={() => navigate('/patient/triage')} fullWidth>
            Request Consultation
          </Button>
          <Button variant="outline" onClick={() => navigate('/patient/appointments')} fullWidth>
            View Appointments
          </Button>
          <Button variant="outline" onClick={() => navigate('/patient/records')} fullWidth>
            Medical Records
          </Button>
          <Button variant="outline" onClick={() => navigate('/patient/referrals')} fullWidth>
            Referrals
          </Button>
          <Button variant="outline" onClick={() => navigate('/patient/follow-ups')} fullWidth>
            Follow-ups
          </Button>
        </div>
      </div>
    </div>
  );
};
