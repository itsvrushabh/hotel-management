// hotel-management/frontend/src/pages/customer/Menu.tsx
// Customer menu interface

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface RecipeItem {
    id: number;
    name: string;
    prep_time: number;
    price: number;
    available?: boolean;
}
const API_BASE = 'http://localhost:8080';

const categories = ['All', 'Appetizers', 'Main Course', 'Desserts', 'Drinks'];

const Menu: React.FC = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState<RecipeItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_BASE}/api/recipes`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                setItems(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    return (
        <div className="menu-page">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Welcome to the Hotel Menu</h1>
                <button onClick={() => navigate('/cart')}>View Cart</button>
            </header>

            <div className="categories" style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        style={{ fontWeight: selectedCategory === cat ? 'bold' : 'normal' }}
                        onClick={() => setSelectedCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {loading && <p>Loading menu items...</p>}
            {error && <p style={{ color: 'red' }}>Could not load menu items: {error}</p>}

            {!loading && !error && items.length === 0 && (
                <p>No menu items available currently.</p>
            )}

            <div className="items-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {items.map(item => (
                    <div key={item.id} style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px' }}>
                        <h3>{item.name}</h3>
                        <p>Price: ₹{item.price}</p>
                        <p>Prep time: {item.prep_time} mins</p>
                        <button onClick={() => navigate('/cart')}>Add to Cart</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Menu;
