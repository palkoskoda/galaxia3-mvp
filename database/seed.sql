-- Seed data for Galaxia3 MVP

-- Insert categories
INSERT INTO categories (name, description, sort_order) VALUES
('Appetizers', 'Start your meal with our delicious appetizers', 1),
('Main Courses', 'Hearty and satisfying main dishes', 2),
('Salads', 'Fresh and healthy salad options', 3),
('Desserts', 'Sweet treats to end your meal', 4),
('Beverages', 'Refreshing drinks and beverages', 5);

-- Insert menu items
INSERT INTO menu_items (name, description, price, category_id, is_available, dietary_tags, allergens, preparation_time) VALUES
-- Appetizers
('Crispy Spring Rolls', 'Fresh vegetables wrapped in crispy pastry, served with sweet chili sauce', 8.99, (SELECT id FROM categories WHERE name = 'Appetizers'), true, ARRAY['vegetarian'], ARRAY['gluten', 'soy'], 8),
('Garlic Parmesan Wings', 'Crispy chicken wings tossed in garlic parmesan sauce', 12.99, (SELECT id FROM categories WHERE name = 'Appetizers'), true, ARRAY[], ARRAY['dairy', 'gluten'], 12),
('Avocado Toast', 'Toasted sourdough with fresh avocado, cherry tomatoes, and herbs', 9.99, (SELECT id FROM categories WHERE name = 'Appetizers'), true, ARRAY['vegetarian', 'vegan-option'], ARRAY['gluten'], 5),

-- Main Courses
('Grilled Salmon', 'Fresh Atlantic salmon with lemon herb butter, served with seasonal vegetables', 24.99, (SELECT id FROM categories WHERE name = 'Main Courses'), true, ARRAY['gluten-free'], ARRAY['fish', 'dairy'], 20),
('Chicken Parmesan', 'Breaded chicken breast with marinara sauce and melted mozzarella', 18.99, (SELECT id FROM categories WHERE name = 'Main Courses'), true, ARRAY[], ARRAY['gluten', 'dairy'], 25),
('Vegetable Pasta', 'Penne pasta with seasonal vegetables in garlic olive oil sauce', 15.99, (SELECT id FROM categories WHERE name = 'Main Courses'), true, ARRAY['vegetarian', 'vegan-option'], ARRAY['gluten'], 15),
('Ribeye Steak', '12oz grilled ribeye with herb butter and roasted potatoes', 32.99, (SELECT id FROM categories WHERE name = 'Main Courses'), true, ARRAY['gluten-free'], ARRAY['dairy'], 30),

-- Salads
('Caesar Salad', 'Crisp romaine lettuce, parmesan cheese, croutons, and caesar dressing', 11.99, (SELECT id FROM categories WHERE name = 'Salads'), true, ARRAY['vegetarian'], ARRAY['dairy', 'gluten', 'eggs'], 5),
('Greek Salad', 'Fresh tomatoes, cucumbers, red onions, olives, and feta cheese', 10.99, (SELECT id FROM categories WHERE name = 'Salads'), true, ARRAY['vegetarian', 'gluten-free'], ARRAY['dairy'], 5),
('Quinoa Bowl', 'Quinoa with roasted vegetables, avocado, and lemon tahini dressing', 13.99, (SELECT id FROM categories WHERE name = 'Salads'), true, ARRAY['vegetarian', 'vegan', 'gluten-free'], ARRAY['sesame'], 8),

-- Desserts
('Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 8.99, (SELECT id FROM categories WHERE name = 'Desserts'), true, ARRAY['vegetarian'], ARRAY['gluten', 'dairy', 'eggs'], 10),
('Tiramisu', 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone', 7.99, (SELECT id FROM categories WHERE name = 'Desserts'), true, ARRAY['vegetarian'], ARRAY['gluten', 'dairy', 'eggs'], 5),
('Fresh Fruit Sorbet', 'Selection of seasonal fruit sorbets', 6.99, (SELECT id FROM categories WHERE name = 'Desserts'), true, ARRAY['vegan', 'gluten-free'], ARRAY[], 2),

-- Beverages
('Fresh Orange Juice', 'Freshly squeezed orange juice', 4.99, (SELECT id FROM categories WHERE name = 'Beverages'), true, ARRAY['vegan', 'gluten-free'], ARRAY[], 1),
('Iced Coffee', 'Cold brew coffee with milk and sugar options', 3.99, (SELECT id FROM categories WHERE name = 'Beverages'), true, ARRAY['vegan-option'], ARRAY['dairy'], 2),
('Lemonade', 'House-made fresh lemonade', 3.49, (SELECT id FROM categories WHERE name = 'Beverages'), true, ARRAY['vegan', 'gluten-free'], ARRAY[], 1);

-- Insert admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@galaxia3.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/J9eHCOOLa', 'Admin', 'User', 'admin');

-- Insert test customer (password: customer123)
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('customer@example.com', '$2b$12$8K1p/kVGKpDH0WJ8XP5MWeE2AoX3eJ3U7P2h5QF6Cq5mH8a5K6vCu', 'John', 'Doe', 'customer');

-- Insert loyalty points for test customer
INSERT INTO loyalty_points (user_id, points, total_earned) VALUES
((SELECT id FROM users WHERE email = 'customer@example.com'), 150, 150);

-- Insert test address for customer
INSERT INTO user_addresses (user_id, street_address, city, state, postal_code, is_default) VALUES
((SELECT id FROM users WHERE email = 'customer@example.com'), '123 Main St', 'New York', 'NY', '10001', true);