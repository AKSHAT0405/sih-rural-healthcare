import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { followUpsApi, patientsApi, consultationsApi, referralsApi } from '../../api';
import type { FollowUp, Patient, Consultation, Referral } from '../../types';
import { API_BASE_URL } from '../../api/config';
import { Card, PageHeader, Button, Badge, Toast, Select, Input, Textarea } from '../../components/ui';

export const DoctorFollowUps = () => {
  const { token, userId, userRole } = useAuth();
  const location = useLocation();
  
  const state = location.state as { consultationId?: string } | null;

  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);

  const [currentView, setCurrentView] = useState<'list' | 'details' | 'create'>(state?.consultationId ? 'create' : 'list');
  const [followupFilterStatus, setFollowupFilterStatus] = useState('');

  // Detail View State
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(null);
  const [editFollowupNotes, setEditFollowupNotes] = useState('');

  // Create View State
  const [selectedConsultationForFollowUp, setSelectedConsultationForFollowUp] = useState<Consultation | null>(null);
  const [newFollowupDate, setNewFollowupDate] = useState('');
  const [newFollowupReferral, setNewFollowupReferral] = useState('');
  const [newFollowupReason, setNewFollowupReason] = useState('');
  const [newFollowupNotes, setNewFollowupNotes] = useState('');

  useEffect(() => {
    if (token) {
      fetchFollowUps(followupFilterStatus);
      patientsApi.getAll(token).then(setPatients);
      consultationsApi.getAll(token).then(data => {
        setConsultations(data);
        if (state?.consultationId) {
          const cons = data.find(c => c.id === state.consultationId);
          if (cons) setSelectedConsultationForFollowUp(cons);
        }
      });
      referralsApi.getAll(token).then(setReferrals);
    }
  }, [token, followupFilterStatus, state?.consultationId]);

  const fetchFollowUps = async (status: string) => {
    if (!token) return;
    try {
      const data = await followUpsApi.getAll(token);
      if (status) {
        setFollowups(data.filter(f => f.status === status));
      } else {
        setFollowups(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.full_name || id;

  const viewFollowUpDetails = (id: string) => {
    const fu = followups.find(f => f.id === id);
    if (fu) {
      setEditFollowupNotes(fu.notes || '');
    }
    setSelectedFollowUpId(id);
    setCurrentView('details');
  };

  const handleUpdateFollowUp = async (id: string, updateData: any) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/followups/${id}/`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      if (res.ok) {
        setToast({ message: 'Follow-up updated successfully.', type: 'success' });
        fetchFollowUps(followupFilterStatus);
      } else {
        const errData = await res.json();
        setToast({ message: 'Failed to update follow-up: ' + JSON.stringify(errData), type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error updating follow-up.', type: 'error' });
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedConsultationForFollowUp) return;
    try {
      const payload: any = {
        patient: selectedConsultationForFollowUp.patient,
        consultation: selectedConsultationForFollowUp.id,
        scheduled_date: newFollowupDate,
        reason: newFollowupReason,
        notes: newFollowupNotes
      };
      if (newFollowupReferral) {
        payload.referral = newFollowupReferral;
      }
      
      const res = await fetch(`${API_BASE_URL}/followups/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Follow-up scheduled successfully.', type: 'success' });
        setNewFollowupDate('');
        setNewFollowupReferral('');
        setNewFollowupReason('');
        setNewFollowupNotes('');
        fetchFollowUps(followupFilterStatus);
        setCurrentView('list');
      } else {
        setToast({ message: 'Failed to schedule follow-up: ' + JSON.stringify(data), type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error scheduling follow-up.', type: 'error' });
    }
  };

  if (currentView === 'create') {
    if (!selectedConsultationForFollowUp) return <p>No consultation selected.</p>;
    
    const validReferrals = referrals.filter(r => r.patient === selectedConsultationForFollowUp.patient);

    return (
      <div>
        <PageHeader 
          title="Schedule Follow-up" 
          subtitle="Set a date for the patient to return for further evaluation."
          action={<Button variant="outline" onClick={() => setCurrentView('list')}>Cancel</Button>}
        />
        
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <Card style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Patient</span>
              <strong>{getPatientName(selectedConsultationForFollowUp.patient)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Consultation Complaint</span>
              <strong>{selectedConsultationForFollowUp.chief_complaint}</strong>
            </div>
          </div>
        </Card>

        <Card>
          <form onSubmit={handleCreateFollowUp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
            <Input 
              type="date"
              label="Scheduled Date"
              value={newFollowupDate} 
              onChange={e => setNewFollowupDate(e.target.value)} 
              required
            />
            
            <Select 
              label="Optional Referral Context"
              value={newFollowupReferral} 
              onChange={e => setNewFollowupReferral(e.target.value)} 
            >
              <option value="">None</option>
              {validReferrals.map(r => (
                <option key={r.id} value={r.id}>
                  {r.reason.slice(0, 30)}... ({new Date(r.created_at).toLocaleDateString()})
                </option>
              ))}
            </Select>

            <Input 
              label="Reason"
              value={newFollowupReason} 
              onChange={e => setNewFollowupReason(e.target.value)} 
              required
              placeholder="e.g. Check blood pressure"
            />

            <Textarea 
              label="Notes"
              value={newFollowupNotes} 
              onChange={e => setNewFollowupNotes(e.target.value)} 
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <Button type="submit">Schedule Follow-up</Button>
              <Button type="button" variant="outline" onClick={() => setCurrentView('list')}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  if (currentView === 'details') {
    const fu = followups.find(f => f.id === selectedFollowUpId);
    if (!fu) return <p>Follow-up not found</p>;

    const cons = consultations.find(c => c.id === fu.consultation);
    const isConsultationDoctor = userRole === 'DOCTOR' && cons?.doctor === userId;
    const isAdmin = userRole === 'ADMIN';
    const canEdit = isConsultationDoctor || isAdmin;
    const isTerminal = fu.status !== 'SCHEDULED';

    return (
      <div>
        <PageHeader 
          title="Follow-up Details" 
          subtitle={`Follow-up ID: ${fu.id.slice(0, 8)}`}
          action={<Button variant="outline" onClick={() => setCurrentView('list')}>Back to List</Button>}
        />
        
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Patient</span>
                <strong>{getPatientName(fu.patient)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Status</span>
                <Badge variant={fu.status === 'COMPLETED' ? 'success' : fu.status === 'CANCELLED' ? 'danger' : fu.status === 'MISSED' ? 'warning' : 'primary'}>
                  {fu.status}
                </Badge>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Scheduled Date</span>
                <strong>{fu.scheduled_date}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Consultation ID</span>
                <span style={{ fontFamily: 'monospace' }}>{fu.consultation.slice(0,8)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Referral ID</span>
                <span style={{ fontFamily: 'monospace' }}>{fu.referral ? fu.referral.slice(0,8) : 'None'}</span>
              </div>
            </div>
            
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginBottom: '8px' }}>Created At</span>
              <span style={{ fontSize: '0.875rem' }}>{new Date(fu.created_at).toLocaleString()}</span>
              {fu.completed_at && (
                <>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginBottom: '8px', marginTop: '12px' }}>Completed At</span>
                  <span style={{ fontSize: '0.875rem' }}>{new Date(fu.completed_at).toLocaleString()}</span>
                </>
              )}
            </div>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Clinical Context</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginBottom: '8px' }}>Reason</span>
              <div style={{ backgroundColor: 'var(--bg)', padding: '12px', borderRadius: '4px' }}>
                {fu.reason}
              </div>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginBottom: '8px' }}>Notes</span>
              {canEdit && !isTerminal ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Textarea 
                    value={editFollowupNotes} 
                    onChange={e => setEditFollowupNotes(e.target.value)}
                  />
                  {editFollowupNotes !== fu.notes && (
                    <div style={{ alignSelf: 'flex-end' }}>
                      <Button size="sm" onClick={() => handleUpdateFollowUp(fu.id, { notes: editFollowupNotes })}>Save Notes</Button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ backgroundColor: 'var(--bg)', padding: '12px', borderRadius: '4px', minHeight: '60px' }}>
                  {fu.notes || <span style={{ opacity: 0.5 }}>No notes provided.</span>}
                </div>
              )}
            </div>
          </Card>
        </div>

        {canEdit && !isTerminal && (
          <Card style={{ marginTop: '24px', backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Actions</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button 
                variant="success"
                onClick={() => handleUpdateFollowUp(fu.id, { status: 'COMPLETED' })}
              >
                Complete
              </Button>
              <Button 
                variant="warning"
                onClick={() => {
                  if(window.confirm('Mark this follow-up as missed?')) {
                    handleUpdateFollowUp(fu.id, { status: 'MISSED' })
                  }
                }}
              >
                Mark Missed
              </Button>
              <Button 
                variant="danger"
                onClick={() => {
                  if(window.confirm('Cancel this follow-up?')) {
                    handleUpdateFollowUp(fu.id, { status: 'CANCELLED' })
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Follow-ups" 
        subtitle="Track and manage patient follow-up appointments." 
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Filter Status:</span>
        <Select 
          value={followupFilterStatus} 
          onChange={(e) => {
            const val = e.target.value;
            setFollowupFilterStatus(val);
            fetchFollowUps(val);
          }}
          style={{ width: 'auto' }}
        >
          <option value="">All</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="MISSED">Missed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      <Card noShadow>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Consultation</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {followups.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No follow-ups found
                  </td>
                </tr>
              ) : (
                followups.map(f => (
                  <tr key={f.id}>
                    <td><strong>{f.scheduled_date}</strong></td>
                    <td>{getPatientName(f.patient)}</td>
                    <td><span style={{ fontFamily: 'monospace' }}>{f.consultation.slice(0,8)}</span></td>
                    <td>
                      <Badge variant={f.status === 'SCHEDULED' ? 'primary' : f.status === 'COMPLETED' ? 'success' : f.status === 'MISSED' ? 'warning' : 'danger'}>
                        {f.status}
                      </Badge>
                    </td>
                    <td>
                      <Button size="sm" variant="outline" onClick={() => viewFollowUpDetails(f.id)}>
                        View Details
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
