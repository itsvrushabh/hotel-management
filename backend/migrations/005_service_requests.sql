-- hotel-backend/migrations/005_service_requests.sql
-- Hotel Service Requests: Laundry, Housekeeping, Amenities, Maintenance

CREATE TABLE IF NOT EXISTS service_requests (
    id BIGSERIAL PRIMARY KEY,
    room_number TEXT NOT NULL,
    service_type TEXT NOT NULL CHECK (service_type IN ('laundry', 'housekeeping', 'amenities', 'maintenance')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    description TEXT,
    requested_by TEXT DEFAULT 'guest', -- 'guest' or 'frontdesk'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient room-based queries
CREATE INDEX IF NOT EXISTS idx_service_requests_room ON service_requests(room_number);
-- Index for status-based queries (staff dashboard)
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
-- Index for service type filtering
CREATE INDEX IF NOT EXISTS idx_service_requests_type ON service_requests(service_type);
