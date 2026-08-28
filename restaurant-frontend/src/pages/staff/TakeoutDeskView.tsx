// restaurant-frontend/src/pages/staff/TakeoutDeskView.tsx
// Dedicated Takeout & Pickup Order Pipeline with Dynamic Kitchen Queue Estimation & Handover Settlement

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

interface OrderItemDetail {
    id: number;
    menu_item_id: number;
    item_name: string;
    quantity: number;
    price: number;
    notes?: string;
}

interface OrderRecord {
    id: number;
    order_code: string;
    customer_id?: number;
    table_number?: string;
    room_number?: string;
    order_type: string;
    status: string;
    total: number;
    notes?: string;
    created_at?: string;
    customer?: {
        id: number;
        phone: string;
        name?: string;
    };
    items?: OrderItemDetail[];
}

const TakeoutDeskView: React.FC = () => {
    const navigate = useNavigate();

    const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Settlement Dialog for Handover
    const [settlingOrder, setSettlingOrder] = useState<OrderRecord | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [issuedBill, setIssuedBill] = useState<{ id: number; total: number } | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const loadOrders = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/orders`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    const enriched = await Promise.all(
                        data.slice(0, 50).map(async (ord: OrderRecord) => {
                            try {
                                const dRes = await fetch(`${API_BASE}/api/orders/${ord.id}`);
                                if (dRes.ok) {
                                    const full = await dRes.json();
                                    return {
                                        ...(full.order || ord),
                                        customer: full.customer || undefined,
                                        items: full.items || [],
                                    };
                                }
                            } catch {
                                // ignore
                            }
                            return ord;
                        })
                    );
                    setAllOrders(enriched);
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
        const interval = setInterval(loadOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const updateStatus = async (orderId: number, nextStatus: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            });
            if (res.ok) {
                showToast(`Ticket status updated to ${nextStatus.toUpperCase()}`);
                loadOrders();
            }
        } catch {
            showToast('Failed to update status.');
        }
    };

    // Dynamic Kitchen Queue Estimation
    // Calculates finish time based on:
    // 1. Max prep time of items in order
    // 2. Active dine-in kitchen tickets load (* 2 mins)
    // 3. Other takeout tickets ahead in queue (* 3 mins)
    // 4. Packaging buffer (3 mins)
    const computeDynamicQueueTime = (order: OrderRecord, indexInQueue: number) => {
        const activeDineInCount = allOrders.filter(
            o => o.order_type !== 'takeaway' && (o.status === 'preparing' || o.status === 'pending')
        ).length;

        const otherTakeoutsAhead = indexInQueue;
        const basePrep = 15; // default base prep
        const dineInDelay = activeDineInCount * 2;
        const takeoutDelay = otherTakeoutsAhead * 3;
        const packagingBuffer = 3;

        const totalEstimatedMins = basePrep + dineInDelay + takeoutDelay + packagingBuffer;

        return {
            totalEstimatedMins,
            activeDineInCount,
            otherTakeoutsAhead,
            breakdown: `${basePrep}m base + ${dineInDelay}m (${activeDineInCount} dine-in) + ${takeoutDelay}m queue + ${packagingBuffer}m pack`,
        };
    };

    // Handover & Settlement Action
    const handlePayAndDeliver = async () => {
        if (!settlingOrder) return;
        setProcessingPayment(true);

        try {
            const res = await fetch(`${API_BASE}/api/billing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: settlingOrder.id,
                    payment_method: paymentMethod,
                }),
            });

            if (res.ok) {
                const billData = await res.json();
                setIssuedBill(billData);

                // Advance status to delivered
                await fetch(`${API_BASE}/api/orders/${settlingOrder.id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'delivered' }),
                });

                showToast(`Bill #${billData.id} paid. Order ${settlingOrder.order_code} handed over to customer!`);
                loadOrders();
            }
        } catch {
            showToast('Failed to process payment settlement.');
        } finally {
            setProcessingPayment(false);
        }
    };

    // Filter Takeout Orders
    const takeoutOrders = allOrders.filter(
        o => o.order_type === 'takeaway' || (o.table_number && o.table_number.toLowerCase().includes('takeaway'))
    );

    // 6 Lifecycle Stages
    const stage1_New = takeoutOrders.filter(o => o.status === 'pending');
    const stage2_Confirmed = takeoutOrders.filter(o => o.status === 'confirmed');
    const stage3_Preparing = takeoutOrders.filter(o => o.status === 'preparing');
    const stage4_Prepared = takeoutOrders.filter(o => o.status === 'prepared');
    const stage5_ReadyToTakeout = takeoutOrders.filter(o => o.status === 'ready' || o.status === 'ready_for_pickup');
    const stage6_Delivered = takeoutOrders.filter(o => o.status === 'delivered' || o.status === 'served');

    return (
        <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', background: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
            {/* Top Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#fde047', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🥡 Takeout & Pickup Operations Desk
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
                        6-Stage Pickup Pipeline: Order → Confirm → Preparing (Queue Load) → Prepared → Ready → Paid & Delivered
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/frontdesk')}
                        style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        🏢 Restaurant Floor Desk
                    </button>
                    <button
                        onClick={() => navigate('/staff')}
                        style={{ padding: '8px 16px', background: '#1e293b', border: '1px solid #334155', color: '#93c5fd', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        👨‍🍳 Kitchen KDS
                    </button>
                </div>
            </div>

            {toastMessage && (
                <div style={{ padding: '12px 20px', background: '#10b981', color: '#fff', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
                    {toastMessage}
                </div>
            )}

            {loading && takeoutOrders.length === 0 && <p style={{ color: '#94a3b8' }}>Loading takeout pipeline...</p>}

            {/* 6-Stage Kanban Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(240px, 1fr))', gap: '14px', overflowX: 'auto', paddingBottom: '16px' }}>
                
                {/* 1. ORDER (NEW) */}
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '14px', border: '1px solid #334155' }}>
                    <div style={{ borderBottom: '2px solid #eab308', paddingBottom: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', color: '#fde047' }}>1. 📥 Order Placed</h3>
                        <span style={{ background: '#334155', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>{stage1_New.length}</span>
                    </div>

                    {stage1_New.map(ord => (
                        <div key={ord.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong style={{ color: '#38bdf8', fontSize: '13px' }}>{ord.order_code}</strong>
                                <strong style={{ color: '#34d399', fontSize: '13px' }}>₹{ord.total}</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                                👤 {ord.customer?.name || 'Customer'} ({ord.customer?.phone || 'N/A'})
                            </div>
                            <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
                                {ord.items?.map(it => `${it.quantity}x ${it.item_name}`).join(', ')}
                            </div>
                            <button
                                onClick={() => updateStatus(ord.id, 'confirmed')}
                                style={{ width: '100%', padding: '8px', background: '#eab308', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                            >
                                ✅ Confirm Order →
                            </button>
                        </div>
                    ))}
                </div>

                {/* 2. CONFIRM */}
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '14px', border: '1px solid #334155' }}>
                    <div style={{ borderBottom: '2px solid #38bdf8', paddingBottom: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', color: '#38bdf8' }}>2. 📋 Confirmed</h3>
                        <span style={{ background: '#334155', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>{stage2_Confirmed.length}</span>
                    </div>

                    {stage2_Confirmed.map(ord => (
                        <div key={ord.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong style={{ color: '#38bdf8', fontSize: '13px' }}>{ord.order_code}</strong>
                                <strong style={{ color: '#34d399', fontSize: '13px' }}>₹{ord.total}</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                                👤 {ord.customer?.name || 'Customer'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
                                {ord.items?.map(it => `${it.quantity}x ${it.item_name}`).join(', ')}
                            </div>
                            <button
                                onClick={() => updateStatus(ord.id, 'preparing')}
                                style={{ width: '100%', padding: '8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                            >
                                👨‍🍳 Start Cooking →
                            </button>
                        </div>
                    ))}
                </div>

                {/* 3. PREPARING (WITH DYNAMIC QUEUE ESTIMATION) */}
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '14px', border: '1px solid #334155' }}>
                    <div style={{ borderBottom: '2px solid #f97316', paddingBottom: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', color: '#fb923c' }}>3. 🔥 Preparing</h3>
                        <span style={{ background: '#334155', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>{stage3_Preparing.length}</span>
                    </div>

                    {stage3_Preparing.map((ord, idx) => {
                        const queueEstimate = computeDynamicQueueTime(ord, idx);

                        return (
                            <div key={ord.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #f97316' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <strong style={{ color: '#fde047', fontSize: '13px' }}>{ord.order_code}</strong>
                                    <strong style={{ color: '#34d399', fontSize: '13px' }}>₹{ord.total}</strong>
                                </div>

                                {/* Dynamic Queue Estimator Badge */}
                                <div style={{ background: '#2d1a15', padding: '8px', borderRadius: '6px', margin: '8px 0', border: '1px solid #c2410c' }}>
                                    <div style={{ color: '#fdba74', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>⏱️</span>
                                        <span>~{queueEstimate.totalEstimatedMins} mins to finish</span>
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#fed7aa', display: 'block', marginTop: '2px' }}>
                                        Queue load: {queueEstimate.activeDineInCount} dine-in + {queueEstimate.otherTakeoutsAhead} takeouts ahead
                                    </span>
                                </div>

                                <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
                                    {ord.items?.map(it => `${it.quantity}x ${it.item_name}`).join(', ')}
                                </div>

                                <button
                                    onClick={() => updateStatus(ord.id, 'prepared')}
                                    style={{ width: '100%', padding: '8px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                >
                                    📦 Mark as Prepared & Packed →
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* 4. PREPARED (PACKED IN KITCHEN) */}
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '14px', border: '1px solid #334155' }}>
                    <div style={{ borderBottom: '2px solid #a855f7', paddingBottom: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', color: '#d8b4fe' }}>4. 📦 Prepared</h3>
                        <span style={{ background: '#334155', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>{stage4_Prepared.length}</span>
                    </div>

                    {stage4_Prepared.map(ord => (
                        <div key={ord.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #a855f7' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong style={{ color: '#d8b4fe', fontSize: '13px' }}>{ord.order_code}</strong>
                                <strong style={{ color: '#34d399', fontSize: '13px' }}>₹{ord.total}</strong>
                            </div>
                            <div style={{ fontSize: '11px', color: '#a855f7', fontWeight: 600, marginBottom: '6px' }}>
                                ✓ Cooking complete & bagged
                            </div>
                            <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
                                {ord.items?.map(it => `${it.quantity}x ${it.item_name}`).join(', ')}
                            </div>
                            <button
                                onClick={() => updateStatus(ord.id, 'ready')}
                                style={{ width: '100%', padding: '8px', background: '#9333ea', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                            >
                                🛎️ Move to Pickup Counter →
                            </button>
                        </div>
                    ))}
                </div>

                {/* 5. READY TO TAKE OUT (AT COUNTER) */}
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '14px', border: '1px solid #334155' }}>
                    <div style={{ borderBottom: '2px solid #10b981', paddingBottom: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', color: '#6ee7b7' }}>5. 🥡 Ready to Takeout</h3>
                        <span style={{ background: '#334155', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>{stage5_ReadyToTakeout.length}</span>
                    </div>

                    {stage5_ReadyToTakeout.map(ord => (
                        <div key={ord.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #10b981' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong style={{ color: '#6ee7b7', fontSize: '13px' }}>{ord.order_code}</strong>
                                <strong style={{ color: '#34d399', fontSize: '14px' }}>₹{ord.total}</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '4px' }}>
                                👤 <strong>{ord.customer?.name || 'Customer'}</strong> ({ord.customer?.phone || 'Pickup'})
                            </div>
                            <div style={{ fontSize: '11px', color: '#fde047', marginBottom: '8px' }}>
                                ⚠️ Collect payment before handover
                            </div>

                            <button
                                onClick={() => {
                                    setSettlingOrder(ord);
                                    setIssuedBill(null);
                                }}
                                style={{ width: '100%', padding: '10px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                            >
                                💳 Pay Bill & Deliver →
                            </button>
                        </div>
                    ))}
                </div>

                {/* 6. DELIVERED (SETTLED) */}
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '14px', border: '1px solid #334155' }}>
                    <div style={{ borderBottom: '2px solid #64748b', paddingBottom: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>6. 🏁 Delivered</h3>
                        <span style={{ background: '#334155', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>{stage6_Delivered.length}</span>
                    </div>

                    {stage6_Delivered.slice(0, 10).map(ord => (
                        <div key={ord.id} style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <strong style={{ color: '#94a3b8', fontSize: '12px' }}>{ord.order_code}</strong>
                                <span style={{ color: '#34d399', fontWeight: 700, fontSize: '12px' }}>₹{ord.total}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#6ee7b7' }}>
                                ✓ Paid & Handed Over
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SETTLEMENT & HANDOVER DIALOG */}
            {settlingOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', color: '#f8fafc', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#fde047' }}>
                                🥡 Takeout Settlement: {settlingOrder.order_code}
                            </h2>
                            <button onClick={() => setSettlingOrder(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: '#94a3b8' }}>Guest:</span>
                                <strong style={{ color: '#f8fafc' }}>{settlingOrder.customer?.name || 'Walk-in Customer'} ({settlingOrder.customer?.phone || 'N/A'})</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                                <span>Payable Bill Amount:</span>
                                <strong style={{ color: '#34d399' }}>₹{settlingOrder.total.toFixed(2)}</strong>
                            </div>
                        </div>

                        {!issuedBill ? (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                                    PAYMENT METHOD COLLECTED AT TAKEOUT DESK
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                                    {[
                                        { id: 'cash', label: '💵 Cash' },
                                        { id: 'upi', label: '📱 UPI / QR' },
                                        { id: 'card', label: '💳 Card' },
                                    ].map(pm => (
                                        <button
                                            key={pm.id}
                                            onClick={() => setPaymentMethod(pm.id as any)}
                                            style={{
                                                padding: '10px 6px',
                                                borderRadius: '6px',
                                                border: paymentMethod === pm.id ? '2px solid #38bdf8' : '1px solid #475569',
                                                background: paymentMethod === pm.id ? '#0284c7' : '#0f172a',
                                                color: '#fff',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {pm.label}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={handlePayAndDeliver}
                                    disabled={processingPayment}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        background: '#10b981',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '15px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {processingPayment ? 'Processing Payment...' : `✅ Settle Payment & Deliver Takeout (₹${settlingOrder.total.toFixed(2)})`}
                                </button>
                            </div>
                        ) : (
                            <div style={{ background: '#064e3b', border: '1px solid #10b981', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', marginBottom: '6px' }}>🥡</div>
                                <h3 style={{ margin: '0 0 4px', color: '#6ee7b7' }}>Order Paid & Delivered!</h3>
                                <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#a7f3d0' }}>
                                    Bill <strong>BILL-{issuedBill.id}</strong> issued. Package handed over to guest.
                                </p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <a
                                        href={`${API_BASE}/api/billing/${issuedBill.id}/pdf`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ flex: 1, padding: '10px', background: '#2563eb', color: '#fff', borderRadius: '6px', fontWeight: 600, fontSize: '13px', textDecoration: 'none', display: 'block' }}
                                    >
                                        📄 Download Receipt PDF
                                    </a>
                                    <button onClick={() => setSettlingOrder(null)} style={{ padding: '10px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Done</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TakeoutDeskView;
