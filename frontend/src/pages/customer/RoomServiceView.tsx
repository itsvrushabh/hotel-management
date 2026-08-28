// hotel-management/frontend/src/pages/customer/RoomServiceView.tsx
// Dedicated Customer In-Room Dining & Room Service Ordering Interface

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';

export interface MenuItemData {
    id: number;
    name: string;
    description?: string;
    price: number;
    category: string;
    prep_time: number;
}

const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

const ROOMS = ['Room 101', 'Room 102', 'Room 201', 'Room 202', 'Room 301', 'Room 302', 'Room 401', 'Room 402'];

const RoomServiceView: React.FC = () => {
    const navigate = useNavigate();
    const { customer, setCustomerSession, isIdentified } = useCustomer();
    const { items: cartItems, addItem, removeItem, updateQuantity, updateNotes, clearCart, totalItems, subtotal, tax, total } = useCart();

    const [selectedRoom, setSelectedRoom] = useState<string>(customer?.roomNumber || 'Room 302');
    const [phone, setPhone] = useState<string>(customer?.phone || '');
    const [guestName, setGuestName] = useState<string>(customer?.name || '');
    const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [specialNotes, setSpecialNotes] = useState<string>('');
    const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    useEffect(() => {
        fetch(`${API_BASE}/api/menu-items`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setMenuItems(data);
            })
            .catch(() => {});
    }, []);

    // Check if phone matches known guest
    useEffect(() => {
        if (phone.trim().length >= 10) {
            fetch(`${API_BASE}/api/customers/by-phone/${encodeURIComponent(phone.trim())}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.name && !guestName) setGuestName(data.name);
                })
                .catch(() => {});
        }
    }, [phone]);

    const categories = ['All', ...Array.from(new Set(menuItems.map(m => m.category)))];
    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handlePlaceRoomOrder = async () => {
        if (cartItems.length === 0 || !phone.trim()) return;
        setSubmitting(true);

        const payload = {
            customer_phone: phone.trim(),
            customer_name: guestName.trim() || undefined,
            order_type: 'room_service',
            room_number: selectedRoom,
            notes: specialNotes.trim() ? `Room Service: ${specialNotes.trim()}` : 'Room Service Delivery',
            items: cartItems.map(i => ({
                menu_item_id: i.menuItemId,
                quantity: i.quantity,
                notes: i.notes || undefined,
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
                setOrderSuccess(ord);
                clearCart();
                // Set session
                setCustomerSession({
                    phone: phone.trim(),
                    name: guestName.trim() || undefined,
                    roomNumber: selectedRoom,
                    diningMode: 'room_service',
                });
            }
        } catch {
            // ignore
        } finally {
            setSubmitting(false);
        }
    };

    if (orderSuccess) {
        return (
            <div style={{ maxWidth: '600px', margin: '40px auto', padding: '32px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'system-ui, sans-serif', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '56px', marginBottom: '12px' }}>🛎️</div>
                <h1 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '24px' }}>Room Service Order Dispatched!</h1>
                <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: '15px' }}>
                    Your order will be prepared fresh and delivered directly to <strong>{orderSuccess.room_number}</strong>.
                </p>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', textAlign: 'left', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                        <span style={{ color: '#64748b' }}>Ticket Number:</span>
                        <strong style={{ color: '#1e293b' }}>{orderSuccess.order_code}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                        <span style={{ color: '#64748b' }}>Room:</span>
                        <strong style={{ color: '#2563eb' }}>{orderSuccess.room_number}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                        <span style={{ color: '#64748b' }}>Billing:</span>
                        <span style={{ color: '#059669', fontWeight: 600 }}>Posted to Room Master Folio</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', borderTop: '1px solid #cbd5e1', paddingTop: '8px' }}>
                        <span>Amount:</span>
                        <strong style={{ color: '#059669' }}>₹{orderSuccess.total.toFixed(2)}</strong>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Restaurant Menu
                    </button>
                    <button
                        onClick={() => setOrderSuccess(null)}
                        style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Order More Room Items
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>🛎️ 24/7 In-Room Dining & Room Service</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Fresh meals delivered directly to your hotel room</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        🍽️ Restaurant Table Menu
                    </button>
                </div>
            </div>

            {/* Room Guest Details Card */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '18px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>SELECT YOUR ROOM NUMBER</label>
                    <select
                        value={selectedRoom}
                        onChange={e => setSelectedRoom(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #93c5fd', fontWeight: 700, fontSize: '15px', background: '#fff' }}
                    >
                        {ROOMS.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>GUEST MOBILE NUMBER</label>
                    <input
                        type="tel"
                        required
                        placeholder="e.g. 9822334455"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '14px' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>GUEST NAME (OPTIONAL)</label>
                    <input
                        type="text"
                        placeholder="e.g. Priya Patel"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '14px' }}
                    />
                </div>
            </div>

            {/* Split layout: Catalog + Room Tray */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
                <div>
                    {/* Categories */}
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
                        {categories.map(c => (
                            <button
                                key={c}
                                onClick={() => setSelectedCategory(c)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: selectedCategory === c ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                    background: selectedCategory === c ? '#2563eb' : '#fff',
                                    color: selectedCategory === c ? '#fff' : '#475569',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}
                            >
                                {c}
                            </button>
                        ))}
                    </div>

                    {/* Dishes Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <strong style={{ fontSize: '16px', color: '#1e293b' }}>{item.name}</strong>
                                        <span style={{ color: '#059669', fontWeight: 700 }}>₹{item.price}</span>
                                    </div>
                                    <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748b' }}>{item.description}</p>
                                </div>
                                <button
                                    onClick={() => addItem({ id: item.id, name: item.name, price: item.price, prep_time: item.prep_time }, 1, '')}
                                    style={{ width: '100%', padding: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    + Add to Room Tray
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Room Tray */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', position: 'sticky', top: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                    <h2 style={{ margin: '0 0 14px', fontSize: '18px', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
                        🛎️ Room Service Tray ({totalItems})
                    </h2>

                    {cartItems.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0', fontSize: '14px' }}>
                            Your room tray is empty. Add breakfast or dinner items above.
                        </p>
                    ) : (
                        <div>
                            <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '14px' }}>
                                {cartItems.map(it => (
                                    <div key={it.menuItemId} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <strong style={{ fontSize: '14px', color: '#1e293b' }}>{it.name}</strong>
                                            <span style={{ fontWeight: 700, color: '#059669' }}>₹{it.price * it.quantity}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <button onClick={() => updateQuantity(it.menuItemId, it.quantity - 1)} style={{ padding: '2px 8px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                                                <span style={{ fontSize: '12px', fontWeight: 600 }}>{it.quantity}</span>
                                                <button onClick={() => updateQuantity(it.menuItemId, it.quantity + 1)} style={{ padding: '2px 8px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                                            </div>
                                            <button onClick={() => removeItem(it.menuItemId)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}>Remove</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>DELIVERY INSTRUCTIONS</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Ring bell twice, deliver at 8:00 AM..."
                                    value={specialNotes}
                                    onChange={e => setSpecialNotes(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                                />
                            </div>

                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                                    <span>Subtotal:</span>
                                    <span>₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                                    <span>GST (5%):</span>
                                    <span>₹{tax.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                    <span>Total Amount:</span>
                                    <span style={{ color: '#059669' }}>₹{total.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePlaceRoomOrder}
                                disabled={submitting || cartItems.length === 0 || !phone.trim()}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#2563eb',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '15px',
                                    cursor: 'pointer',
                                }}
                            >
                                {submitting ? 'Dispatching...' : `🛎️ Deliver to ${selectedRoom}`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoomServiceView;
