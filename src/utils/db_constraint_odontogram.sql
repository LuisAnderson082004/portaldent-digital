-- SQL migration to enforce clinical catalog integrity for COP findings

ALTER TABLE public.odontogram_records 
DROP CONSTRAINT IF EXISTS check_tipo_hallazgo;

ALTER TABLE public.odontogram_records 
ADD CONSTRAINT check_tipo_hallazgo 
CHECK (tipo_hallazgo IN (
    'AOF', -- 1.1 Aparato Ortodóntico Fijo
    'AOR', -- 1.2 Aparato Ortodóntico Removible
    'C',   -- 1.3 Caries
    'CD',  -- 1.4 Corona Definitiva
    'CT',  -- 1.5 Corona Temporal
    'DES', -- 1.6 Desgaste Oclusal/Incisal
    'DIA', -- 1.7 Diastema
    'A',   -- 1.8 Diente Ausente / Extracción
    'DIS', -- 1.9 Diente Discromico
    'ECT', -- 1.10 Diente Ectópico
    'CLV', -- 1.11 Diente en Clavija
    'EXT', -- 1.12 Diente Extruido
    'INT', -- 1.13 Diente Intruido
    'EDT', -- 1.14 Edéntulo Total
    'FRA', -- 1.15 Fractura
    'GEM', -- 1.16 Geminación/Fusión
    'GIR', -- 1.17 Giroversión
    'IMPAC', -- 1.18 Impactación
    'IMP', -- 1.19 Implante
    'MAC', -- 1.20 Macrodoncia
    'MIC', -- 1.21 Microdoncia
    'MIG', -- 1.22 Migración
    'MOV', -- 1.23 Movilidad
    'PF',  -- 1.24 Prótesis Fija
    'PR',  -- 1.25 Prótesis Removible
    'PT',  -- 1.26 Prótesis Total
    'RR',  -- 1.27 Remanente Radicular
    'R',   -- 1.28 Restauración Definitiva
    'RT',  -- 1.29 Restauración Temporal
    'SI',  -- 1.30 Semi-impactación
    'SUP', -- 1.31 Supernumerario
    'TRA', -- 1.32 Transposición
    'TP',  -- 1.33 Tratamiento Pulpar
    'S'    -- Sellante Preventivo
));
