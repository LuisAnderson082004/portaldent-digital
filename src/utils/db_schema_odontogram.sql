-- SQL Migration: Schema for public.odontogram_records and RLS policies
-- Cumple con la Norma Técnica del Odontograma del Colegio Odontológico del Perú (COP)

CREATE TABLE IF NOT EXISTS public.odontogram_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    tooth_id INTEGER NOT NULL, -- Nomenclatura FDI (ej. 18-48, 55-85)
    surface VARCHAR(20) NULL, -- 'buccal', 'lingual', 'mesial', 'distal', 'occlusal' o null (toda la pieza)
    tipo_hallazgo VARCHAR(10) NOT NULL, -- CC, CF, CMC, 3/4, CV, PF, PR, RR, TP, A, C, O, S
    estado BOOLEAN NOT NULL DEFAULT true, -- true = buen estado / azul, false = mal estado / rojo
    especificaciones TEXT NOT NULL, -- Notas clínicas obligatorias
    is_baseline BOOLEAN NOT NULL DEFAULT false, -- true = registro inicial (admission), false = evolución
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) -- Trazabilidad legal / Firma digital
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.odontogram_records ENABLE ROW LEVEL SECURITY;

-- 1. Política de Lectura (SELECT): Permitir a cualquier usuario autenticado de la clínica
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.odontogram_records;
CREATE POLICY "Allow select for authenticated users" ON public.odontogram_records
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 2. Política de Inserción (INSERT): Permitir solo si está autenticado y firma con su propio uid
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.odontogram_records;
CREATE POLICY "Allow insert for authenticated users" ON public.odontogram_records
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = author_id
    );

-- 3. Política de Actualización (UPDATE): Permitir solo si el baseline inicial no ha sido congelado aún
DROP POLICY IF EXISTS "Allow update if baseline not frozen" ON public.odontogram_records;
CREATE POLICY "Allow update if baseline not frozen" ON public.odontogram_records
    FOR UPDATE
    USING (
        auth.uid() = author_id
        AND COALESCE((SELECT (odontogram->>'baselineFrozen')::boolean FROM public.patients WHERE id = patient_id), false) = false
    );

-- 4. Política de Eliminación (DELETE): Permitir solo si el baseline inicial no ha sido congelado aún
DROP POLICY IF EXISTS "Allow delete if baseline not frozen" ON public.odontogram_records;
CREATE POLICY "Allow delete if baseline not frozen" ON public.odontogram_records
    FOR DELETE
    USING (
        auth.uid() = author_id
        AND COALESCE((SELECT (odontogram->>'baselineFrozen')::boolean FROM public.patients WHERE id = patient_id), false) = false
    );
