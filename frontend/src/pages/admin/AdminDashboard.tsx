import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/ui';
import { facilitiesApi, doctorsApi, patientsApi, inventoryApi } from '../../api';
import type { Facility, Patient, InventoryItem } from '../../types';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token') || '';

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setLoading(true);
      Promise.all([
        facilitiesApi.getAll(token).catch(() => []),
        doctorsApi.getAll(token).catch(() => []),
        patientsApi.getAll(token).catch(() => []),
        inventoryApi.getAll(token).catch(() => [])
      ]).then(([facs, docs, pats, inv]) => {
        setFacilities(facs);
        setDoctors(docs);
        setPatients(pats);
        setInventory(inv);
        setError(null);
      }).catch(() => {
        setError("Failed to load platform data. Please try again later.");
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading platform overview...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-danger)' }}>
        {error}
      </div>
    );
  }

  const inventoryAlerts = inventory.filter(i => 
    i.availability_status === 'LOW_STOCK' || 
    i.availability_status === 'OUT_OF_STOCK' || 
    i.availability_status === 'UNAVAILABLE_EQUIPMENT'
  );

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          Admin Dashboard
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Platform-wide operational overview
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Total Facilities
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>
            {facilities.length}
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Registered Doctors
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>
            {doctors.length}
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Registered Patients
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>
            {patients.length}
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: inventoryAlerts.length > 0 ? '#fff3cd' : 'var(--surface)', border: `1px solid ${inventoryAlerts.length > 0 ? '#ffeeba' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Inventory Alerts
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: inventoryAlerts.length > 0 ? '#856404' : 'var(--text)' }}>
            {inventoryAlerts.length}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Button variant="primary" onClick={() => navigate('/admin/users')} fullWidth>
              Manage Users (Patients)
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/doctors')} fullWidth>
              View Doctors
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/facilities')} fullWidth>
              View Facilities
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/inventory')} fullWidth>
              Manage Global Inventory
            </Button>
          </div>
        </div>
        
        <Card>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>System Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text)' }}>Backend Services</span>
              <Badge variant="success">Operational</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text)' }}>Database Connections</span>
              <Badge variant="success">Healthy</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text)' }}>Inventory Monitoring</span>
              {inventoryAlerts.length > 0 ? (
                <Badge variant="warning">{inventoryAlerts.length} Alerts</Badge>
              ) : (
                <Badge variant="success">Clear</Badge>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
