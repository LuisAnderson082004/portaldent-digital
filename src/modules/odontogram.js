/* odontogram.js - Modular State Controller, Memoization Cache, and Debounce Handlers */

import { validateClinicalFinding } from '../utils/odontogramRules.js';
import { getOdontogramRecords, insertOdontogramRecord } from '../utils/storage.js';

export { HALLAZGOS_CONFIG } from '../utils/odontogramRules.js';

class OdontogramControllerClass {
    constructor() {
        this.currentPatientId = null;
        this.rawRecords = [];
        this.reconstructedState = { baseline: {}, evolution: {} };
        this.toothStateCache = new Map(); // tooth_id -> JSON string of state
        this.isFrozen = false;
    }

    /**
     * Loads patient odontogram records on demand.
     */
    async loadPatientOdontogram(patientId) {
        this.currentPatientId = patientId;
        // On-demand selective loading of patient-specific records
        this.rawRecords = await getOdontogramRecords(patientId);
        this.reconstructedState = this.reconstructState(this.rawRecords);
        
        // Reset cache for new patient
        this.toothStateCache.clear();
        this.isFrozen = false;
        
        return this.reconstructedState;
    }

    /**
     * Reconstructs odontogram state from atomic rows.
     */
    reconstructState(records) {
        const baseline = {};
        const evolution = {};

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
                if (r.tipo_hallazgo === 'A') {
                    target[tId].status = r.is_baseline ? 'absent' : 'extracted';
                }
                target[tId].findings.push(findingObj);
            }
        });

        return { baseline, evolution };
    }

    /**
     * Checks if a tooth state has actually changed compared to the cache (pure JS memoization).
     * @returns {boolean} True if the state changed, False if identical (no re-render needed).
     */
    didToothStateChange(toothId) {
        const toothBaseline = this.reconstructedState.baseline[toothId] || null;
        const toothEvolution = this.reconstructedState.evolution[toothId] || null;
        const currentStateStr = JSON.stringify({ toothBaseline, toothEvolution });

        const cachedStateStr = this.toothStateCache.get(toothId);
        if (cachedStateStr === currentStateStr) {
            return false; // Memoized, no change
        }

        // Cache miss: Update cache and return true
        this.toothStateCache.set(toothId, currentStateStr);
        return true;
    }

    /**
     * Saves a record atomically: validates, posts to server, updates state.
     */
    async saveOdontogramRecord(recordData, isBaseline, authorId) {
        if (isBaseline && this.isFrozen) {
            throw new Error("El odontograma inicial de admisión está congelado y es inalterable.");
        }

        // Validate the structure using decoupled rules
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

        // Atomicity: Only update local state AFTER successful server write
        const inserted = await insertOdontogramRecord(record);
        
        // Push record and rebuild state locally
        this.rawRecords.push(inserted[0]);
        this.reconstructedState = this.reconstructState(this.rawRecords);

        return inserted[0];
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
