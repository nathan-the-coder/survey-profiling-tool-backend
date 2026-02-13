-- Migration: Update schema for multi-select checkbox fields
-- Date: 2026-02-13
-- Description: Change varchar(2) fields to TEXT to support multiple comma-separated values

-- ============================================
-- family_members table updates
-- ============================================

-- Change sacraments_code from varchar(2) to TEXT for multiple selections
ALTER TABLE family_members 
ALTER COLUMN sacraments_code TYPE TEXT;

-- Add organization_code field (TEXT for multiple selections)
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS organization_code TEXT;

-- Add position field
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS position VARCHAR(255);

-- ============================================
-- health_conditions table updates
-- ============================================

-- Change treatment_source_code to TEXT for multiple selections
ALTER TABLE health_conditions 
ALTER COLUMN treatment_source_code TYPE TEXT;

-- Change potable_water_source_code to TEXT for multiple selections
ALTER TABLE health_conditions 
ALTER COLUMN potable_water_source_code TYPE TEXT;

-- Change lighting_source_code to TEXT for multiple selections
ALTER TABLE health_conditions 
ALTER COLUMN lighting_source_code TYPE TEXT;

-- Change cooking_source_code to TEXT for multiple selections
ALTER TABLE health_conditions 
ALTER COLUMN cooking_source_code TYPE TEXT;

-- Change garbage_disposal_code to TEXT for multiple selections
ALTER TABLE health_conditions 
ALTER COLUMN garbage_disposal_code TYPE TEXT;

-- Change toilet_facility_code to TEXT for multiple selections
ALTER TABLE health_conditions 
ALTER COLUMN toilet_facility_code TYPE TEXT;

-- ============================================
-- socio_economic table updates
-- ============================================

-- Change savings_location_code to TEXT for multiple selections
ALTER TABLE socio_economic 
ALTER COLUMN savings_location_code TYPE TEXT;

-- Change house_lot_ownership_code to TEXT for multiple selections
ALTER TABLE socio_economic 
ALTER COLUMN house_lot_ownership_code TYPE TEXT;

-- Change house_classification_code to TEXT for multiple selections
ALTER TABLE socio_economic 
ALTER COLUMN house_classification_code TYPE TEXT;

-- ============================================
-- Rollback (if needed)
-- ============================================
-- To rollback these changes, run:
-- ALTER TABLE family_members ALTER COLUMN sacraments_code TYPE VARCHAR(2);
-- ALTER TABLE health_conditions ALTER COLUMN treatment_source_code TYPE VARCHAR(2);
-- ALTER TABLE health_conditions ALTER COLUMN potable_water_source_code TYPE VARCHAR(2);
-- ALTER TABLE health_conditions ALTER COLUMN lighting_source_code TYPE VARCHAR(2);
-- ALTER TABLE health_conditions ALTER COLUMN cooking_source_code TYPE VARCHAR(2);
-- ALTER TABLE health_conditions ALTER COLUMN garbage_disposal_code TYPE VARCHAR(2);
-- ALTER TABLE health_conditions ALTER COLUMN toilet_facility_code TYPE VARCHAR(2);
-- ALTER TABLE socio_economic ALTER COLUMN savings_location_code TYPE VARCHAR(2);
-- ALTER TABLE socio_economic ALTER COLUMN house_lot_ownership_code TYPE VARCHAR(2);
-- ALTER TABLE socio_economic ALTER COLUMN house_classification_code TYPE VARCHAR(2);
-- Note: organization_code and position columns need to be dropped manually if needed
