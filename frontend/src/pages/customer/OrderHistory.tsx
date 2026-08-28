// hotel-management/frontend/src/pages/customer/OrderHistory.tsx
import React, { useState } from 'react';
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

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'served'];

const OrderHistory: React.FC = () => {
    const navigate = useNavigate();
    const [searchCode, setSearchCode] = useState('');
    const [orders, setOrders] = useState<OrderRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = searchCode.trim();
        if (!code) return;

        setLoading(true);
        setError(null);
        setOrders([]);

        try {
            // First try looking up by order code
            const res = await fetch(`${API_BASE}/api/orders/code/${encodeURIComponent(code)}`);
            if (res.ok) {
                const data = await res.json();
                const record: OrderRecord = {
                    ...(data.order || data),
                    items: data.items || [],
                };
                setOrders([record]);
            } else {
                // If not found by code, try listing recent orders
                const listRes = await fetch(`${API_BASE}/api/orders`);
                if (listRes.ok) {
                    const allData = await listRes.json();
                    if (Array.isArray(allData)) {
                        const matched = allData.filter((o: OrderRecord) =>
                            o.order_code.toLowerCase().includes(code.toLowerCase()) ||
                            (o.table_number && o.table_number.toLowerCase().includes(code.toLowerCase()))
                        );
                        if (matched.length > 0) {
                            setOrders(matched);
                        } else {
                            setError(`No order found matching "${code}".`);
                        }
                    }
                } else {
                    setError('Order not found.');
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error fetching order details.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIndex = (status: string) => {
        const idx = STATUS_STEPS.indexOf(status.toLowerCase());
        return idx >= 0 ? idx : 0;
    };

    return (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #eee', paddingBottom: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b' }}>Track Your Order</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b' }}>Enter your order number or table number to check status</p>
                </div>
                <button
                    onClick={() => navigate('/')}
                    style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                    Menu
                </button>
            </div>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <input
                    type="text"
                    placeholder="Enter order code (e.g. ORD-2026...) or table number..."
                    value={searchCode}
                    onChange={e => setSearchCode(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                />
                <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {error && (
                <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {orders.map(order => {
                const currentStepIdx = getStatusIndex(order.status);
                return (
                    <div
                        key={order.id}
                        style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '20px',
                            background: '#fff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#1e293b' }}>{order.order_code}</h2>
                                <span style={{ color: '#64748b', fontSize: '14px' }}>
                                    {order.order_type.replace('_', ' ').toUpperCase()} • {order.table_number || order.room_number || 'Takeaway'}
                                </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '18px', fontWeight: 700, color: '#059669', display: 'block' }}>
                                    ₹{order.total.toFixed(2)}
                                </span>
                                {order.created_at && (
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Progress Stepper */}
                        <div style={{ margin: '24px 0', padding: '12px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                                {STATUS_STEPS.map((step, idx) => {
                                    const isPassed = idx <= currentStepIdx;
                                    const isCurrent = idx === currentStepIdx;
                                    return (
                                        <div key={step} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                                            <div
                                                style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '50%',
                                                    background: isPassed ? '#10b981' : '#e2e8f0',
                                                    color: isPassed ? '#fff' : '#64748b',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    margin: '0 auto 6px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    boxShadow: isCurrent ? '0 0 0 4px #d1fae5' : 'none',
                                                }}
                                            >
                                                {idx + 1}
                                            </div>
                                            <span style={{ fontSize: '12px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#047857' : '#64748b', textTransform: 'capitalize' }}>
                                                {step}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Items list if available */}
                        {order.items && order.items.length > 0 && (
                            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginTop: '16px' }}>
                                <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#475569' }}>Dishes in this order:</h4>
                                {order.items.map(item => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', color: '#334155' }}>
                                        <span>
                                            {item.quantity}x {item.item_name}
                                            {item.notes && <em style={{ color: '#64748b', marginLeft: '6px' }}>({item.notes})</em>}
                                        </span>
                                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default OrderHistory;
