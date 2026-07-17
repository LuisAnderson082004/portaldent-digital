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
    ('Consulta dental', 50.00, 0.00, 'Preventiva'),
    ('Profilaxis dental simple', 100.00, 0.00, 'Preventiva'),
    ('Profilaxis dental con destartraje', 150.00, 0.00, 'Preventiva'),
    ('Fluorización', 50.00, 0.00, 'Preventiva'),
    ('Sellantes dentales', 50.00, 0.00, 'Preventiva'),
    ('Resina simple', 70.00, 0.00, 'Restauradora'),
    ('Resina compuesta', 90.00, 0.00, 'Restauradora'),
    ('Resina compleja', 120.00, 0.00, 'Restauradora'),
    ('Carilla de resina', 180.00, 0.00, 'Restauradora'),
    ('Ionomero', 80.00, 0.00, 'Restauradora'),
    ('Incrustación de resina', 180.00, 0.00, 'Restauradora'),
    ('Corona metal porcelana', 450.00, 0.00, 'Rehabilitación'),
    ('Corona disilicato de litio', 600.00, 0.00, 'Rehabilitación'),
    ('Corona de zirconio', 700.00, 0.00, 'Rehabilitación'),
    ('Corona veneer acrílico', 250.00, 0.00, 'Rehabilitación'),
    ('Corona metálica', 200.00, 0.00, 'Rehabilitación'),
    ('Poste de fibra de vidrio', 200.00, 0.00, 'Rehabilitación'),
    ('Prótesis parcial removible metálica sup o inf (Olympic)', 1600.00, 0.00, 'Rehabilitación'),
    ('Prótesis parcial removible metálica sup o inf (Ortolux)', 1800.00, 0.00, 'Rehabilitación'),
    ('Prótesis parcial removible acrílica sup o inf', 800.00, 0.00, 'Rehabilitación'),
    ('Prótesis completa sup o inf (Olympic)', 800.00, 0.00, 'Rehabilitación'),
    ('Prótesis completa sup o inf (Ortolux)', 900.00, 0.00, 'Rehabilitación'),
    ('Prótesis removibles provisionales sup o inf', 300.00, 0.00, 'Rehabilitación'),
    ('Reparación de prótesis', 150.00, 0.00, 'Rehabilitación'),
    ('Endodoncia monoradicular', 350.00, 0.00, 'Endodoncia'),
    ('Endodoncia biradicular', 450.00, 0.00, 'Endodoncia'),
    ('Endodoncia multiradicular', 600.00, 0.00, 'Endodoncia'),
    ('Pulpotomía', 250.00, 0.00, 'Endodoncia'),
    ('Pulpectomía monoradicular', 300.00, 0.00, 'Endodoncia'),
    ('Pulpectomía multiradicular', 400.00, 0.00, 'Endodoncia'),
    ('Exodoncia dental deciduo', 50.00, 0.00, 'Cirugía'),
    ('Exodoncia dental simple', 80.00, 0.00, 'Cirugía'),
    ('Exodoncia dental simple con sutura', 120.00, 0.00, 'Cirugía'),
    ('Exodoncia dental compleja', 250.00, 0.00, 'Cirugía'),
    ('Exodoncia de 3ra semi impactada', 400.00, 0.00, 'Cirugía'),
    ('Exodoncia de 3ra impactada', 500.00, 0.00, 'Cirugía'),
    ('Ortodoncia leve', 3500.00, 0.00, 'Ortodoncia'),
    ('Ortodoncia moderada', 4250.00, 0.00, 'Ortodoncia'),
    ('Ortodoncia compleja', 5500.00, 0.00, 'Ortodoncia'),
    ('Contensión fija superior o inferior', 350.00, 0.00, 'Ortodoncia'),
    ('Placa de contensión o férula', 350.00, 0.00, 'Ortodoncia'),
    ('Reposición de bracket', 50.00, 0.00, 'Ortodoncia'),
    ('Blanqueamiento dental 1 sesión', 350.00, 0.00, 'Estética'),
    ('Blanqueamiento dental 2 sesiones', 450.00, 0.00, 'Estética'),
    ('Blanqueamiento dental interno', 200.00, 0.00, 'Estética'),
    ('Cementado de corona', 50.00, 0.00, 'Rehabilitación'),
    ('Implante dental', 0.00, 1000.00, 'Rehabilitación'),
    ('Hueso por gramo', 0.00, 120.00, 'Cirugía')
ON CONFLICT (nombre) DO UPDATE SET 
    precio_soles = EXCLUDED.precio_soles, 
    precio_dolares = EXCLUDED.precio_dolares, 
    categoria = EXCLUDED.categoria;
