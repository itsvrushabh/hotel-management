// hotel-management/frontend/src/pages/owner/OwnerDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

interface MenuItem {
    id: number;
    name: string;
    description?: string;
    price: number;
    category: string;
    prep_time: number;
    available?: boolean;
}

interface InventoryItem {
    id: number;
    name: string;
    quantity: number;
    unit?: string;
}

interface BillItem {
    id: number;
    order_id?: number;
    total: number;
    payment_method: string;
    created_at?: string;
}

const OwnerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'menu' | 'inventory' | 'billing'>('menu');

    // Menu state
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('Main Course');
    const [newItemPrepTime, setNewItemPrepTime] = useState('15');
    const [newItemDesc, setNewItemDesc] = useState('');

    // Inventory state
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [newInvName, setNewInvName] = useState('');
    const [newInvQty, setNewInvQty] = useState('');
    const [newInvUnit, setNewInvUnit] = useState('kg');

    // Billing state
    const [bills, setBills] = useState<BillItem[]>([]);

    const loadMenu = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/menu-items`);
            if (res.ok) setMenuItems(await res.json());
        } catch {
            // ignore
        }
    };

    const loadInventory = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/inventory`);
            if (res.ok) setInventoryItems(await res.json());
        } catch {
            // ignore
        }
    };

    const loadBilling = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/billing`);
            if (res.ok) setBills(await res.json());
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        loadMenu();
        loadInventory();
        loadBilling();
    }, []);

    const handleCreateMenuItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const priceNum = parseFloat(newItemPrice);
        if (!newItemName || isNaN(priceNum)) return;

        try {
            const res = await fetch(`${API_BASE}/api/menu-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newItemName.trim(),
                    description: newItemDesc.trim() || undefined,
                    price: priceNum,
                    category: newItemCategory,
                    prep_time: parseInt(newItemPrepTime, 10) || 15,
                    available: true,
                }),
            });
            if (res.ok) {
                setNewItemName('');
                setNewItemPrice('');
                setNewItemDesc('');
                loadMenu();
            }
        } catch {
            // ignore
        }
    };

    const handleDeleteMenuItem = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/api/menu-items/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMenuItems(prev => prev.filter(m => m.id !== id));
            }
        } catch {
            // ignore
        }
    };

    const handleCreateInventory = async (e: React.FormEvent) => {
        e.preventDefault();
        const qtyNum = parseInt(newInvQty, 10);
        if (!newInvName || isNaN(qtyNum)) return;

        try {
            const res = await fetch(`${API_BASE}/api/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newInvName.trim(),
                    quantity: qtyNum,
                    unit: newInvUnit,
                }),
            });
            if (res.ok) {
                setNewInvName('');
                setNewInvQty('');
                loadInventory();
            }
        } catch {
            // ignore
        }
    };

    const handleAdjustInventory = async (id: number, delta: number) => {
        try {
            const res = await fetch(`${API_BASE}/api/inventory/${id}/adjust`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ delta }),
            });
            if (res.ok) {
                const updated = await res.json();
                setInventoryItems(prev => prev.map(inv => (inv.id === id ? updated : inv)));
            }
        } catch {
            // ignore
        }
    };

    const totalRevenue = bills.reduce((acc, b) => acc + (b.total || 0), 0);

    return (
        <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '14px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b' }}>⚙️ Owner & Management Dashboard</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b' }}>Manage menu offerings, kitchen raw ingredients, and financial reports</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => navigate('/staff')}
                        style={{ padding: '8px 14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Kitchen System
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Menu
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {(['menu', 'inventory', 'billing'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: activeTab === tab ? '2px solid #2563eb' : '1px solid #cbd5e1',
                            background: activeTab === tab ? '#eff6ff' : '#fff',
                            color: activeTab === tab ? '#2563eb' : '#475569',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                        }}
                    >
                        {tab === 'menu' ? '🍽️ Menu Management' : tab === 'inventory' ? '📦 Inventory Supplies' : '💳 Billing & Revenue'}
                    </button>
                ))}
            </div>

            {/* TAB 1: Menu Management */}
            {activeTab === 'menu' && (
                <div>
                    {/* Add Item Form */}
                    <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                        <h3 style={{ margin: '0 0 14px', color: '#1e293b' }}>Add New Menu Item</h3>
                        <form onSubmit={handleCreateMenuItem} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
                            <input
                                type="text"
                                placeholder="Dish Name (e.g. Biryani)"
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                required
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Price (₹)"
                                value={newItemPrice}
                                onChange={e => setNewItemPrice(e.target.value)}
                                required
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                            <select
                                value={newItemCategory}
                                onChange={e => setNewItemCategory(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                            >
                                <option value="Appetizers">Appetizers</option>
                                <option value="Main Course">Main Course</option>
                                <option value="Desserts">Desserts</option>
                                <option value="Drinks">Drinks</option>
                            </select>
                            <input
                                type="number"
                                placeholder="Prep Time (mins)"
                                value={newItemPrepTime}
                                onChange={e => setNewItemPrepTime(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                            <input
                                type="text"
                                placeholder="Description (ingredients / flavors)"
                                value={newItemDesc}
                                onChange={e => setNewItemDesc(e.target.value)}
                                style={{ gridColumn: 'span 3', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                            <button
                                type="submit"
                                style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                + Add Dish
                            </button>
                        </form>
                    </div>

                    {/* Menu Items Table */}
                    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                                    <th style={{ padding: '12px 16px' }}>Name</th>
                                    <th style={{ padding: '12px 16px' }}>Category</th>
                                    <th style={{ padding: '12px 16px' }}>Price</th>
                                    <th style={{ padding: '12px 16px' }}>Prep Time</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {menuItems.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{item.name}</td>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.category}</td>
                                        <td style={{ padding: '12px 16px', color: '#059669', fontWeight: 600 }}>₹{item.price}</td>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.prep_time}m</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleDeleteMenuItem(item.id)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: Inventory Supplies */}
            {activeTab === 'inventory' && (
                <div>
                    <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                        <h3 style={{ margin: '0 0 14px', color: '#1e293b' }}>Add Raw Material / Supply</h3>
                        <form onSubmit={handleCreateInventory} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
                            <input
                                type="text"
                                placeholder="Ingredient (e.g. Basmati Rice)"
                                value={newInvName}
                                onChange={e => setNewInvName(e.target.value)}
                                required
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                            <input
                                type="number"
                                placeholder="Initial Quantity"
                                value={newInvQty}
                                onChange={e => setNewInvQty(e.target.value)}
                                required
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                            <select
                                value={newInvUnit}
                                onChange={e => setNewInvUnit(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                            >
                                <option value="kg">kg</option>
                                <option value="grams">grams</option>
                                <option value="liters">liters</option>
                                <option value="units">units</option>
                                <option value="packets">packets</option>
                            </select>
                            <button
                                type="submit"
                                style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                + Add Stock
                            </button>
                        </form>
                    </div>

                    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                                    <th style={{ padding: '12px 16px' }}>Item</th>
                                    <th style={{ padding: '12px 16px' }}>Current Stock</th>
                                    <th style={{ padding: '12px 16px' }}>Unit</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Quick Adjust</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventoryItems.map(inv => (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{inv.name}</td>
                                        <td style={{ padding: '12px 16px', color: inv.quantity < 5 ? '#ef4444' : '#1e293b', fontWeight: 700 }}>
                                            {inv.quantity} {inv.quantity < 5 && '(Low Stock)'}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{inv.unit || 'units'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleAdjustInventory(inv.id, -5)}
                                                style={{ padding: '4px 8px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '6px', fontWeight: 'bold' }}
                                            >
                                                -5
                                            </button>
                                            <button
                                                onClick={() => handleAdjustInventory(inv.id, 10)}
                                                style={{ padding: '4px 8px', background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                +10
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: Billing Records */}
            {activeTab === 'billing' && (
                <div>
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '14px', color: '#047857' }}>Total Recorded Revenue</span>
                            <h2 style={{ margin: '4px 0 0', fontSize: '28px', color: '#065f46' }}>₹{totalRevenue.toFixed(2)}</h2>
                        </div>
                        <span style={{ fontSize: '14px', color: '#047857', fontWeight: 600 }}>{bills.length} Bills Processed</span>
                    </div>

                    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                                    <th style={{ padding: '12px 16px' }}>Bill #</th>
                                    <th style={{ padding: '12px 16px' }}>Order Ref</th>
                                    <th style={{ padding: '12px 16px' }}>Payment Mode</th>
                                    <th style={{ padding: '12px 16px' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bills.map(b => (
                                    <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>BILL-{b.id}</td>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>Order #{b.order_id || 'N/A'}</td>
                                        <td style={{ padding: '12px 16px', textTransform: 'uppercase', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                                            {b.payment_method}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#059669' }}>
                                            ₹{b.total.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerDashboard;
