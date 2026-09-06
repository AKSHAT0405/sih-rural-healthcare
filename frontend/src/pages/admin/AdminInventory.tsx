import React, { useEffect, useState } from 'react';
import { inventoryApi, facilitiesApi } from '../../api';
import type { InventoryItem, Facility } from '../../types';
import { Card, Badge, Button } from '../../components/ui';

export const AdminInventory = () => {
  const token = localStorage.getItem('token') || '';
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New Item State
  const [newInvName, setNewInvName] = useState('');
  const [newInvType, setNewInvType] = useState('MEDICINE');
  const [newInvQuantity, setNewInvQuantity] = useState('');
  const [newInvStatus, setNewInvStatus] = useState('AVAILABLE');
  const [newInvUnit, setNewInvUnit] = useState('');
  const [newInvFacility, setNewInvFacility] = useState('');

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [inv, facs] = await Promise.all([
        inventoryApi.getAll(token),
        facilitiesApi.getAll(token)
      ]);
      setInventory(inv);
      setFacilities(facs);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to load global inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newInvFacility) return;
    
    const data: any = {
      name: newInvName,
      item_type: newInvType,
      availability_status: newInvStatus,
      unit: newInvUnit,
      facility: newInvFacility
    };
    if (newInvQuantity !== '') {
      data.quantity = parseInt(newInvQuantity, 10);
    }

    try {
      setSubmitting(true);
      await inventoryApi.create(token, data);
      setNewInvName('');
      setNewInvQuantity('');
      setNewInvUnit('');
      setNewInvFacility('');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Failed to create inventory item. Check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const medicines = inventory.filter(i => i.item_type === 'MEDICINE');
  const equipment = inventory.filter(i => i.item_type === 'EQUIPMENT');

  const getStatusVariant = (status: string) => {
    if (status === 'AVAILABLE' || status === 'AVAILABLE_EQUIPMENT') return 'success';
    if (status === 'LOW_STOCK') return 'warning';
    return 'danger';
  };

  const getFacilityName = (id: string) => facilities.find(f => f.id === id)?.name || id;

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading global inventory...</div>;
  }

  if (error) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-danger)' }}>{error}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          Global Inventory Management
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Track and provision medicines and equipment across all facilities.
        </p>
      </div>

      <Card style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>Provision New Item</h2>
        <form onSubmit={handleCreateInventory} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{flex: '1 1 200px'}}>
            <label style={{display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px'}}>Facility</label>
            <select value={newInvFacility} onChange={e => setNewInvFacility(e.target.value)} required style={{width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}}>
              <option value="">Select Facility...</option>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div style={{flex: '1 1 200px'}}>
            <label style={{display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px'}}>Name</label>
            <input type="text" value={newInvName} onChange={e => setNewInvName(e.target.value)} required style={{width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}} />
          </div>
          <div style={{flex: '1 1 120px'}}>
            <label style={{display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px'}}>Type</label>
            <select value={newInvType} onChange={e => {
              setNewInvType(e.target.value);
              setNewInvStatus(e.target.value === 'MEDICINE' ? 'AVAILABLE' : 'AVAILABLE_EQUIPMENT');
            }} style={{width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}}>
              <option value="MEDICINE">Medicine</option>
              <option value="EQUIPMENT">Equipment</option>
            </select>
          </div>
          <div style={{flex: '1 1 150px'}}>
            <label style={{display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px'}}>Status</label>
            <select value={newInvStatus} onChange={e => setNewInvStatus(e.target.value)} style={{width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}}>
              {newInvType === 'MEDICINE' ? (
                <>
                  <option value="AVAILABLE">Available</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </>
              ) : (
                <>
                  <option value="AVAILABLE_EQUIPMENT">Available Equipment</option>
                  <option value="UNAVAILABLE_EQUIPMENT">Unavailable Equipment</option>
                </>
              )}
            </select>
          </div>
          <div style={{flex: '1 1 100px'}}>
            <label style={{display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px'}}>Qty (Optional)</label>
            <input type="number" min="0" value={newInvQuantity} onChange={e => setNewInvQuantity(e.target.value)} style={{width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}} />
          </div>
          <div style={{flex: '1 1 100px'}}>
            <label style={{display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px'}}>Unit (Optional)</label>
            <input type="text" value={newInvUnit} onChange={e => setNewInvUnit(e.target.value)} placeholder="e.g. Box" style={{width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}} />
          </div>
          <div style={{flex: '1 1 150px'}}>
            <Button type="submit" variant="primary" fullWidth disabled={submitting}>
              {submitting ? 'Provisioning...' : 'Provision Item'}
            </Button>
          </div>
        </form>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
            Medicines
          </h2>
          {medicines.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No medicines found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {medicines.map(item => (
                <Card key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{item.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      {item.quantity !== null ? `${item.quantity} ${item.unit}` : 'Qty not tracked'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                      🏥 {getFacilityName(item.facility)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Badge variant={getStatusVariant(item.availability_status) as any}>
                        {item.availability_status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Updated: {new Date(item.last_updated).toLocaleString([], { dateStyle: 'short' })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
            Equipment
          </h2>
          {equipment.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No equipment found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {equipment.map(item => (
                <Card key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                      🏥 {getFacilityName(item.facility)}
                    </div>
                    {item.notes && <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{item.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Badge variant={getStatusVariant(item.availability_status) as any}>
                        {item.availability_status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Updated: {new Date(item.last_updated).toLocaleString([], { dateStyle: 'short' })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
