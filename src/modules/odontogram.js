/* odontogram.js - Logic & Validations for Interactive Dental Chart (FDI / COP Norms) */

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

        if (r.tipo_hallazgo === 'A') {
            if (r.is_baseline) {
                baseline[tId] = 'absent';
            } else {
                evolution[tId] = { status: 'extracted', especificaciones: r.especificaciones, id: r.id };
            }
        } else if (['CC', 'CF', 'CMC', '3/4', 'CV'].includes(r.tipo_hallazgo)) {
            target[tId] = { status: 'crown', type: r.tipo_hallazgo, estado: r.estado, especificaciones: r.especificaciones, id: r.id };
        } else if (['PF', 'PR'].includes(r.tipo_hallazgo)) {
            target[tId] = { status: 'prosthesis', type: r.tipo_hallazgo, estado: r.estado, especificaciones: r.especificaciones, id: r.id };
        } else if (r.tipo_hallazgo === 'RR') {
            target[tId] = { status: 'remanente', type: r.tipo_hallazgo, estado: r.estado, especificaciones: r.especificaciones, id: r.id };
        } else if (r.tipo_hallazgo === 'TP') {
            target[tId] = { status: 'pulpar', type: r.tipo_hallazgo, estado: r.estado, especificaciones: r.especificaciones, id: r.id };
        } else if (['C', 'O', 'S'].includes(r.tipo_hallazgo)) {
            if (!target[tId]) {
                target[tId] = {};
            }
            if (!target[tId].surfaces) {
                target[tId].surfaces = {};
                target[tId].notes = {};
            }
            const typeLabel = r.tipo_hallazgo === 'C' ? 'pathology' : (r.tipo_hallazgo === 'O' ? 'curation' : 'sealant');
            target[tId].surfaces[r.surface] = { type: typeLabel, estado: r.estado, especificaciones: r.especificaciones, id: r.id };
        }
    });

    return { baseline, evolution };
}

/**
 * Validates clinical constraints prior to registering a new finding.
 */
export function validateFinding(findingData, currentArchState) {
    const { toothId, tipo_hallazgo } = findingData;
    const { baseline, evolution } = currentArchState;

    const isAbsentInBaseline = baseline[toothId] === 'absent';
    const isExtractedInEvolution = evolution[toothId] && evolution[toothId].status === 'extracted';

    // Block findings on absent/extracted teeth (except registering absence/extraction itself)
    if (tipo_hallazgo !== 'A' && (isAbsentInBaseline || isExtractedInEvolution)) {
        throw new Error(`VALIDACIÓN DE INTEGRIDAD: La pieza dental ${toothId} se encuentra marcada como AUSENTE o EXTRAÍDA. No se permite registrar hallazgos o tratamientos en ella.`);
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
