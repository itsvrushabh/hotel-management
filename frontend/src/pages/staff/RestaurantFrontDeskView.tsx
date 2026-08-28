// hotel-management/frontend/src/pages/staff/RestaurantFrontDeskView.tsx
// Dedicated Restaurant Front Desk for Dining Tables, Open Bar, Takeaway, and Dining Settlements

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

interface BillRecord {
    id: number;
    order_id?: number;
    total: number;
    payment_method: string;
    created_at?: string;
}

// 1. Restaurant Dining Tables
const RESTAURANT_TABLES = Array.from({ length: 20 }, (_, i) => `Table ${i + 1}`);

// 2. Open Bar & Lounge Area
const OPEN_BAR_COUNTERS = [
    'Bar Counter 1',
    'Bar Counter 2',
    'Bar Counter 3',
    'Bar Counter 4',
];

const RestaurantFrontDeskView: React.FC = () => {
    const navigate = useNavigate();

    const [restaurantFilter, setRestaurantFilter] = useState<'all' | 'tables' | 'bar' | 'takeaway'>('all');
    const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
    const [allBills, setAllBills] = useState<BillRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Selected Table/Bar for Settlement
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [locationOrders, setLocationOrders] = useState<OrderRecord[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'room_charge'>('upi');
    const [settling, setSettling] = useState(false);
    const [generatedBill, setGeneratedBill] = useState<{ id: number; total: number } | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const [ordersRes, billsRes] = await Promise.all([
                fetch(`${API_BASE}/api/orders`),
                fetch(`${API_BASE}/api/billing`),
            ]);

            if (ordersRes.ok) {
                const ordData = await ordersRes.json();
                if (Array.isArray(ordData)) {
                    const enriched = await Promise.all(
                        ordData.slice(0, 50).map(async (ord: OrderRecord) => {
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

            if (billsRes.ok) {
                const bData = await billsRes.json();
                if (Array.isArray(bData)) setAllBills(bData);
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 6000);
        return () => clearInterval(interval);
    }, []);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Open Billing Modal for Restaurant Table / Bar
    const handleOpenBilling = (locationName: string) => {
        setSelectedLocation(locationName);
        setGeneratedBill(null);

        const ordersForLoc = allOrders.filter(
            o => o.table_number === locationName && o.status !== 'cancelled'
        );
        setLocationOrders(ordersForLoc);
    };

    // Process Table Settlement
    const handleProcessSettlement = async () => {
        if (locationOrders.length === 0) return;
        setSettling(true);

        try {
            const targetOrder = locationOrders[0];
            if (!targetOrder) return;

            const res = await fetch(`${API_BASE}/api/billing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: targetOrder.id,
                    payment_method: paymentMethod,
                }),
            });

            if (res.ok) {
                const billData = await res.json();
                setGeneratedBill(billData);

                // Mark orders as served
                await Promise.all(
                    locationOrders.map(o =>
                        fetch(`${API_BASE}/api/orders/${o.id}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'served' }),
                        })
                    )
                );

                showToast(`${selectedLocation} settled successfully! Bill #${billData.id} issued.`);
                loadData();
            }
        } catch {
            showToast('Settlement processing failed.');
        } finally {
            setSettling(false);
        }
    };

    const getLocationSummary = (locName: string) => {
        const matchingOrders = allOrders.filter(
            o => o.table_number === locName && o.status !== 'cancelled'
        );

        if (matchingOrders.length === 0) {
            return {
                status: 'vacant',
                statusLabel: '🟢 Vacant & Clean',
                subLabel: 'Available for guests',
                activeOrders: [],
                totalBalance: 0,
                customerName: null,
                phone: null,
            };
        }

        const hasPreparing = matchingOrders.some(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing');
        const hasReady = matchingOrders.some(o => o.status === 'ready');
        const allServed = matchingOrders.every(o => o.status === 'served');
        const billedOrderIds = new Set(allBills.map(b => b.order_id));
        const allBilled = matchingOrders.every(o => billedOrderIds.has(o.id));
        const totalBalance = matchingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const customer = matchingOrders.find(o => o.customer)?.customer;

        if (allBilled) {
            return {
                status: 'settled',
                statusLabel: '⚪ Paid / Reset Needed',
                subLabel: 'Ready for table reset',
                activeOrders: matchingOrders,
                totalBalance,
                customerName: customer?.name || null,
                phone: customer?.phone || null,
            };
        }

        if (hasPreparing) {
            return {
                status: 'preparing',
                statusLabel: '🟡 In Kitchen (Cooking)',
                subLabel: 'Chef preparing dishes',
                activeOrders: matchingOrders,
                totalBalance,
                customerName: customer?.name || null,
                phone: customer?.phone || null,
            };
        }

        if (hasReady) {
            return {
                status: 'ready',
                statusLabel: '🔵 Food Ready for Service',
                subLabel: 'Waiter pickup required',
                activeOrders: matchingOrders,
                totalBalance,
                customerName: customer?.name || null,
                phone: customer?.phone || null,
            };
        }

        if (allServed) {
            return {
                status: 'serving',
                statusLabel: '🟣 Active Dining (Served)',
                subLabel: 'Guests eating',
                activeOrders: matchingOrders,
                totalBalance,
                customerName: customer?.name || null,
                phone: customer?.phone || null,
            };
        }

        return {
            status: 'occupied',
            statusLabel: '🟡 Occupied',
            subLabel: `${matchingOrders.length} order(s)`,
            activeOrders: matchingOrders,
            totalBalance,
            customerName: customer?.name || null,
            phone: customer?.phone || null,
        };
    };

    const takeawayOrders = allOrders.filter(o => o.order_type === 'takeaway' || (o.table_number && o.table_number.toLowerCase().includes('takeaway')));
    const roomServiceOutbox = allOrders.filter(o => o.order_type === 'room_service' || o.room_number);

    const consolidatedItems = locationOrders.flatMap(o => o.items || []);
    const consolidatedSubtotal = consolidatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const consolidatedTax = Math.round(consolidatedSubtotal * 0.05 * 100) / 100;
    const consolidatedTotal = Math.round((consolidatedSubtotal + consolidatedTax) * 100) / 100;

    const renderCard = (locName: string, isBar = false) => {
        const info = getLocationSummary(locName);

        let cardBorder = '#1e3a5f';
        let badgeBg = '#064e3b';
        let badgeColor = '#6ee7b7';

        if (info.status === 'preparing') {
            cardBorder = '#854d0e';
            badgeBg = '#713f12';
            badgeColor = '#fde047';
        } else if (info.status === 'ready') {
            cardBorder = '#1d4ed8';
            badgeBg = '#1e40af';
            badgeColor = '#93c5fd';
        } else if (info.status === 'serving') {
            cardBorder = '#6b21a8';
            badgeBg = '#581c87';
            badgeColor = '#d8b4fe';
        } else if (info.status === 'settled') {
            cardBorder = '#475569';
            badgeBg = '#334155';
            badgeColor = '#cbd5e1';
        }

        return (
            <div
                key={locName}
                style={{
                    background: '#1e293b',
                    border: `2px solid ${cardBorder}`,
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                }}
            >
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <h3 style={{ margin: 0, fontSize: '17px', color: '#f8fafc' }}>
                            {isBar ? `🍸 ${locName}` : `🍽️ ${locName}`}
                        </h3>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: badgeBg, color: badgeColor }}>
                            {info.statusLabel}
                        </span>
                    </div>

                    <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#94a3b8' }}>
                        {info.subLabel}
                    </p>

                    {info.status !== 'vacant' && (
                        <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
                            {info.customerName && (
                                <div style={{ color: '#e2e8f0', marginBottom: '2px' }}>
                                    👤 Guest: <strong>{info.customerName}</strong>
                                </div>
                            )}
                            {info.phone && (
                                <div style={{ color: '#94a3b8', marginBottom: '4px' }}>
                                    📞 Phone: {info.phone}
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px solid #334155', paddingTop: '4px' }}>
                                <span style={{ color: '#94a3b8' }}>Tickets: {info.activeOrders.length}</span>
                                <strong style={{ color: '#34d399', fontSize: '14px' }}>₹{info.totalBalance.toFixed(2)}</strong>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    {info.status !== 'vacant' ? (
                        <button
                            onClick={() => handleOpenBilling(locName)}
                            style={{ width: '100%', padding: '10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                        >
                            🧾 Settle {locName} Bill →
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/waiter')}
                            style={{ width: '100%', padding: '8px', background: '#334155', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                            ➕ New {isBar ? 'Bar Tab' : 'Table Ticket'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', background: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🍽️ Restaurant Front Desk & Floor Operations
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
                        Dining tables, open bar lounge, takeaway counter, and dining settlements
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/hotel-frontdesk')}
                        style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        🏨 Switch to Hotel Front Desk (Rooms) →
                    </button>
                    <button
                        onClick={() => navigate('/waiter')}
                        style={{ padding: '8px 16px', background: '#0f172a', border: '1px solid #475569', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        🤵 Waiter POS
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {[
                    { id: 'all', label: '🌐 All Restaurant Zones' },
                    { id: 'tables', label: `🍽️ Dining Tables (${RESTAURANT_TABLES.length})` },
                    { id: 'bar', label: `🍸 Open Bar Lounge (${OPEN_BAR_COUNTERS.length})` },
                    { id: 'takeaway', label: `🥡 Takeout Orders (${takeawayOrders.length})` },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setRestaurantFilter(tab.id as any)}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '20px',
                            border: restaurantFilter === tab.id ? '2px solid #38bdf8' : '1px solid #334155',
                            background: restaurantFilter === tab.id ? '#0369a1' : '#1e293b',
                            color: '#f8fafc',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Toast Message */}
            {toastMessage && (
                <div style={{ padding: '12px 20px', background: '#10b981', color: '#fff', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
                    {toastMessage}
                </div>
            )}

            {/* Content Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* 1. RESTAURANT TABLES */}
                {(restaurantFilter === 'all' || restaurantFilter === 'tables') && (
                    <div style={{ background: '#132337', padding: '20px', borderRadius: '16px', border: '1px solid #1e3a5f' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #0284c7', paddingBottom: '8px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', color: '#38bdf8' }}>🍽️ Restaurant Dining Tables (1 to 20)</h2>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Dine-in guests, table seating, and food service</span>
                            </div>
                            <span style={{ background: '#0369a1', color: '#fff', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}>
                                20 Tables
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                            {RESTAURANT_TABLES.map(t => renderCard(t, false))}
                        </div>
                    </div>
                )}

                {/* 2. OPEN BAR */}
                {(restaurantFilter === 'all' || restaurantFilter === 'bar') && (
                    <div style={{ background: '#251733', padding: '20px', borderRadius: '16px', border: '1px solid #4a1d6d' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #a855f7', paddingBottom: '8px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', color: '#d8b4fe' }}>🍸 Open Bar & Cocktail Lounge</h2>
                                <span style={{ fontSize: '12px', color: '#c084fc' }}>Beverage service, drink tabs, and bar counter checkouts</span>
                            </div>
                            <span style={{ background: '#7e22ce', color: '#fff', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}>
                                4 Bar Counters
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                            {OPEN_BAR_COUNTERS.map(b => renderCard(b, true))}
                        </div>
                    </div>
                )}

                {/* 3. TAKEAWAY & ROOM SERVICE OUTBOX */}
                {(restaurantFilter === 'all' || restaurantFilter === 'takeaway') && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Takeaway */}
                        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
                            <h3 style={{ margin: '0 0 14px', color: '#fde047', fontSize: '17px' }}>🥡 Takeout & Pickup Counter</h3>
                            {takeawayOrders.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: '13px' }}>No active takeaway orders right now.</p>
                            ) : (
                                takeawayOrders.map(tOrd => (
                                    <div key={tOrd.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <strong style={{ color: '#38bdf8' }}>{tOrd.order_code}</strong>
                                            <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '11px' }}>{tOrd.status}</span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                                            {tOrd.items?.map(it => `${it.quantity}x ${it.item_name}`).join(', ')}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px solid #334155', paddingTop: '4px' }}>
                                            <span style={{ color: '#94a3b8' }}>Guest: {tOrd.customer?.name || 'Walk-in'}</span>
                                            <strong style={{ color: '#34d399' }}>₹{tOrd.total.toFixed(2)}</strong>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Room Service Outbox */}
                        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
                            <h3 style={{ margin: '0 0 14px', color: '#38bdf8', fontSize: '17px' }}>🛎️ Room Service Kitchen Outbox</h3>
                            {roomServiceOutbox.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: '13px' }}>No active room service orders in kitchen.</p>
                            ) : (
                                roomServiceOutbox.map(rOrd => (
                                    <div key={rOrd.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <strong style={{ color: '#6ee7b7' }}>🏨 {rOrd.room_number || 'Room Delivery'}</strong>
                                            <span style={{ background: '#8b5cf6', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '11px' }}>{rOrd.status}</span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                                            {rOrd.items?.map(it => `${it.quantity}x ${it.item_name}`).join(', ')}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px solid #334155', paddingTop: '4px' }}>
                                            <span style={{ color: '#94a3b8' }}>Ticket: {rOrd.order_code}</span>
                                            <strong style={{ color: '#34d399' }}>₹{rOrd.total.toFixed(2)}</strong>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* RESTAURANT SETTLEMENT MODAL */}
            {selectedLocation && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '16px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', color: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '16px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>
                                    🧾 Restaurant Bill for {selectedLocation}
                                </h2>
                                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                    {locationOrders.length} ticket(s) on this table/bar tab
                                </span>
                            </div>
                            <button onClick={() => setSelectedLocation(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {/* Order Tickets */}
                        <div style={{ marginBottom: '16px' }}>
                            {locationOrders.map((ord, idx) => (
                                <div key={ord.id} style={{ background: '#0f172a', padding: '10px 14px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <strong style={{ color: '#fde047', fontSize: '13px' }}>Round #{idx + 1} — {ord.order_code}</strong>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{ord.status.toUpperCase()}</span>
                                    </div>
                                    {ord.items?.map(it => (
                                        <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#cbd5e1' }}>
                                            <span>{it.quantity}x {it.item_name} {it.notes && <em style={{ color: '#fb7185' }}>({it.notes})</em>}</span>
                                            <span>₹{(it.price * it.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>
                                <span>Subtotal:</span>
                                <span>₹{consolidatedSubtotal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                                <span>GST Tax (5%):</span>
                                <span>₹{consolidatedTax.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: '#f8fafc', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                                <span>Grand Total:</span>
                                <span style={{ color: '#34d399' }}>₹{consolidatedTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {!generatedBill ? (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>SELECT PAYMENT METHOD</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                                    {[
                                        { id: 'cash', label: '💵 Cash' },
                                        { id: 'upi', label: '📱 UPI / QR' },
                                        { id: 'card', label: '💳 Card' },
                                        { id: 'room_charge', label: '🏨 Post to Room' },
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
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {pm.label}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={handleProcessSettlement}
                                    disabled={settling || locationOrders.length === 0}
                                    style={{ width: '100%', padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}
                                >
                                    {settling ? 'Settling Payment...' : `Complete Payment & Print Bill (₹${consolidatedTotal.toFixed(2)})`}
                                </button>
                            </div>
                        ) : (
                            <div style={{ background: '#064e3b', border: '1px solid #10b981', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
                                <h3 style={{ margin: '0 0 4px', color: '#6ee7b7' }}>Settlement Complete!</h3>
                                <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#a7f3d0' }}>Bill <strong>BILL-{generatedBill.id}</strong> issued. Table marked clean.</p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <a
                                        href={`${API_BASE}/api/billing/${generatedBill.id}/pdf`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', display: 'block' }}
                                    >
                                        📄 Download Receipt PDF
                                    </a>
                                    <button onClick={() => setSelectedLocation(null)} style={{ padding: '12px 20px', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Done</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RestaurantFrontDeskView;
