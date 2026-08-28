// hotel-frontend/src/pages/LaundryService.tsx
// Dedicated In-House Hotel Laundry & Dry Cleaning Service

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotelGuest } from '../context/HotelGuestContext';

const LAUNDRY_PACKAGES = [
    { id: 1, name: 'Standard Wash & Fold', desc: 'Everyday casual wear, machine washed and neatly folded', price: 90, unit: 'per kg', time: 'Same day (6 hrs)' },
    { id: 2, name: 'Premium Dry Cleaning', desc: 'Suits, formal blazers, silk sarees & delicate fabrics', price: 180, unit: 'per piece', time: '24 hours' },
    { id: 3, name: 'Express Steam Ironing', desc: 'Wrinkle-free high-pressure steam pressing on hangers', price: 40, unit: 'per piece', time: '2 hours express' },
    { id: 4, name: 'Delicate Wool & Cashmere', desc: 'Hand wash with gentle fabric softener and natural drying', price: 150, unit: 'per piece', time: '12 hours' },
];

const LaundryService: React.FC = () => {
    const navigate = useNavigate();
    const { guest } = useHotelGuest();

    const [quantities, setQuantities] = useState<Record<number, number>>({ 1: 2, 3: 3 });
    const [pickupSlot, setPickupSlot] = useState('Morning (8:00 AM - 10:00 AM)');
    const [specialNotes, setSpecialNotes] = useState('');
    const [requested, setRequested] = useState(false);

    const handleQty = (id: number, delta: number) => {
        setQuantities(prev => {
            const cur = prev[id] || 0;
            const next = Math.max(0, cur + delta);
            return { ...prev, [id]: next };
        });
    };

    const subtotal = LAUNDRY_PACKAGES.reduce((acc, p) => acc + p.price * (quantities[p.id] || 0), 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const handleRequestPickup = () => {
        if (subtotal === 0) return;
        setRequested(true);
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e3a5f', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#d8b4fe', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🧺 In-House Laundry & Dry Cleaning Services
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
                        Professional garment care collected directly from {guest?.roomNumber || 'your room'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/')}
                    style={{ padding: '8px 16px', background: '#1e3a5f', color: '#38bdf8', border: '1px solid #0284c7', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                    ← Back to Room Portal
                </button>
            </div>

            {requested ? (
                <div style={{ background: '#132337', border: '1px solid #a855f7', borderRadius: '16px', padding: '32px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
                    <div style={{ fontSize: '56px', marginBottom: '10px' }}>🧺</div>
                    <h2 style={{ margin: '0 0 8px', color: '#d8b4fe' }}>Laundry Pickup Scheduled!</h2>
                    <p style={{ color: '#cbd5e1', fontSize: '15px', marginBottom: '20px' }}>
                        Housekeeping will collect your laundry from <strong>{guest?.roomNumber || 'Room 302'}</strong> during the <strong>{pickupSlot}</strong> slot.
                    </p>
                    <div style={{ background: '#0b192c', padding: '16px', borderRadius: '10px', textAlign: 'left', marginBottom: '24px', border: '1px solid #1e3a5f', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: '#94a3b8' }}>Folio Charge:</span>
                            <strong style={{ color: '#34d399' }}>₹{total.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                            <span>Billing Status:</span>
                            <span style={{ color: '#60a5fa' }}>Posted to {guest?.roomNumber || 'Room 302'} Stay Folio</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        style={{ padding: '12px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Return to Room Portal
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
                    {/* Packages List */}
                    <div>
                        <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#f8fafc' }}>Select Laundry Services:</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {LAUNDRY_PACKAGES.map(pkg => {
                                const qty = quantities[pkg.id] || 0;
                                return (
                                    <div
                                        key={pkg.id}
                                        style={{
                                            background: '#132337',
                                            border: qty > 0 ? '2px solid #a855f7' : '1px solid #1e3a5f',
                                            borderRadius: '14px',
                                            padding: '18px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>{pkg.name}</h3>
                                                <span style={{ background: '#251733', color: '#d8b4fe', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600 }}>
                                                    ⏱️ {pkg.time}
                                                </span>
                                            </div>
                                            <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#94a3b8' }}>{pkg.desc}</p>
                                            <span style={{ color: '#34d399', fontWeight: 700, fontSize: '15px' }}>
                                                ₹{pkg.price} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>{pkg.unit}</span>
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #1e3a5f', borderRadius: '8px', overflow: 'hidden', background: '#0b192c' }}>
                                            <button onClick={() => handleQty(pkg.id, -1)} style={{ padding: '6px 12px', background: '#132337', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                            <span style={{ padding: '0 12px', fontWeight: 700, fontSize: '14px' }}>{qty}</span>
                                            <button onClick={() => handleQty(pkg.id, 1)} style={{ padding: '6px 12px', background: '#132337', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pickup Slot & Summary */}
                    <div style={{ background: '#132337', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '20px', position: 'sticky', top: '20px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#d8b4fe', borderBottom: '1px solid #1e3a5f', paddingBottom: '8px' }}>
                            🧺 Pickup & Delivery Details
                        </h3>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '6px' }}>ROOM PICKUP TIME SLOT</label>
                            <select
                                value={pickupSlot}
                                onChange={e => setPickupSlot(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #1e3a5f', background: '#0b192c', color: '#f8fafc', fontSize: '13px' }}
                            >
                                <option value="Morning (8:00 AM - 10:00 AM)">Morning (8:00 AM - 10:00 AM)</option>
                                <option value="Afternoon (1:00 PM - 3:00 PM)">Afternoon (1:00 PM - 3:00 PM)</option>
                                <option value="Evening (6:00 PM - 8:00 PM)">Evening (6:00 PM - 8:00 PM)</option>
                                <option value="Express Pickup (Within 30 Mins)">Express Pickup (Within 30 Mins)</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '6px' }}>SPECIAL CARE INSTRUCTIONS</label>
                            <textarea
                                rows={3}
                                placeholder="e.g. Extra starch on shirts, separate white garments..."
                                value={specialNotes}
                                onChange={e => setSpecialNotes(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', border: '1px solid #1e3a5f', background: '#0b192c', color: '#f8fafc', fontSize: '12px', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ borderTop: '1px solid #1e3a5f', paddingTop: '10px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>
                                <span>Subtotal:</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                                <span>GST (5%):</span>
                                <span>₹{tax.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>
                                <span>Total Laundry Charge:</span>
                                <span style={{ color: '#34d399' }}>₹{total.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleRequestPickup}
                            disabled={subtotal === 0}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: subtotal > 0 ? '#a855f7' : '#334155',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '15px',
                                cursor: subtotal > 0 ? 'pointer' : 'not-allowed',
                            }}
                        >
                            🧺 Schedule Pickup for {guest?.roomNumber || 'Room'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaundryService;
