// hotel-management/frontend/src/pages/staff/WaiterView.tsx
// Dedicated Waiter Interface for table-side order taking & KOT dispatch
// Note: Payment and billing are handled exclusively at Front Desk

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
}

interface TicketItem {
    menu_item_id: number;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
}

const PRESET_CHIPS = ['No Onion', 'Extra Spicy', 'Less Salt', 'No Garlic', 'Less Oil', 'Well Done'];

const TABLES = Array.from({ length: 20 }, (_, i) => `Table ${i + 1}`).concat([
    'Bar Counter 1',
    'Bar Counter 2',
    'Room 101',
    'Room 102',
    'Room 201',
    'Room 202',
    'Takeaway',
]);

const WaiterView: React.FC = () => {
    const navigate = useNavigate();

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [ticketItems, setTicketItems] = useState<TicketItem[]>([]);

    // Table & Customer selection
    const [tableNumber, setTableNumber] = useState('Table 1');
    const [orderType, setOrderType] = useState('dine_in');
    const [phone, setPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [existingCustomerFound, setExistingCustomerFound] = useState(false);
    const [orderNotes, setOrderNotes] = useState('');

    // Submission states
    const [submitting, setSubmitting] = useState(false);
    const [lastSubmittedCode, setLastSubmittedCode] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_BASE}/api/menu-items`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setMenuItems(data);
            })
            .catch(() => {});
    }, []);

    // Live phone lookup for returning customers
    useEffect(() => {
        const cleanPhone = phone.trim();
        if (cleanPhone.length >= 10) {
            fetch(`${API_BASE}/api/customers/by-phone/${encodeURIComponent(cleanPhone)}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error('Not found');
                })
                .then(data => {
                    if (data && data.name) {
                        setCustomerName(data.name);
                        setExistingCustomerFound(true);
                    }
                })
                .catch(() => {
                    setExistingCustomerFound(false);
                });
        } else {
            setExistingCustomerFound(false);
        }
    }, [phone]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleAddItem = (item: MenuItem) => {
        setTicketItems(prev => {
            const idx = prev.findIndex(i => i.menu_item_id === item.id);
            if (idx > -1) {
                const copy = [...prev];
                copy[idx]!.quantity += 1;
                return copy;
            }
            return [
                ...prev,
                {
                    menu_item_id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                    notes: '',
                },
            ];
        });
    };

    const handleUpdateQty = (itemId: number, delta: number) => {
        setTicketItems(prev => {
            return prev
                .map(i => {
                    if (i.menu_item_id === itemId) {
                        const newQty = i.quantity + delta;
                        return newQty > 0 ? { ...i, quantity: newQty } : null;
                    }
                    return i;
                })
                .filter((i): i is TicketItem => i !== null);
        });
    };

    const handleAppendChipNote = (itemId: number, chip: string) => {
        setTicketItems(prev =>
            prev.map(i => {
                if (i.menu_item_id === itemId) {
                    const current = i.notes ? i.notes.trim() : '';
                    const updated = current ? `${current}, ${chip}` : chip;
                    return { ...i, notes: updated };
                }
                return i;
            })
        );
    };

    const subtotal = ticketItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

    const categories = ['All', ...Array.from(new Set(menuItems.map(m => m.category)))];
    const filteredItems = menuItems.filter(
        m => selectedCategory === 'All' || m.category === selectedCategory
    );

    const handleSubmitTicket = async () => {
        if (ticketItems.length === 0) return;
        setSubmitting(true);

        const payload = {
            customer_phone: phone.trim() ? phone.trim() : undefined,
            customer_name: customerName.trim() ? customerName.trim() : undefined,
            order_type: orderType,
            table_number: tableNumber,
            notes: orderNotes.trim() ? orderNotes.trim() : undefined,
            items: ticketItems.map(i => ({
                menu_item_id: i.menu_item_id,
                quantity: i.quantity,
                notes: i.notes ? i.notes : undefined,
            })),
        };

        try {
            const res = await fetch(`${API_BASE}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const data = await res.json();
                const ord = data.order || data;
                setLastSubmittedCode(ord.order_code);
                showToast(`Ticket ${ord.order_code} dispatched to Kitchen!`);
                setTicketItems([]);
                setOrderNotes('');
            }
        } catch {
            showToast('Failed to send order to kitchen.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
            {/* Left: Quick Dish Entry */}
            <div style={{ padding: '20px', overflowY: 'auto', borderRight: '2px solid #e2e8f0' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px', color: '#1e293b' }}>🤵 Waiter Table-Side POS</h1>
                        <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>Quick order taking & kitchen ticket dispatch</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => navigate('/frontdesk')}
                            style={{ padding: '6px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            🏢 Front Desk Map
                        </button>
                        <button
                            onClick={() => navigate('/staff')}
                            style={{ padding: '6px 14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            👨‍🍳 Kitchen KDS
                        </button>
                    </div>
                </div>

                {/* Toast message */}
                {toastMessage && (
                    <div style={{ padding: '10px 16px', background: '#10b981', color: '#fff', borderRadius: '8px', marginBottom: '16px', fontWeight: 600, fontSize: '14px' }}>
                        ✓ {toastMessage}
                    </div>
                )}

                {/* Categories */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {categories.map(c => (
                        <button
                            key={c}
                            onClick={() => setSelectedCategory(c)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: selectedCategory === c ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                background: selectedCategory === c ? '#2563eb' : '#fff',
                                color: selectedCategory === c ? '#fff' : '#334155',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                {/* Dishes Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                    {filteredItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => handleAddItem(item)}
                            style={{
                                background: '#fff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '10px',
                                padding: '14px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'all 0.1s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                            }}
                        >
                            <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1e293b' }}>{item.name}</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, color: '#059669', fontSize: '15px' }}>₹{item.price}</span>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>⏱️ {item.prep_time}m</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Active Ticket Summary */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fff', overflowY: 'auto' }}>
                <div>
                    <h2 style={{ margin: '0 0 14px', fontSize: '18px', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                        Active Table Ticket
                    </h2>

                    {/* Table Selection */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>TABLE / LOCATION</label>
                            <select
                                value={tableNumber}
                                onChange={e => setTableNumber(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '14px' }}
                            >
                                {TABLES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>DINING MODE</label>
                            <select
                                value={orderType}
                                onChange={e => setOrderType(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                            >
                                <option value="dine_in">Dine-in</option>
                                <option value="room_service">Room Service</option>
                                <option value="takeaway">Takeaway</option>
                            </select>
                        </div>
                    </div>

                    {/* Customer Lookup */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>CUSTOMER PHONE (OPTIONAL)</label>
                        <input
                            type="tel"
                            placeholder="Enter phone to recognize customer"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                        {existingCustomerFound && (
                            <span style={{ fontSize: '12px', color: '#059669', display: 'block', marginTop: '4px', fontWeight: 600 }}>
                                ✨ Customer Recognized: {customerName}
                            </span>
                        )}
                    </div>

                    {/* Ticket Items List */}
                    <div style={{ maxHeight: '280px', overflowY: 'auto', margin: '14px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 0' }}>
                        {ticketItems.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                                <div style={{ fontSize: '28px', marginBottom: '4px' }}>📝</div>
                                <p style={{ margin: 0, fontSize: '13px' }}>Tap menu dishes on the left to add to {tableNumber}</p>
                            </div>
                        )}

                        {ticketItems.map(item => (
                            <div key={item.menu_item_id} style={{ marginBottom: '10px', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{item.name}</strong>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>₹{item.price * item.quantity}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            onClick={() => handleUpdateQty(item.menu_item_id, -1)}
                                            style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            -
                                        </button>
                                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{item.quantity}</span>
                                        <button
                                            onClick={() => handleUpdateQty(item.menu_item_id, 1)}
                                            style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Instruction..."
                                        value={item.notes || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setTicketItems(prev => prev.map(i => i.menu_item_id === item.menu_item_id ? { ...i, notes: val } : i));
                                        }}
                                        style={{ width: '140px', padding: '3px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>

                                {/* Preset chips */}
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                                    {PRESET_CHIPS.map(chip => (
                                        <button
                                            key={chip}
                                            onClick={() => handleAppendChipNote(item.menu_item_id, chip)}
                                            style={{ fontSize: '10px', padding: '2px 6px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            +{chip}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <input
                            type="text"
                            placeholder="General kitchen instruction / allergy note..."
                            value={orderNotes}
                            onChange={e => setOrderNotes(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        />
                    </div>
                </div>

                {/* Footer Action */}
                <div>
                    <div style={{ fontSize: '14px', color: '#1e293b', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>Estimated Ticket Total:</span>
                        <span style={{ color: '#059669', fontSize: '16px' }}>₹{subtotal.toFixed(2)}</span>
                    </div>

                    <button
                        onClick={handleSubmitTicket}
                        disabled={submitting || ticketItems.length === 0}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: ticketItems.length > 0 ? '#2563eb' : '#cbd5e1',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '15px',
                            cursor: ticketItems.length > 0 ? 'pointer' : 'not-allowed',
                            boxShadow: ticketItems.length > 0 ? '0 4px 10px rgba(37,99,235,0.3)' : 'none',
                            marginBottom: '10px',
                        }}
                    >
                        {submitting ? 'Sending to Kitchen...' : `🚀 Send ${tableNumber} Ticket to Kitchen`}
                    </button>

                    <div style={{ textAlign: 'center', padding: '8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', color: '#64748b' }}>
                        🔒 <strong>Cash & Payment Policy:</strong> Waiters do not handle cash/payments. Billing & settlements occur exclusively at <strong>Front Desk</strong>.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WaiterView;
