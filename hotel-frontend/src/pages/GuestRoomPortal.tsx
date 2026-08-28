// hotel-frontend/src/pages/GuestRoomPortal.tsx
// Guest Room Portal: Central Hub for In-Room Dining, Laundry, Housekeeping & Concierge

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotelGuest } from '../context/HotelGuestContext';
import { useRoomCart } from '../context/RoomCartContext';

const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

const ROOMS = [
    'Room 101', 'Room 102', 'Room 201', 'Room 202',
    'Room 301', 'Room 302', 'Room 401', 'Room 402',
];

interface FoodItem {
    id: number;
    name: string;
    description?: string;
    price: number;
    category: string;
    prep_time: number;
}

const GuestRoomPortal: React.FC = () => {
    const navigate = useNavigate();
    const { guest, setGuestSession, clearGuestSession, isIdentified } = useHotelGuest();
    const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, tax, total } = useRoomCart();

    // Login Gate State
    const [loginRoom, setLoginRoom] = useState(guest?.roomNumber || 'Room 302');
    const [loginPhone, setLoginPhone] = useState(guest?.phone || '');
    const [loginName, setLoginName] = useState(guest?.name || '');
    const [recognizedName, setRecognizedName] = useState<string | null>(null);

    // Service Tab Navigation State
    const [activeServiceTab, setActiveServiceTab] = useState<'portal' | 'dining' | 'laundry' | 'amenities'>('portal');

    // Food Catalog & Orders State
    const [foodMenu, setFoodMenu] = useState<FoodItem[]>([]);
    const [activeServiceTickets, setActiveServiceTickets] = useState<any[]>([]);
    const [foodCategory, setFoodCategory] = useState('All');
    const [specialNotes, setSpecialNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Phone lookup for existing resident
    useEffect(() => {
        const clean = loginPhone.trim();
        if (clean.length >= 10) {
            fetch(`${API_BASE}/api/customers/by-phone/${encodeURIComponent(clean)}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.name) {
                        setRecognizedName(data.name);
                        if (!loginName) setLoginName(data.name);
                    }
                })
                .catch(() => setRecognizedName(null));
        } else {
            setRecognizedName(null);
        }
    }, [loginPhone]);

    const loadPortalData = async () => {
        try {
            const [menuRes, ordersRes] = await Promise.all([
                fetch(`${API_BASE}/api/menu-items`),
                fetch(`${API_BASE}/api/orders`),
            ]);

            if (menuRes.ok) {
                const data = await menuRes.json();
                if (Array.isArray(data)) setFoodMenu(data);
            }

            if (ordersRes.ok && guest?.roomNumber) {
                const allOrd = await ordersRes.json();
                if (Array.isArray(allOrd)) {
                    const roomOrd = allOrd.filter((o: any) => o.room_number === guest.roomNumber && o.status !== 'cancelled');
                    setActiveServiceTickets(roomOrd);
                }
            }
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (isIdentified) {
            loadPortalData();
            const interval = setInterval(loadPortalData, 8000);
            return () => clearInterval(interval);
        }
    }, [isIdentified, guest?.roomNumber]);

    const handleIdentificationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = loginPhone.trim();
        if (!clean) return;

        setGuestSession({
            roomNumber: loginRoom,
            phone: clean,
            name: (loginName || recognizedName || '').trim() || undefined,
        });
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleDispatchRoomFood = async () => {
        if (cartItems.length === 0 || !guest) return;
        setSubmitting(true);

        const payload = {
            customer_phone: guest.phone,
            customer_name: guest.name,
            order_type: 'room_service',
            room_number: guest.roomNumber,
            notes: specialNotes.trim() ? `Room Service: ${specialNotes.trim()}` : 'Room Delivery',
            items: cartItems.map(i => ({
                menu_item_id: i.id,
                quantity: i.quantity,
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
                showToast(`Ticket ${ord.order_code} dispatched to kitchen for ${guest.roomNumber}!`);
                clearCart();
                setSpecialNotes('');
                loadPortalData();
            }
        } catch {
            showToast('Failed to dispatch in-room dining order.');
        } finally {
            setSubmitting(false);
        }
    };

    // --- SCREEN 1: GUEST ROOM IDENTIFICATION GATE ---
    if (!isIdentified) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0b192c 0%, #132337 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ background: '#132337', borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '32px', border: '1px solid #1e3a5f', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', color: '#f8fafc' }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏨</div>
                        <h1 style={{ margin: '0 0 6px', fontSize: '24px', color: '#60a5fa' }}>Grand Palace Hotel</h1>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                            Guest Room Services Portal • 24/7 Dining, Laundry & Concierge
                        </p>
                    </div>

                    <form onSubmit={handleIdentificationSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '6px' }}>
                                🏨 YOUR ROOM NUMBER *
                            </label>
                            <select
                                value={loginRoom}
                                onChange={e => setLoginRoom(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #1e3a5f', background: '#0b192c', color: '#f8fafc', fontSize: '15px', fontWeight: 700 }}
                            >
                                {ROOMS.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '6px' }}>
                                📱 GUEST MOBILE NUMBER *
                            </label>
                            <input
                                type="tel"
                                required
                                placeholder="e.g. 9822334455"
                                value={loginPhone}
                                onChange={e => setLoginPhone(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #1e3a5f', background: '#0b192c', color: '#f8fafc', fontSize: '15px' }}
                            />
                            {recognizedName && (
                                <span style={{ fontSize: '12px', color: '#34d399', display: 'block', marginTop: '4px', fontWeight: 600 }}>
                                    ✨ Welcome, {recognizedName}!
                                </span>
                            )}
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '6px' }}>
                                👤 GUEST NAME (OPTIONAL)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Priya Patel"
                                value={loginName}
                                onChange={e => setLoginName(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #1e3a5f', background: '#0b192c', color: '#f8fafc', fontSize: '15px' }}
                            />
                        </div>

                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '16px',
                                cursor: 'pointer',
                            }}
                        >
                            Open Room Portal →
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- SCREEN 2: IN-HOUSE GUEST SERVICES HUB ---
    const categories = ['All', ...Array.from(new Set(foodMenu.map(m => m.category)))];
    const filteredFood = foodMenu.filter(m => foodCategory === 'All' || m.category === foodCategory);

    return (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e3a5f', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#60a5fa' }}>🏨 Hotel Guest Services Portal</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ background: '#0369a1', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                            {guest?.roomNumber} • {guest?.name || 'In-House Guest'} ({guest?.phone})
                        </span>
                        <button
                            onClick={clearGuestSession}
                            style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        >
                            Change Room / Sign Out
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <a
                        href="http://localhost:3000"
                        style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                    >
                        🍽️ Restaurant Floor (Dine-in) →
                    </a>
                </div>
            </div>

            {toastMessage && (
                <div style={{ padding: '12px 20px', background: '#10b981', color: '#fff', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
                    {toastMessage}
                </div>
            )}

            {/* Persistent Service Tab Navigation Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #1e3a5f', paddingBottom: '0', flexWrap: 'wrap' }}>
                {[
                    { id: 'portal' as const, label: '🏠 Room Hub', color: '#38bdf8' },
                    { id: 'dining' as const, label: '🛎️ In-Room Dining', color: '#0284c7' },
                    { id: 'laundry' as const, label: '🧺 Laundry', color: '#a855f7' },
                    { id: 'amenities' as const, label: '🧻 Housekeeping', color: '#10b981' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveServiceTab(tab.id)}
                        style={{
                            padding: '12px 20px',
                            background: activeServiceTab === tab.id ? tab.color : '#0b192c',
                            color: activeServiceTab === tab.id ? '#fff' : '#94a3b8',
                            border: activeServiceTab === tab.id ? `2px solid ${tab.color}` : '1px solid #1e3a5f',
                            borderRadius: '8px 8px 0 0',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: 'pointer',
                            borderBottom: activeServiceTab === tab.id ? '2px solid #0b192c' : 'none',
                            marginBottom: activeServiceTab === tab.id ? '-2px' : '0',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Service Content Based on Active Tab */}
            {activeServiceTab === 'portal' && (
                <>
                    {/* Active Room Orders Tracker */}
                    {activeServiceTickets.length > 0 && (
                        <div style={{ background: '#132337', padding: '20px', borderRadius: '14px', border: '1px solid #1e3a5f', marginBottom: '28px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #1e3a5f', paddingBottom: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '17px', color: '#60a5fa' }}>
                                    📦 Active Room Service Deliveries for {guest?.roomNumber} ({activeServiceTickets.length})
                                </h3>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Charges posted to Master Room Folio</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                                {activeServiceTickets.map(ticket => (
                                    <div key={ticket.id} style={{ background: '#0b192c', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1e3a5f' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <strong style={{ color: '#38bdf8' }}>{ticket.order_code}</strong>
                                            <span style={{ background: ticket.status === 'served' ? '#047857' : '#d97706', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>
                                                {ticket.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
                                            {ticket.notes || 'In-Room Meal Delivery'}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e3a5f', paddingTop: '4px', fontSize: '13px' }}>
                                            <span style={{ color: '#94a3b8' }}>Total:</span>
                                            <strong style={{ color: '#34d399' }}>₹{ticket.total.toFixed(2)}</strong>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Room Hub Welcome */}
                    <div style={{ background: '#132337', padding: '32px', borderRadius: '16px', border: '1px solid #1e3a5f', textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏨</div>
                        <h2 style={{ margin: '0 0 8px', fontSize: '22px', color: '#60a5fa' }}>Welcome to Your Room Hub</h2>
                        <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: '15px' }}>
                            Select a service above to order in-room dining, schedule laundry pickup, or request housekeeping amenities.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
                            <div style={{ background: '#0b192c', padding: '16px', borderRadius: '10px', border: '1px solid #1e3a5f' }}>
                                <div style={{ fontSize: '24px', marginBottom: '4px' }}>🛎️</div>
                                <strong style={{ color: '#38bdf8', fontSize: '14px' }}>In-Room Dining</strong>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>24/7 food delivery</p>
                            </div>
                            <div style={{ background: '#0b192c', padding: '16px', borderRadius: '10px', border: '1px solid #1e3a5f' }}>
                                <div style={{ fontSize: '24px', marginBottom: '4px' }}>🧺</div>
                                <strong style={{ color: '#d8b4fe', fontSize: '14px' }}>Laundry Service</strong>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>Wash & dry cleaning</p>
                            </div>
                            <div style={{ background: '#0b192c', padding: '16px', borderRadius: '10px', border: '1px solid #1e3a5f' }}>
                                <div style={{ fontSize: '24px', marginBottom: '4px' }}>🧻</div>
                                <strong style={{ color: '#6ee7b7', fontSize: '14px' }}>Housekeeping</strong>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>Towels & amenities</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeServiceTab === 'dining' && (
                <>
                    {/* In-Room Dining Menu Section */}
                    <div id="in-room-dining-section" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>🛎️ In-Room Dining Menu</h2>
                                    <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '13px' }}>Delivered fresh and hot to {guest?.roomNumber}</p>
                                </div>
                            </div>

                            {/* Category Filter */}
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
                                {categories.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setFoodCategory(c)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '20px',
                                            border: foodCategory === c ? '2px solid #38bdf8' : '1px solid #1e3a5f',
                                            background: foodCategory === c ? '#0284c7' : '#132337',
                                            color: '#fff',
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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                                {filteredFood.map(dish => (
                                    <div
                                        key={dish.id}
                                        style={{
                                            background: '#132337',
                                            border: '1px solid #1e3a5f',
                                            borderRadius: '12px',
                                            padding: '14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <strong style={{ fontSize: '15px', color: '#f8fafc' }}>{dish.name}</strong>
                                                <span style={{ color: '#34d399', fontWeight: 700 }}>₹{dish.price}</span>
                                            </div>
                                            <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#94a3b8' }}>{dish.description}</p>
                                        </div>
                                        <button
                                            onClick={() => addItem({ id: dish.id, name: dish.name, category: dish.category, price: dish.price }, 1, '')}
                                            style={{ width: '100%', padding: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                                        >
                                            + Add to Room Tray
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Room Tray */}
                        <div style={{ background: '#132337', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '20px', position: 'sticky', top: '20px' }}>
                            <h3 style={{ margin: '0 0 14px', fontSize: '18px', color: '#60a5fa', borderBottom: '1px solid #1e3a5f', paddingBottom: '8px' }}>
                                🛎️ Room Service Tray ({totalItems})
                            </h3>

                            {cartItems.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0', fontSize: '13px' }}>
                                    Your room tray is empty. Tap dishes on the left to add to {guest?.roomNumber}.
                                </p>
                            ) : (
                                <div>
                                    <div style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: '12px' }}>
                                        {cartItems.map(it => (
                                            <div key={it.id} style={{ background: '#0b192c', padding: '10px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #1e3a5f' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <strong style={{ fontSize: '13px', color: '#f8fafc' }}>{it.name}</strong>
                                                    <span style={{ color: '#34d399', fontWeight: 700 }}>₹{it.price * it.quantity}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                        <button onClick={() => updateQuantity(it.id, it.quantity - 1)} style={{ padding: '2px 8px', border: '1px solid #1e3a5f', background: '#132337', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                                                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{it.quantity}</span>
                                                        <button onClick={() => updateQuantity(it.id, it.quantity + 1)} style={{ padding: '2px 8px', border: '1px solid #1e3a5f', background: '#132337', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                                                    </div>
                                                    <button onClick={() => removeItem(it.id)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>Remove</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '4px' }}>DELIVERY INSTRUCTION</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Ring bell twice, deliver at 8:00 AM..."
                                            value={specialNotes}
                                            onChange={e => setSpecialNotes(e.target.value)}
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #1e3a5f', background: '#0b192c', color: '#f8fafc', fontSize: '12px' }}
                                        />
                                    </div>

                                    <div style={{ borderTop: '1px solid #1e3a5f', paddingTop: '10px', marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>
                                            <span>Subtotal:</span>
                                            <span>₹{subtotal.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                                            <span>GST (5%):</span>
                                            <span>₹{tax.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                                            <span>Charge to Room Folio:</span>
                                            <span style={{ color: '#34d399' }}>₹{total.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleDispatchRoomFood}
                                        disabled={submitting || cartItems.length === 0}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: '#10b981',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '15px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {submitting ? 'Dispatching...' : `🛎️ Deliver to ${guest?.roomNumber}`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {activeServiceTab === 'laundry' && (
                <>
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧺</div>
                        <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#d8b4fe' }}>Laundry Service</h2>
                        <p style={{ margin: '0 0 20px', fontSize: '14px' }}>
                            For laundry pickup scheduling, please use the dedicated Laundry Service page.
                        </p>
                        <button
                            onClick={() => navigate('/laundry')}
                            style={{ padding: '12px 24px', background: '#a855f7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Open Laundry Service →
                        </button>
                    </div>
                </>
            )}

            {activeServiceTab === 'amenities' && (
                <>
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧻</div>
                        <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#6ee7b7' }}>Housekeeping & Amenities</h2>
                        <p style={{ margin: '0 0 20px', fontSize: '14px' }}>
                            For housekeeping requests, please use the dedicated Amenities & Concierge page.
                        </p>
                        <button
                            onClick={() => navigate('/amenities')}
                            style={{ padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Open Housekeeping Service →
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default GuestRoomPortal;
