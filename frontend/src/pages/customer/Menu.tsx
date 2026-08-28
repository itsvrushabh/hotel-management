// hotel-management/frontend/src/pages/customer/Menu.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

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

const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

const CATEGORIES = ['All', 'Appetizers', 'Main Course', 'Desserts', 'Drinks'];

// Fallback items in case backend is started fresh without seed data
const SAMPLE_ITEMS: MenuItemData[] = [
    { id: 1, name: 'Paneer Tikka', description: 'Marinated cottage cheese cubes grilled in tandoor with bell peppers', price: 240, category: 'Appetizers', prep_time: 15, available: true },
    { id: 2, name: 'Paneer Butter Masala', description: 'Rich cottage cheese in creamy tomato gravy', price: 280, category: 'Main Course', prep_time: 20, available: true },
    { id: 3, name: 'Garlic Naan', description: 'Freshly baked tandoori flatbread with garlic butter', price: 60, category: 'Main Course', prep_time: 10, available: true },
    { id: 4, name: 'Gulab Jamun with Ice Cream', description: 'Warm milk dumplings served with vanilla ice cream', price: 120, category: 'Desserts', prep_time: 5, available: true },
    { id: 5, name: 'Masala Chaas', description: 'Spiced traditional buttermilk with roasted cumin', price: 50, category: 'Drinks', prep_time: 5, available: true },
];

const Menu: React.FC = () => {
    const navigate = useNavigate();
    const { items: cartItems, addItem, removeItem, updateQuantity, updateNotes, clearCart, totalItems, subtotal, tax, total } = useCart();

    const [items, setItems] = useState<MenuItemData[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [notes, setNotes] = useState<Record<number, string>>({});
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [showMobileCart, setShowMobileCart] = useState<boolean>(false);

    useEffect(() => {
        fetch(`${API_BASE}/api/menu-items`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setItems(data);
                } else {
                    setItems(SAMPLE_ITEMS);
                }
                setLoading(false);
            })
            .catch(() => {
                setItems(SAMPLE_ITEMS);
                setLoading(false);
            });
    }, []);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2000);
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
        showToast(`Added ${qty}x ${item.name} to cart`);
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

    return (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b', fontSize: '26px' }}>🍽️ Grand Palace Hotel & Restaurant</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Browse the menu and watch your cart update in real time</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/history')}
                        style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
                    >
                        Track Order
                    </button>
                    <button
                        onClick={() => navigate('/pos')}
                        style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Staff POS
                    </button>
                </div>
            </header>

            {/* Toast Banner */}
            {toastMessage && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.15)', zIndex: 1000, fontWeight: 600, animation: 'fadeIn 0.2s ease-in-out' }}>
                    ✓ {toastMessage}
                </div>
            )}

            {/* Main 2-Column Split: Menu Catalog (Left) + Live Cart Sidebar (Right) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '28px', alignItems: 'start' }}>
                
                {/* LEFT COLUMN: Menu Catalog */}
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

                    {/* Loading State */}
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
                                        transition: 'border-color 0.2s, background-color 0.2s',
                                    }}
                                >
                                    {/* In-Cart Ribbon Badge */}
                                    {isInCart && (
                                        <div style={{ position: 'absolute', top: '-10px', right: '12px', background: '#10b981', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                            ✓ {cartEntry?.quantity} IN CART
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
                                                {isInCart ? `+ Add More` : `+ Add to Cart`}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT COLUMN: Live Cart Sidebar */}
                <div style={{ position: 'sticky', top: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '19px', color: '#1e293b' }}>🛒 Your Order Tray</h2>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>{totalItems} item{totalItems !== 1 ? 's' : ''} selected</span>
                        </div>
                        {cartItems.length > 0 && (
                            <button
                                onClick={clearCart}
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Empty State */}
                    {cartItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8' }}>
                            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🍲</div>
                            <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#475569', fontSize: '15px' }}>Your Tray is Empty</p>
                            <p style={{ margin: 0, fontSize: '13px' }}>Click <strong>+ Add to Cart</strong> on any dish on the left to start your order.</p>
                        </div>
                    ) : (
                        <div>
                            {/* Scrollable Items List */}
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

                                        {/* Notes input */}
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

                            {/* Checkout Button */}
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
                                <span>Proceed to Checkout</span>
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
