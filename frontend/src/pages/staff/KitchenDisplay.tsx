// hotel-management/frontend/src/pages/staff/KitchenDisplay.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

interface OrderItemDetail {
    id: number;
    item_name: string;
    quantity: number;
    price: number;
    notes?: string;
}

interface KitchenOrder {
    id: number;
    order_code: string;
    status: string;
    total: number;
    table_number?: string;
    room_number?: string;
    order_type: string;
    notes?: string;
    created_at?: string;
    items?: OrderItemDetail[];
}

const KitchenDisplay: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadOrders = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/orders`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                // Fetch full details for recent orders
                const detailed = await Promise.all(
                    data.slice(0, 30).map(async (ord: KitchenOrder) => {
                        try {
                            const dRes = await fetch(`${API_BASE}/api/orders/${ord.id}`);
                            if (dRes.ok) {
                                const full = await dRes.json();
                                return {
                                    ...(full.order || ord),
                                    items: full.items || [],
                                };
                            }
                        } catch {
                            // ignore individual fetch errors
                        }
                        return ord;
                    })
                );
                setOrders(detailed);
            }
            setError(null);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error loading kitchen orders';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const updateStatus = async (orderId: number, nextStatus: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            });
            if (res.ok) {
                setOrders(prev =>
                    prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o))
                );
            }
        } catch {
            // failed to update status
        }
    };

    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const readyOrders = orders.filter(o => o.status === 'ready');

    return (
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', background: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#f8fafc' }}>🍳 Kitchen Display System (KDS)</h1>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>Live incoming tickets with instant status updates (Auto-refreshes every 5s)</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={loadOrders}
                        style={{ padding: '8px 16px', background: '#334155', color: '#f8fafc', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        🔄 Refresh
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Customer View
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '12px', background: '#7f1d1d', color: '#fecaca', borderRadius: '8px', marginBottom: '16px' }}>
                    {error}
                </div>
            )}

            {loading && orders.length === 0 && <p style={{ color: '#94a3b8' }}>Loading active kitchen tickets...</p>}

            {/* 3-Column Board */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {/* Column 1: Pending */}
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #eab308', paddingBottom: '8px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', color: '#fde047' }}>⏳ New Orders ({pendingOrders.length})</h2>
                    </div>

                    {pendingOrders.map(order => (
                        <div key={order.id} style={{ background: '#0f172a', borderRadius: '8px', padding: '14px', marginBottom: '14px', border: '1px solid #475569' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <strong style={{ color: '#fde047', fontSize: '15px' }}>{order.order_code}</strong>
                                <span style={{ color: '#cbd5e1', fontSize: '13px', background: '#334155', padding: '2px 8px', borderRadius: '4px' }}>
                                    {order.table_number || order.room_number || 'Takeaway'}
                                </span>
                            </div>

                            <div style={{ margin: '10px 0', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                                {order.items?.map(it => (
                                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 600 }}>{it.quantity}x {it.item_name}</span>
                                        {it.notes && <span style={{ color: '#fb7185', fontSize: '12px' }}>⚠️ {it.notes}</span>}
                                    </div>
                                ))}
                                {order.notes && (
                                    <p style={{ margin: '6px 0 0', color: '#93c5fd', fontSize: '12px' }}>
                                        Note: {order.notes}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => updateStatus(order.id, 'preparing')}
                                style={{ width: '100%', padding: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', marginTop: '6px' }}
                            >
                                👨‍🍳 Start Cooking →
                            </button>
                        </div>
                    ))}
                </div>

                {/* Column 2: Preparing */}
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #3b82f6', paddingBottom: '8px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', color: '#60a5fa' }}>🔥 In Kitchen ({preparingOrders.length})</h2>
                    </div>

                    {preparingOrders.map(order => (
                        <div key={order.id} style={{ background: '#0f172a', borderRadius: '8px', padding: '14px', marginBottom: '14px', border: '1px solid #3b82f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <strong style={{ color: '#60a5fa', fontSize: '15px' }}>{order.order_code}</strong>
                                <span style={{ color: '#cbd5e1', fontSize: '13px', background: '#334155', padding: '2px 8px', borderRadius: '4px' }}>
                                    {order.table_number || order.room_number || 'Takeaway'}
                                </span>
                            </div>

                            <div style={{ margin: '10px 0', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                                {order.items?.map(it => (
                                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 600 }}>{it.quantity}x {it.item_name}</span>
                                        {it.notes && <span style={{ color: '#fb7185', fontSize: '12px' }}>⚠️ {it.notes}</span>}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => updateStatus(order.id, 'ready')}
                                style={{ width: '100%', padding: '8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', marginTop: '6px' }}
                            >
                                ✅ Mark as Ready →
                            </button>
                        </div>
                    ))}
                </div>

                {/* Column 3: Ready */}
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #10b981', paddingBottom: '8px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', color: '#34d399' }}>🍽️ Ready to Serve ({readyOrders.length})</h2>
                    </div>

                    {readyOrders.map(order => (
                        <div key={order.id} style={{ background: '#0f172a', borderRadius: '8px', padding: '14px', marginBottom: '14px', border: '1px solid #10b981' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <strong style={{ color: '#34d399', fontSize: '15px' }}>{order.order_code}</strong>
                                <span style={{ color: '#cbd5e1', fontSize: '13px', background: '#334155', padding: '2px 8px', borderRadius: '4px' }}>
                                    {order.table_number || order.room_number || 'Takeaway'}
                                </span>
                            </div>

                            <div style={{ margin: '10px 0', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                                {order.items?.map(it => (
                                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                                        <span>{it.quantity}x {it.item_name}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => updateStatus(order.id, 'served')}
                                style={{ width: '100%', padding: '8px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', marginTop: '6px' }}
                            >
                                📦 Mark as Served
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default KitchenDisplay;
