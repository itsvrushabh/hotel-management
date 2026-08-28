// hotel-management/frontend/src/pages/staff/FrontDeskView.tsx
// Front Desk Floor & Room Management with Distinct Zones: Tables, Open Bar, and Hotel Rooms

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

// 3. Hotel Guest Rooms
const HOTEL_ROOMS = [
    'Room 101',
    'Room 102',
    'Room 201',
    'Room 202',
    'Room 301',
    'Room 302',
    'Room 401',
    'Room 402',
];

const FrontDeskView: React.FC = () => {
    const navigate = useNavigate();

    const [viewMode, setViewMode] = useState<'floor' | 'history'>('floor');
    const [zoneFilter, setZoneFilter] = useState<'all' | 'tables' | 'bar' | 'rooms'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'occupied' | 'vacant' | 'settled'>('all');

    const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
    const [allBills, setAllBills] = useState<BillRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Selected Location for Consolidated Billing
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [selectedZoneType, setSelectedZoneType] = useState<'table' | 'bar' | 'room'>('table');
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
                if (Array.isArray(bData)) {
                    setAllBills(bData);
                }
            }
        } catch {
            // ignore network err
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

    // Open Billing Modal for Location (Table, Bar, or Room)
    const handleOpenBilling = (locationName: string, zoneType: 'table' | 'bar' | 'room') => {
        setSelectedLocation(locationName);
        setSelectedZoneType(zoneType);
        setGeneratedBill(null);

        // 1. Direct orders for this location
        const directOrders = allOrders.filter(
            o => (o.table_number === locationName || o.room_number === locationName) && o.status !== 'cancelled'
        );

        // 2. If guest has orders across both Room and Restaurant Table, unify under guest folio
        const custId = directOrders.find(o => o.customer_id)?.customer_id;
        const custPhone = directOrders.find(o => o.customer?.phone)?.customer?.phone;

        let unifiedOrders = directOrders;
        if (custId || custPhone) {
            const allGuestOrders = allOrders.filter(
                o => ((custId && o.customer_id === custId) || (custPhone && o.customer?.phone === custPhone)) && o.status !== 'cancelled'
            );
            if (allGuestOrders.length > directOrders.length) {
                unifiedOrders = allGuestOrders;
            }
        }

        setLocationOrders(unifiedOrders);
    };

    // Process Consolidated Settlement
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

                // Mark orders as served/completed
                await Promise.all(
                    locationOrders.map(o =>
                        fetch(`${API_BASE}/api/orders/${o.id}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'served' }),
                        })
                    )
                );

                showToast(`${selectedLocation} settled successfully! Master Bill #${billData.id} issued.`);
                loadData();
            }
        } catch {
            showToast('Settlement processing failed.');
        } finally {
            setSettling(false);
        }
    };

    // Service duration calculation
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
        return { text: `${minutes} mins in prep (Active)`, badge: '#3b82f6' };
    };

    // Location status resolver
    const getLocationSummary = (locName: string) => {
        const matchingOrders = allOrders.filter(
            o => (o.table_number === locName || o.room_number === locName) && o.status !== 'cancelled'
        );

        if (matchingOrders.length === 0) {
            return {
                status: 'vacant',
                statusLabel: '🟢 Available & Vacant',
                subLabel: 'Ready for guest',
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
                subLabel: 'Bill settled',
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
                statusLabel: '🔵 Ready for Service',
                subLabel: 'Food prepared',
                activeOrders: matchingOrders,
                totalBalance,
                customerName: customer?.name || null,
                phone: customer?.phone || null,
            };
        }

        if (allServed) {
            return {
                status: 'serving',
                statusLabel: '🟣 Active Dining / Served',
                subLabel: 'Dishes delivered',
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

    const filterList = (list: string[]) => {
        return list.filter(loc => {
            const summary = getLocationSummary(loc);
            if (statusFilter === 'all') return true;
            if (statusFilter === 'occupied') return summary.status !== 'vacant';
            if (statusFilter === 'vacant') return summary.status === 'vacant';
            if (statusFilter === 'settled') return summary.status === 'settled';
            return true;
        });
    };

    const displayTables = filterList(RESTAURANT_TABLES);
    const displayBars = filterList(OPEN_BAR_COUNTERS);
    const displayRooms = filterList(HOTEL_ROOMS);

    const consolidatedItems = locationOrders.flatMap(o => o.items || []);
    const consolidatedSubtotal = consolidatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const consolidatedTax = Math.round(consolidatedSubtotal * 0.05 * 100) / 100;
    const consolidatedTotal = Math.round((consolidatedSubtotal + consolidatedTax) * 100) / 100;

    const renderCard = (locName: string, zoneType: 'table' | 'bar' | 'room') => {
        const info = getLocationSummary(locName);

        let cardBorder = '#334155';
        let badgeBg = '#334155';
        let badgeColor = '#94a3b8';
        let icon = '🍽️';

        if (zoneType === 'bar') icon = '🍸';
        if (zoneType === 'room') icon = '🏨';

        if (info.status === 'vacant') {
            cardBorder = '#1e3a5f';
            badgeBg = '#064e3b';
            badgeColor = '#6ee7b7';
        } else if (info.status === 'preparing') {
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
                    boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                }}
            >
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '18px' }}>{icon}</span>
                            <h3 style={{ margin: 0, fontSize: '17px', color: '#f8fafc' }}>{locName}</h3>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: badgeBg, color: badgeColor }}>
                            {info.statusLabel}
                        </span>
                    </div>

                    <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#94a3b8' }}>
                        {info.subLabel}
                    </p>

                    {info.status !== 'vacant' && (
                        <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', border: '1px solid #334155' }}>
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
                            onClick={() => handleOpenBilling(locName, zoneType)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#0284c7',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                            }}
                        >
                            🧾 Settle {locName} Bill →
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate(zoneType === 'room' ? '/room' : '/waiter')}
                            style={{
                                width: '100%',
                                padding: '8px',
                                background: '#334155',
                                color: '#cbd5e1',
                                border: '1px solid #475569',
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            ➕ New {zoneType === 'room' ? 'Room Service' : zoneType === 'bar' ? 'Bar Order' : 'Table Ticket'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', background: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
            {/* Top Navigation Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#f8fafc' }}>🏢 Front Desk Operations & Floor Matrix</h1>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
                        Separated floor zones for Restaurant Tables, Open Bar Lounge, and Hotel Rooms
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/waiter')}
                        style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        🤵 Waiter View
                    </button>
                    <button
                        onClick={() => navigate('/staff')}
                        style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        👨‍🍳 Kitchen KDS
                    </button>
                    <button
                        onClick={() => navigate('/room')}
                        style={{ padding: '8px 16px', background: '#475569', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        🛎️ Room Service View
                    </button>
                </div>
            </div>

            {/* View Mode & Floor Zone Navigation Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                {/* View Mode Tabs */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setViewMode('floor')}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: viewMode === 'floor' ? '2px solid #38bdf8' : '1px solid #334155',
                            background: viewMode === 'floor' ? '#0369a1' : '#1e293b',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        🏢 Physical Floor Zones
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: viewMode === 'history' ? '2px solid #38bdf8' : '1px solid #334155',
                            background: viewMode === 'history' ? '#0369a1' : '#1e293b',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        ⏱️ Service Duration Log ({allOrders.length})
                    </button>
                </div>

                {/* Zone Filter Buttons */}
                {viewMode === 'floor' && (
                    <div style={{ display: 'flex', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
                        {[
                            { id: 'all', label: '🌐 All Floor Zones' },
                            { id: 'tables', label: `🍽️ Tables (${RESTAURANT_TABLES.length})` },
                            { id: 'bar', label: `🍸 Open Bar (${OPEN_BAR_COUNTERS.length})` },
                            { id: 'rooms', label: `🏨 Rooms (${HOTEL_ROOMS.length})` },
                        ].map(z => (
                            <button
                                key={z.id}
                                onClick={() => setZoneFilter(z.id as any)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: zoneFilter === z.id ? '#0284c7' : 'transparent',
                                    color: zoneFilter === z.id ? '#fff' : '#94a3b8',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                {z.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Toast Message */}
            {toastMessage && (
                <div style={{ padding: '12px 20px', background: '#10b981', color: '#fff', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
                    {toastMessage}
                </div>
            )}

            {/* TAB MODE 1: PHYSICAL FLOOR ZONES */}
            {viewMode === 'floor' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* ZONE 1: RESTAURANT DINING TABLES */}
                    {(zoneFilter === 'all' || zoneFilter === 'tables') && (
                        <div style={{ background: '#132337', padding: '20px', borderRadius: '16px', border: '1px solid #1e3a5f' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #0284c7', paddingBottom: '10px' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '19px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        🍽️ Restaurant Dining Floor (Tables 1 to 20)
                                    </h2>
                                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                        Table-side dining, waiter attendance, and instant food service
                                    </span>
                                </div>
                                <span style={{ background: '#0369a1', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                                    {displayTables.length} Tables Active
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                                {displayTables.map(tableName => renderCard(tableName, 'table'))}
                            </div>
                        </div>
                    )}

                    {/* ZONE 2: OPEN BAR & LOUNGE COUNTERS */}
                    {(zoneFilter === 'all' || zoneFilter === 'bar') && (
                        <div style={{ background: '#251733', padding: '20px', borderRadius: '16px', border: '1px solid #4a1d6d' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #a855f7', paddingBottom: '10px' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '19px', color: '#d8b4fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        🍸 Open Bar & Cocktail Lounge Area
                                    </h2>
                                    <span style={{ fontSize: '13px', color: '#c084fc' }}>
                                        Running drink tabs, beverage service, and quick bar counter settlements
                                    </span>
                                </div>
                                <span style={{ background: '#7e22ce', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                                    {displayBars.length} Bar Counters
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                                {displayBars.map(barName => renderCard(barName, 'bar'))}
                            </div>
                        </div>
                    )}

                    {/* ZONE 3: HOTEL GUEST ROOMS & ROOM SERVICE */}
                    {(zoneFilter === 'all' || zoneFilter === 'rooms') && (
                        <div style={{ background: '#132822', padding: '20px', borderRadius: '16px', border: '1px solid #164e3f' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #10b981', paddingBottom: '10px' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '19px', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        🏨 Hotel Guest Rooms & In-Room Dining
                                    </h2>
                                    <span style={{ fontSize: '13px', color: '#a7f3d0' }}>
                                        In-house guest suites, room service delivery tickets, and master room stay accounts
                                    </span>
                                </div>
                                <span style={{ background: '#047857', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                                    {displayRooms.length} Guest Rooms
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                                {displayRooms.map(roomName => renderCard(roomName, 'room'))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB MODE 2: SERVICE DURATION LOG */}
            {viewMode === 'history' && (
                <div style={{ background: '#1e293b', borderRadius: '14px', padding: '20px', border: '1px solid #334155' }}>
                    <div style={{ marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>⏱️ Order Service Velocity & Duration Log</h2>
                        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                            Calculates elapsed time from ticket creation to service across Tables, Open Bar, and Rooms
                        </p>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#0f172a', borderBottom: '1px solid #475569', color: '#94a3b8' }}>
                                    <th style={{ padding: '12px 14px' }}>Order ID</th>
                                    <th style={{ padding: '12px 14px' }}>Zone / Location</th>
                                    <th style={{ padding: '12px 14px' }}>Status</th>
                                    <th style={{ padding: '12px 14px' }}>Service Velocity</th>
                                    <th style={{ padding: '12px 14px' }}>Dishes in Ticket</th>
                                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allOrders.map(ord => {
                                    const velocity = computeServiceDuration(ord.created_at, ord.status);
                                    let statusColor = '#eab308';
                                    if (ord.status === 'preparing') statusColor = '#3b82f6';
                                    if (ord.status === 'ready') statusColor = '#10b981';
                                    if (ord.status === 'served') statusColor = '#8b5cf6';

                                    let locationLabel = ord.table_number || ord.room_number || 'Takeaway';
                                    let zoneBadge = '🍽️ Table';
                                    if (ord.room_number) zoneBadge = '🏨 Room';
                                    if (ord.table_number && ord.table_number.toLowerCase().includes('bar')) zoneBadge = '🍸 Bar';

                                    return (
                                        <tr key={ord.id} style={{ borderBottom: '1px solid #334155' }}>
                                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#38bdf8' }}>
                                                {ord.order_code}
                                            </td>
                                            <td style={{ padding: '12px 14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '10px', background: '#334155', color: '#cbd5e1', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                                        {zoneBadge}
                                                    </span>
                                                    <strong style={{ color: '#f8fafc' }}>{locationLabel}</strong>
                                                </div>
                                                {ord.customer?.name && (
                                                    <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                                        {ord.customer.name}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ background: statusColor, color: '#fff', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, textTransform: 'capitalize' }}>
                                                    {ord.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ color: velocity.badge, fontWeight: 700, fontSize: '13px' }}>
                                                    ⏱️ {velocity.text}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                                                {ord.items?.map(it => `${it.quantity}x ${it.item_name}`).join(', ') || 'Dishes'}
                                            </td>
                                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                                                ₹{ord.total.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONSOLIDATED BILLING MODAL */}
            {selectedLocation && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '16px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', color: '#f8fafc', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '16px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>
                                    🧾 Settlement for {selectedLocation}
                                </h2>
                                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                    {selectedZoneType === 'room' ? '🏨 Hotel Room Folio' : selectedZoneType === 'bar' ? '🍸 Open Bar Tab' : '🍽️ Restaurant Dining Bill'} • {locationOrders.length} ticket(s)
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedLocation(null)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Order Rounds Breakdown */}
                        <div style={{ marginBottom: '16px' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#38bdf8' }}>Order Tickets in this Folio:</h4>
                            {locationOrders.map((ord, idx) => (
                                <div key={ord.id} style={{ background: '#0f172a', padding: '10px 14px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <strong style={{ color: '#fde047', fontSize: '13px' }}>
                                            Ticket #{idx + 1} — {ord.order_code} {ord.room_number ? `(🛎️ ${ord.room_number})` : `(🍽️ ${ord.table_number})`}
                                        </strong>
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{ord.status.toUpperCase()}</span>
                                    </div>
                                    {ord.items?.map(it => (
                                        <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#cbd5e1', marginBottom: '2px' }}>
                                            <span>
                                                {it.quantity}x {it.item_name}
                                                {it.notes && <em style={{ color: '#fb7185', marginLeft: '6px' }}>({it.notes})</em>}
                                            </span>
                                            <span>₹{(it.price * it.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Combined Financial Calculation */}
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
                                <span>Grand Total Balance:</span>
                                <span style={{ color: '#34d399' }}>₹{consolidatedTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment Selection */}
                        {!generatedBill ? (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                                    SELECT SETTLEMENT PAYMENT METHOD
                                </label>
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
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        background: '#10b981',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {settling ? 'Settling Payment...' : `Complete Payment & Issue Invoice (₹${consolidatedTotal.toFixed(2)})`}
                                </button>
                            </div>
                        ) : (
                            <div style={{ background: '#064e3b', border: '1px solid #10b981', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
                                <h3 style={{ margin: '0 0 4px', color: '#6ee7b7' }}>Settlement Complete!</h3>
                                <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#a7f3d0' }}>
                                    Master Receipt <strong>BILL-{generatedBill.id}</strong> recorded. {selectedLocation} is ready for reset.
                                </p>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <a
                                        href={`${API_BASE}/api/billing/${generatedBill.id}/pdf`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: '#2563eb',
                                            color: '#fff',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            textDecoration: 'none',
                                            display: 'block',
                                        }}
                                    >
                                        📄 Download Master Tax PDF
                                    </a>
                                    <button
                                        onClick={() => setSelectedLocation(null)}
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
        </div>
    );
};

export default FrontDeskView;
