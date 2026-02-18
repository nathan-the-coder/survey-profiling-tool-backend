-- Supabase migration: Separate parishes from users
-- Run this in your Supabase SQL Editor

-- Step 1: Create parishes table
CREATE TABLE IF NOT EXISTS parishes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    diocese VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add parish_id and role columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'parish';
ALTER TABLE users ADD COLUMN IF NOT EXISTS parish_id INTEGER REFERENCES parishes(id);

-- Step 3: Insert parishes
INSERT INTO parishes (name, diocese) VALUES
('St. Padre Pio of Pietrelcina Parish', 'Archdiocese of Tuguegarao'),
('Dana-ili, Immaculate Conception Parish', 'Archdiocese of Tuguegarao'),
('St. Thomas Aquinas Parish', 'Archdiocese of Tuguegarao'),
('St. Philomene Parish', 'Archdiocese of Tuguegarao'),
('Our Lady of Fatima Parish', 'Archdiocese of Tuguegarao'),
('Our Lady of the Most Holy Rosary Parish', 'Archdiocese of Tuguegarao'),
('Cordova, St. Vincent Ferrer Parish', 'Archdiocese of Tuguegarao'),
('St. Peter Gonzales of Thelmo Parish', 'Archdiocese of Tuguegarao'),
('Bukig, Mary, Mother of the Church Parish', 'Archdiocese of Tuguegarao'),
('Centro Baggao, St. Dominic de Guzman Parish', 'Archdiocese of Tuguegarao'),
('San Jose, St. Joseph the Worker Parish and Shrines', 'Archdiocese of Tuguegarao'),
('Tallang, Our Lady of Peace and Good Voyage Parish', 'Archdiocese of Tuguegarao'),
('Holy Cross Parish', 'Archdiocese of Tuguegarao'),
('St. Anne Parish', 'Archdiocese of Tuguegarao'),
('St. Bartholomew Parish', 'Archdiocese of Tuguegarao'),
('St. Hyacinth of Poland Parish', 'Archdiocese of Tuguegarao'),
('Dugo, St. Isidore the Farmer Parish', 'Archdiocese of Tuguegarao'),
('St. Vincent Ferrer Parish (Camiguin)', 'Archdiocese of Tuguegarao'),
('St. Vincent Ferrer Parish (Solana)', 'Archdiocese of Tuguegarao'),
('St. Joseph Parish', 'Archdiocese of Tuguegarao'),
('Our Lady of Snows Parish', 'Archdiocese of Tuguegarao'),
('St. Catherine of Alexandria Parish', 'Archdiocese of Tuguegarao'),
('St. Roch Parish (Gonzaga)', 'Archdiocese of Tuguegarao'),
('San Isidro Labrador Parish Church (Nabaccayan)', 'Archdiocese of Tuguegarao'),
('St. James the Apostle Parish', 'Archdiocese of Tuguegarao'),
('St. Dominic de Guzman Parish', 'Archdiocese of Tuguegarao'),
('Magapit, Our Lady of the Miraculous Medal Parish', 'Archdiocese of Tuguegarao'),
('San Isidro Labrador Parish (Lasam)', 'Archdiocese of Tuguegarao'),
('St. Peter the Martyr Parish', 'Archdiocese of Tuguegarao'),
('St. Dominic de Guzman Parish — Basilica Minore of Our Lady of Piat', 'Archdiocese of Tuguegarao'),
('St. Joseph, Husband of Mary Parish', 'Archdiocese of Tuguegarao'),
('Our Mother of Perpetual Help Parish (Nannarian, Peñablanca)', 'Archdiocese of Tuguegarao'),
('St. Raymund Peñafort Parish', 'Archdiocese of Tuguegarao'),
('Mauanan, St. Francis of Assisi Parish', 'Archdiocese of Tuguegarao'),
('Sto. Niño Parish – Archdiocesan Shrine of Sto. Niño', 'Archdiocese of Tuguegarao'),
('Sto. Niño Parish (Faire)', 'Archdiocese of Tuguegarao'),
('St. Roch Parish (Sanchez Mira)', 'Archdiocese of Tuguegarao'),
('Our Lady of Perpetual Help Parish (Namuac)', 'Archdiocese of Tuguegarao'),
('Holy Family Parish (Gadu, Solana)', 'Archdiocese of Tuguegarao'),
('St. Anthony de Padua Parish', 'Archdiocese of Tuguegarao'),
('Casambalangan, Sts. Peter and Paul Parish', 'Archdiocese of Tuguegarao'),
('San Isidro Labrador Parish (Sta. Praxedes)', 'Archdiocese of Tuguegarao'),
('Sta. Rosa de Lima Parish (under Tuguegarao City)', 'Archdiocese of Tuguegarao'),
('Our Lady of the Angels Parish', 'Archdiocese of Tuguegarao'),
('Holy Guardian Angels Parish', 'Archdiocese of Tuguegarao'),
('Naruangan, San Roque Parish', 'Archdiocese of Tuguegarao'),
('Annafunan, Sta. Rosa de Lima Parish', 'Archdiocese of Tuguegarao'),
('Cataggaman, St. Dominic de Guzman Parish', 'Archdiocese of Tuguegarao'),
('Leonarda, Parish of the Divine Mercy of Our Lord Jesus Christ', 'Archdiocese of Tuguegarao'),
('San Gabriel, Sto. Niño Parish – Archdiocesan Shrine of Sto. Niño', 'Archdiocese of Tuguegarao'),
('St. Peter''s Metropolitan Cathedral', 'Archdiocese of Tuguegarao')
ON CONFLICT (name) DO NOTHING;

-- Step 4: Update existing users to link to parishes
UPDATE users 
SET role = 'parish', 
    parish_id = (SELECT id FROM parishes WHERE name = users.username LIMIT 1)
WHERE username IN (SELECT name FROM parishes);

-- Step 5: Update admin user
UPDATE users SET role = 'admin', parish_id = NULL WHERE username = 'SJCB_Admin';
INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (username) DO UPDATE SET role = 'admin';

-- Step 6: Remove organizations columns from socio_economic (now in family_members)
ALTER TABLE socio_economic DROP COLUMN IF EXISTS organizations;
ALTER TABLE socio_economic DROP COLUMN IF EXISTS organizations_others_text;

-- Add organization column to family_members if not exists
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS organization_code TEXT;
