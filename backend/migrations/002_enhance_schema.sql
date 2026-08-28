-- hotel-backend/migrations/002_enhance_schema.sql

-- Enhance menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS prep_time INTEGER NOT NULL DEFAULT 15;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT TRUE;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Enhance orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'dine_in';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Populate order_code for any existing rows if present
UPDATE orders SET order_code = 'ORD-LEGACY-' || id WHERE order_code IS NULL;

-- Add unique constraint on order_code if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_code_key'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_order_code_key UNIQUE (order_code);
    END IF;
END $$;

-- Enhance inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'units';

-- Enhance bills constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bills_order_id_key'
    ) THEN
        ALTER TABLE bills ADD CONSTRAINT bills_order_id_key UNIQUE (order_id);
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
