/* odontogramRules.js - Decoupled Clinical Rules and Nomenclatures for COP Odontogram */

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

const VALID_FDI_TEETH = new Set([
    // Adult teeth
    18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
    48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
    // Child teeth
    55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
    85, 84, 83, 82, 81, 71, 72, 73, 74, 75
]);

const VALID_SURFACES = new Set([
    'buccal', 'lingual', 'palatal', 'mesial', 'distal', 'occlusal', 'lingual'
]);

/**
 * Verifies that the tooth number and surface correspond to the FDI standard.
 */
export function isValidFDI(toothId, surface) {
    if (!VALID_FDI_TEETH.has(toothId)) {
        return false;
    }
    if (surface !== null && surface !== undefined && !VALID_SURFACES.has(surface)) {
        return false;
    }
    return true;
}

/**
 * Centralized clinical finding validations.
 * @param {Object} record - The finding data to test.
 * @param {Object} reconstructedState - Reconstructed { baseline, evolution } state for patient.
 */
export function validateClinicalFinding(record, reconstructedState) {
    const { tooth_id, tipo_hallazgo, surface, especificaciones } = record;
    const { baseline = {}, evolution = {} } = reconstructedState || {};

    if (!especificaciones || especificaciones.trim().length === 0) {
        throw new Error("El campo 'Especificaciones' (Rubro IX de la Norma Técnica) es de carácter obligatorio.");
    }

    if (!isValidFDI(tooth_id, surface)) {
        throw new Error(`AUDITORÍA DE INTEGRIDAD: La pieza dental ${tooth_id} o superficie ${surface} no cumplen con la nomenclatura FDI.`);
    }

    const baselineData = baseline[tooth_id] || { findings: [], surfaces: {} };
    const evolutionData = evolution[tooth_id] || { findings: [], surfaces: {} };

    const isAbsentInBaseline = baselineData.status === 'absent';
    const isExtractedInEvolution = evolutionData.status === 'extracted';

    // Block findings on absent/extracted teeth (except registering absence/extraction itself)
    if (tipo_hallazgo !== 'A' && (isAbsentInBaseline || isExtractedInEvolution)) {
        throw new Error(`VALIDACIÓN DE INTEGRIDAD: La pieza dental ${tooth_id} se encuentra marcada como AUSENTE o EXTRAÍDA. No se permiten hallazgos adicionales.`);
    }

    const config = HALLAZGOS_CONFIG[tipo_hallazgo];
    if (!config) {
        throw new Error("Hallazgo clínico no identificado en el catálogo de la norma técnica.");
    }

    // Validate that surface findings are only applied on surfaces, and whole-tooth findings on whole teeth
    if (config.isSurface && !surface) {
        throw new Error(`El hallazgo clínico ${config.name} (${tipo_hallazgo}) requiere seleccionar una superficie específica.`);
    }
    if (!config.isSurface && surface) {
        throw new Error(`El hallazgo clínico ${config.name} (${tipo_hallazgo}) se debe aplicar a toda la pieza dental, no a una superficie.`);
    }
}
