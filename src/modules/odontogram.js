/* odontogram.js - Interactive Dental Chart Logic & Validations */

export function saveBaselineState(patient) {
    if (patient.odontogram.baselineFrozen) {
        throw new Error("El estado inicial de admisión ya se encuentra congelado.");
    }
    patient.odontogram.baselineFrozen = true;
}

export function applyTreatment(treatmentData, state, author, systemTimeStr) {
    const { patientId, toothId, surfaceName, type, note } = treatmentData;

    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) throw new Error("Paciente no encontrado.");

    // INTEGRATED GRAPHICAL VALIDATIONS
    // 1. Block treatments on Absent baseline teeth or Extracted teeth in evolution
    const isAbsentInBaseline = patient.odontogram.baseline[toothId] === 'absent';
    const isExtractedInEvolution = patient.odontogram.evolution[toothId] && patient.odontogram.evolution[toothId].status === 'extracted';

    if (isAbsentInBaseline || isExtractedInEvolution) {
        throw new Error(`VALIDACIÓN DE INTEGRIDAD: La pieza dental ${toothId} se encuentra marcada como AUSENTE o EXTRAÍDA. No se permite realizar tratamientos.`);
    }

    if (!patient.odontogram.evolution[toothId]) {
        patient.odontogram.evolution[toothId] = {
            surfaces: {},
            notes: {}
        };
    }

    // Surgical Extraction (applied to entire tooth)
    if (type === 'extraction') {
        patient.odontogram.evolution[toothId].status = 'extracted';
        
        // Auto-generate evolution note version
        const logText = `PROCEDIMIENTO QUIRÚRGICO: Se realiza extracción de la pieza ${toothId}. Justificación: ${note}`;
        patient.evolutionNotes.push({
            version: patient.evolutionNotes.length + 1,
            timestamp: systemTimeStr,
            author,
            content: logText
        });
        return;
    }

    // Surface treatments (curation, sealant, pathology)
    if (!surfaceName) {
        throw new Error("Debe seleccionar una superficie dental específica para aplicar este tratamiento.");
    }

    const activeSurfaceState = patient.odontogram.evolution[toothId].surfaces[surfaceName];

    // 2. Block concurrent contradictory states
    if (type === 'pathology' && activeSurfaceState === 'curation') {
        throw new Error("CONTRADICCIÓN CLÍNICA: La superficie seleccionada cuenta con una Curación activa. Debe reportar y remover la curación previa antes de registrar una patología activa.");
    }

    if (type === 'sealant' && activeSurfaceState === 'curation') {
        throw new Error("CONTRADICCIÓN CLÍNICA: La superficie seleccionada ya ha sido curada con resina. No requiere un sellante preventivo.");
    }

    // Save treatment
    patient.odontogram.evolution[toothId].surfaces[surfaceName] = type;
    patient.odontogram.evolution[toothId].notes[surfaceName] = note;

    // Auto-generate evolution note version
    const typeLabel = getTreatmentNameSpanish(type);
    const surfaceLabel = getSurfaceNameSpanish(surfaceName);
    const logText = `TRATAMIENTO EVOLUTIVO: Se registra ${typeLabel} en la pieza ${toothId} (superficie ${surfaceLabel}). Nota clínica: ${note}`;

    patient.evolutionNotes.push({
        version: patient.evolutionNotes.length + 1,
        timestamp: systemTimeStr,
        author,
        content: logText
    });
}

function getTreatmentNameSpanish(type) {
    switch (type) {
        case 'curation': return 'Curación (Obturación)';
        case 'sealant': return 'Sellante Preventivo';
        case 'pathology': return 'Patología Dental / Caries';
        case 'extraction': return 'Extracción';
        default: return type;
    }
}

function getSurfaceNameSpanish(surf) {
    switch (surf) {
        case 'buccal': return 'Vestibular (Bucal)';
        case 'lingual': return 'Lingual / Palatino';
        case 'mesial': return 'Mesial';
        case 'distal': return 'Distal';
        case 'occlusal': return 'Oclusal / Incisal';
        default: return surf;
    }
}