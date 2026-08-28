// hotel-management/frontend/src/pages/customer/Cart.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

const Cart: React.FC = () => {
    const navigate = useNavigate();
    const { items, updateQuantity, updateNotes, removeItem, clearCart, subtotal, tax, total } = useCart();

    if (items.length === 0) {
        return (
            <div style={{ maxWidth: '600px', margin: '40px auto', padding: '30px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
                <h2 style={{ color: '#1e293b' }}>Your Cart is Empty</h2>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>Add some delicious items from our menu to begin your order.</p>
                <button
                    onClick={() => navigate('/')}
                    style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                    Browse Menu
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '12px' }}>
                <h1 style={{ margin: 0, color: '#1e293b' }}>Review Your Cart</h1>
                <button
                    onClick={() => navigate('/')}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
                >
                    ← Add More Dishes
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
                {/* Items List */}
                <div>
                    {items.map(item => (
                        <div
                            key={item.menuItemId}
                            style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '16px',
                                marginBottom: '12px',
                                background: '#fff',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 4px', color: '#1e293b' }}>{item.name}</h3>
                                    <span style={{ color: '#64748b', fontSize: '14px' }}>₹{item.price} each</span>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '16px', color: '#059669' }}>
                                    ₹{Math.round(item.price * item.quantity * 100) / 100}
                                </span>
                            </div>

                            <div style={{ margin: '10px 0' }}>
                                <input
                                    type="text"
                                    placeholder="Note for chef (e.g. no onions)..."
                                    value={item.notes || ''}
                                    onChange={e => updateNotes(item.menuItemId, e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                                    <button
                                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                                        style={{ padding: '4px 10px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        -
                                    </button>
                                    <span style={{ padding: '0 12px', fontWeight: 600 }}>{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                                        style={{ padding: '4px 10px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        +
                                    </button>
                                </div>
                                <button
                                    onClick={() => removeItem(item.menuItemId)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer' }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={clearCart}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: '6px 0' }}
                    >
                        Clear entire cart
                    </button>
                </div>

                {/* Summary Box */}
                <div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: '#f8fafc' }}>
                        <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#1e293b' }}>Order Summary</h2>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#475569' }}>
                            <span>Subtotal</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: '#475569' }}>
                            <span>GST (5%)</span>
                            <span>₹{tax.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', paddingTop: '12px', marginBottom: '20px', fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                            <span>Total Amount</span>
                            <span style={{ color: '#059669' }}>₹{total.toFixed(2)}</span>
                        </div>

                        <button
                            onClick={() => navigate('/checkout')}
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
                            Proceed to Checkout →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
