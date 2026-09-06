import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { DoctorProfile, DoctorAvailability } from '../../types';
import { API_BASE_URL } from '../../api/config';
import { Card, PageHeader, Toast, Button, Input, Select, Textarea, Badge } from '../../components/ui';

export const DoctorProfilePage = () => {
  const { token, userId } = useAuth();
  
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [doctorAvailabilities, setDoctorAvailabilities] = useState<DoctorAvailability[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'warning' | 'info'} | null>(null);
  
  const [profileSpec, setProfileSpec] = useState('');
  const [profileQual, setProfileQual] = useState('');
  const [profileExp, setProfileExp] = useState(0);
  const [profileBio, setProfileBio] = useState('');
  
  const [availDay, setAvailDay] = useState(0);
  const [availStart, setAvailStart] = useState('09:00');
  const [availEnd, setAvailEnd] = useState('17:00');
  const [availOnline, setAvailOnline] = useState(false);

  useEffect(() => {
    if (token && userId) {
      fetchDoctorProfile(token);
      fetchDoctorAvailabilities(token, userId);
    }
  }, [token, userId]);

  const fetchDoctorProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/doctor-profiles/`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const profile = data[0];
          setDoctorProfile(profile);
          setProfileSpec(profile.specialization || '');
          setProfileQual(profile.qualifications || '');
          setProfileExp(profile.years_of_experience || 0);
          setProfileBio(profile.bio || '');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDoctorAvailabilities = async (authToken: string, docId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/doctor-availability/?doctor=${docId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDoctorAvailabilities(data.results || data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const url = doctorProfile 
        ? `${API_BASE_URL}/auth/doctor-profiles/${doctorProfile.id}/` 
        : `${API_BASE_URL}/auth/doctor-profiles/`;
      const method = doctorProfile ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          specialization: profileSpec,
          qualifications: profileQual,
          years_of_experience: profileExp,
          bio: profileBio
        })
      });
      if (res.ok) {
        setToast({ message: 'Profile saved successfully.', type: 'success' });
        fetchDoctorProfile(token);
      } else {
        const data = await res.json();
        setToast({ message: 'Error saving profile: ' + JSON.stringify(data), type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to save profile.', type: 'error' });
    }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !userId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/doctor-availability/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          day_of_week: availDay,
          start_time: availStart,
          end_time: availEnd,
          is_online: availOnline
        })
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Availability added successfully.', type: 'success' });
        fetchDoctorAvailabilities(token, userId);
      } else {
        setToast({ message: 'Error adding availability: ' + JSON.stringify(data), type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to add availability.', type: 'error' });
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    if (!token || !userId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/doctor-availability/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setToast({ message: 'Availability deleted.', type: 'info' });
        fetchDoctorAvailabilities(token, userId);
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to delete availability.', type: 'error' });
    }
  };

  return (
    <div>
      <PageHeader 
        title="My Professional Profile" 
        subtitle="Manage your public profile and weekly availability." 
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
        
        {/* Profile Section */}
        <div>
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Professional Information</h3>
            <form onSubmit={handleSaveProfile}>
              <Input 
                label="Specialization"
                value={profileSpec} 
                onChange={e => setProfileSpec(e.target.value)} 
                required 
              />
              <Input 
                label="Qualifications"
                value={profileQual} 
                onChange={e => setProfileQual(e.target.value)} 
                required 
              />
              <Input 
                type="number"
                label="Experience (Years)"
                value={profileExp} 
                onChange={e => setProfileExp(Number(e.target.value))} 
                required 
              />
              <Textarea 
                label="Bio"
                value={profileBio} 
                onChange={e => setProfileBio(e.target.value)} 
              />
              <div style={{ marginTop: '24px' }}>
                <Button type="submit">
                  {doctorProfile ? 'Update Profile' : 'Create Profile'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Availability Section */}
        <div>
          <Card style={{ marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0 }}>My Weekly Availability</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 0, marginBottom: '24px' }}>
              Define your recurring working hours. These represent your general availability, not individual appointments.
            </p>
            
            <div className="table-responsive" style={{ marginBottom: '24px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Mode</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorAvailabilities.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No availability defined yet.
                      </td>
                    </tr>
                  ) : (
                    doctorAvailabilities.map(av => {
                      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                      return (
                        <tr key={av.id}>
                          <td><strong>{days[av.day_of_week]}</strong></td>
                          <td>{av.start_time.slice(0,5)} - {av.end_time.slice(0,5)}</td>
                          <td>
                            <Badge variant={av.is_online ? 'info' : 'neutral'}>
                              {av.is_online ? 'Telemedicine' : 'In-Person'}
                            </Badge>
                          </td>
                          <td>
                            <Button size="sm" variant="danger" onClick={() => handleDeleteAvailability(av.id)}>
                              Delete
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h4 style={{ marginTop: 0, marginBottom: '24px' }}>Add Availability Slot</h4>
            <form onSubmit={handleAddAvailability} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <Select 
                label="Day of Week"
                value={availDay} 
                onChange={e => setAvailDay(Number(e.target.value))}
              >
                <option value={0}>Monday</option>
                <option value={1}>Tuesday</option>
                <option value={2}>Wednesday</option>
                <option value={3}>Thursday</option>
                <option value={4}>Friday</option>
                <option value={5}>Saturday</option>
                <option value={6}>Sunday</option>
              </Select>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                <input 
                  type="checkbox" 
                  id="telemed-checkbox"
                  checked={availOnline} 
                  onChange={e => setAvailOnline(e.target.checked)} 
                />
                <label htmlFor="telemed-checkbox" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                  Telemedicine Supported
                </label>
              </div>

              <Input 
                type="time" 
                label="Start Time"
                value={availStart} 
                onChange={e => setAvailStart(e.target.value)} 
                required 
              />
              <Input 
                type="time" 
                label="End Time"
                value={availEnd} 
                onChange={e => setAvailEnd(e.target.value)} 
                required 
              />
              
              <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                <Button type="submit" variant="secondary" fullWidth>
                  Add Slot
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
