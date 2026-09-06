import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { consultationsApi, doctorsApi, appointmentsApi } from '../../api';
import type { Consultation } from '../../types';
import { Card, Button, PageHeader, Toast, Badge, Textarea, Input } from '../../components/ui';

type TriageResult = {
  id: string;
  priority: string;
  triage_category: string;
  triage_notes: string;
  chief_complaint: string;
};

type Slot = { start: string; end: string; mode_supported: string };
type Doctor = { id: string; first_name: string; last_name: string; specialization?: string; facility?: { id: string; name: string } };

export const PatientTriage = () => {
  const { token } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);

  // Triage state
  const [complaint, setComplaint] = useState('');
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

  // Booking state
  const [bookingConsultation, setBookingConsultation] = useState<Consultation | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);
  const [bookingMode, setBookingMode] = useState('IN_PERSON');
  const [booking, setBooking] = useState(false);

  const fetchConsultations = async () => {
    if (!token) return;
    try {
      const data = await consultationsApi.getAll(token);
      setConsultations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
    if (token) {
      doctorsApi.getAll(token).then(setDoctors);
    }
  }, [token]);

  // Fetch available slots when doctor and date selected
  useEffect(() => {
    const fetchSlots = async () => {
      if (!token || !selectedDoctor || !selectedDate) return;
      try {
        const slots = await doctorsApi.getSlots(token, selectedDoctor, selectedDate);
        setAvailableSlots(slots);
        setSelectedSlotIdx(null);
      } catch (err: any) {
        setAvailableSlots([]);
      }
    };
    fetchSlots();
  }, [selectedDoctor, selectedDate, token]);

  const handleSubmitTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !complaint.trim()) return;
    setSubmitting(true);
    try {
      const res = await consultationsApi.create(token, { chief_complaint: complaint });
      setComplaint('');
      setTriageResult(res);
      fetchConsultations();
    } catch (err: any) {
      setToast({ message: 'Unable to submit your request. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDoctorObj = doctors.find(d => d.id === selectedDoctor);
  const selectedSlot = selectedSlotIdx !== null ? availableSlots[selectedSlotIdx] : null;


  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !bookingConsultation || selectedSlotIdx === null || !selectedSlot) return;
    setBooking(true);
    try {
      await appointmentsApi.create(token, {
        consultation: bookingConsultation.id,
        doctor: selectedDoctor,
        scheduled_date: selectedDate,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        mode: bookingMode
      });
      setToast({ message: 'Appointment booked successfully!', type: 'success' });
      setBookingConsultation(null);
      setSelectedDoctor('');
      setSelectedDate('');
      setAvailableSlots([]);
      setSelectedSlotIdx(null);
      fetchConsultations();
    } catch (err: any) {
      let msg = 'Failed to book appointment.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.non_field_errors) msg = parsed.non_field_errors[0];
        else if (parsed.detail) msg = parsed.detail;
      } catch {}
      setToast({ message: msg, type: 'error' });
    } finally {
      setBooking(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  if (loading) return <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</p>;

  return (
    <div>
      <PageHeader 
        title="Request a Consultation" 
        subtitle="Describe what you are experiencing. Your information will be evaluated to help determine the appropriate care pathway." 
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Triage form */}
      {!triageResult && (
        <Card style={{ marginBottom: '32px', maxWidth: '640px' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600 }}>What are you experiencing?</h3>
          <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Please describe your symptoms in as much detail as possible.
          </p>
          <form onSubmit={handleSubmitTriage}>
            <Textarea
              placeholder="E.g. I have had a severe headache and fever for the past 3 days, with some neck stiffness..."
              value={complaint}
              onChange={e => setComplaint(e.target.value)}
              required
              style={{ minHeight: '120px' }}
            />
            <div style={{ marginTop: '16px' }}>
              <Button type="submit" disabled={submitting || !complaint.trim()}>
                {submitting ? 'Evaluating...' : 'Evaluate Symptoms'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Triage result */}
      {triageResult && (
        <div style={{ marginBottom: '32px', maxWidth: '640px' }}>
          {triageResult.priority === 'EMERGENCY' ? (
            <div style={{
              padding: '24px',
              backgroundColor: '#fef2f2',
              border: '2px solid var(--danger)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 20h-17L12 5.5zm-1 5v5h2V10.5h-2zm0 7v2h2v-2h-2z" fill="#c0392b"/>
                </svg>
                <h3 style={{ margin: 0, color: '#c0392b', fontSize: '1.125rem', fontWeight: 700 }}>Emergency — Seek Immediate Care</h3>
              </div>
              <p style={{ margin: '0 0 8px', color: '#7f1d1d', fontWeight: 600 }}>
                Based on your symptoms, you require emergency medical attention.
              </p>
              <p style={{ margin: '0 0 12px', color: '#991b1b', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Please go to the nearest Emergency Department immediately or call emergency services. 
                Do not wait for a regular appointment.
              </p>
              <div style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>
                <strong>Evaluated pathway:</strong> {triageResult.triage_category}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#7f1d1d', marginTop: '4px' }}>
                {triageResult.triage_notes}
              </div>
            </div>
          ) : (
            <Card style={{ borderLeft: `4px solid ${triageResult.priority === 'URGENT' ? 'var(--warning)' : 'var(--success)'}`, marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Evaluation Complete</h3>
                <Badge variant={triageResult.priority === 'URGENT' ? 'warning' : 'success'}>
                  {triageResult.priority === 'URGENT' ? 'Priority Care' : 'Routine Care'}
                </Badge>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Recommended Pathway</span>
                <span style={{ fontWeight: 600 }}>{triageResult.triage_category}</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Clinical Rationale</span>
                <span style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{triageResult.triage_notes}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {consultations.find(c => c.id === triageResult.id) && (
                  <Button 
                    size="sm"
                    onClick={() => {
                      const c = consultations.find(con => con.id === triageResult.id);
                      if (c) setBookingConsultation(c);
                    }}
                  >
                    Book Appointment
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setTriageResult(null)}>
                  New Request
                </Button>
              </div>
            </Card>
          )}
          {triageResult.priority === 'EMERGENCY' && (
            <Button variant="outline" onClick={() => setTriageResult(null)} size="sm">
              Submit a different request
            </Button>
          )}
        </div>
      )}

      {/* Appointment booking form */}
      {bookingConsultation && (
        <Card style={{ marginBottom: '32px', maxWidth: '640px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Book Appointment</h3>
            <Button size="sm" variant="ghost" onClick={() => setBookingConsultation(null)}>Cancel</Button>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.875rem' }}>
            <strong>Consultation:</strong> {bookingConsultation.chief_complaint.slice(0, 60)}
          </div>

          <form onSubmit={handleBookAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Step 1: Doctor selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
                1. Select Doctor
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {doctors.map(d => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDoctor(d.id)}
                    style={{
                      padding: '12px 16px',
                      border: `1px solid ${selectedDoctor === d.id ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: selectedDoctor === d.id ? 'var(--primary-light)' : 'var(--surface)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>Dr. {d.first_name} {d.last_name}</div>
                    {d.specialization && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {d.specialization} {d.facility ? `· ${d.facility.name}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Date */}
            {selectedDoctor && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
                  2. Select Date
                </label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  required
                  style={{ maxWidth: '220px' }}
                  min={today}
                />
              </div>
            )}

            {/* Step 3: Available slots */}
            {selectedDoctor && selectedDate && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
                  3. Available Times
                </label>
                {availableSlots.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No available slots for this date. Please try a different date or doctor.
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {availableSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedSlotIdx(idx);
                          // Auto-set mode based on slot
                          if (slot.mode_supported === 'TELEMEDICINE') setBookingMode('TELEMEDICINE');
                          else setBookingMode('IN_PERSON');
                        }}
                        style={{
                          padding: '8px 14px',
                          border: `1px solid ${selectedSlotIdx === idx ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: selectedSlotIdx === idx ? 'var(--primary)' : 'var(--surface)',
                          color: selectedSlotIdx === idx ? '#fff' : 'var(--text)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontWeight: selectedSlotIdx === idx ? 600 : 400,
                          fontSize: '0.875rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {slot.start.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Mode */}
            {selectedSlotIdx !== null && selectedSlot && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
                  4. Appointment Mode
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setBookingMode('IN_PERSON')}
                    style={{
                      padding: '8px 16px',
                      border: `1px solid ${bookingMode === 'IN_PERSON' ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: bookingMode === 'IN_PERSON' ? 'var(--primary-light)' : 'var(--surface)',
                      color: bookingMode === 'IN_PERSON' ? 'var(--primary-hover)' : 'var(--text)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontWeight: bookingMode === 'IN_PERSON' ? 600 : 400,
                      fontSize: '0.875rem',
                    }}
                  >
                    In-Person
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingMode('TELEMEDICINE')}
                    disabled={selectedSlot.mode_supported !== 'TELEMEDICINE'}
                    style={{
                      padding: '8px 16px',
                      border: `1px solid ${bookingMode === 'TELEMEDICINE' ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: bookingMode === 'TELEMEDICINE' ? 'var(--primary-light)' : 'var(--surface)',
                      color: selectedSlot.mode_supported !== 'TELEMEDICINE' ? 'var(--text-muted)' : bookingMode === 'TELEMEDICINE' ? 'var(--primary-hover)' : 'var(--text)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: selectedSlot.mode_supported !== 'TELEMEDICINE' ? 'not-allowed' : 'pointer',
                      opacity: selectedSlot.mode_supported !== 'TELEMEDICINE' ? 0.5 : 1,
                      fontWeight: bookingMode === 'TELEMEDICINE' ? 600 : 400,
                      fontSize: '0.875rem',
                    }}
                  >
                    Online (Telemedicine)
                  </button>
                </div>
                {selectedSlot.mode_supported !== 'TELEMEDICINE' && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    This doctor is not accepting telemedicine for this slot.
                  </p>
                )}
              </div>
            )}

            {/* Step 5: Confirm summary */}
            {selectedSlotIdx !== null && selectedSlot && selectedDoctorObj && (
              <div style={{ padding: '16px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9375rem', fontWeight: 600 }}>Appointment Summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8125rem' }}>Doctor</span>
                    <strong>Dr. {selectedDoctorObj.first_name} {selectedDoctorObj.last_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8125rem' }}>Facility</span>
                    <strong>{selectedDoctorObj.facility?.name || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8125rem' }}>Date</span>
                    <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8125rem' }}>Time</span>
                    <strong>{selectedSlot.start.slice(0, 5)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8125rem' }}>Mode</span>
                    <strong>{bookingMode === 'TELEMEDICINE' ? 'Online Consultation' : 'In-Person Visit'}</strong>
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <Button type="submit" disabled={booking}>
                    {booking ? 'Confirming...' : 'Confirm Appointment'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      )}

      {/* My active consultations list */}
      {consultations.filter(c => c.status !== 'COMPLETED' && c.status !== 'CANCELLED').length > 0 && (
        <Card noShadow>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600 }}>My Active Consultations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {consultations.filter(c => c.status !== 'COMPLETED' && c.status !== 'CANCELLED').map(c => (
              <div key={c.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface)',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{c.chief_complaint.slice(0, 60)}{c.chief_complaint.length > 60 ? '…' : ''}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {new Date(c.created_at).toLocaleDateString()}
                    {c.triage_category && ` · ${c.triage_category}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge variant={
                    c.priority === 'EMERGENCY' ? 'danger' : 
                    c.priority === 'URGENT' ? 'warning' : 'neutral'
                  }>{c.priority}</Badge>
                  <Badge variant={
                    c.status === 'SCHEDULED' ? 'primary' :
                    c.status === 'IN_PROGRESS' ? 'success' : 'neutral'
                  }>{c.status === 'PENDING_TRIAGE' ? 'Awaiting Triage' : c.status}</Badge>
                  {c.status === 'PENDING_TRIAGE' && c.priority !== 'EMERGENCY' && (
                    <Button size="sm" onClick={() => setBookingConsultation(c)}>
                      Book Appt
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
