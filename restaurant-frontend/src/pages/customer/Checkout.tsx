// hotel-management/frontend/src/pages/customer/Checkout.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';
const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

interface PlacedOrderResult {
    id: number;
    order_code: string;
    status: string;
    total: number;
    table_number?: string;
    room_number?: string;
    created_at?: string;
}

const Checkout: React.FC = () => {
    const navigate = useNavigate();
    const { items, subtotal, tax, total, clearCart } = useCart();
    const { customer } = useCustomer();

    const [phone, setPhone] = useState(customer?.phone || '');
    const [name, setName] = useState(customer?.name || '');
    const [orderType, setOrderType] = useState(customer?.diningMode || 'dine_in');
    const [tableNumber, setTableNumber] = useState(customer?.tableNumber || 'Table 1');
    const [roomNumber, setRoomNumber] = useState(customer?.roomNumber || '');
    const [generalNotes, setGeneralNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmedOrder, setConfirmedOrder] = useState<PlacedOrderResult | null>(null);

    const maxPrepTime = items.reduce((max, i) => Math.max(max, i.prepTime || 15), 15);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) {
            setError('Your cart is empty.');
            return;
        }
        if (!phone.trim()) {
            setError('Please enter your contact phone number.');
            return;
        }

        setSubmitting(true);
        setError(null);

        const attachedRoom = customer?.roomNumber || (roomNumber.trim() ? roomNumber.trim() : undefined);

        const orderPayload = {
            customer_phone: phone.trim(),
            customer_name: name.trim() ? name.trim() : undefined,
            order_type: orderType,
            table_number: orderType === 'dine_in' ? tableNumber.trim() : undefined,
            room_number: attachedRoom,
            notes: generalNotes.trim() ? generalNotes.trim() : undefined,
            items: items.map(i => ({
                menu_item_id: i.menuItemId,
                quantity: i.quantity,
                notes: i.notes ? i.notes : undefined,
            })),
        };

        try {
            const res = await fetch(`${API_BASE}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload),
            });

            if (!res.ok) {
                throw new Error(`Failed to place order (HTTP ${res.status})`);
            }

            const data = await res.json();
            const orderObj = data.order || data;
            setConfirmedOrder({
                id: orderObj.id,
                order_code: orderObj.order_code,
                status: orderObj.status,
                total: orderObj.total,
                table_number: orderObj.table_number,
                room_number: orderObj.room_number,
                created_at: orderObj.created_at,
            });
            clearCart();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error communicating with the server.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (confirmedOrder) {
        return (
            <div style={{ maxWidth: '600px', margin: '30px auto', padding: '30px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontSize: '54px', color: '#10b981', marginBottom: '12px' }}>✅</div>
                <h1 style={{ margin: '0 0 8px', color: '#1e293b' }}>Order Received!</h1>
                <p style={{ color: '#64748b', fontSize: '16px', margin: '0 0 20px' }}>Your order has been sent to the kitchen.</p>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#64748b' }}>Order Number:</span>
                        <strong style={{ color: '#1e293b' }}>{confirmedOrder.order_code}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#64748b' }}>Estimated Time:</span>
                        <strong style={{ color: '#2563eb' }}>~{maxPrepTime} mins</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#64748b' }}>Status:</span>
                        <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '13px', textTransform: 'capitalize' }}>
                            {confirmedOrder.status}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Amount:</span>
                        <strong style={{ color: '#059669' }}>₹{confirmedOrder.total.toFixed(2)}</strong>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => navigate('/history')}
                        style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Track Status
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Back to Menu
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '750px', margin: '20px auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #eee', paddingBottom: '12px' }}>
                <h1 style={{ margin: 0, color: '#1e293b' }}>Checkout</h1>
                <button
                    onClick={() => navigate('/cart')}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
                >
                    ← Back to Cart
                </button>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginBottom: '20px', fontWeight: 500 }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Phone Number *
                        </label>
                        <input
                            type="tel"
                            required
                            placeholder="e.g. 9876543210"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Your Name (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Rajesh Kumar"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Order Type
                        </label>
                        <select
                            value={orderType}
                            onChange={e => setOrderType(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                        >
                            <option value="dine_in">Dine-in (Restaurant)</option>
                            <option value="room_service">Room Service</option>
                            <option value="takeaway">Takeaway</option>
                        </select>
                    </div>

                    {orderType === 'dine_in' && (
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                Table Number
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Table 4"
                                value={tableNumber}
                                onChange={e => setTableNumber(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    )}

                    {orderType === 'room_service' && (
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                Room Number
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Room 204"
                                value={roomNumber}
                                onChange={e => setRoomNumber(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            General Delivery Notes
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Any allergies, arrival instructions..."
                            value={generalNotes}
                            onChange={e => setGeneralNotes(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                        />
                    </div>
                </div>

                {/* Sidebar Summary */}
                <div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#1e293b' }}>Items ({items.length})</h3>
                        {items.map(i => (
                            <div key={i.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#475569' }}>
                                <span>{i.quantity}x {i.name}</span>
                                <span>₹{(i.price * i.quantity).toFixed(2)}</span>
                            </div>
                        ))}

                        <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '12px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                            <span>Subtotal</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                            <span>GST (5%)</span>
                            <span>₹{tax.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                            <span>Total</span>
                            <span style={{ color: '#059669' }}>₹{total.toFixed(2)}</span>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || items.length === 0}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: submitting ? '#94a3b8' : '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '15px',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {submitting ? 'Placing Order...' : 'Confirm & Place Order'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default Checkout;
