import { 
    getTreatmentsCatalog, 
    getPatientTreatmentPlans, 
    insertPatientTreatmentPlan, 
    updatePatientTreatmentPlan, 
    deletePatientTreatmentPlan,
    getPatientClinicalData
} from '../utils/storage.js';
import { HALLAZGOS_CONFIG } from './odontogram.js';

const adultUpperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const childUpperTeeth = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const childLowerTeeth = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const adultLowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

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

export function getToothFindingsSummary(toothId, patient) {
    const descriptions = [];
    if (!patient || !patient.odontogram) return descriptions;
    
    const baselineData = patient.odontogram.baseline[toothId];
    const evolutionData = patient.odontogram.evolution[toothId];

    const addFinding = (f, surface = null) => {
        const displayName = HALLAZGOS_CONFIG[f.tipo]?.name || f.tipo;
        const surfSuffix = surface ? ` en ${getSurfaceNameSpanish(surface)}` : '';
        descriptions.push(`<span class="badge badge-info" style="margin-right: 5px;">${displayName}${surfSuffix}</span> ${f.especificaciones ? `(${f.especificaciones})` : ''}`);
    };

    if (baselineData) {
        if (baselineData.findings) {
            baselineData.findings.forEach(f => addFinding(f));
        }
        if (baselineData.surfaces) {
            Object.entries(baselineData.surfaces).forEach(([surf, f]) => addFinding(f, surf));
        }
    }

    if (evolutionData) {
        if (evolutionData.findings) {
            evolutionData.findings.forEach(f => addFinding(f));
        }
        if (evolutionData.surfaces) {
            Object.entries(evolutionData.surfaces).forEach(([surf, f]) => addFinding(f, surf));
        }
    }

    return descriptions;
}

