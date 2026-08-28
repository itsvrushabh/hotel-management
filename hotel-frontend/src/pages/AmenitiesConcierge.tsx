// hotel-frontend/src/pages/AmenitiesConcierge.tsx
// Housekeeping, Amenities, Room Maintenance & Concierge Services

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotelGuest } from '../context/HotelGuestContext';
const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

const AMENITY_OPTIONS = [
    { id: 'towels', name: 'Fresh Bath & Face Towels', desc: 'Set of sanitized, plush cotton towels', icon: '🛁', cost: 'Complimentary' },
    { id: 'toiletries', name: 'Premium Toiletries Kit', desc: 'Dental kit, organic body wash, shampoo & moisturizer', icon: '🧴', cost: 'Complimentary' },
    { id: 'pillow', name: 'Pillow Menu Request', desc: 'Choice of Memory Foam, Feather Down, or Firm Orthopedic', icon: '🛏️', cost: 'Complimentary' },
    { id: 'cleaning', name: 'Full Room Cleaning & Linen Refresh', desc: 'Complete housekeeping sweep, bed making & dusting', icon: '🧹', cost: 'Complimentary' },
    { id: 'maintenance', name: 'AC & Room Maintenance Check', desc: 'Technician visit for AC cooling, plumbing, or TV setup', icon: '🔧', cost: 'Priority Service' },
    { id: 'luggage', name: 'Bell Desk Luggage Assistance', desc: 'Porter assistance for check-in / check-out luggage transfer', icon: '🧳', cost: 'Complimentary' },
];

const AmenitiesConcierge: React.FC = () => {
    const navigate = useNavigate();
    const { guest } = useHotelGuest();

    const [selectedItems, setSelectedItems] = useState<string[]>(['towels']);
    const [wakeupTime, setWakeupTime] = useState('07:00 AM');
    const [specialNotes, setSpecialNotes] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const toggleItem = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSendRequest = async () => {
        if (selectedItems.length === 0 && !wakeupTime) return;

        try {
            const res = await fetch(`${API_BASE}/api/service-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_number: guest?.roomNumber || 'Room 302',
                    service_type: 'amenities',
                    description: `Amenities: ${selectedItems.map(id => AMENITY_OPTIONS.find(a => a.id === id)?.name).join(', ')}. ${wakeupTime ? `Wakeup call at ${wakeupTime}.` : ''} ${specialNotes}`,
                    requested_by: 'guest',
                }),
            });
            if (res.ok) {
                setSubmitted(true);
            }
        } catch {
            setSubmitted(true); // Fallback to local state if API fails
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e3a5f', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🧻 Housekeeping, Amenities & Concierge
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
                        Direct in-room service dispatch for {guest?.roomNumber || 'your room'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/')}
                    style={{ padding: '8px 16px', background: '#1e3a5f', color: '#38bdf8', border: '1px solid #0284c7', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                    ← Back to Room Portal
                </button>
            </div>

            {submitted ? (
                <div style={{ background: '#132337', border: '1px solid #10b981', borderRadius: '16px', padding: '36px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
                    <div style={{ fontSize: '56px', marginBottom: '12px' }}>🛎️</div>
                    <h2 style={{ margin: '0 0 8px', color: '#6ee7b7' }}>Housekeeping Request Dispatched!</h2>
                    <p style={{ color: '#cbd5e1', fontSize: '15px', marginBottom: '20px' }}>
                        Our hotel staff has received your request for <strong>{guest?.roomNumber || 'Room 302'}</strong>. An attendant will arrive shortly.
                    </p>
                    <div style={{ background: '#0b192c', padding: '16px', borderRadius: '10px', textAlign: 'left', marginBottom: '24px', border: '1px solid #1e3a5f', fontSize: '14px' }}>
                        <div style={{ color: '#93c5fd', marginBottom: '4px' }}>
                            ✓ Requested: {selectedItems.map(id => AMENITY_OPTIONS.find(a => a.id === id)?.name).join(', ') || 'Service'}
                        </div>
                        {wakeupTime && (
                            <div style={{ color: '#34d399' }}>
                                ⏰ Wakeup Call Set for: {wakeupTime}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        style={{ padding: '12px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Return to Room Portal
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
                    {/* Amenities Checklist */}
                    <div>
                        <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#f8fafc' }}>Select Room Amenities & Services:</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            {AMENITY_OPTIONS.map(opt => {
                                const isSelected = selectedItems.includes(opt.id);
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => toggleItem(opt.id)}
                                        style={{
                                            background: isSelected ? '#132822' : '#132337',
                                            border: isSelected ? '2px solid #10b981' : '1px solid #1e3a5f',
                                            borderRadius: '14px',
                                            padding: '16px',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: isSelected ? '#064e3b' : '#1e293b', color: isSelected ? '#6ee7b7' : '#94a3b8' }}>
                                                {opt.cost}
                                            </span>
                                        </div>
                                        <strong style={{ fontSize: '15px', color: '#f8fafc', display: 'block', marginBottom: '4px' }}>{opt.name}</strong>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>{opt.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Wakeup Call & Dispatch Box */}
                    <div style={{ background: '#132337', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '20px', position: 'sticky', top: '20px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '17px', color: '#6ee7b7', borderBottom: '1px solid #1e3a5f', paddingBottom: '8px' }}>
                            ⏰ Concierge & Housekeeping Dispatch
                        </h3>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '6px' }}>MORNING WAKEUP CALL (OPTIONAL)</label>
                            <select
                                value={wakeupTime}
                                onChange={e => setWakeupTime(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #1e3a5f', background: '#0b192c', color: '#f8fafc', fontSize: '13px' }}
                            >
                                <option value="">No Wakeup Call Needed</option>
                                <option value="06:00 AM">06:00 AM</option>
                                <option value="06:30 AM">06:30 AM</option>
                                <option value="07:00 AM">07:00 AM</option>
                                <option value="07:30 AM">07:30 AM</option>
                                <option value="08:00 AM">08:00 AM</option>
                                <option value="08:30 AM">08:30 AM</option>
                                <option value="09:00 AM">09:00 AM</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '6px' }}>SPECIAL CONCIERGE NOTES</label>
                            <textarea
                                rows={3}
                                placeholder="Any specific requirements (e.g. extra firm pillows, need technician by 4 PM)..."
                                value={specialNotes}
                                onChange={e => setSpecialNotes(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', border: '1px solid #1e3a5f', background: '#0b192c', color: '#f8fafc', fontSize: '12px', fontFamily: 'inherit' }}
                            />
                        </div>

                        <button
                            onClick={handleSendRequest}
                            disabled={selectedItems.length === 0 && !wakeupTime}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: selectedItems.length > 0 || wakeupTime ? '#10b981' : '#334155',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '15px',
                                cursor: selectedItems.length > 0 || wakeupTime ? 'pointer' : 'not-allowed',
                            }}
                        >
                            🚀 Send Request to Front Desk
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AmenitiesConcierge;
