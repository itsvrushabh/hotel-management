// hotel-frontend/src/pages/HotelStaffDashboard.tsx
// Staff Dashboard: View and manage hotel service requests (Laundry, Housekeeping, Amenities, Maintenance)

import React, { useEffect, useState } from 'react';

const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

interface ServiceRequest {
    id: number;
    room_number: string;
    service_type: string;
    status: string;
    description?: string;
    requested_by?: string;
    created_at?: string;
    updated_at?: string;
}

const HotelStaffDashboard: React.FC = () => {
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const loadRequests = async () => {
        try {
            const params = new URLSearchParams();
            if (filterStatus !== 'all') params.append('status', filterStatus);
            if (filterType !== 'all') params.append('service_type', filterType);

            const res = await fetch(`${API_BASE}/api/service-requests?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setRequests(data);
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
        const interval = setInterval(loadRequests, 10000);
        return () => clearInterval(interval);
    }, [filterStatus, filterType]);

    const updateRequestStatus = async (id: number, newStatus: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/service-requests/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                showToast(`Request #${id} updated to ${newStatus}`);
                loadRequests();
            }
        } catch {
            showToast('Failed to update request status');
        }
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const inProgressCount = requests.filter(r => r.status === 'in_progress').length;

    const serviceTypeIcon: Record<string, string> = {
        laundry: '🧺',
        housekeeping: '🧻',
        amenities: '🛎️',
        maintenance: '🔧',
    };

    const statusColor: Record<string, string> = {
        pending: '#f59e0b',
        in_progress: '#3b82f6',
        completed: '#10b981',
        cancelled: '#64748b',
    };

    return (
        <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', background: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        👨‍💼 Hotel Staff Dashboard
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
                        Service Requests: {pendingCount} Pending • {inProgressCount} In Progress
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => window.location.href = '/frontdesk'}
                        style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        🏨 Front Desk
                    </button>
                </div>
            </div>

            {toastMessage && (
                <div style={{ padding: '12px 20px', background: '#10b981', color: '#fff', borderRadius: '8px', marginBottom: '20px', fontWeight: 600 }}>
                    {toastMessage}
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '4px' }}>STATUS</label>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: '13px' }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#93c5fd', marginBottom: '4px' }}>SERVICE TYPE</label>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: '13px' }}
                    >
                        <option value="all">All Services</option>
                        <option value="laundry">Laundry</option>
                        <option value="housekeeping">Housekeeping</option>
                        <option value="amenities">Amenities</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <p style={{ color: '#94a3b8' }}>Loading service requests...</p>
            ) : requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#f8fafc' }}>No Service Requests</h3>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                        {filterStatus === 'all' && filterType === 'all'
                            ? 'There are currently no pending service requests.'
                            : 'No requests match the selected filters.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {requests.map(req => (
                        <div
                            key={req.id}
                            style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '24px' }}>{serviceTypeIcon[req.service_type] || '📋'}</span>
                                    <div>
                                        <strong style={{ fontSize: '15px', color: '#f8fafc', display: 'block' }}>
                                            {req.service_type.charAt(0).toUpperCase() + req.service_type.slice(1)}
                                        </strong>
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                            #{req.id} • {req.room_number}
                                        </span>
                                    </div>
                                </div>
                                <span
                                    style={{
                                        background: statusColor[req.status] || '#64748b',
                                        color: '#fff',
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {req.status.replace('_', ' ')}
                                </span>
                            </div>

                            {req.description && (
                                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.4 }}>
                                    {req.description}
                                </p>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '12px', color: '#64748b' }}>
                                <span>Requested by: {req.requested_by || 'guest'}</span>
                                <span>{req.created_at ? new Date(req.created_at).toLocaleString() : ''}</span>
                            </div>

                            {req.status === 'pending' && (
                                <button
                                    onClick={() => updateRequestStatus(req.id, 'in_progress')}
                                    style={{ width: '100%', padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    👨‍🔧 Start Working
                                </button>
                            )}

                            {req.status === 'in_progress' && (
                                <button
                                    onClick={() => updateRequestStatus(req.id, 'completed')}
                                    style={{ width: '100%', padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    ✅ Mark Complete
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HotelStaffDashboard;
