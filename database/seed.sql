-- Galaxia Obedy 3.0 - Seed Data

-- ============================================
-- NASTAVENIA UZÁVIEROK
-- ============================================
INSERT INTO delivery_settings (setting_key, setting_value, description) VALUES
('standard_deadline_time', '14:30', 'Čas uzávierky pre štandardné objednávky (deň vopred)'),
('express_deadline_time', '09:00', 'Čas uzávierky pre expresné objednávky (v daný deň)'),
('planning_horizon_days', '14', 'Koľko dní dopredu sa zobrazuje jedálny lístok'),
('currency', 'EUR', 'Mena pre zobrazovanie cien');

-- ============================================
-- POUŽÍVATELIA
-- ============================================
-- Heslo pre všetkých testovacích používateľov: "password123"
-- Hash: $2b$10$YourHashHere (v produkcii použiť bcrypt)

INSERT INTO users (email, password_hash, first_name, last_name, phone, address, role) VALUES
('admin@galaxia.sk', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Galaxia', '+421900000001', 'Hlavná 1, Bratislava', 'admin'),
('kuchar@galaxia.sk', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ján', 'Kuchár', '+421900000002', 'Kuchynská 5, Bratislava', 'staff'),
('rozvoz@galaxia.sk', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Peter', 'Rozvoz', '+421900000003', 'Rozvozová 10, Bratislava', 'staff'),
('klient1@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mária', 'Nováková', '+421911111111', 'Nováková 15, Bratislava', 'customer'),
('klient2@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jozef', 'Kováč', '+421922222222', 'Kováčska 22, Bratislava', 'customer'),
('klient3@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Anna', 'Horváthová', '+421933333333', 'Horváthova 8, Bratislava', 'customer');

-- ============================================
-- KNIŽNICA JEDÁL
-- ============================================
INSERT INTO menu_items (name, description, price, allergens, deadline_type, is_active) VALUES
-- Menu A - Štandardné
('Kurací rezeň s ryžou', 'Kurací rezeň v trojobale, dusená ryža, uhorkový šalát', 6.50, ARRAY['lepk', 'vajc', 'mlie'], 'standard', true),
('Bravčový guláš s knedľou', 'Tradičný bravčový guláš, domáca knedľa', 7.20, ARRAY['lepk', 'mlie'], 'standard', true),
('Vyprážaný syr s hranolkami', 'Vyprážaný eidam, hranolky, tatárska omáčka', 6.80, ARRAY['lepk', 'mlie', 'vajc'], 'standard', true),
('Pečené kuracie stehno', 'Pečené kuracie stehno, zemiakový šalát', 7.50, ARRAY['vajc'], 'standard', true),

-- Menu B - Alternatíva
('Ryža s hubami', 'Hlivové rizoto s parmezánom', 6.00, ARRAY['mlie'], 'standard', true),
('Zeleninové lasagne', 'Lasagne so špenátom a ricottou', 6.50, ARRAY['lepk', 'mlie', 'vajc'], 'standard', true),
('Quinoa šalát', 'Quinoa s pečenou zeleninou a fetou', 6.20, ARRAY['mlie'], 'standard', true),
('Tofu stir-fry', 'Tofu s miešanou zeleninou a ryžou', 6.00, ARRAY['sója'], 'standard', true),

-- Polievky
('Slepačí vývar s rezancami', 'Tradičný slepačí vývar, domáce rezance', 2.50, ARRAY['lepk', 'vajc'], 'standard', true),
('Paradajková polievka', 'Krémová paradajková polievka s bazalkou', 2.50, ARRAY['mlie'], 'standard', true),
('Šampiňónová polievka', 'Krémová šampiňónová polievka', 2.50, ARRAY['mlie'], 'standard', true),
('Hráškový krém', 'Jemný hráškový krém s mätou', 2.50, ARRAY['mlie'], 'standard', true),

-- Špeciálne (expresné)
('Cesnaková polievka', 'Sýta cesnaková polievka s chlebom', 3.00, ARRAY['lepk', 'mlie'], 'express', true),
('Šunková bageta', 'Bageta so šunkou a syrom', 4.50, ARRAY['lepk', 'mlie'], 'express', true),
('Croissant', 'Maslový croissant', 2.00, ARRAY['lepk', 'mlie', 'vajc'], 'express', true),
('Jogurt s ovocím', 'Grécky jogurt s čerstvým ovocím', 3.50, ARRAY['mlie'], 'express', true);

-- ============================================
-- DENNÁ PONUKA (pre nasledujúcich 7 dní)
-- ============================================
DO $$
DECLARE
    v_date DATE;
    v_item RECORD;
BEGIN
    -- Vytvoríme dennú ponuku pre nasledujúcich 7 dní
    FOR i IN 0..6 LOOP
        v_date := CURRENT_DATE + i;
        
        -- Pondelok - Menu A: Kurací rezeň, Menu B: Ryža s hubami, Polievka: Slepačí vývar
        IF EXTRACT(DOW FROM v_date) = 1 THEN
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'MenuA', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Kurací rezeň s ryžou';
            
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'MenuB', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Ryža s hubami';
            
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'Soup', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Slepačí vývar s rezancami';
            
        -- Utorok - Menu A: Bravčový guláš, Menu B: Zeleninové lasagne, Polievka: Paradajková
        ELSIF EXTRACT(DOW FROM v_date) = 2 THEN
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'MenuA', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Bravčový guláš s knedľou';
            
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'MenuB', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Zeleninové lasagne';
            
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'Soup', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Paradajková polievka';
            
        -- Streda - Menu A: Vyprážaný syr, Menu B: Quinoa šalát, Polievka: Šampiňónová
        ELSIF EXTRACT(DOW FROM v_date) = 3 THEN
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'MenuA', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Vyprážaný syr s hranolkami';
            
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'MenuB', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Quinoa šalát';
            
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'Soup', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Šampiňónová polievka';
            
        -- Štvrtok - Menu A: Pečené kuracie stehno, Menu B: Tofu stir-fry, Polievka: Hráškový krém
        ELSIF EXTRACT(DOW FROM v_date) = 4 THEN
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'MenuA', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Pečené kuracie stehno';
            
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'MenuB', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Tofu stir-fry';
            
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'Soup', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Hráškový krém';
            
        -- Piatok - Menu A: Kurací rezeň, Menu B: Ryža s hubami, Polievka: Slepačí vývar
        ELSIF EXTRACT(DOW FROM v_date) = 5 THEN
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'MenuA', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Kurací rezeň s ryžou';
            
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'MenuB', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Ryža s hubami';
            
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'Soup', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE name = 'Slepačí vývar s rezancami';
            
        -- Víkend - expresné položky
        ELSE
            INSERT INTO daily_menu (date, menu_item_id, menu_slot, deadline_timestamp)
            SELECT v_date, id, 'Special', calculate_deadline(v_date, deadline_type)
            FROM menu_items WHERE deadline_type = 'express';
        END IF;
    END LOOP;
END $$;

-- ============================================
-- UKÁŽKOVÉ PLÁNY DODÁVOK (pre testovanie)
-- ============================================
-- Mária Nováková má objednané na zajtra
INSERT INTO delivery_plan_items (user_id, daily_menu_id, quantity)
SELECT 
    (SELECT id FROM users WHERE email = 'klient1@example.com'),
    dm.id,
    1
FROM daily_menu dm
WHERE dm.date = CURRENT_DATE + 1 AND dm.menu_slot = 'MenuA';

INSERT INTO delivery_plan_items (user_id, daily_menu_id, quantity)
SELECT 
    (SELECT id FROM users WHERE email = 'klient1@example.com'),
    dm.id,
    1
FROM daily_menu dm
WHERE dm.date = CURRENT_DATE + 1 AND dm.menu_slot = 'Soup';

-- Jozef Kováč má objednané na pozajtra
INSERT INTO delivery_plan_items (user_id, daily_menu_id, quantity)
SELECT 
    (SELECT id FROM users WHERE email = 'klient2@example.com'),
    dm.id,
    2
FROM daily_menu dm
WHERE dm.date = CURRENT_DATE + 2 AND dm.menu_slot = 'MenuA';

-- Anna Horváthová má objednané na viac dní dopredu
INSERT INTO delivery_plan_items (user_id, daily_menu_id, quantity)
SELECT 
    (SELECT id FROM users WHERE email = 'klient3@example.com'),
    dm.id,
    1
FROM daily_menu dm
WHERE dm.date IN (CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3) AND dm.menu_slot = 'MenuB';
