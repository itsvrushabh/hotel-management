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
    { id: 1, name: 'Paneer Butter Masala', description: 'Rich cottage cheese in creamy tomato gravy', price: 280, category: 'Main Course', prep_time: 20, available: true },
    { id: 2, name: 'Crispy Corn & Pepper', description: 'Sweet corn tossed with peppers and mild spices', price: 180, category: 'Appetizers', prep_time: 15, available: true },
    { id: 3, name: 'Garlic Naan', description: 'Freshly baked tandoori flatbread with garlic butter', price: 60, category: 'Main Course', prep_time: 10, available: true },
    { id: 4, name: 'Gulab Jamun with Ice Cream', description: 'Warm milk dumplings served with vanilla ice cream', price: 120, category: 'Desserts', prep_time: 5, available: true },
    { id: 5, name: 'Masala Chaas', description: 'Spiced traditional buttermilk with roasted cumin', price: 50, category: 'Drinks', prep_time: 5, available: true },
];

const Menu: React.FC = () => {
    const navigate = useNavigate();
    const { addItem, totalItems } = useCart();

    const [items, setItems] = useState<MenuItemData[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [notes, setNotes] = useState<Record<number, string>>({});
    const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        setTimeout(() => setToastMessage(null), 2500);
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
        showToast(`Added ${qty}x ${item.name} to cart!`);
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
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b' }}>Grand Palace Hotel & Restaurant</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b' }}>Fresh delicacies prepared with artisanal care</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/history')}
                        style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                    >
                        Track Order
                    </button>
                    <button
                        onClick={() => navigate('/cart')}
                        style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <span>Cart</span>
                        {totalItems > 0 && (
                            <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                                {totalItems}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Toast Banner */}
            {toastMessage && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, fontWeight: 500 }}>
                    {toastMessage}
                </div>
            )}

            {/* Search & Categories */}
            <div style={{ margin: '24px 0 16px' }}>
                <input
                    type="text"
                    placeholder="Search dishes or ingredients..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
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
                            background: selectedCategory === cat ? '#eff6ff' : '#fff',
                            color: selectedCategory === cat ? '#2563eb' : '#475569',
                            fontWeight: selectedCategory === cat ? 700 : 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Loading / Error state */}
            {loading && <p style={{ color: '#64748b' }}>Loading delicious dishes...</p>}

            {!loading && filteredItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <p style={{ fontSize: '18px' }}>No dishes found matching your selection.</p>
                </div>
            )}

            {/* Items Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {filteredItems.map(item => {
                    const currentQty = quantities[item.id] || 1;
                    const currentNote = notes[item.id] || '';

                    return (
                        <div
                            key={item.id}
                            style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '18px',
                                background: '#fff',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: '#1e293b' }}>{item.name}</h3>
                                    <span style={{ fontSize: '17px', fontWeight: 700, color: '#059669' }}>₹{item.price}</span>
                                </div>
                                {item.description && (
                                    <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#64748b', lineHeight: 1.4 }}>{item.description}</p>
                                )}
                                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                                    <span>Category: <strong>{item.category}</strong></span>
                                    <span>⏱️ {item.prep_time}m</span>
                                </div>
                            </div>

                            <div>
                                <input
                                    type="text"
                                    placeholder="Special note (e.g. less spicy)..."
                                    value={currentNote}
                                    onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '10px' }}
                                />

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                                        <button
                                            onClick={() => handleQuantityChange(item.id, -1)}
                                            style={{ padding: '6px 12px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            -
                                        </button>
                                        <span style={{ padding: '0 10px', fontWeight: 600, fontSize: '14px' }}>{currentQty}</span>
                                        <button
                                            onClick={() => handleQuantityChange(item.id, 1)}
                                            style={{ padding: '6px 12px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleAddToCart(item)}
                                        style={{ flex: 1, padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Menu;
