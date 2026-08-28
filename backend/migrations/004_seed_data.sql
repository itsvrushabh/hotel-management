-- hotel-backend/migrations/004_seed_data.sql

-- 1. Seed Menu Items
INSERT INTO menu_items (name, description, price, category, prep_time, available, image_url) VALUES
    ('Paneer Tikka', 'Marinated cottage cheese cubes grilled in tandoor with bell peppers', 240.00, 'Appetizers', 15, TRUE, NULL),
    ('Crispy Corn & Pepper', 'Sweet corn tossed with peppers and mild spices', 180.00, 'Appetizers', 12, TRUE, NULL),
    ('Chicken Seekh Kebab', 'Minced spiced chicken skewers char-grilled to perfection', 320.00, 'Appetizers', 18, TRUE, NULL),
    ('Veg Spring Rolls', 'Crispy rolls filled with shredded seasonal vegetables and glass noodles', 160.00, 'Appetizers', 10, TRUE, NULL),
    ('Tandoori Mushroom', 'Button mushrooms marinated in spiced yogurt and roasted', 220.00, 'Appetizers', 15, TRUE, NULL),
    ('Paneer Butter Masala', 'Rich cottage cheese in a velvety tomato and cashew gravy', 280.00, 'Main Course', 20, TRUE, NULL),
    ('Dal Makhani', 'Slow-cooked black lentils simmered overnight with butter and cream', 240.00, 'Main Course', 25, TRUE, NULL),
    ('Butter Chicken', 'Tender tandoori chicken cooked in rich buttery tomato sauce', 380.00, 'Main Course', 20, TRUE, NULL),
    ('Hyderabadi Dum Biryani', 'Fragrant basmati rice layered with aromatic spices and saffron', 340.00, 'Main Course', 25, TRUE, NULL),
    ('Garlic Naan', 'Freshly baked tandoori flatbread brushed with garlic herb butter', 60.00, 'Main Course', 8, TRUE, NULL),
    ('Butter Roti', 'Traditional whole wheat flatbread brushed with fresh butter', 30.00, 'Main Course', 5, TRUE, NULL),
    ('Jeera Rice', 'Aromatic basmati rice tempered with roasted cumin seeds and ghee', 140.00, 'Main Course', 10, TRUE, NULL),
    ('Gulab Jamun with Ice Cream', 'Warm milk dumplings soaked in cardamom syrup served with vanilla ice cream', 120.00, 'Desserts', 5, TRUE, NULL),
    ('Rasmalai', 'Soft cottage cheese patties steeped in saffron-infused pistachio milk', 140.00, 'Desserts', 5, TRUE, NULL),
    ('Chocolate Brownie Fudge', 'Warm chocolate fudge brownie topped with rich dark ganache', 160.00, 'Desserts', 8, TRUE, NULL),
    ('Masala Chaas', 'Refreshing traditional buttermilk seasoned with roasted cumin and mint', 50.00, 'Drinks', 5, TRUE, NULL),
    ('Fresh Lime Soda', 'Zesty lemon cooler prepared sweet, salted, or mixed', 80.00, 'Drinks', 5, TRUE, NULL),
    ('Mango Lassi', 'Thick blended yogurt smoothie flavored with sweet Alphonso mango pulp', 110.00, 'Drinks', 5, TRUE, NULL),
    ('Cold Coffee with Ice Cream', 'Rich brewed espresso blended with chilled milk and chocolate drizzle', 130.00, 'Drinks', 5, TRUE, NULL)
ON CONFLICT DO NOTHING;

-- 2. Seed Customers
INSERT INTO customers (phone, name) VALUES
    ('9876543210', 'Anita Sharma'),
    ('9811223344', 'Rahul Verma'),
    ('9822334455', 'Priya Patel'),
    ('9833445566', 'Vikram Malhotra'),
    ('9844556677', 'Sneha Reddy'),
    ('9855667788', 'Amitabh Sengupta')
ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name;

-- 3. Seed Raw Inventory Supplies
INSERT INTO inventory (name, quantity, unit) VALUES
    ('Basmati Rice', 50, 'kg'),
    ('Fresh Paneer', 25, 'kg'),
    ('Whole Wheat Flour (Atta)', 60, 'kg'),
    ('Amul Fresh Butter', 20, 'kg'),
    ('Refined Sunflower Oil', 40, 'liters'),
    ('Full Cream Milk', 30, 'liters'),
    ('Fresh Farm Tomatoes', 45, 'kg'),
    ('Nashik Red Onions', 55, 'kg'),
    ('Garam Masala Blend', 15, 'packets'),
    ('Cardamom & Saffron', 5, 'packets'),
    ('Vanilla Bean Ice Cream', 14, 'tubs'),
    ('Alphonso Mango Pulp', 20, 'tins')