export function populateTreatmentPlanDiagnoses(patient) {
    const tbody = document.getElementById('treatment-plan-diagnoses-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const allTeeth = [
        ...adultUpperTeeth, ...childUpperTeeth, ...childLowerTeeth, ...adultLowerTeeth
    ].sort((a,b) => a-b);

    let hasAnyFindings = false;

    allTeeth.forEach(tId => {
        const descriptions = getToothFindingsSummary(tId, patient);
        if (descriptions.length > 0) {
            hasAnyFindings = true;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 700; color: #1e293b; padding: 10px;">Pieza ${tId}</td>
                <td style="line-height: 1.6; padding: 10px;">${descriptions.join('<br>')}</td>
            `;
            tbody.appendChild(tr);
        }
    });

    if (!hasAnyFindings) {
        tbody.innerHTML = `
            <tr>
                <td colspan="2" class="text-center text-muted py-4">
                    No se registran hallazgos clínicos (Patologías o condiciones) en el odontograma.
                </td>
            </tr>
        `;
    }
}

export async function initializeTreatmentPlanView(appState) {
    const patientId = document.getElementById('ehr-patient-select').value;
    const patientNameLabel = document.getElementById('treatment-plan-patient-name');
    
    const treatmentSelect = document.getElementById('plan-treatment-select');
    const toothSelect = document.getElementById('plan-tooth-select');

    if (!patientId) {
        patientNameLabel.innerText = "Ningún paciente seleccionado";
        document.getElementById('treatment-plan-table-body').innerHTML = '<tr><td colspan="5" class="text-center text-muted">Seleccione un paciente en la ficha clínica primero.</td></tr>';
        return;
    }

    const patient = appState.patients.find(p => p.id === patientId);
    if (patient) {
        try {
            const clinical = await getPatientClinicalData(patientId);
            Object.assign(patient, clinical);
        } catch (err) {
            console.error("Error loading patient clinical data:", err.message);
        }
        patientNameLabel.innerText = `${patient.firstname} ${patient.lastname} (DNI: ${patient.dni})`;
    }

    // Populate Treatments select dropdown
    try {
        appState.treatmentsCatalog = await getTreatmentsCatalog();
    } catch (err) {
        console.error("Error fetching treatments catalog:", err.message);
    }

    treatmentSelect.innerHTML = '<option value="">-- Seleccione un tratamiento --</option>';
    appState.treatmentsCatalog.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.innerText = item.nombre;
        treatmentSelect.appendChild(opt);
    });

    // Populate Tooth select dropdown
    toothSelect.innerHTML = '<option value="">-- General (Toda la boca) --</option>';
    const allTeeth = [
        ...adultUpperTeeth, ...childUpperTeeth, ...childLowerTeeth, ...adultLowerTeeth
    ].sort((a,b) => a-b);
    allTeeth.forEach(tId => {
        const opt = document.createElement('option');
        opt.value = tId;
        opt.innerText = `Pieza FDI ${tId}`;
        toothSelect.appendChild(opt);
    });

    // Render diagnoses table instead of read-only odontogram canvas
    populateTreatmentPlanDiagnoses(patient);

    // Load and render patient treatment plan items
    await loadPatientTreatmentPlans(patientId, appState);
}

export async function loadPatientTreatmentPlans(patientId, appState) {
    const tbody = document.getElementById('treatment-plan-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
        appState.patientTreatmentPlans = await getPatientTreatmentPlans(patientId);
    } catch (err) {
        console.error("Error loading patient treatment plans:", err.message);
    }

    let solesPending = 0;
    let solesDone = 0;

    appState.patientTreatmentPlans.forEach(item => {
        const soles = parseFloat(item.precio_soles_aplicado);
        const toothLabel = item.tooth_id ? `Pieza ${item.tooth_id}` : 'General';
        const isDone = item.estado === 'realizado';

        if (isDone) {
            solesDone += soles;
        } else {
            solesPending += soles;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.treatments_catalog?.nombre || 'Procedimiento'}</strong></td>
            <td>${toothLabel}</td>
            <td>
                <span class="badge ${isDone ? 'badge-success' : 'badge-warning'}">
                    ${isDone ? '<i class="fa-solid fa-circle-check"></i> Realizado' : 'Pendiente'}
                </span>
            </td>
            <td>
                <button type="button" class="btn btn-sm ${isDone ? 'btn-outline' : 'btn-success'} mr-1" onclick="toggleTreatmentPlanStatus('${item.id}', '${item.estado}')">
                    ${isDone ? 'Pendiente' : 'Completar'}
                </button>
                <button type="button" class="btn btn-danger-outline btn-sm" onclick="deleteTreatmentPlanItem('${item.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Update summaries
    document.getElementById('plan-total-soles-pending').innerText = `S/ ${solesPending.toFixed(2)}`;
    document.getElementById('plan-total-soles-done').innerText = `S/ ${solesDone.toFixed(2)}`;
}

export async function toggleTreatmentPlanStatus(planId, currentStatus, appState) {
    const nextStatus = currentStatus === 'realizado' ? 'pendiente' : 'realizado';
    const executionDate = nextStatus === 'realizado' ? appState.systemTime.toISOString() : null;

    try {
        await updatePatientTreatmentPlan(planId, { estado: nextStatus, fecha_ejecucion: executionDate });
        const patientId = document.getElementById('ehr-patient-select').value;
        await loadPatientTreatmentPlans(patientId, appState);
    } catch (err) {
        alert("Error al cambiar estado: " + err.message);
    }
}

export async function deleteTreatmentPlanItem(planId, appState) {
    if (confirm("¿Está seguro que desea eliminar este procedimiento del plan de tratamiento?")) {
        try {
            await deletePatientTreatmentPlan(planId);
            const patientId = document.getElementById('ehr-patient-select').value;
            await loadPatientTreatmentPlans(patientId, appState);
        } catch (err) {
            alert("Error al eliminar del plan: " + err.message);
        }
    }
}

export function setupTreatmentPlan(appState) {
    const form = document.getElementById('add-treatment-plan-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const patientId = document.getElementById('ehr-patient-select').value;
        if (!patientId) return;

        const treatmentId = document.getElementById('plan-treatment-select').value;
        const tooth_id = document.getElementById('plan-tooth-select').value ? parseInt(document.getElementById('plan-tooth-select').value) : null;

        const treatment = appState.treatmentsCatalog.find(t => t.id === treatmentId);
        if (!treatment) return;

        const record = {
            patient_id: patientId,
            treatment_id: treatmentId,
            tooth_id,
            estado: 'pendiente',
            precio_soles_aplicado: treatment.precio_soles,   // Historical price preserved
            precio_dolares_aplicado: treatment.precio_dolares || 0
        };

        try {
            await insertPatientTreatmentPlan(record);
            form.reset();
            await loadPatientTreatmentPlans(patientId, appState);
        } catch (err) {
            alert("Error al agregar al plan: " + err.message);
        }
    });
}
