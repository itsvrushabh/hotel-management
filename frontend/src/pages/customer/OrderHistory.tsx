// hotel-management/frontend/src/pages/customer/OrderHistory.tsx
// Front Desk & Order Service Velocity History View

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

interface OrderRecord {
    id: number;
    order_code: string;
    status: string;
    total: number;
    table_number?: string;
    room_number?: string;
    order_type: string;
    created_at?: string;
    items?: OrderItemDetail[];
}

const OrderHistory: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<OrderRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchCode, setSearchCode] = useState('');

    const loadOrders = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/orders`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    const detailed = await Promise.all(
                        data.slice(0, 30).map(async (ord: OrderRecord) => {
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
                                // ignore
                            }
                            return ord;
                        })
                    );
                    setOrders(detailed);
                }
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const computeServiceDuration = (createdAt?: string, status?: string) => {
        if (!createdAt) return { text: 'N/A', badge: '#64748b' };
        const createdDate = new Date(createdAt);
        const now = new Date();
        const diffMs = now.getTime() - createdDate.getTime();
        const minutes = Math.max(1, Math.round(diffMs / 60000));

        if (status === 'served') {
            if (minutes <= 15) return { text: `${minutes} mins (⚡ Fast Service)`, badge: '#10b981' };
            if (minutes <= 25) return { text: `${minutes} mins (Standard)`, badge: '#38bdf8' };
            return { text: `${minutes} mins (Served)`, badge: '#a855f7' };
        }

        if (minutes > 25) return { text: `${minutes} mins in prep (⚠️ Delayed)`, badge: '#ef4444' };
        if (minutes > 15) return { text: `${minutes} mins in prep (Cooking)`, badge: '#eab308' };
        return { text: `${minutes} mins in prep (Just Placed)`, badge: '#3b82f6' };
    };

    const filtered = orders.filter(
        o =>
            !searchCode.trim() ||
            o.order_code.toLowerCase().includes(searchCode.toLowerCase()) ||
            (o.table_number && o.table_number.toLowerCase().includes(searchCode.toLowerCase())) ||
            (o.room_number && o.room_number.toLowerCase().includes(searchCode.toLowerCase()))
    );

    return (
        <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '22px', color: '#1e293b' }}>⏱️ Order Timeline & Service Duration Log</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                        Shows Order ID, status, and duration from order creation to table delivery
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        ← Customer Menu
                    </button>
                    <button
                        onClick={() => navigate('/frontdesk')}
                        style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        🏢 Front Desk Floor Map
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <input
                    type="text"
                    placeholder="Search by Order ID (e.g. ORD-2026...), Table, or Room..."
                    value={searchCode}
                    onChange={e => setSearchCode(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
            </div>

            {loading && <p style={{ color: '#64748b' }}>Loading order log...</p>}

            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                            <th style={{ padding: '12px 16px' }}>Order ID</th>
                            <th style={{ padding: '12px 16px' }}>Table / Location</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px' }}>Service Velocity</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(ord => {
                            const velocity = computeServiceDuration(ord.created_at, ord.status);
                            let statusColor = '#eab308';
                            if (ord.status === 'preparing') statusColor = '#3b82f6';
                            if (ord.status === 'ready') statusColor = '#10b981';
                            if (ord.status === 'served') statusColor = '#8b5cf6';

                            return (
                                <tr key={ord.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2563eb' }}>
                                        {ord.order_code}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                                        {ord.table_number || ord.room_number || 'Takeaway'}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ background: statusColor, color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, textTransform: 'capitalize' }}>
                                            {ord.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: 700, color: velocity.badge }}>
                                        ⏱️ {velocity.text}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                        ₹{ord.total.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OrderHistory;
