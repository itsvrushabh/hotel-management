// hotel-frontend/src/pages/HotelFrontDesk.tsx
// Dedicated Hotel Front Desk for Rooms, In-House Guests, Room Service Deliveries & Folio Checkout

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

const HOTEL_ROOMS = [
    { room: 'Room 101', floor: '1st Floor - Deluxe Suite', capacity: 2 },
    { room: 'Room 102', floor: '1st Floor - Deluxe Suite', capacity: 2 },
    { room: 'Room 201', floor: '2nd Floor - Premium Suite', capacity: 3 },
    { room: 'Room 202', floor: '2nd Floor - Premium Suite', capacity: 3 },
    { room: 'Room 301', floor: '3rd Floor - Executive Suite', capacity: 4 },
    { room: 'Room 302', floor: '3rd Floor - Executive Suite', capacity: 4 },
    { room: 'Room 401', floor: '4th Floor - Presidential Suite', capacity: 4 },
    { room: 'Room 402', floor: '4th Floor - Presidential Suite', capacity: 4 },
];
const HotelFrontDesk: React.FC = () => {
    const navigate = useNavigate();

    const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
    const [allBills, setAllBills] = useState<BillRecord[]>([]);
    const [serviceRequests, setServiceRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [roomFilter, setRoomFilter] = useState<'all' | 'occupied' | 'vacant' | 'service_active'>('all');

    // Selected Room for Folio Settlement
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [roomOrders, setRoomOrders] = useState<OrderRecord[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'room_charge'>('upi');
    const [settling, setSettling] = useState(false);
    const [generatedBill, setGeneratedBill] = useState<{ id: number; total: number } | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Create Service Request Modal State
    const [showCreateServiceModal, setShowCreateServiceModal] = useState(false);
    const [createServiceRoom, setCreateServiceRoom] = useState('Room 302');
    const [createServiceType, setCreateServiceType] = useState('amenities');
    const [createServiceDesc, setCreateServiceDesc] = useState('');

    const loadData = async () => {
        try {
            const [ordersRes, billsRes, serviceRes] = await Promise.all([
                fetch(`${API_BASE}/api/orders`),
                fetch(`${API_BASE}/api/billing`),
                fetch(`${API_BASE}/api/service-requests`),
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

            if (serviceRes.ok) {
                const sData = await serviceRes.json();
                if (Array.isArray(sData)) setServiceRequests(sData);
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

    // Open Room Folio & Checkout Modal
    const handleOpenRoomFolio = (roomNumber: string) => {
        setSelectedRoom(roomNumber);
        setGeneratedBill(null);

        // Find all room service orders for this room or guest
        const ordersForRoom = allOrders.filter(
            o => o.room_number === roomNumber && o.status !== 'cancelled'
        );
        setRoomOrders(ordersForRoom);
    };

    // Settle Room Folio
    const handleSettleFolio = async () => {
        if (roomOrders.length === 0) return;
        setSettling(true);

        try {
            const targetOrder = roomOrders[0];
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

                // Mark orders as served/settled
                await Promise.all(
                    roomOrders.map(o =>
                        fetch(`${API_BASE}/api/orders/${o.id}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'served' }),
                        })
                    )
                );

                showToast(`Room ${selectedRoom} folio settled! Bill #${billData.id} issued.`);
                loadData();
            }
        } catch {
            showToast('Folio settlement failed.');
        } finally {
            setSettling(false);
        }
    };

    // Create Service Request from Front Desk
    const handleCreateServiceRequest = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/service-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_number: createServiceRoom,
                    service_type: createServiceType,
                    description: createServiceDesc,
                    requested_by: 'frontdesk',
                }),
            });
            if (res.ok) {
                showToast(`Service request created for ${createServiceRoom}`);
                setShowCreateServiceModal(false);
                setCreateServiceDesc('');
                loadData();
            }
        } catch {
            showToast('Failed to create service request');
        }
    };

    const getRoomSummary = (roomName: string) => {
        const matchingOrders = allOrders.filter(
            o => o.room_number === roomName && o.status !== 'cancelled'
        );

        if (matchingOrders.length === 0) {
            return {
                status: 'vacant',
                statusLabel: '🟢 Ready for Check-in',
                subLabel: 'Room clean & vacant',
                guestName: null,
                phone: null,
                orders: [],
                totalBalance: 0,
                hasActiveDelivery: false,
            };
        }

        const hasActive = matchingOrders.some(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing' || o.status === 'ready');
        const billedOrderIds = new Set(allBills.map(b => b.order_id));
        const allBilled = matchingOrders.every(o => billedOrderIds.has(o.id));
        const totalBalance = matchingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const customer = matchingOrders.find(o => o.customer)?.customer;

        if (allBilled) {
            return {
                status: 'settled',
                statusLabel: '⚪ Checked Out / Settled',
                subLabel: 'Folio paid in full',
                guestName: customer?.name || 'In-House Guest',
                phone: customer?.phone || null,
                orders: matchingOrders,
                totalBalance,
                hasActiveDelivery: false,
            };
        }

        if (hasActive) {
            return {
                status: 'service_active',
                statusLabel: '🛎️ Room Service in Prep',
                subLabel: 'Kitchen delivering meal',
                guestName: customer?.name || 'In-House Guest',
                phone: customer?.phone || null,
                orders: matchingOrders,
                totalBalance,
                hasActiveDelivery: true,
            };
        }

        return {
            status: 'occupied',
            statusLabel: '🟣 Guest Checked In',
            subLabel: `${matchingOrders.length} Room Service Folio(s)`,
            guestName: customer?.name || 'In-House Guest',
            phone: customer?.phone || null,
            orders: matchingOrders,
            totalBalance,
            hasActiveDelivery: false,
        };
    };

    const filteredRooms = HOTEL_ROOMS.filter(r => {
        const summary = getRoomSummary(r.room);
        if (roomFilter === 'all') return true;
        if (roomFilter === 'occupied') return summary.status === 'occupied' || summary.status === 'service_active';
        if (roomFilter === 'vacant') return summary.status === 'vacant';
        if (roomFilter === 'service_active') return summary.hasActiveDelivery;
        return true;
    });

    const consolidatedItems = roomOrders.flatMap(o => o.items || []);
    const consolidatedSubtotal = consolidatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const consolidatedTax = Math.round(consolidatedSubtotal * 0.05 * 100) / 100;
    const consolidatedTotal = Math.round((consolidatedSubtotal + consolidatedTax) * 100) / 100;

    return (
        <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', background: '#0b192c', minHeight: '100vh', color: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e3a5f', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏨 Hotel Front Desk & Room Management
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
                        In-house room occupancy, 24/7 room service dispatch, and guest folio settlement
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/staff')}
                        style={{ padding: '8px 16px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        👨‍💼 Staff Dashboard
                    </button>
                    <a
                        href="http://localhost:3000/frontdesk"
                        style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center' }}
                    >
                        🍽️ Restaurant Front Desk →
                    </a>
                    <button
                        onClick={() => navigate('/')}
                        style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        🛎️ Guest Room Portal
                    </button>
                </div>
            </div>

            <div style={{ background: '#132337', border: '1px solid #3b82f6', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>ℹ️</span>
                    <div>
                        <strong style={{ color: '#93c5fd', fontSize: '14px' }}>Hotel Division Policy:</strong>
                        <span style={{ color: '#cbd5e1', fontSize: '13px', marginLeft: '6px' }}>
                            Hotel Front Desk manages guest rooms, check-in, laundry, and in-room meal deliveries. If in-house guests wish to physically dine-in, they can be directed to the Restaurant Floor.
                        </span>
                    </div>
                </div>
                <a
                    href="http://localhost:3000"
                    style={{ padding: '6px 12px', background: '#0369a1', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                >
                    View Restaurant Floor
                </a>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {[
                    { id: 'all', label: `All Hotel Rooms (${HOTEL_ROOMS.length})` },
                    { id: 'occupied', label: `Checked In / Occupied` },
                    { id: 'service_active', label: `🛎️ Active Room Service Prep` },
                    { id: 'vacant', label: `Vacant / Ready for Check-in` },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setRoomFilter(tab.id as any)}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '20px',
                            border: roomFilter === tab.id ? '2px solid #60a5fa' : '1px solid #1e3a5f',
                            background: roomFilter === tab.id ? '#1d4ed8' : '#132337',
                            color: '#fff',
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Service Requests Summary */}
            {serviceRequests.length > 0 && (
                <div style={{ background: '#132337', border: '1px solid #f59e0b', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '24px' }}>📋</span>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#fcd34d' }}>
                                Pending Service Requests ({serviceRequests.filter(r => r.status === 'pending').length})
                            </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setShowCreateServiceModal(true)}
                                style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                + Create Request
                            </button>
                            <button
                                onClick={() => navigate('/staff')}
                                style={{ padding: '6px 12px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                View Staff Dashboard →
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                        {serviceRequests.slice(0, 4).map(req => (
                            <div key={req.id} style={{ background: '#0b192c', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <strong style={{ color: '#fcd34d', fontSize: '13px' }}>
                                        {req.service_type.charAt(0).toUpperCase() + req.service_type.slice(1)}
                                    </strong>
                                    <span style={{ background: req.status === 'pending' ? '#f59e0b' : '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700 }}>
                                        {req.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '2px' }}>
                                    {req.room_number} • {req.description || 'No description'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Hotel Rooms Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
                {filteredRooms.map(r => {
                    const info = getRoomSummary(r.room);

                    let cardBorder = '#1e3a5f';
                    let badgeBg = '#064e3b';
                    let badgeColor = '#6ee7b7';

                    if (info.status === 'service_active') {
                        cardBorder = '#854d0e';
                        badgeBg = '#713f12';
                        badgeColor = '#fde047';
                    } else if (info.status === 'occupied') {
                        cardBorder = '#4338ca';
                        badgeBg = '#312e81';
                        badgeColor = '#c7d2fe';
                    } else if (info.status === 'settled') {
                        cardBorder = '#475569';
                        badgeBg = '#334155';
                        badgeColor = '#cbd5e1';
                    }

                    return (
                        <div
                            key={r.room}
                            style={{
                                background: '#132337',
                                border: `2px solid ${cardBorder}`,
                                borderRadius: '14px',
                                padding: '18px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>🏨 {r.room}</h3>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{r.floor}</span>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: badgeBg, color: badgeColor }}>
                                        {info.statusLabel}
                                    </span>
                                </div>

                                <p style={{ margin: '6px 0 12px', fontSize: '12px', color: '#94a3b8' }}>
                                    {info.subLabel}
                                </p>

                                {info.status !== 'vacant' && (
                                    <div style={{ background: '#0b192c', padding: '12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #1e3a5f', fontSize: '12px' }}>
                                        {info.guestName && (
                                            <div style={{ color: '#e2e8f0', marginBottom: '2px' }}>
                                                👤 Guest: <strong>{info.guestName}</strong>
                                            </div>
                                        )}
                                        {info.phone && (
                                            <div style={{ color: '#94a3b8', marginBottom: '4px' }}>
                                                📞 Phone: {info.phone}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px solid #1e3a5f', paddingTop: '6px' }}>
                                            <span style={{ color: '#94a3b8' }}>Room Service Folios: {info.orders.length}</span>
                                            <strong style={{ color: '#34d399', fontSize: '14px' }}>₹{info.totalBalance.toFixed(2)}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                {info.status !== 'vacant' ? (
                                    <button
                                        onClick={() => handleOpenRoomFolio(r.room)}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: '#2563eb',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        🧾 Settle Room Folio & Checkout →
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/')}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            background: '#0b192c',
                                            color: '#93c5fd',
                                            border: '1px solid #3b82f6',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        🛎️ In-Room Services Portal
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ROOM FOLIO SETTLEMENT MODAL */}
            {selectedRoom && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#132337', border: '1px solid #1e3a5f', borderRadius: '16px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', color: '#f8fafc', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e3a5f', paddingBottom: '14px', marginBottom: '16px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', color: '#60a5fa' }}>
                                    🏨 In-Room Folio & Checkout: {selectedRoom}
                                </h2>
                                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                    Consolidated room service meals and in-room dining tickets ({roomOrders.length} ticket(s))
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedRoom(null)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Order Tickets */}
                        <div style={{ marginBottom: '16px' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#93c5fd' }}>In-Room Meal Deliveries:</h4>
                            {roomOrders.map((ord, idx) => (
                                <div key={ord.id} style={{ background: '#0b192c', padding: '10px 14px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #1e3a5f' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <strong style={{ color: '#fde047', fontSize: '13px' }}>Meal #{idx + 1} — {ord.order_code}</strong>
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

                        {/* Folio Total */}
                        <div style={{ background: '#0b192c', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #1e3a5f' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>
                                <span>Meal Subtotal:</span>
                                <span>₹{consolidatedSubtotal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                                <span>GST (5%):</span>
                                <span>₹{consolidatedTax.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: '#f8fafc', borderTop: '1px solid #1e3a5f', paddingTop: '8px' }}>
                                <span>Total Folio Amount:</span>
                                <span style={{ color: '#34d399' }}>₹{consolidatedTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment / Receipt */}
                        {!generatedBill ? (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                                    PAYMENT METHOD COLLECTED AT HOTEL DESK
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                                    {[
                                        { id: 'upi', label: '📱 UPI / QR' },
                                        { id: 'card', label: '💳 Credit/Debit Card' },
                                        { id: 'cash', label: '💵 Cash' },
                                    ].map(pm => (
                                        <button
                                            key={pm.id}
                                            onClick={() => setPaymentMethod(pm.id as any)}
                                            style={{
                                                padding: '10px 6px',
                                                borderRadius: '6px',
                                                border: paymentMethod === pm.id ? '2px solid #60a5fa' : '1px solid #1e3a5f',
                                                background: paymentMethod === pm.id ? '#1d4ed8' : '#0b192c',
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
                                    onClick={handleSettleFolio}
                                    disabled={settling || roomOrders.length === 0}
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
                                    {settling ? 'Settling Folio...' : `Complete Checkout & Print Bill (₹${consolidatedTotal.toFixed(2)})`}
                                </button>
                            </div>
                        ) : (
                            <div style={{ background: '#064e3b', border: '1px solid #10b981', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
                                <h3 style={{ margin: '0 0 4px', color: '#6ee7b7' }}>Room Folio Settled!</h3>
                                <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#a7f3d0' }}>
                                    Invoice <strong>BILL-{generatedBill.id}</strong> recorded. Room is now ready for cleaning / turnover.
                                </p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <a
                                        href={`${API_BASE}/api/billing/${generatedBill.id}/pdf`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', display: 'block' }}
                                    >
                                        📄 Download Room Invoice PDF
                                    </a>
                                    <button
                                        onClick={() => setSelectedRoom(null)}
                                        style={{ padding: '12px 20px', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Service Request Modal */}
            {showCreateServiceModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px', color: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#fcd34d' }}>Create Service Request</h2>
                            <button onClick={() => setShowCreateServiceModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '6px' }}>ROOM NUMBER</label>
                            <select
                                value={createServiceRoom}
                                onChange={e => setCreateServiceRoom(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: '13px' }}
                            >
                                {HOTEL_ROOMS.map(r => (
                                    <option key={r.room} value={r.room}>{r.room}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '6px' }}>SERVICE TYPE</label>
                            <select
                                value={createServiceType}
                                onChange={e => setCreateServiceType(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: '13px' }}
                            >
                                <option value="amenities">🧻 Housekeeping & Amenities</option>
                                <option value="laundry">🧺 Laundry Service</option>
                                <option value="maintenance">🔧 Room Maintenance</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '6px' }}>DESCRIPTION</label>
                            <textarea
                                rows={3}
                                placeholder="Describe the service request..."
                                value={createServiceDesc}
                                onChange={e => setCreateServiceDesc(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: '12px', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleCreateServiceRequest}
                                style={{ flex: 1, padding: '12px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Create Request
                            </button>
                            <button
                                onClick={() => setShowCreateServiceModal(false)}
                                style={{ padding: '12px 20px', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HotelFrontDesk;
