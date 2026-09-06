import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { referralsApi, facilitiesApi, doctorsApi, patientsApi, consultationsApi } from '../../api';
import type { Referral, Facility, Patient, Consultation } from '../../types';
import { API_BASE_URL } from '../../api/config';
import { Card, PageHeader, Button, Badge, Toast, Select, Textarea } from '../../components/ui';

export const DoctorReferrals = () => {
  const { token, userId, userFacility, userRole } = useAuth();
  const location = useLocation();
  
  const state = location.state as { consultationId?: string } | null;

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);

  const [currentView, setCurrentView] = useState<'list' | 'details' | 'create'>(state?.consultationId ? 'create' : 'list');
  const [referralFilterStatus, setReferralFilterStatus] = useState('');
  const [isIncoming, setIsIncoming] = useState(false);

  // Detail View State
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editPriority, setEditPriority] = useState('NORMAL');
  const [editReferralNotes, setEditReferralNotes] = useState('');

  // Create View State
  const [selectedConsultationForReferral, setSelectedConsultationForReferral] = useState<Consultation | null>(null);
  const [newReferralToFacility, setNewReferralToFacility] = useState('');
  const [newReferralToDoctor, setNewReferralToDoctor] = useState('');
  const [newReferralReason, setNewReferralReason] = useState('');
  const [newReferralPriority, setNewReferralPriority] = useState('NORMAL');

  useEffect(() => {
    if (token) {
      fetchReferrals(referralFilterStatus, isIncoming);
      facilitiesApi.getAll(token).then(setFacilities);
      doctorsApi.getAll(token).then(setDoctors);
      patientsApi.getAll(token).then(setPatients);
      consultationsApi.getAll(token).then(data => {
        if (state?.consultationId) {
          const cons = data.find((c: Consultation) => c.id === state.consultationId);
          if (cons) setSelectedConsultationForReferral(cons);
        }
      });
    }
  }, [token, referralFilterStatus, isIncoming, state?.consultationId]);

  const fetchReferrals = async (status: string, incoming: boolean) => {
    if (!token) return;
    try {
      const data = await referralsApi.getAll(token, status || undefined, incoming ? (userFacility?.id || '') : undefined);
      setReferrals(data);
    } catch (err) {
      console.error(err);
    }
  };

  const getFacilityName = (id: string | null | undefined) => facilities.find(f => f.id === id)?.name || id;
  const getPatientName = (id: string) => patients.find(p => p.id === id)?.full_name || id;

  const viewReferralDetails = (id: string) => {
    const ref = referrals.find(r => r.id === id);
    if (ref) {
      setEditReferralNotes(ref.referral_notes || '');
      setEditReason(ref.reason || '');
      setEditPriority(ref.priority || 'NORMAL');
    }
    setSelectedReferralId(id);
    setCurrentView('details');
  };

  const handleUpdateReferral = async (id: string, updateData: any) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/referrals/${id}/`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      if (res.ok) {
        setToast({ message: 'Referral updated successfully.', type: 'success' });
        fetchReferrals(referralFilterStatus, isIncoming);
      } else {
        const errData = await res.json();
        setToast({ message: 'Failed to update referral: ' + JSON.stringify(errData), type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error updating referral.', type: 'error' });
    }
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedConsultationForReferral) return;
    try {
      const res = await fetch(`${API_BASE_URL}/referrals/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patient: selectedConsultationForReferral.patient,
          consultation: selectedConsultationForReferral.id,
          to_facility: newReferralToFacility,
          to_doctor: newReferralToDoctor || null,
          reason: newReferralReason,
          priority: newReferralPriority,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Referral created successfully.', type: 'success' });
        setNewReferralToFacility('');
        setNewReferralToDoctor('');
        setNewReferralReason('');
        setNewReferralPriority('NORMAL');
        fetchReferrals(referralFilterStatus, isIncoming);
        viewReferralDetails(data.id);
      } else {
        setToast({ message: 'Failed to create referral: ' + JSON.stringify(data), type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error creating referral.', type: 'error' });
    }
  };

  if (currentView === 'create') {
    if (!selectedConsultationForReferral) return <p>No consultation selected.</p>;
    return (
      <div>
        <PageHeader 
          title="Create Referral" 
          subtitle="Refer this patient to another facility or specialist."
          action={<Button variant="outline" onClick={() => setCurrentView('list')}>Cancel</Button>}
        />
        
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <Card style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Patient</span>
              <strong>{getPatientName(selectedConsultationForReferral.patient)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Complaint</span>
              <strong>{selectedConsultationForReferral.chief_complaint}</strong>
            </div>
          </div>
        </Card>

        <Card>
          <form onSubmit={handleCreateReferral} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
            <Select 
              label="Destination Facility"
              value={newReferralToFacility} 
              onChange={e => setNewReferralToFacility(e.target.value)} 
              required
            >
              <option value="">Select Destination...</option>
              {facilities
                .filter(f => f.id !== userFacility?.id)
                .map(f => <option key={f.id} value={f.id}>{f.name} ({f.type})</option>)
              }
            </Select>
            
            {newReferralToFacility && (
              <Select 
                label="Destination Doctor (Optional)"
                value={newReferralToDoctor} 
                onChange={e => setNewReferralToDoctor(e.target.value)} 
              >
                <option value="">Any Doctor</option>
                {doctors
                  .filter(d => d.facility?.id === newReferralToFacility)
                  .map(d => <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name} ({d.specialization})</option>)
                }
              </Select>
            )}
            
            <Textarea 
              label="Reason for Referral"
              value={newReferralReason} 
              onChange={e => setNewReferralReason(e.target.value)} 
              required 
            />

            <Select 
              label="Priority"
              value={newReferralPriority} 
              onChange={e => setNewReferralPriority(e.target.value)}
            >
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
              <option value="EMERGENCY">Emergency</option>
            </Select>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <Button type="submit">Submit Referral</Button>
              <Button type="button" variant="outline" onClick={() => setCurrentView('list')}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  if (currentView === 'details') {
    const ref = referrals.find(r => r.id === selectedReferralId);
    if (!ref) return <p>Referral not found</p>;

    const isDestinationDoctor = userRole === 'DOCTOR' && userFacility?.id === ref.to_facility;
    const isSourceDoctor = userRole === 'DOCTOR' && ref.referred_by === userId;
    const isAdmin = userRole === 'ADMIN';
    const isTerminal = ref.status === 'COMPLETED' || ref.status === 'CANCELLED';

    return (
      <div>
        <PageHeader 
          title="Referral Details" 
          subtitle={`Referral ID: ${ref.id.slice(0, 8)}`}
          action={<Button variant="outline" onClick={() => setCurrentView('list')}>Back to List</Button>}
        />
        
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Patient</span>
                <strong>{getPatientName(ref.patient)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Status</span>
                <Badge variant={ref.status === 'COMPLETED' ? 'success' : ref.status === 'CANCELLED' ? 'danger' : ref.status === 'ACCEPTED' ? 'primary' : 'warning'}>
                  {ref.status}
                </Badge>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>From Facility</span>
                <strong>{getFacilityName(ref.from_facility)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>To Facility</span>
                <strong>{getFacilityName(ref.to_facility)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Created At</span>
                <strong>{new Date(ref.created_at).toLocaleString()}</strong>
              </div>
              {ref.completed_at && (
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block' }}>Completed At</span>
                  <strong>{new Date(ref.completed_at).toLocaleString()}</strong>
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginBottom: '8px' }}>Priority</span>
              {(isSourceDoctor || isAdmin) && !isTerminal ? (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Select value={editPriority} onChange={e => setEditPriority(e.target.value)}>
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency</option>
                  </Select>
                  {editPriority !== ref.priority && (
                    <Button size="sm" onClick={() => handleUpdateReferral(ref.id, { priority: editPriority })}>Save</Button>
                  )}
                </div>
              ) : (
                <Badge variant={ref.priority === 'EMERGENCY' ? 'danger' : ref.priority === 'URGENT' ? 'warning' : 'neutral'}>
                  {ref.priority}
                </Badge>
              )}
            </div>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Clinical Context</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginBottom: '8px' }}>Reason for Referral</span>
              {(isSourceDoctor || isAdmin) && !isTerminal ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Textarea 
                    value={editReason} 
                    onChange={e => setEditReason(e.target.value)}
                  />
                  {editReason !== ref.reason && (
                    <div style={{ alignSelf: 'flex-end' }}>
                      <Button size="sm" onClick={() => handleUpdateReferral(ref.id, { reason: editReason })}>Save Reason</Button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ backgroundColor: 'var(--bg)', padding: '12px', borderRadius: '4px' }}>
                  {ref.reason}
                </div>
              )}
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginBottom: '8px' }}>Referral Notes (Destination Feedback)</span>
              {(isDestinationDoctor || isAdmin) && !isTerminal ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Textarea 
                    value={editReferralNotes} 
                    onChange={e => setEditReferralNotes(e.target.value)}
                  />
                  <div style={{ alignSelf: 'flex-end' }}>
                    <Button size="sm" onClick={() => handleUpdateReferral(ref.id, { referral_notes: editReferralNotes })}>
                      Save Notes
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: 'var(--bg)', padding: '12px', borderRadius: '4px', minHeight: '60px' }}>
                  {ref.referral_notes || <span style={{ opacity: 0.5 }}>No notes provided yet.</span>}
                </div>
              )}
            </div>
          </Card>
        </div>

        {(isDestinationDoctor || isSourceDoctor || isAdmin) && !isTerminal && (
          <Card style={{ marginTop: '24px', backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Actions</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {(isDestinationDoctor || isAdmin) && ref.status === 'PENDING' && (
                <Button onClick={() => handleUpdateReferral(ref.id, { status: 'ACCEPTED' })}>
                  Accept Referral
                </Button>
              )}
              
              {(isDestinationDoctor || isAdmin) && ref.status === 'ACCEPTED' && (
                <Button variant="success" onClick={() => handleUpdateReferral(ref.id, { status: 'COMPLETED' })}>
                  Complete Referral
                </Button>
              )}

              <Button 
                variant="danger"
                onClick={() => {
                  if(window.confirm('Are you sure you want to cancel this referral?')) {
                    handleUpdateReferral(ref.id, { status: 'CANCELLED' })
                  }
                }}
              >
                Cancel Referral
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
        title={isIncoming ? 'Incoming Referrals' : 'All Referrals'} 
        subtitle="Manage and track patient referrals across facilities." 
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            variant={!isIncoming ? 'primary' : 'outline'}
            onClick={() => setIsIncoming(false)}
          >
            All Referrals
          </Button>
          <Button 
            variant={isIncoming ? 'primary' : 'outline'}
            onClick={() => setIsIncoming(true)}
          >
            Incoming Referrals
          </Button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Filter Status:</span>
          <Select 
            value={referralFilterStatus} 
            onChange={(e) => setReferralFilterStatus(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
      </div>

      <Card noShadow>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>From</th>
                <th>To</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No referrals found
                  </td>
                </tr>
              ) : (
                referrals.map(r => (
                  <tr key={r.id}>
                    <td><strong>{new Date(r.created_at).toLocaleDateString()}</strong></td>
                    <td>{getPatientName(r.patient)}</td>
                    <td>{getFacilityName(r.from_facility)}</td>
                    <td>{getFacilityName(r.to_facility)}</td>
                    <td>
                      <Badge variant={r.priority === 'EMERGENCY' ? 'danger' : r.priority === 'URGENT' ? 'warning' : 'neutral'}>
                        {r.priority}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={r.status === 'COMPLETED' ? 'success' : r.status === 'CANCELLED' ? 'danger' : r.status === 'ACCEPTED' ? 'primary' : 'warning'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td>
                      <Button size="sm" variant="outline" onClick={() => viewReferralDetails(r.id)}>
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
