-- Galaxia Obedy 3.0 - Database Schema
-- Stavový model pre plánovanie dodávok obedov

-- ============================================
-- 1. USERS - Používatelia
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,                    -- Adresa pre rozvoz
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. MENU_ITEMS - Knižnica jedál
-- ============================================
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    allergens TEXT[],                -- Pole alergénov
    deadline_type VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (deadline_type IN ('standard', 'express')),
    -- standard: deň vopred 14:30
    -- express: v daný deň 9:00
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. DAILY_MENU - Denná ponuka
-- ============================================
CREATE TABLE daily_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    menu_slot VARCHAR(20) NOT NULL CHECK (menu_slot IN ('MenuA', 'MenuB', 'Soup', 'Special')),
    deadline_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,  -- Vypočítaný čas uzávierky
    max_quantity INTEGER,              -- Voliteľný limit počtu porcií
    is_locked BOOLEAN DEFAULT false,   -- Zamknuté po uzávierke
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, menu_item_id)
);

-- ============================================
-- 4. DELIVERY_PLAN_ITEMS - KĽÚČOVÁ TABUĽKA (Živý plán)
-- ============================================
CREATE TABLE delivery_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    daily_menu_id UUID NOT NULL REFERENCES daily_menu(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, daily_menu_id)     -- Jeden záznam na používateľa a deň/jedlo
);

-- ============================================
-- 5. ORDER_HISTORY - História dodávok (archív)
-- ============================================
CREATE TABLE order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,                -- Dátum dodávky
    items_json JSONB NOT NULL,         -- [{name, quantity, price, total}, ...]
    total_price DECIMAL(10,2) NOT NULL,
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'invoiced', 'overdue')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. DELIVERY_SETTINGS - Nastavenia uzávierok
-- ============================================
CREATE TABLE delivery_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT
);

-- ============================================
-- INDEXY pre výkon
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_daily_menu_date ON daily_menu(date);
CREATE INDEX idx_daily_menu_item ON daily_menu(menu_item_id);
CREATE INDEX idx_daily_menu_date_slot ON daily_menu(date, menu_slot);

CREATE INDEX idx_delivery_plan_user ON delivery_plan_items(user_id);
CREATE INDEX idx_delivery_plan_daily ON delivery_plan_items(daily_menu_id);
CREATE INDEX idx_delivery_plan_user_daily ON delivery_plan_items(user_id, daily_menu_id);

CREATE INDEX idx_order_history_user ON order_history(user_id);
CREATE INDEX idx_order_history_date ON order_history(date);
CREATE INDEX idx_order_history_user_date ON order_history(user_id, date);

-- ============================================
-- TRIGGERY pre updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_menu_updated_at BEFORE UPDATE ON daily_menu
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_history_updated_at BEFORE UPDATE ON order_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pre aktualizáciu last_updated v delivery_plan_items
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_delivery_plan_last_updated BEFORE UPDATE ON delivery_plan_items
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

-- ============================================
-- POMOCNÉ FUNKCIE
-- ============================================

-- Funkcia na výpočet deadline pre jedlo
CREATE OR REPLACE FUNCTION calculate_deadline(
    p_date DATE,
    p_deadline_type VARCHAR(20)
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    v_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
    IF p_deadline_type = 'standard' THEN
        -- Deň vopred o 14:30
        v_deadline := (p_date - INTERVAL '1 day')::TIMESTAMP + INTERVAL '14 hours 30 minutes';
    ELSIF p_deadline_type = 'express' THEN
        -- V daný deň o 9:00
        v_deadline := p_date::TIMESTAMP + INTERVAL '9 hours';
    ELSE
        v_deadline := (p_date - INTERVAL '1 day')::TIMESTAMP + INTERVAL '14 hours 30 minutes';
    END IF;
    
    RETURN v_deadline;
END;
$$ language 'plpgsql';

-- Funkcia na kontrolu či je uzávierka prekonaná
CREATE OR REPLACE FUNCTION is_deadline_passed(p_daily_menu_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT deadline_timestamp INTO v_deadline
    FROM daily_menu
    WHERE id = p_daily_menu_id;
    
    RETURN v_deadline < NOW();
END;
$$ language 'plpgsql';

-- Funkcia na získanie súhrnu pre kuchyňu
CREATE OR REPLACE FUNCTION get_kitchen_summary(p_date DATE)
RETURNS TABLE (
    menu_item_name VARCHAR(255),
    total_quantity BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.name,
        COALESCE(SUM(dpi.quantity), 0)::BIGINT as total_quantity
    FROM daily_menu dm
    JOIN menu_items mi ON dm.menu_item_id = mi.id
    LEFT JOIN delivery_plan_items dpi ON dm.id = dpi.daily_menu_id
    WHERE dm.date = p_date
    GROUP BY mi.name
    ORDER BY mi.name;
END;
$$ language 'plpgsql';

-- Funkcia na získanie detailov pre rozvoz
CREATE OR REPLACE FUNCTION get_delivery_details(p_date DATE)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_address TEXT,
    user_phone VARCHAR(20),
    items JSONB,
    total_price DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        (u.first_name || ' ' || u.last_name)::TEXT,
        u.address,
        u.phone,
        jsonb_agg(jsonb_build_object(
            'item_name', mi.name,
            'quantity', dpi.quantity,
            'price', mi.price
        )) as items,
        SUM(dpi.quantity * mi.price) as total_price
    FROM delivery_plan_items dpi
    JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
    JOIN menu_items mi ON dm.menu_item_id = mi.id
    JOIN users u ON dpi.user_id = u.id
    WHERE dm.date = p_date
    GROUP BY u.id, u.first_name, u.last_name, u.address, u.phone
    ORDER BY u.last_name, u.first_name;
END;
$$ language 'plpgsql';
