// hotel-management/frontend/src/pages/customer/Menu.tsx
// Customer menu with pre-flight mobile number identification, order tracking, and live cart

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
    available?: boolean;
    image_url?: string;
}

interface CustomerOrderHistory {
    id: number;
    order_code: string;
    status: string;
    total: number;
    table_number?: string;
    room_number?: string;
    created_at?: string;
    items?: Array<{ id: number; item_name: string; quantity: number; price: number; notes?: string }>;
}

const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

const CATEGORIES = ['All', 'Appetizers', 'Main Course', 'Desserts', 'Drinks'];

const TABLES = Array.from({ length: 20 }, (_, i) => `Table ${i + 1}`).concat([
    'Bar Counter 1',
    'Bar Counter 2',
    'Room 101',
    'Room 201',
    'Room 302',
    'Takeaway',
]);

// Fallback items in case backend is started fresh
const SAMPLE_ITEMS: MenuItemData[] = [
    { id: 1, name: 'Paneer Tikka', description: 'Marinated cottage cheese cubes grilled in tandoor with bell peppers', price: 240, category: 'Appetizers', prep_time: 15, available: true },
    { id: 2, name: 'Paneer Butter Masala', description: 'Rich cottage cheese in creamy tomato gravy', price: 280, category: 'Main Course', prep_time: 20, available: true },
    { id: 3, name: 'Garlic Naan', description: 'Freshly baked tandoori flatbread with garlic butter', price: 60, category: 'Main Course', prep_time: 10, available: true },
    { id: 4, name: 'Gulab Jamun with Ice Cream', description: 'Warm milk dumplings served with vanilla ice cream', price: 120, category: 'Desserts', prep_time: 5, available: true },
    { id: 5, name: 'Masala Chaas', description: 'Spiced traditional buttermilk with roasted cumin', price: 50, category: 'Drinks', prep_time: 5, available: true },
];

