// hotel-management/frontend/src/pages/staff/FrontDeskView.tsx
// Front Desk Floor & Table Management with Consolidated Billing & Settlement

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

const ALL_TABLE_IDS = [
    'Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5',
    'Table 6', 'Table 7', 'Table 8', 'Table 9', 'Table 10',
    'Table 11', 'Table 12', 'Table 13', 'Table 14', 'Table 15',
    'Table 16', 'Table 17', 'Table 18', 'Table 19', 'Table 20',
    'Bar Counter 1', 'Bar Counter 2', 'Room 101', 'Room 201', 'Room 302',
];

const FrontDeskView: React.FC = () => {
    const navigate = useNavigate();

    const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
    const [allBills, setAllBills] = useState<BillRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTab, setFilterTab] = useState<'all' | 'occupied' | 'vacant' | 'settled'>('all');

    // Selected Table for Consolidated Billing
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tableOrders, setTableOrders] = useState<OrderRecord[]>([]);
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
                    // Enrich recent orders with full items
                    const enriched = await Promise.all(
                        ordData.slice(0, 40).map(async (ord: OrderRecord) => {
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

    // Open Billing Modal for Table (with unified Room & Restaurant Guest Folio)
    const handleOpenTableBilling = (tableName: string) => {
        setSelectedTable(tableName);
        setGeneratedBill(null);

        // 1. Direct orders for this table/room
        const directOrders = allOrders.filter(
            o => (o.table_number === tableName || o.room_number === tableName) && o.status !== 'cancelled'
        );

        // 2. Lookup if this in-house guest has orders across both Room Service and Restaurant
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

        setTableOrders(unifiedOrders);
    };

    // Process Consolidated Settlement
    const handleProcessSettlement = async () => {
        if (tableOrders.length === 0) return;
        setSettling(true);

        try {
            // Find primary order or most recent order to bill
            const targetOrder = tableOrders[0];
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

                // Mark all table orders as served/completed
                await Promise.all(
                    tableOrders.map(o =>
                        fetch(`${API_BASE}/api/orders/${o.id}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'served' }),
                        })
                    )
                );

                showToast(`Table ${selectedTable} settled successfully! Bill #${billData.id} generated.`);
                loadData();
            }
        } catch {
            showToast('Settlement processing failed.');
        } finally {
            setSettling(false);
        }
    };

    // Table status resolver
    const getTableSummary = (tableName: string) => {
        const matchingOrders = allOrders.filter(
            o => (o.table_number === tableName || o.room_number === tableName) && o.status !== 'cancelled'
        );

        if (matchingOrders.length === 0) {
            return {
                status: 'vacant',
                statusLabel: '🟢 Vacant & Clean',
                subLabel: 'Ready for next guest',
                activeOrders: [],
                totalBalance: 0,
                customerName: null,
                phone: null,
                isServing: false,
                isPreparing: false,
                isFinished: false,
            };
        }

        // Check if any order is active vs served
        const hasPreparing = matchingOrders.some(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing');
        const hasReady = matchingOrders.some(o => o.status === 'ready');
        const allServed = matchingOrders.every(o => o.status === 'served');

        // Check if billed
        const billedOrderIds = new Set(allBills.map(b => b.order_id));
        const allBilled = matchingOrders.every(o => billedOrderIds.has(o.id));

        const totalBalance = matchingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const customer = matchingOrders.find(o => o.customer)?.customer;

        if (allBilled) {
            return {
                status: 'settled',
                statusLabel: '⚪ Paid / Turnover',
                subLabel: 'Ready for table reset',
                activeOrders: matchingOrders,
                totalBalance,
                customerName: customer?.name || null,
                phone: customer?.phone || null,
                isServing: false,
                isPreparing: false,
                isFinished: true,
            };
        }

        if (hasPreparing) {
            return {
                status: 'preparing',
                statusLabel: '🟡 Occupied — In Kitchen',
                subLabel: 'Chef cooking dishes',
                activeOrders: matchingOrders,
                totalBalance,
                customerName: customer?.name || null,
                phone: customer?.phone || null,
                isServing: false,
                isPreparing: true,
                isFinished: false,
            };
        }

        if (hasReady) {
            return {
                status: 'ready',
                statusLabel: '🔵 Food Ready for Table',
                subLabel: 'Waiter pickup required',
                activeOrders: matchingOrders,
                totalBalance,
                customerName: customer?.name || null,
                phone: customer?.phone || null,
                isServing: true,
                isPreparing: false,
                isFinished: false,
            };
        }

        if (allServed) {
            return {
                status: 'serving',
                statusLabel: '🟣 Dining — Food Served',
                subLabel: 'Guests eating / Finished',
                activeOrders: matchingOrders,
                totalBalance,
                customerName: customer?.name || null,
                phone: customer?.phone || null,
                isServing: true,
                isPreparing: false,
                isFinished: true,
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
            isServing: true,
            isPreparing: false,
            isFinished: false,
        };
    };

    const filteredTables = ALL_TABLE_IDS.filter(t => {
        const summary = getTableSummary(t);
        if (filterTab === 'all') return true;
        if (filterTab === 'occupied') return summary.status !== 'vacant';
        if (filterTab === 'vacant') return summary.status === 'vacant';
        if (filterTab === 'settled') return summary.status === 'settled';
        return true;
    });

    // Compute consolidated line items for modal
    const consolidatedItems = tableOrders.flatMap(o => o.items || []);
    const consolidatedSubtotal = consolidatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const consolidatedTax = Math.round(consolidatedSubtotal * 0.05 * 100) / 100;
    const consolidatedTotal = Math.round((consolidatedSubtotal + consolidatedTax) * 100) / 100;

    return (
        <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', background: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#f8fafc' }}>🏢 Front Desk & Floor Management</h1>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
                        Real-time table occupancy, dining status matrix, and consolidated billing
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={loadData}
                        style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        🔄 Refresh Floor
                    </button>
                    <button
                        onClick={() => navigate('/waiter')}
                        style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        🤵 Waiter POS
                    </button>
                    <button
                        onClick={() => navigate('/staff')}
                        style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        👨‍🍳 Kitchen KDS
                    </button>
                </div>
            </div>

            {/* Toast Message */}
            {toastMessage && (
                <div style={{ padding: '12px 20px', background: '#10b981', color: '#fff', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
                    {toastMessage}
                </div>
            )}

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {[
                    { id: 'all', label: `All Locations (${ALL_TABLE_IDS.length})` },
                    { id: 'occupied', label: `Occupied / Dining` },
                    { id: 'vacant', label: `Vacant & Available` },
                    { id: 'settled', label: `Settled / Needs Reset` },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterTab(tab.id as any)}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '20px',
                            border: filterTab === tab.id ? '2px solid #38bdf8' : '1px solid #334155',
                            background: filterTab === tab.id ? '#0369a1' : '#1e293b',
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

            {loading && allOrders.length === 0 && <p style={{ color: '#94a3b8' }}>Loading floor status...</p>}

            {/* Visual Floor Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {filteredTables.map(tableName => {
                    const info = getTableSummary(tableName);

                    let cardBorder = '#334155';
                    let badgeBg = '#334155';
                    let badgeColor = '#94a3b8';

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
                            key={tableName}
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>{tableName}</h3>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: badgeBg, color: badgeColor }}>
                                        {info.statusLabel}
                                    </span>
                                </div>

                                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#94a3b8' }}>
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
                                            <span style={{ color: '#94a3b8' }}>Total Rounds: {info.activeOrders.length}</span>
                                            <strong style={{ color: '#34d399', fontSize: '14px' }}>₹{info.totalBalance.toFixed(2)}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                {info.status !== 'vacant' ? (
                                    <button
                                        onClick={() => handleOpenTableBilling(tableName)}
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
                                        🧾 View Orders & Generate Bill →
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/waiter')}
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
                                        ➕ Take Table Order (Waiter)
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* CONSOLIDATED BILLING MODAL */}
            {selectedTable && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '16px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', color: '#f8fafc', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '16px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>
                                    🧾 Consolidated Bill for {selectedTable}
                                </h2>
                                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                    Aggregated across all {tableOrders.length} order ticket(s) placed by this customer
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedTable(null)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Order Rounds Breakdown */}
                        <div style={{ marginBottom: '16px' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#38bdf8' }}>Order Rounds & Tickets:</h4>
                            {tableOrders.map((ord, idx) => (
                                <div key={ord.id} style={{ background: '#0f172a', padding: '10px 14px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <strong style={{ color: '#fde047', fontSize: '13px' }}>Round #{idx + 1} — {ord.order_code}</strong>
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

                        {/* Payment Selection or Completed Bill Actions */}
                        {!generatedBill ? (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                                    PAYMENT METHOD COLLECTED AT DESK
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                                    {[
                                        { id: 'cash', label: '💵 Cash' },
                                        { id: 'upi', label: '📱 UPI / QR' },
                                        { id: 'card', label: '💳 Card' },
                                        { id: 'room_charge', label: '🏨 Room Charge' },
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
                                    disabled={settling || tableOrders.length === 0}
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
                                    Receipt <strong>BILL-{generatedBill.id}</strong> recorded. Table is now marked clean for next guest.
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
                                        📄 Print / Download Master Tax PDF
                                    </a>
                                    <button
                                        onClick={() => setSelectedTable(null)}
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
