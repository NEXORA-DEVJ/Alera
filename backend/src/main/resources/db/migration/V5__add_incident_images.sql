-- ========================================================
-- ALERA - V5: Agregar soporte para imágenes de evidencia
-- ========================================================

ALTER TABLE community_incidents 
ADD COLUMN IF NOT EXISTS image_urls TEXT DEFAULT '';