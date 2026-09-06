import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { consultationsApi, medicalRecordsApi, appointmentsApi, patientsApi } from '../../api';
import type { Consultation, Appointment, MedicalRecord, Patient } from '../../types';
import { API_BASE_URL } from '../../api/config';
import { Card, PageHeader, Toast, Button, Input, Textarea, Badge } from '../../components/ui';

export const DoctorWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [activeMedicalRecord, setActiveMedicalRecord] = useState<MedicalRecord | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (token && id) {
      consultationsApi.getAll(token).then(consultations => {
        const consultation = consultations.find(c => c.id === id);
        setActiveConsultation(consultation || null);
        
        if (consultation) {
          appointmentsApi.getAll(token).then(appointments => {
             const appt = appointments.find(a => a.consultation === consultation.id);
             setActiveAppointment(appt || null);
          });
          
          medicalRecordsApi.getAll(token, consultation.id).then(records => {
             if (records.length > 0) {
               setActiveMedicalRecord(records[0]);
             }
          });
        }
      });
      
      patientsApi.getAll(token).then(setPatients);
    }
  }, [token, id]);

  const getPatientName = (patientId: string) => {
    return patients.find(p => p.id === patientId)?.full_name || patientId;
  };

  const handleSaveMedicalRecord = async () => {
    if (!token || !activeMedicalRecord) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/medical-records/${activeMedicalRecord.id}/`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(activeMedicalRecord)
      });
      if (res.ok) {
        const data = await res.json();
        setActiveMedicalRecord(data);
        setToast({ message: 'Medical Record saved successfully', type: 'success' });
      } else {
        const errData = await res.json();
        setToast({ message: 'Failed to save record: ' + JSON.stringify(errData), type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error saving record', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!token || !activeConsultation) return;
    try {
      const res = await fetch(`${API_BASE_URL}/consultations/${activeConsultation.id}/complete/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        navigate('/doctor/appointments');
      } else {
        const errData = await res.json();
        setToast({ message: 'Failed to complete consultation: ' + JSON.stringify(errData), type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error completing consultation', type: 'error' });
    }
  };

  if (!activeConsultation) return <p>Loading workspace...</p>;

  return (
    <div>
      <PageHeader 
        title="Clinical Workspace" 
        subtitle="Manage the active consultation and update medical records."
        action={
          <Button variant="outline" onClick={() => navigate('/doctor/appointments')}>
            Back to Appointments
          </Button>
        }
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem' }}>Patient Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Name</span>
                <strong>{getPatientName(activeConsultation.patient)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Patient ID</span>
                <span style={{ fontFamily: 'monospace' }}>{activeConsultation.patient.slice(0,8)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem' }}>Appointment Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeAppointment ? (
                <>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Date & Time</span>
                    <strong>{new Date(activeAppointment.scheduled_date).toLocaleDateString()} {activeAppointment.start_time.slice(0,5)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Mode</span>
                    <Badge variant={activeAppointment.mode === 'TELEMEDICINE' ? 'info' : 'primary'}>
                      {activeAppointment.mode}
                    </Badge>
                  </div>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Walk-in / Unscheduled</span>
              )}
            </div>
          </Card>

          <Card style={{ borderColor: activeConsultation.priority === 'EMERGENCY' ? 'var(--danger)' : activeConsultation.priority === 'URGENT' ? 'var(--warning)' : 'var(--border)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem' }}>Triage Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Chief Complaint</span>
                <strong>{activeConsultation.chief_complaint}</strong>
              </div>
              
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Priority</span>
                <Badge variant={activeConsultation.priority === 'EMERGENCY' ? 'danger' : activeConsultation.priority === 'URGENT' ? 'warning' : 'success'}>
                  {activeConsultation.priority}
                </Badge>
              </div>

              {activeConsultation.triage_category && (
                <div style={{ backgroundColor: 'var(--bg)', padding: '12px', borderRadius: '4px' }}>
                  <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '4px' }}>AI Recommended Pathway:</strong>
                  <span style={{ fontSize: '0.875rem' }}>{activeConsultation.triage_category}</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{activeConsultation.triage_notes}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Medical Record & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Medical Record</h3>
              <Badge variant="primary">Draft</Badge>
            </div>

            {activeMedicalRecord ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Input 
                  label="Chief Complaint"
                  value={activeMedicalRecord.chief_complaint}
                  onChange={e => setActiveMedicalRecord({...activeMedicalRecord, chief_complaint: e.target.value})}
                />
                <Textarea 
                  label="Examination Notes"
                  value={activeMedicalRecord.examination_notes}
                  onChange={e => setActiveMedicalRecord({...activeMedicalRecord, examination_notes: e.target.value})}
                />
                <Textarea 
                  label="Diagnosis / Assessment"
                  value={activeMedicalRecord.diagnosis}
                  onChange={e => setActiveMedicalRecord({...activeMedicalRecord, diagnosis: e.target.value})}
                />
                <Textarea 
                  label="Treatment Plan"
                  value={activeMedicalRecord.treatment_plan}
                  onChange={e => setActiveMedicalRecord({...activeMedicalRecord, treatment_plan: e.target.value})}
                />
                <Input 
                  label="Medications (Prescription Draft)"
                  value={activeMedicalRecord.medications}
                  onChange={e => setActiveMedicalRecord({...activeMedicalRecord, medications: e.target.value})}
                />
                <Textarea 
                  label="Additional Doctor Notes"
                  value={activeMedicalRecord.doctor_notes}
                  onChange={e => setActiveMedicalRecord({...activeMedicalRecord, doctor_notes: e.target.value})}
                />
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <Button variant="secondary" onClick={handleSaveMedicalRecord} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </Button>
                </div>
              </div>
            ) : (
              <p>Loading medical record draft...</p>
            )}
          </Card>

          <Card style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem' }}>Consultation Actions</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              Create follow-ups or referrals before completing this consultation.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button 
                variant="outline" 
                onClick={() => navigate('/doctor/referrals', { state: { consultationId: activeConsultation.id } })}
              >
                Create Referral
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/doctor/follow-ups', { state: { consultationId: activeConsultation.id } })}
              >
                Schedule Follow-up
              </Button>
              
              <div style={{ flexGrow: 1 }} />
              
              <Button 
                variant="success" 
                onClick={() => {
                  if (window.confirm('Are you sure you want to complete this consultation? The medical record will become read-only and this action cannot be undone.')){
                    handleCompleteConsultation();
                  }
                }}
              >
                Complete Consultation
              </Button>
            </div>
          </Card>
        </div>
        
      </div>
    </div>
  );
};
