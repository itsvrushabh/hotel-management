// hotel-management/frontend/src/pages/staff/WaiterPOS.tsx
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

interface PosOrderItem {
    menu_item_id: number;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
}

const PRESET_CHIPS = ['No Onion', 'Extra Spicy', 'Less Salt', 'No Garlic', 'Less Oil', 'Well Done'];

const WaiterPOS: React.FC = () => {
    const navigate = useNavigate();

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [cartItems, setCartItems] = useState<PosOrderItem[]>([]);

    // Customer & Table
    const [phone, setPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [existingCustomerFound, setExistingCustomerFound] = useState(false);
    const [tableNumber, setTableNumber] = useState('Table 1');
    const [orderType, setOrderType] = useState('dine_in');
    const [orderNotes, setOrderNotes] = useState('');

    // Submission & Bill
    const [submitting, setSubmitting] = useState(false);
    const [placedOrder, setPlacedOrder] = useState<{ id: number; order_code: string; total: number } | null>(null);
    const [generatedBill, setGeneratedBill] = useState<{ id: number; total: number } | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    useEffect(() => {
        fetch(`${API_BASE}/api/menu-items`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setMenuItems(data);
            })
            .catch(() => {});
    }, []);

    // Live phone lookup debounce
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

    const handleAddItem = (item: MenuItem) => {
        setCartItems(prev => {
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
        setCartItems(prev => {
            return prev
                .map(i => {
                    if (i.menu_item_id === itemId) {
                        const newQty = i.quantity + delta;
                        return newQty > 0 ? { ...i, quantity: newQty } : null;
                    }
                    return i;
                })
                .filter((i): i is PosOrderItem => i !== null);
        });
    };

    const handleAppendChipNote = (itemId: number, chip: string) => {
        setCartItems(prev =>
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

    const subtotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const categories = ['All', ...Array.from(new Set(menuItems.map(m => m.category)))];
    const filteredItems = menuItems.filter(
        m => selectedCategory === 'All' || m.category === selectedCategory
    );

    const handleSubmitOrder = async () => {
        if (cartItems.length === 0) return;
        setSubmitting(true);

        const payload = {
            customer_phone: phone.trim() ? phone.trim() : undefined,
            customer_name: customerName.trim() ? customerName.trim() : undefined,
            order_type: orderType,
            table_number: tableNumber,
            notes: orderNotes.trim() ? orderNotes.trim() : undefined,
            items: cartItems.map(i => ({
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
                setPlacedOrder(data.order || data);
                setCartItems([]);
            }
        } catch {
            // failed
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateBill = async () => {
        if (!placedOrder) return;
        try {
            const res = await fetch(`${API_BASE}/api/billing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: placedOrder.id,
                    payment_method: paymentMethod,
                }),
            });
            if (res.ok) {
                const billData = await res.json();
                setGeneratedBill(billData);
            }
        } catch {
            // failed
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            {/* Left: Quick Menu Selection */}
            <div style={{ padding: '20px', overflowY: 'auto', background: '#f8fafc', borderRight: '2px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px', color: '#1e293b' }}>🛎️ Waiter & Front Desk POS</h1>
                        <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>Fast table-side order entry mode</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => navigate('/staff')}
                            style={{ padding: '6px 12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                        >
                            Kitchen KDS
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                        >
                            Menu
                        </button>
                    </div>
                </div>

                {/* Categories */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {categories.map(c => (
                        <button
                            key={c}
                            onClick={() => setSelectedCategory(c)}
                            style={{
                                padding: '6px 14px',
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
                                transition: 'transform 0.1s, box-shadow 0.1s',
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

            {/* Right: Table Info & Live Ticket Summary */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fff', overflowY: 'auto' }}>
                <div>
                    <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#1e293b', borderBottom: '2px solid #eee', paddingBottom: '8px' }}>
                        Current Ticket
                    </h2>

                    {/* Table & Customer Setup */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        <select
                            value={tableNumber}
                            onChange={e => setTableNumber(e.target.value)}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                        >
                            {Array.from({ length: 20 }, (_, i) => `Table ${i + 1}`).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                            <option value="Bar 1">Bar Counter 1</option>
                            <option value="Bar 2">Bar Counter 2</option>
                            <option value="Takeaway">Takeaway Counter</option>
                        </select>

                        <select
                            value={orderType}
                            onChange={e => setOrderType(e.target.value)}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="dine_in">Dine-in</option>
                            <option value="room_service">Room Service</option>
                            <option value="takeaway">Takeaway</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <input
                            type="tel"
                            placeholder="Customer Phone (Auto-search)"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                        {existingCustomerFound && (
                            <span style={{ fontSize: '12px', color: '#059669', display: 'block', marginTop: '2px' }}>
                                ✨ Welcome back, {customerName}!
                            </span>
                        )}
                    </div>

                    {/* Ticket Items */}
                    <div style={{ maxHeight: '280px', overflowY: 'auto', margin: '14px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 0' }}>
                        {cartItems.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', margin: '20px 0' }}>Tap dishes on the left to add</p>
                        )}
                        {cartItems.map(item => (
                            <div key={item.menu_item_id} style={{ marginBottom: '12px', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
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
                                            setCartItems(prev => prev.map(i => i.menu_item_id === item.menu_item_id ? { ...i, notes: val } : i));
                                        }}
                                        style={{ width: '130px', padding: '3px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>

                                {/* Quick chips */}
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
                </div>

                {/* Footer Totals & Action */}
                <div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Subtotal:</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tax (5%):</span>
                        <span>₹{tax.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total:</span>
                        <span style={{ color: '#059669' }}>₹{total.toFixed(2)}</span>
                    </div>

                    <button
                        onClick={handleSubmitOrder}
                        disabled={submitting || cartItems.length === 0}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: cartItems.length > 0 ? '#10b981' : '#cbd5e1',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '15px',
                            cursor: cartItems.length > 0 ? 'pointer' : 'not-allowed',
                            marginBottom: '10px',
                        }}
                    >
                        {submitting ? 'Sending to Kitchen...' : '🚀 Submit Order to Kitchen'}
                    </button>

                    {/* Placed Order Modal / Bill actions */}
                    {placedOrder && (
                        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', padding: '12px', marginTop: '10px' }}>
                            <div style={{ fontSize: '13px', color: '#065f46', marginBottom: '6px' }}>
                                ✅ Order Submitted: <strong>{placedOrder.order_code}</strong>
                            </div>

                            {!generatedBill ? (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <select
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI / QR</option>
                                        <option value="card">Credit/Debit Card</option>
                                    </select>
                                    <button
                                        onClick={handleGenerateBill}
                                        style={{ flex: 1, padding: '6px', background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Generate Bill
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: '12px', color: '#065f46', marginBottom: '6px' }}>
                                        Receipt: <strong>BILL-{generatedBill.id}</strong> (₹{generatedBill.total})
                                    </div>
                                    <a
                                        href={`${API_BASE}/api/billing/${generatedBill.id}/pdf`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'block',
                                            textAlign: 'center',
                                            padding: '8px',
                                            background: '#2563eb',
                                            color: '#fff',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            textDecoration: 'none',
                                        }}
                                    >
                                        📄 Download Digital PDF Bill
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WaiterPOS;