const Menu: React.FC = () => {
    const navigate = useNavigate();
    const { customer, setCustomerSession, clearCustomerSession, isIdentified } = useCustomer();
    const { items: cartItems, addItem, removeItem, updateQuantity, updateNotes, clearCart, totalItems, subtotal, tax, total } = useCart();

    // Identification Gate Form State
    const [loginPhone, setLoginPhone] = useState(customer?.phone || '');
    const [loginName, setLoginName] = useState(customer?.name || '');
    const [loginTable, setLoginTable] = useState(customer?.tableNumber || 'Table 1');
    const [recognizedName, setRecognizedName] = useState<string | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);

    // Menu & Active Orders State
    const [items, setItems] = useState<MenuItemData[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [notes, setNotes] = useState<Record<number, string>>({});
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [activeOrders, setActiveOrders] = useState<CustomerOrderHistory[]>([]);
    const [showOrdersBanner, setShowOrdersBanner] = useState<boolean>(true);

    // Live phone number recognition on identification screen
    useEffect(() => {
        const clean = loginPhone.trim();
        if (clean.length >= 10) {
            fetch(`${API_BASE}/api/customers/by-phone/${encodeURIComponent(clean)}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error('Not found');
                })
                .then(data => {
                    if (data && data.name) {
                        setRecognizedName(data.name);
                        if (!loginName) setLoginName(data.name);
                    }
                })
                .catch(() => {
                    setRecognizedName(null);
                });
        } else {
            setRecognizedName(null);
        }
    }, [loginPhone]);

    // Load Menu & Active Orders once identified
    const loadMenuAndOrders = async () => {
        try {
            const menuRes = await fetch(`${API_BASE}/api/menu-items`);
            if (menuRes.ok) {
                const data = await menuRes.json();
                if (Array.isArray(data) && data.length > 0) {
                    setItems(data);
                } else {
                    setItems(SAMPLE_ITEMS);
                }
            } else {
                setItems(SAMPLE_ITEMS);
            }
        } catch {
            setItems(SAMPLE_ITEMS);
        } finally {
            setLoading(false);
        }

        // Fetch customer's active orders if identified
        if (customer?.phone) {
            try {
                const ordRes = await fetch(`${API_BASE}/api/orders`);
                if (ordRes.ok) {
                    const allOrd = await ordRes.json();
                    if (Array.isArray(allOrd)) {
                        // Match orders by phone or table
                        const matched = allOrd.filter((o: any) =>
                            (customer.tableNumber && o.table_number === customer.tableNumber) ||
                            (o.customer && o.customer.phone === customer.phone)
                        );

                        // Enrich matched orders with line items
                        const detailed = await Promise.all(
                            matched.slice(0, 5).map(async (ord: any) => {
                                try {
                                    const dRes = await fetch(`${API_BASE}/api/orders/${ord.id}`);
                                    if (dRes.ok) {
                                        const full = await dRes.json();
                                        return {
                                            ...(full.order || ord),
                                            items: full.items || [],
                                        };
                                    }
                                } catch {
                                    // ignore
                                }
                                return ord;
                            })
                        );

                        setActiveOrders(detailed);
                    }
                }
            } catch {
                // ignore
            }
        }
    };

    useEffect(() => {
        if (isIdentified) {
            loadMenuAndOrders();
            const interval = setInterval(loadMenuAndOrders, 8000);
            return () => clearInterval(interval);
        }
    }, [isIdentified, customer?.phone, customer?.tableNumber]);

    const handleIdentificationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = loginPhone.trim();
        if (!clean || clean.length < 8) {
            setLoginError('Please enter a valid mobile number.');
            return;
        }

        setCustomerSession({
            phone: clean,
            name: (loginName || recognizedName || '').trim() || undefined,
            tableNumber: loginTable,
            diningMode: 'dine_in',
        });
        setLoginError(null);
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2200);
    };

    const handleQuantityChange = (itemId: number, delta: number) => {
        setQuantities(prev => {
            const current = prev[itemId] || 1;
            const updated = Math.max(1, current + delta);
            return { ...prev, [itemId]: updated };
        });
    };

    const handleAddToCart = (item: MenuItemData) => {
        const qty = quantities[item.id] || 1;
        const itemNote = notes[item.id] || '';
        addItem({ id: item.id, name: item.name, price: item.price, prep_time: item.prep_time }, qty, itemNote);
        showToast(`Added ${qty}x ${item.name} to tray`);
        // Reset item local note/quantity
        setQuantities(prev => ({ ...prev, [item.id]: 1 }));
        setNotes(prev => ({ ...prev, [item.id]: '' }));
    };

    const filteredItems = items.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    // --- STEP 1: MOBILE NUMBER IDENTIFICATION GATE ---
    if (!isIdentified) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🍽️</div>
                        <h1 style={{ margin: '0 0 8px', fontSize: '24px', color: '#1e293b' }}>Grand Palace Hotel</h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                            Enter your mobile number to view our digital menu, track your active orders, or place a new order.
                        </p>
                    </div>

                    {loginError && (
                        <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
                            {loginError}
                        </div>
                    )}

                    <form onSubmit={handleIdentificationSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                📱 MOBILE NUMBER *
                            </label>
                            <input
                                type="tel"
                                required
                                placeholder="e.g. 9876543210"
                                value={loginPhone}
                                onChange={e => setLoginPhone(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' }}
                            />
                            {recognizedName && (
                                <span style={{ fontSize: '12px', color: '#059669', display: 'block', marginTop: '4px', fontWeight: 600 }}>
                                    ✨ Welcome back, {recognizedName}!
                                </span>
                            )}
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                👤 YOUR NAME (OPTIONAL)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Anita Sharma"
                                value={loginName}
                                onChange={e => setLoginName(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                🪑 YOUR TABLE / ROOM
                            </label>
                            <select
                                value={loginTable}
                                onChange={e => setLoginTable(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', background: '#fff' }}
                            >
                                {TABLES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
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
                                boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                            }}
                        >
                            Continue to Menu & Orders →
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- STEP 2: MAIN MENU & ACTIVE ORDERS VIEW ---
    return (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Header with Guest Session */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>🍽️ Grand Palace Hotel & Restaurant</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                            👤 {customer?.name || 'Guest'} ({customer?.phone}) • {customer?.tableNumber}
                        </span>
                        <button
                            onClick={clearCustomerSession}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        >
                            Change Mobile Number
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/history')}
                        style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
                    >
                        Detailed History
                    </button>
                    <button
                        onClick={() => navigate('/frontdesk')}
                        style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Front Desk
                    </button>
                </div>
            </header>

            {/* Toast Banner */}
            {toastMessage && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.15)', zIndex: 1000, fontWeight: 600 }}>
                    ✓ {toastMessage}
                </div>
            )}

            {/* ACTIVE ORDERS & STATUS TRACKER FOR CURRENT VISIT */}
            {activeOrders.length > 0 && showOrdersBanner && (
                <div style={{ background: '#0f172a', borderRadius: '14px', padding: '20px', color: '#f8fafc', marginBottom: '24px', border: '1px solid #334155', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>📦</span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', color: '#f8fafc' }}>Your Active Orders ({activeOrders.length})</h3>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Live kitchen updates for {customer?.tableNumber}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowOrdersBanner(false)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                        {activeOrders.map(ord => {
                            let statusBadge = '#eab308';
                            let statusText = 'Pending Confirmation';
                            if (ord.status === 'preparing') {
                                statusBadge = '#3b82f6';
                                statusText = '🔥 In Kitchen (Cooking)';
                            } else if (ord.status === 'ready') {
                                statusBadge = '#10b981';
                                statusText = '🍽️ Ready for Service';
                            } else if (ord.status === 'served') {
                                statusBadge = '#8b5cf6';
                                statusText = '✅ Food Served on Table';
                            }

                            return (
                                <div key={ord.id} style={{ background: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #475569' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <strong style={{ color: '#38bdf8', fontSize: '14px' }}>{ord.order_code}</strong>
                                        <span style={{ background: statusBadge, color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                                            {statusText}
                                        </span>
                                    </div>

                                    {ord.items && ord.items.length > 0 && (
                                        <div style={{ margin: '8px 0', fontSize: '13px', color: '#cbd5e1' }}>
                                            {ord.items.map(it => (
                                                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                    <span>{it.quantity}x {it.item_name}</span>
                                                    <span>₹{(it.price * it.quantity).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '6px', fontSize: '13px' }}>
                                        <span style={{ color: '#94a3b8' }}>Order Total:</span>
                                        <strong style={{ color: '#34d399' }}>₹{ord.total.toFixed(2)}</strong>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: '14px', padding: '8px 12px', background: '#1e293b', borderRadius: '8px', fontSize: '13px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>💡</span>
                        <span><strong>Need extra food?</strong> Pick dishes from the menu below to add an extra round to your table anytime!</span>
                    </div>
                </div>
            )}

            {/* Main Split: Catalog (Left) + Live Tray (Right) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '28px', alignItems: 'start' }}>
                
                {/* LEFT: Menu Catalog */}
                <div>
                    {/* Search & Categories */}
                    <div style={{ marginBottom: '16px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Search dishes (e.g. Biryani, Naan, Paneer)..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '20px',
                                    border: selectedCategory === cat ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                    background: selectedCategory === cat ? '#2563eb' : '#fff',
                                    color: selectedCategory === cat ? '#fff' : '#475569',
                                    fontWeight: selectedCategory === cat ? 700 : 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    fontSize: '14px',
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {loading && <p style={{ color: '#64748b' }}>Loading fresh dishes...</p>}

                    {!loading && filteredItems.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                            <p style={{ fontSize: '18px' }}>No dishes found matching your selection.</p>
                        </div>
                    )}

                    {/* Dishes Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                        {filteredItems.map(item => {
                            const cartEntry = cartItems.find(c => c.menuItemId === item.id);
                            const isInCart = Boolean(cartEntry);
                            const currentQty = quantities[item.id] || 1;
                            const currentNote = notes[item.id] || '';

                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        border: isInCart ? '2px solid #10b981' : '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        background: isInCart ? '#f0fdf4' : '#fff',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        position: 'relative',
                                    }}
                                >
                                    {isInCart && (
                                        <div style={{ position: 'absolute', top: '-10px', right: '12px', background: '#10b981', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                                            ✓ {cartEntry?.quantity} IN TRAY
                                        </div>
                                    )}

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                            <h3 style={{ margin: 0, fontSize: '17px', color: '#1e293b' }}>{item.name}</h3>
                                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>₹{item.price}</span>
                                        </div>
                                        {item.description && (
                                            <p style={{ margin: '4px 0 8px', fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>{item.description}</p>
                                        )}
                                        <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                                            <span>📂 {item.category}</span>
                                            <span>⏱️ {item.prep_time}m</span>
                                        </div>
                                    </div>

                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Special instruction (e.g. less spicy)..."
                                            value={currentNote}
                                            onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '8px', background: '#fff' }}
                                        />

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#fff' }}>
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, -1)}
                                                    style={{ padding: '6px 10px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                                >
                                                    -
                                                </button>
                                                <span style={{ padding: '0 8px', fontWeight: 600, fontSize: '13px' }}>{currentQty}</span>
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, 1)}
                                                    style={{ padding: '6px 10px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleAddToCart(item)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    background: isInCart ? '#059669' : '#2563eb',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: 600,
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {isInCart ? `+ Add More` : `+ Add to Tray`}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: Live Cart Sidebar */}
                <div style={{ position: 'sticky', top: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '19px', color: '#1e293b' }}>🛒 Your Order Tray</h2>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>For {customer?.tableNumber} ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
                        </div>
                        {cartItems.length > 0 && (
                            <button
                                onClick={clearCart}
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {cartItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8' }}>
                            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🍲</div>
                            <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#475569', fontSize: '15px' }}>Your Tray is Empty</p>
                            <p style={{ margin: 0, fontSize: '13px' }}>Click <strong>+ Add to Tray</strong> on any dish to add to {customer?.tableNumber}.</p>
                        </div>
                    ) : (
                        <div>
                            <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
                                {cartItems.map(item => (
                                    <div
                                        key={item.menuItemId}
                                        style={{
                                            padding: '12px',
                                            background: '#f8fafc',
                                            borderRadius: '10px',
                                            marginBottom: '10px',
                                            border: '1px solid #e2e8f0',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                            <div>
                                                <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block' }}>{item.name}</strong>
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>₹{item.price} each</span>
                                            </div>
                                            <span style={{ fontWeight: 700, fontSize: '15px', color: '#059669' }}>
                                                ₹{(item.price * item.quantity).toFixed(2)}
                                            </span>
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Chef note (e.g. extra spicy)..."
                                            value={item.notes || ''}
                                            onChange={e => updateNotes(item.menuItemId, e.target.value)}
                                            style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '8px', background: '#fff' }}
                                        />

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#fff' }}>
                                                <button
                                                    onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                                                    style={{ padding: '2px 8px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                                >
                                                    -
                                                </button>
                                                <span style={{ padding: '0 10px', fontWeight: 600, fontSize: '12px' }}>{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                                                    style={{ padding: '2px 8px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => removeItem(item.menuItemId)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                                            >
                                                🗑️ Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Financial Summary */}
                            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                                    <span>Subtotal:</span>
                                    <span>₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                                    <span>GST Tax (5%):</span>
                                    <span>₹{tax.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                                    <span>Grand Total:</span>
                                    <span style={{ color: '#059669' }}>₹{total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Submit / Checkout Button */}
                            <button
                                onClick={() => navigate('/checkout')}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: '#10b981',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 10px rgba(16,185,129,0.3)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}
                            >
                                <span>Place Order for {customer?.tableNumber}</span>
                                <span>(₹{total.toFixed(2)}) →</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Menu;
