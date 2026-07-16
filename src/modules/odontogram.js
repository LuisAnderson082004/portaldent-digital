/* odontogram.js - Logic & Validations for Interactive Dental Chart (FDI / COP Norms) */

export const HALLAZGOS_CONFIG = {
    'AOF': { code: 'AOF', name: 'Aparato Ortodóntico Fijo', label: '1.1 AOF', isSurface: false, defaultColor: 'azul' },
    'AOR': { code: 'AOR', name: 'Aparato Ortodóntico Removible', label: '1.2 AOR', isSurface: false, defaultColor: 'azul' },
    'C': { code: 'C', name: 'Caries', label: '1.3 C', isSurface: true, defaultColor: 'rojo' },
    'CD': { code: 'CD', name: 'Corona Definitiva', label: '1.4 CD', isSurface: false, defaultColor: 'azul' },
    'CT': { code: 'CT', name: 'Corona Temporal', label: '1.5 CT', isSurface: false, defaultColor: 'rojo' },
    'DES': { code: 'DES', name: 'Desgaste Oclusal/Incisal', label: '1.6 DES', isSurface: false, defaultColor: 'rojo' },
    'DIA': { code: 'DIA', name: 'Diastema', label: '1.7 DIA', isSurface: false, defaultColor: 'azul' },
    'A': { code: 'A', name: 'Diente Ausente', label: '1.8 A', isSurface: false, defaultColor: 'azul' },
    'DIS': { code: 'DIS', name: 'Diente Discromico', label: '1.9 DIS', isSurface: false, defaultColor: 'rojo' },
    'ECT': { code: 'ECT', name: 'Diente Ectópico', label: '1.10 ECT', isSurface: false, defaultColor: 'rojo' },
    'CLV': { code: 'CLV', name: 'Diente en Clavija', label: '1.11 CLV', isSurface: false, defaultColor: 'azul' },
    'EXT': { code: 'EXT', name: 'Diente Extruido', label: '1.12 EXT', isSurface: false, defaultColor: 'rojo' },
    'INT': { code: 'INT', name: 'Diente Intruido', label: '1.13 INT', isSurface: false, defaultColor: 'rojo' },
    'EDT': { code: 'EDT', name: 'Edéntulo Total', label: '1.14 EDT', isSurface: false, defaultColor: 'azul' },
    'FRA': { code: 'FRA', name: 'Fractura', label: '1.15 FRA', isSurface: false, defaultColor: 'rojo' },
    'GEM': { code: 'GEM', name: 'Geminación/Fusión', label: '1.16 GEM', isSurface: false, defaultColor: 'azul' },
    'GIR': { code: 'GIR', name: 'Giroversión', label: '1.17 GIR', isSurface: false, defaultColor: 'rojo' },
    'IMPAC': { code: 'IMPAC', name: 'Impactación', label: '1.18 IMPAC', isSurface: false, defaultColor: 'rojo' },
    'IMP': { code: 'IMP', name: 'Implante', label: '1.19 IMP', isSurface: false, defaultColor: 'azul' },
    'MAC': { code: 'MAC', name: 'Macrodoncia', label: '1.20 MAC', isSurface: false, defaultColor: 'rojo' },
    'MIC': { code: 'MIC', name: 'Microdoncia', label: '1.21 MIC', isSurface: false, defaultColor: 'rojo' },
    'MIG': { code: 'MIG', name: 'Migración', label: '1.22 MIG', isSurface: false, defaultColor: 'rojo' },
    'MOV': { code: 'MOV', name: 'Movilidad', label: '1.23 MOV', isSurface: false, defaultColor: 'rojo' },
    'PF': { code: 'PF', name: 'Prótesis Fija', label: '1.24 PF', isSurface: false, defaultColor: 'azul' },
    'PR': { code: 'PR', name: 'Prótesis Removible', label: '1.25 PR', isSurface: false, defaultColor: 'azul' },
    'PT': { code: 'PT', name: 'Prótesis Total', label: '1.26 PT', isSurface: false, defaultColor: 'azul' },
    'RR': { code: 'RR', name: 'Remanente Radicular', label: '1.27 RR', isSurface: false, defaultColor: 'rojo' },
    'R': { code: 'R', name: 'Restauración Definitiva', label: '1.28 R', isSurface: true, defaultColor: 'azul' },
    'RT': { code: 'RT', name: 'Restauración Temporal', label: '1.29 RT', isSurface: true, defaultColor: 'rojo' },
    'SI': { code: 'SI', name: 'Semi-impactación', label: '1.30 SI', isSurface: false, defaultColor: 'rojo' },
    'SUP': { code: 'SUP', name: 'Supernumerario', label: '1.31 SUP', isSurface: false, defaultColor: 'azul' },
    'TRA': { code: 'TRA', name: 'Transposición', label: '1.32 TRA', isSurface: false, defaultColor: 'rojo' },
    'TP': { code: 'TP', name: 'Tratamiento Pulpar', label: '1.33 TP', isSurface: false, defaultColor: 'azul' }
};

