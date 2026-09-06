import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { inventoryApi } from '../../api';
import type { InventoryItem } from '../../types';
import { Card, Badge, Button } from '../../components/ui';

export const HealthWorkerInventory = () => {
  const { token } = useAuth();
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newInvName, setNewInvName] = useState('');
  const [newInvType, setNewInvType] = useState('MEDICINE');
  const [newInvQuantity, setNewInvQuantity] = useState('');
  const [newInvStatus, setNewInvStatus] = useState('AVAILABLE');
  const [newInvUnit, setNewInvUnit] = useState('');
  const [newInvNotes, setNewInvNotes] = useState('');

  const fetchInventory = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await inventoryApi.getAll(token);
      setInventory(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [token]);

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    const data: any = {
      name: newInvName,
      item_type: newInvType,
      availability_status: newInvStatus,
      unit: newInvUnit,
      notes: newInvNotes
    };
    if (newInvQuantity !== '') {
      data.quantity = parseInt(newInvQuantity, 10);
    }

    try {
      setSubmitting(true);
      await inventoryApi.create(token, data);
      setNewInvName('');
      setNewInvQuantity('');
      setNewInvNotes('');
      setNewInvUnit('');
      await fetchInventory();
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

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading facility inventory...</div>;
  }

  if (error) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-danger)' }}>{error}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
          Facility Inventory
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Track essential medicines and equipment.
        </p>
      </div>

      <Card style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>Add New Item</h2>
        <form onSubmit={handleCreateInventory} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
            <input type="text" value={newInvUnit} onChange={e => setNewInvUnit(e.target.value)} placeholder="e.g. Tablets" style={{width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}} />
          </div>
          <div style={{flex: '1 1 100px'}}>
            <Button type="submit" variant="primary" fullWidth disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Medicines */}
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
            Medicines & Consumables
          </h2>
          {medicines.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No medicines found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {medicines.map(item => (
                <Card key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{item.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {item.quantity !== null ? `${item.quantity} ${item.unit}` : 'Qty not tracked'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Badge variant={getStatusVariant(item.availability_status) as any}>
                        {item.availability_status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Updated: {new Date(item.last_updated).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Equipment */}
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
            Equipment
          </h2>
          {equipment.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No equipment found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {equipment.map(item => (
                <Card key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{item.name}</div>
                    {item.notes && <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{item.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Badge variant={getStatusVariant(item.availability_status) as any}>
                        {item.availability_status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Updated: {new Date(item.last_updated).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
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