ON CONFLICT DO NOTHING;

-- 4. Seed Staff Users (password: 'password123' bcrypt hashed)
INSERT INTO users (username, password_hash, role) VALUES
    ('admin', '$2b$12$e68Y20nK6X0q/X200aXQaejB1976zK0Y0pS4hN7jQ9rC2sY1K5wzS', 'admin'),
    ('waiter_rahul', '$2b$12$e68Y20nK6X0q/X200aXQaejB1976zK0Y0pS4hN7jQ9rC2sY1K5wzS', 'waiter'),
    ('chef_suresh', '$2b$12$e68Y20nK6X0q/X200aXQaejB1976zK0Y0pS4hN7jQ9rC2sY1K5wzS', 'kitchen')
ON CONFLICT (username) DO NOTHING;

-- 5. Seed Historical / Active Orders (using customer subqueries)
INSERT INTO orders (order_code, customer_id, table_number, room_number, order_type, status, total, notes) VALUES
    ('ORD-20260828-001', (SELECT id FROM customers WHERE phone = '9876543210' LIMIT 1), 'Table 2', NULL, 'dine_in', 'served', 700.00, 'Served promptly'),
    ('ORD-20260828-002', (SELECT id FROM customers WHERE phone = '9811223344' LIMIT 1), 'Table 5', NULL, 'dine_in', 'ready', 520.00, 'Less spicy requested'),
    ('ORD-20260828-003', (SELECT id FROM customers WHERE phone = '9822334455' LIMIT 1), NULL, 'Room 302', 'room_service', 'preparing', 640.00, 'Deliver by 1:30 PM'),
    ('ORD-20260828-004', (SELECT id FROM customers WHERE phone = '9833445566' LIMIT 1), 'Table 1', NULL, 'dine_in', 'pending', 350.00, 'No onions in starter')
ON CONFLICT (order_code) DO NOTHING;

-- 6. Seed Order Items for the seeded orders
INSERT INTO order_items (order_id, menu_item_id, quantity, price, notes)
SELECT o.id, COALESCE((SELECT id FROM menu_items WHERE name = 'Paneer Butter Masala' LIMIT 1), 1), 2, 280.00, 'Extra butter' FROM orders o WHERE o.order_code = 'ORD-20260828-001'
UNION ALL
SELECT o.id, COALESCE((SELECT id FROM menu_items WHERE name = 'Garlic Naan' LIMIT 1), 1), 2, 60.00, NULL FROM orders o WHERE o.order_code = 'ORD-20260828-001'
UNION ALL
SELECT o.id, COALESCE((SELECT id FROM menu_items WHERE name = 'Masala Chaas' LIMIT 1), 1), 2, 50.00, 'Chilled' FROM orders o WHERE o.order_code = 'ORD-20260828-001'
UNION ALL
SELECT o.id, COALESCE((SELECT id FROM menu_items WHERE name = 'Paneer Tikka' LIMIT 1), 1), 1, 240.00, 'Crispy' FROM orders o WHERE o.order_code = 'ORD-20260828-002'
UNION ALL
SELECT o.id, COALESCE((SELECT id FROM menu_items WHERE name = 'Dal Makhani' LIMIT 1), 1), 1, 240.00, NULL FROM orders o WHERE o.order_code = 'ORD-20260828-002'
UNION ALL
SELECT o.id, COALESCE((SELECT id FROM menu_items WHERE name = 'Butter Roti' LIMIT 1), 1), 2, 30.00, NULL FROM orders o WHERE o.order_code = 'ORD-20260828-002'
UNION ALL
SELECT o.id, COALESCE((SELECT id FROM menu_items WHERE name = 'Butter Chicken' LIMIT 1), 1), 1, 380.00, NULL FROM orders o WHERE o.order_code = 'ORD-20260828-003'
UNION ALL
SELECT o.id, COALESCE((SELECT id FROM menu_items WHERE name = 'Hyderabadi Dum Biryani' LIMIT 1), 1), 1, 340.00, 'Spicy' FROM orders o WHERE o.order_code = 'ORD-20260828-003'
ON CONFLICT DO NOTHING;

-- 7. Seed Corresponding Bills
INSERT INTO bills (order_id, total, payment_method)
SELECT o.id, o.total, 'upi' FROM orders o WHERE o.order_code = 'ORD-20260828-001'
ON CONFLICT (order_id) DO NOTHING;
