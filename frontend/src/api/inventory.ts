export const inventoryApi = {
  getAll: async (token: string) => {
    const res = await fetch('http://127.0.0.1:8000/api/v1/inventory/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch inventory');
    const data = await res.json();
    return data.results || data;
  },

  create: async (token: string, data: any) => {
    const res = await fetch('http://127.0.0.1:8000/api/v1/inventory/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create inventory item');
    return res.json();
  },

  update: async (token: string, id: string, data: any) => {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/inventory/${id}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update inventory item');
    return res.json();
  },

  delete: async (token: string, id: string) => {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/inventory/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Failed to delete inventory item');
    return true;
  }
};