/**
 * Rebuilds the structured dental arch state from atomic database records.
 * @param {Array} records - List of public.odontogram_records rows
 * @returns {Object} { baseline: {...}, evolution: {...} }
 */
export function reconstructOdontogramState(records) {
    const baseline = {};
    const evolution = {};

    // Sort records sequentially by created_at to apply them in order
    const sorted = [...records].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    sorted.forEach(r => {
        const tId = r.tooth_id;
        const target = r.is_baseline ? baseline : evolution;

        if (!target[tId]) {
            target[tId] = {
                findings: [],
                surfaces: {}
            };
        }

        const findingObj = {
            id: r.id,
            tipo: r.tipo_hallazgo,
            estado: r.estado,
            especificaciones: r.especificaciones,
            surface: r.surface,
            created_at: r.created_at
        };

        if (r.surface) {
            target[tId].surfaces[r.surface] = findingObj;
        } else {
            // Specific status flags
            if (r.tipo_hallazgo === 'A') {
                target[tId].status = r.is_baseline ? 'absent' : 'extracted';
            }
            target[tId].findings.push(findingObj);
        }
    });

    return { baseline, evolution };
}

/**
 * Validates clinical constraints prior to registering a new finding.
 */
export function validateFinding(findingData, currentArchState) {
    const { toothId, tipo_hallazgo, especificaciones } = findingData;
    const { baseline, evolution } = currentArchState;

    if (!especificaciones || especificaciones.trim().length === 0) {
        throw new Error("El campo 'Especificaciones' (Rubro IX de la Norma Técnica) es de carácter obligatorio.");
    }

    const baselineData = baseline[toothId] || { findings: [], surfaces: {} };
    const evolutionData = evolution[toothId] || { findings: [], surfaces: {} };

    const isAbsentInBaseline = baselineData.status === 'absent';
    const isExtractedInEvolution = evolutionData.status === 'extracted';

    // Block findings on absent/extracted teeth (except registering absence/extraction itself)
    if (tipo_hallazgo !== 'A' && (isAbsentInBaseline || isExtractedInEvolution)) {
        throw new Error(`VALIDACIÓN DE INTEGRIDAD: La pieza dental ${toothId} se encuentra marcada como AUSENTE o EXTRAÍDA. No se permite registrar hallazgos o tratamientos en ella.`);
    }

    const config = HALLAZGOS_CONFIG[tipo_hallazgo];
    if (!config) {
        throw new Error("Hallazgo clínico no identificado.");
    }
}

/**
 * Freezes the baseline/admission state.
 */
export function saveBaselineState(patient) {
    if (patient.odontogram && patient.odontogram.baselineFrozen) {
        throw new Error("El estado inicial de admisión ya se encuentra congelado.");
    }
    if (!patient.odontogram) {
        patient.odontogram = {};
    }
    patient.odontogram.baselineFrozen = true;
}
