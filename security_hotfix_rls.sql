-- =========================================================================
-- SQL SECURITY HOTFIX: POLÍTICAS DE RLS PARA ORTODONCIA
-- Copie y ejecute este script en el SQL Editor de Supabase para cerrar la brecha de seguridad.
-- =========================================================================

-- 1. Asegurar RLS habilitado en ambas tablas
ALTER TABLE IF EXISTS public.orthodontic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orthodontic_monthly_controls ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas inseguras existentes para orthodontic_records
DROP POLICY IF EXISTS "Allow public read access for orthodontic_records" ON public.orthodontic_records;
DROP POLICY IF EXISTS "Allow public insert for orthodontic_records" ON public.orthodontic_records;
DROP POLICY IF EXISTS "Allow public update for orthodontic_records" ON public.orthodontic_records;
DROP POLICY IF EXISTS "Allow public delete for orthodontic_records" ON public.orthodontic_records;

-- 3. Crear políticas seguras para orthodontic_records (Solo personal autenticado)
CREATE POLICY "Allow authenticated read for orthodontic_records"
ON public.orthodontic_records FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert for orthodontic_records"
ON public.orthodontic_records FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update for orthodontic_records"
ON public.orthodontic_records FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete for orthodontic_records"
ON public.orthodontic_records FOR DELETE
USING (auth.role() = 'authenticated');


-- 4. Limpiar políticas inseguras existentes para orthodontic_monthly_controls
DROP POLICY IF EXISTS "Allow public read access for orthodontic_monthly_controls" ON public.orthodontic_monthly_controls;
DROP POLICY IF EXISTS "Allow public insert for orthodontic_monthly_controls" ON public.orthodontic_monthly_controls;
DROP POLICY IF EXISTS "Allow public update for orthodontic_monthly_controls" ON public.orthodontic_monthly_controls;
DROP POLICY IF EXISTS "Allow public delete for orthodontic_monthly_controls" ON public.orthodontic_monthly_controls;

-- 5. Crear políticas seguras para orthodontic_monthly_controls (Solo personal autenticado)
CREATE POLICY "Allow authenticated read for orthodontic_monthly_controls"
ON public.orthodontic_monthly_controls FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert for orthodontic_monthly_controls"
ON public.orthodontic_monthly_controls FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update for orthodontic_monthly_controls"
ON public.orthodontic_monthly_controls FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete for orthodontic_monthly_controls"
ON public.orthodontic_monthly_controls FOR DELETE
USING (auth.role() = 'authenticated');

COMMIT;
