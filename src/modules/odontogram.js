

import { validateClinicalFinding } from '../utils/odontogramRules.js';
import { getOdontogramRecords, insertOdontogramRecord } from '../utils/storage.js';

export { HALLAZGOS_CONFIG } from '../utils/odontogramRules.js';

class OdontogramControllerClass {
    constructor() {
        this.currentPatientId = null;
        this.rawRecords = [];
        this.reconstructedState = { baseline: {}, evolution: {} };
        this.toothStateCache = new Map(); 
        this.isFrozen = false;
    }

    
    async loadPatientOdontogram(patientId) {
        this.currentPatientId = patientId;
        
        this.rawRecords = await getOdontogramRecords(patientId);
        this.reconstructedState = this.reconstructState(this.rawRecords);
        
        
        this.toothStateCache.clear();
        this.isFrozen = false;
        
        return this.reconstructedState;
    }

    
    reconstructState(records) {
        const baseline = {};
        const evolution = {};

        const sorted = [...records].sort((a, b) => new Date(a.creado_en || a.created_at) - new Date(b.creado_en || b.created_at));

        sorted.forEach(r => {
            const tId = r.pieza_dental_id || r.tooth_id;
            if (!tId) return;

            const isBaseline = r.is_baseline !== undefined ? r.is_baseline : true;
            const target = isBaseline ? baseline : evolution;

            if (!target[tId]) {
                target[tId] = {
                    findings: [],
                    surfaces: {}
                };
            }

            const findingType = r.tipo || r.tipo_hallazgo || r.type;
            const pathologyTypes = ['C', 'DES', 'FRA', 'RR'];
            const isPathology = pathologyTypes.includes(findingType);

            let findingState;
            if (r.estado !== undefined && r.estado !== null) {
                findingState = (r.estado === true || r.estado === 'true');
            } else if (r.state !== undefined && r.state !== null) {
                findingState = (r.state === true || r.state === 'true');
            } else {
                findingState = !isPathology;
            }

            const findingObj = {
                id: r.id,
                tipo: findingType,
                estado: findingState,
                especificaciones: r.especificaciones || '',
                surface: r.superficie || r.surface || null,
                created_at: r.creado_en || r.created_at
            };

            const surf = r.superficie || r.surface;
            if (surf) {
                target[tId].surfaces[surf] = findingObj;
            } else {
                if (findingType === 'A') {
                    target[tId].status = isBaseline ? 'absent' : 'extracted';
                }
                target[tId].findings.push(findingObj);
            }
        });

        return { baseline, evolution };
    }

    
    didToothStateChange(toothId) {
        const toothBaseline = this.reconstructedState.baseline[toothId] || null;
        const toothEvolution = this.reconstructedState.evolution[toothId] || null;
        const currentStateStr = JSON.stringify({ toothBaseline, toothEvolution });

        const cachedStateStr = this.toothStateCache.get(toothId);
        if (cachedStateStr === currentStateStr) {
            return false; 
        }

        
        this.toothStateCache.set(toothId, currentStateStr);
        return true;
    }

    
    async saveOdontogramRecord(recordData, isBaseline, authorId) {
        if (isBaseline && this.isFrozen) {
            throw new Error("El odontograma inicial de admisión está congelado y es inalterable.");
        }

        
        validateClinicalFinding(recordData, this.reconstructedState);

        const record = {
            patient_id: this.currentPatientId,
            tooth_id: recordData.tooth_id,
            surface: recordData.surface,
            tipo_hallazgo: recordData.tipo_hallazgo,
            estado: recordData.estado,
            especificaciones: recordData.especificaciones,
            is_baseline: isBaseline,
            author_id: authorId
        };

        
        const inserted = await insertOdontogramRecord(record);
        
        
        this.rawRecords.push(inserted);
        this.reconstructedState = this.reconstructState(this.rawRecords);

        return inserted;
    }
}

export const OdontogramController = new OdontogramControllerClass();

export function saveBaselineState(patient) {
    if (patient.odontogram && patient.odontogram.baselineFrozen) {
        throw new Error("El estado inicial de admisión ya se encuentra congelado.");
    }
    if (!patient.odontogram) {
        patient.odontogram = {};
    }
    patient.odontogram.baselineFrozen = true;
}

export function debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
