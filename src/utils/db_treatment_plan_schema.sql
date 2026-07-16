-- Migration Script: Treatments Catalog & Patient Treatment Plan Schema

-- 1. Create treatments_catalog table
CREATE TABLE IF NOT EXISTS public.treatments_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    precio_soles DECIMAL(10, 2) NOT NULL CHECK (precio_soles >= 0),
    precio_dolares DECIMAL(10, 2) NOT NULL CHECK (precio_dolares >= 0),
    categoria VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for catalog
ALTER TABLE public.treatments_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users" ON public.treatments_catalog
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow write for admin users" ON public.treatments_catalog
    FOR ALL USING (
        COALESCE(
            (SELECT role FROM public.profiles WHERE id = auth.uid()), 
            'receptionist'
        ) = 'admin'
    );

-- 2. Create patient_treatment_plan table
CREATE TABLE IF NOT EXISTS public.patient_treatment_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    treatment_id UUID NOT NULL REFERENCES public.treatments_catalog(id) ON DELETE RESTRICT,
    tooth_id INTEGER NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'realizado')),
    fecha_ejecucion TIMESTAMPTZ NULL,
    precio_soles_aplicado DECIMAL(10, 2) NOT NULL, -- Preserves historical cost
    precio_dolares_aplicado DECIMAL(10, 2) NOT NULL, -- Preserves historical cost
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for treatment plan
ALTER TABLE public.patient_treatment_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read treatment plan for authenticated users" ON public.patient_treatment_plan
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow modify treatment plan for authenticated users" ON public.patient_treatment_plan
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Seed data for treatments_catalog
INSERT INTO public.treatments_catalog (nombre, precio_soles, precio_dolares, categoria)
VALUES 
    ('Profilaxis Dental Simple', 80.00, 22.00, 'Preventiva'),
    ('Curación Resina Compuesta Simple', 120.00, 32.50, 'Restauradora'),
    ('Endodoncia Monorradicular', 350.00, 95.00, 'Endodoncia'),
    ('Endodoncia Multirradicular', 550.00, 150.00, 'Endodoncia'),
    ('Extracción Dental Simple', 100.00, 27.00, 'Cirugía'),
    ('Corona de Porcelana Prensada', 850.00, 230.00, 'Rehabilitación'),
    ('Blanqueamiento Dental Láser', 400.00, 110.00, 'Estética'),
    ('Instalación de Brackets Metálicos', 1500.00, 405.00, 'Ortodoncia')
ON CONFLICT (nombre) DO NOTHING;
