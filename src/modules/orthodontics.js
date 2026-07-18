import { 
    getOrthodonticRecord, 
    saveOrthodonticRecord, 
    getOrthodonticControls, 
    insertOrthodonticControl, 
    deleteOrthodonticControl 
} from '../utils/storage.js';
import { printOrthoControlSheet } from '../utils/pdf-generator.js';
import { toggleModal } from '../utils/ui-helper.js';


const modelsAnalysisRows = [
    { key: 'forma', label: 'Forma (Ej. Oval, Triangular)' },
    { key: 'simetria', label: 'Simetría' },
    { key: 'apinamiento', label: 'Apiñamiento' },
    { key: 'diastemas', label: 'Diastemas' },
    { key: 'rotaciones', label: 'Rotaciones' },
    { key: 'protrusiones', label: 'Protrusiones' },
    { key: 'retrusiones', label: 'Retrusiones' },
    { key: 'perimetro', label: 'Perímetro de arco' },
    { key: 'dist_intermolar', label: 'Distancia intermolar' },
    { key: 'dist_intercanina', label: 'Distancia intercanina' },
    { key: 'linea_media', label: 'Línea media', type: 'linea_media' },
    { key: 'mordida_abierta_ant', label: 'Mordida abierta anterior' },
    { key: 'mordida_abierta_post', label: 'Mordida abierta posterior' },
    { key: 'mordida_cruzada_ant', label: 'Mordida cruzada anterior' },
    { key: 'mordida_cruzada_post', label: 'Mordida cruzada posterior' }
];

let activeControlsList = [];

function getLocalYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function switchOrthoTab(tabId, buttonEl) {
    // Hide all tab contents
    document.querySelectorAll('.ortho-tab-content').forEach(el => el.classList.add('hidden'));
    // Show active tab
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.remove('hidden');

    // Toggle active state on buttons
    const tabsContainer = buttonEl.closest('.ortho-tabs');
    if (tabsContainer) {
        tabsContainer.querySelectorAll('.btn-tab').forEach(btn => {
            btn.classList.add('btn-outline');
            btn.classList.remove('active');
        });
    }
    buttonEl.classList.remove('btn-outline');
    buttonEl.classList.add('active');
}

export async function initializeOrthoHistoryView(appState) {
    const patientId = document.getElementById('ehr-patient-select').value;
    const patientNameHeader = document.getElementById('ortho-history-patient-name');
    const emptyState = document.getElementById('ortho-history-empty');
    const container = document.getElementById('ortho-history-container');

    if (!patientId) {
        patientNameHeader.innerText = "-";
        emptyState.classList.remove('hidden');
        container.classList.add('hidden');
        return;
    }

    const patient = appState.patients.find(p => p.id === patientId);
    if (patient) {
        patientNameHeader.innerText = `${patient.firstname} ${patient.lastname} (DNI: ${patient.dni})`;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    // Reset Form
    document.getElementById('ortho-history-form').reset();
    document.getElementById('ortho-record-id').value = '';

    // Render Models Analysis Table Rows
    const tbody = document.getElementById('ortho-models-table-body');
    if (tbody) {
        tbody.innerHTML = '';
        modelsAnalysisRows.forEach(row => {
            const tr = document.createElement('tr');
            if (row.type === 'linea_media') {
                tr.innerHTML = `
                    <td><strong>${row.label}</strong></td>
                    <td>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <select class="form-control py-1 models-sup-type" style="padding: 2px 6px;">
                                <option value="Normal">Normal</option>
                                <option value="Desviada">Desviada</option>
                            </select>
                            <input type="text" class="form-control py-1 models-sup-val" style="width: 80px; padding: 2px 6px;" placeholder="d-i mm">
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <select class="form-control py-1 models-inf-type" style="padding: 2px 6px;">
                                <option value="Normal">Normal</option>
                                <option value="Desviada">Desviada</option>
                            </select>
                            <input type="text" class="form-control py-1 models-inf-val" style="width: 80px; padding: 2px 6px;" placeholder="d-i mm">
                        </div>
                    </td>
                `;
            } else {
                tr.innerHTML = `
                    <td><strong>${row.label}</strong></td>
                    <td><input type="text" class="form-control py-1 models-sup" style="padding: 2px 6px;" data-key="${row.key}"></td>
                    <td><input type="text" class="form-control py-1 models-inf" style="padding: 2px 6px;" data-key="${row.key}"></td>
                `;
            }
            tbody.appendChild(tr);
        });
    }

    // Load existing record from database
    try {
        const record = await getOrthodonticRecord(patientId);
        if (record) {
            document.getElementById('ortho-record-id').value = record.id;
            document.getElementById('ortho-representative').value = record.representative || '';
            document.getElementById('ortho-relationship').value = record.relationship || '';
            document.getElementById('ortho-consultation-motif').value = record.consultation_motif || '';
            document.getElementById('ortho-eruption-chronology').value = record.eruption_chronology || '';
            
            // Alteraciones
            const radioSi = document.querySelector('input[name="ortho-structural-alterations"][value="Si"]');
            const radioNo = document.querySelector('input[name="ortho-structural-alterations"][value="No"]');
            if (radioSi && radioNo) {
                if (record.structural_alterations === 'Si') radioSi.checked = true;
                else radioNo.checked = true;
            }
            document.getElementById('ortho-structural-alterations-desc').value = record.structural_alterations_desc || '';

            // Examen clínico
            document.getElementById('ortho-symmetry-midline').value = record.symmetry_midline || '';
            document.getElementById('ortho-symmetry-thirds').value = record.symmetry_thirds || '';
            document.getElementById('ortho-face-form').value = record.face_form || '';
            document.getElementById('ortho-profile').value = record.profile || '';
            document.getElementById('ortho-lips').value = record.lips || '';
            document.getElementById('ortho-chin-masseter').value = record.chin_masseter || '';
            document.getElementById('ortho-nose-size').value = record.nose_size || '';
            document.getElementById('ortho-ears-insertion').value = record.ears_insertion || '';
            document.getElementById('ortho-lip-frenum').value = record.lip_frenum || '';
            document.getElementById('ortho-lingual-frenum').value = record.lingual_frenum || '';
            document.getElementById('ortho-palate').value = record.palate || '';
            document.getElementById('ortho-tongue-volume').value = record.tongue_volume || '';
            document.getElementById('ortho-tongue-position').value = record.tongue_position || '';

            // Checkbox arrays
            const atmList = (record.atm_deviations || '').split(',').map(s => s.trim());
            document.querySelectorAll('input[name="ortho-atm"]').forEach(cb => {
                cb.checked = atmList.includes(cb.value);
            });

            const contactsList = (record.premature_contacts || '').split(',').map(s => s.trim());
            document.querySelectorAll('input[name="ortho-contacts"]').forEach(cb => {
                cb.checked = contactsList.includes(cb.value);
            });

            // Models analysis table
            const analysis = record.models_analysis || {};
            document.querySelectorAll('#ortho-models-table-body tr').forEach((tr, idx) => {
                const row = modelsAnalysisRows[idx];
                if (row.type === 'linea_media') {
                    const supType = tr.querySelector('.models-sup-type');
                    const supVal = tr.querySelector('.models-sup-val');
                    const infType = tr.querySelector('.models-inf-type');
                    const infVal = tr.querySelector('.models-inf-val');
                    if (supType) supType.value = analysis.linea_media_sup_type || 'Normal';
                    if (supVal) supVal.value = analysis.linea_media_sup_val || '';
                    if (infType) infType.value = analysis.linea_media_inf_type || 'Normal';
                    if (infVal) infVal.value = analysis.linea_media_inf_val || '';
                } else {
                    const supInput = tr.querySelector('.models-sup');
                    const infInput = tr.querySelector('.models-inf');
                    if (supInput) supInput.value = analysis[`${row.key}_sup`] || '';
                    if (infInput) infInput.value = analysis[`${row.key}_inf`] || '';
                }
            });

            document.getElementById('ortho-overjet').value = record.overjet || '';
            document.getElementById('ortho-overjet-type').value = record.overjet_type || 'Normal';
            document.getElementById('ortho-overbite').value = record.overbite || '';
            document.getElementById('ortho-overbite-type').value = record.overbite_type || 'Normal';

            // X-Rays
            const xrayList = record.xray_findings || [];
            document.querySelectorAll('input[name="ortho-xray"]').forEach(cb => {
                cb.checked = xrayList.includes(cb.value);
            });

            // Habits
            const habitsList = record.habits || [];
            document.querySelectorAll('input[name="ortho-habits"]').forEach(cb => {
                cb.checked = habitsList.includes(cb.value);
            });
            document.getElementById('ortho-habits-other').value = record.habits_other || '';
            document.getElementById('ortho-habits-frequency').value = record.habits_frequency || '';

            // Diagnósticos
            document.getElementById('ortho-dental-diagnosis').value = record.dental_diagnosis || '';
            document.getElementById('ortho-cephalometric-diagnosis').value = record.cephalometric_diagnosis || '';
            document.getElementById('ortho-problems-list').value = record.problems_list || '';
            document.getElementById('ortho-treatment-objectives').value = record.treatment_objectives || '';
            document.getElementById('ortho-treatment-plan').value = record.treatment_plan || '';
            document.getElementById('ortho-interconsultations').value = record.interconsultations || '';
        }
    } catch (err) {
        console.error("Error loading orthodontic history:", err.message);
    }
}

export async function saveOrthoHistory(e, appState) {
    if (e) e.preventDefault();
    const patientId = document.getElementById('ehr-patient-select').value;
    if (!patientId) return;

    // Collect checkbox lists
    const atmList = [];
    document.querySelectorAll('input[name="ortho-atm"]:checked').forEach(cb => atmList.push(cb.value));

    const contactsList = [];
    document.querySelectorAll('input[name="ortho-contacts"]:checked').forEach(cb => contactsList.push(cb.value));

    const xrayList = [];
    document.querySelectorAll('input[name="ortho-xray"]:checked').forEach(cb => xrayList.push(cb.value));

    const habitsList = [];
    document.querySelectorAll('input[name="ortho-habits"]:checked').forEach(cb => habitsList.push(cb.value));

    // Collect models table data
    const analysis = {};
    document.querySelectorAll('#ortho-models-table-body tr').forEach((tr, idx) => {
        const row = modelsAnalysisRows[idx];
        if (row.type === 'linea_media') {
            analysis.linea_media_sup_type = tr.querySelector('.models-sup-type').value;
            analysis.linea_media_sup_val = tr.querySelector('.models-sup-val').value;
            analysis.linea_media_inf_type = tr.querySelector('.models-inf-type').value;
            analysis.linea_media_inf_val = tr.querySelector('.models-inf-val').value;
        } else {
            analysis[`${row.key}_sup`] = tr.querySelector('.models-sup').value;
            analysis[`${row.key}_inf`] = tr.querySelector('.models-inf').value;
        }
    });

    const record = {
        patient_id: patientId,
        representative: document.getElementById('ortho-representative').value,
        relationship: document.getElementById('ortho-relationship').value,
        consultation_motif: document.getElementById('ortho-consultation-motif').value,
        eruption_chronology: document.getElementById('ortho-eruption-chronology').value,
        structural_alterations: document.querySelector('input[name="ortho-structural-alterations"]:checked').value,
        structural_alterations_desc: document.getElementById('ortho-structural-alterations-desc').value,
        symmetry_midline: document.getElementById('ortho-symmetry-midline').value,
        symmetry_thirds: document.getElementById('ortho-symmetry-thirds').value,
        face_form: document.getElementById('ortho-face-form').value,
        profile: document.getElementById('ortho-profile').value,
        lips: document.getElementById('ortho-lips').value,
        chin_masseter: document.getElementById('ortho-chin-masseter').value,
        nose_size: document.getElementById('ortho-nose-size').value,
        ears_insertion: document.getElementById('ortho-ears-insertion').value,
        lip_frenum: document.getElementById('ortho-lip-frenum').value,
        lingual_frenum: document.getElementById('ortho-lingual-frenum').value,
        palate: document.getElementById('ortho-palate').value,
        tongue_volume: document.getElementById('ortho-tongue-volume').value,
        tongue_position: document.getElementById('ortho-tongue-position').value,
        atm_deviations: atmList.join(','),
        premature_contacts: contactsList.join(','),
        models_analysis: analysis,
        overjet: document.getElementById('ortho-overjet').value,
        overjet_type: document.getElementById('ortho-overjet-type').value,
        overbite: document.getElementById('ortho-overbite').value,
        overbite_type: document.getElementById('ortho-overbite-type').value,
        xray_findings: xrayList,
        habits: habitsList,
        habits_other: document.getElementById('ortho-habits-other').value,
        habits_frequency: document.getElementById('ortho-habits-frequency').value,
        dental_diagnosis: document.getElementById('ortho-dental-diagnosis').value,
        cephalometric_diagnosis: document.getElementById('ortho-cephalometric-diagnosis').value,
        problems_list: document.getElementById('ortho-problems-list').value,
        treatment_objectives: document.getElementById('ortho-treatment-objectives').value,
        treatment_plan: document.getElementById('ortho-treatment-plan').value,
        interconsultations: document.getElementById('ortho-interconsultations').value,
        signature_doctor: appState.currentUser ? appState.currentUser.name : ''
    };

    const recordId = document.getElementById('ortho-record-id').value;
    if (recordId) record.id = recordId;

    try {
        const saved = await saveOrthodonticRecord(record);
        document.getElementById('ortho-record-id').value = saved.id;
        alert("Ficha de ortodoncia guardada exitosamente en la base de datos.");
    } catch (err) {
        alert("Error al guardar la ficha: " + err.message);
    }
}

export async function initializeOrthoControlsView(appState) {
    const patientId = document.getElementById('ehr-patient-select').value;
    const patientNameHeader = document.getElementById('ortho-controls-patient-name');
    const emptyState = document.getElementById('ortho-controls-empty');
    const container = document.getElementById('ortho-controls-container');

    if (!patientId) {
        patientNameHeader.innerText = "-";
        emptyState.classList.remove('hidden');
        container.classList.add('hidden');
        return;
    }

    const patient = appState.patients.find(p => p.id === patientId);
    if (patient) {
        patientNameHeader.innerText = `${patient.firstname} ${patient.lastname} (DNI: ${patient.dni})`;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    await renderOrthoControlsTable(patientId);
}

export async function renderOrthoControlsTable(patientId) {
    const tbody = document.getElementById('ortho-controls-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><i class="fa-solid fa-spinner fa-spin"></i> Cargando historial...</td></tr>';

    try {
        activeControlsList = await getOrthodonticControls(patientId);
        tbody.innerHTML = '';

        if (activeControlsList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay controles mensuales registrados para este paciente.</td></tr>';
            return;
        }

        activeControlsList.forEach(ctrl => {
            const tr = document.createElement('tr');
            const dParts = ctrl.date.split('-');
            const dateFormatted = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;

            tr.innerHTML = `
                <td><strong>${dateFormatted}</strong></td>
                <td><code>${ctrl.time || ''}</code></td>
                <td>${ctrl.dentist_name || '-'}</td>
                <td><span class="badge badge-success">${ctrl.visit_type || 'Control'}</span></td>
                <td>${ctrl.observations ? ctrl.observations.substring(0, 50) + (ctrl.observations.length > 50 ? '...' : '') : '-'}</td>
                <td class="text-center">
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        <button class="btn btn-secondary btn-sm py-1 px-2" onclick="printOrthoControl('${ctrl.id}')" title="Imprimir"><i class="fa-solid fa-print"></i></button>
                        <button class="btn btn-outline btn-sm py-1 px-2 text-danger" onclick="deleteOrthoControlFlow('${ctrl.id}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Error al cargar historial: ${err.message}</td></tr>`;
    }
}

export function openOrthoControlModal(appState) {
    const modal = document.getElementById('ortho-control-modal');
    const form = document.getElementById('ortho-control-form');
    if (!form || !modal) return;
    form.reset();
    document.getElementById('ortho-control-id').value = '';

    // Set default date and time
    const now = appState.systemTime || new Date();
    document.getElementById('control-date').value = getLocalYYYYMMDD(now);
    document.getElementById('control-time').value = now.toTimeString().split(' ')[0].substring(0, 5);

    // Default doctor
    if (appState.currentUser) {
        document.getElementById('control-dentist').value = appState.currentUser.name;
        document.getElementById('control-cop').value = appState.currentUser.role === 'dentist' ? '61259' : '';
    }

    toggleModal('ortho-control-modal', true);
}

export function closeOrthoControlModal() {
    toggleModal('ortho-control-modal', false);
}

export async function saveOrthoControlFlow(e, appState) {
    if (e) e.preventDefault();
    const patientId = document.getElementById('ehr-patient-select').value;
    if (!patientId) return;

    // Collect derivations checklist
    const referrals = [];
    document.querySelectorAll('input[name="control-referral"]:checked').forEach(cb => referrals.push(cb.value));

    // Collect recommendations checklist
    const recommendations = [];
    document.querySelectorAll('input[name="control-recommendations"]:checked').forEach(cb => recommendations.push(cb.value));

    const control = {
        patient_id: patientId,
        date: document.getElementById('control-date').value,
        time: document.getElementById('control-time').value,
        visit_type: document.querySelector('input[name="control-visit-type"]:checked').value,
        dentist_name: document.getElementById('control-dentist').value,
        dentist_cop: document.getElementById('control-cop').value,
        separators: {
            sup: document.getElementById('control-sep-sup').checked,
            inf: document.getElementById('control-sep-inf').checked,
            none: document.getElementById('control-sep-none').checked
        },
        brackets_bonding: {
            sup: document.getElementById('control-brac-sup').checked,
            inf: document.getElementById('control-brac-inf').checked
        },
        tubes: {
            sup: document.getElementById('control-tubes-sup').checked,
            inf: document.getElementById('control-tubes-inf').checked,
            none: document.getElementById('control-tubes-none').checked
        },
        tubes_motif: document.getElementById('control-tubes-motif').value,
        bands: {
            sup: document.getElementById('control-bands-sup').checked,
            inf: document.getElementById('control-bands-inf').checked,
            none: document.getElementById('control-bands-none').checked
        },
        bands_motif: document.getElementById('control-bands-motif').value,
        arch_upper_details: document.getElementById('control-arch-upper').value,
        arch_lower_details: document.getElementById('control-arch-lower').value,
        ligatures_use: {
            yes_no: document.querySelector('input[name="control-ligas-use"]:checked').value,
            num: document.getElementById('control-ligas-use-num').value
        },
        ligatures_patient: {
            yes_no: document.querySelector('input[name="control-ligas-patient"]:checked').value
        },
        ligatures_motif: document.getElementById('control-ligas-patient-motif').value,
        elastic_change: document.querySelector('input[name="control-elastic-change"]:checked').value,
        brackets_rebound: {
            yes_no: document.getElementById('control-rebound-brac').checked ? 'SI' : 'NO',
            pieces: document.getElementById('control-rebound-brac-pieces').value
        },
        tubes_rebound: {
            yes_no: document.getElementById('control-rebound-tubes').checked ? 'SI' : 'NO',
            pieces: document.getElementById('control-rebound-tubes-pieces').value
        },
        bands_rebound: {
            yes_no: document.getElementById('control-rebound-bands').checked ? 'SI' : 'NO',
            pieces: document.getElementById('control-rebound-bands-pieces').value
        },
        hygiene: document.querySelector('input[name="control-hygiene"]:checked').value,
        hygiene_profilaxis: document.getElementById('control-hygiene-profilaxis').checked,
        caries: document.querySelector('input[name="control-caries"]:checked').value,
        caries_cure: document.getElementById('control-caries-cure').checked,
        referrals: referrals,
        referral_specs: document.getElementById('control-referral-specs').value,
        recommendations: recommendations,
        brackets_removal: {
            sup: document.getElementById('control-removal-sup').checked,
            inf: document.getElementById('control-removal-inf').checked,
            date: document.getElementById('control-removal-date').value
        },
        retention: {
            sup: document.getElementById('control-retention-sup').checked,
            inf: document.getElementById('control-retention-inf').checked,
            fija: document.getElementById('control-retention-fija').checked,
            removible: document.getElementById('control-retention-remov').checked,
            date: document.getElementById('control-retention-date').value
        },
        observations: document.getElementById('control-observations').value,
        next_appt_date: document.getElementById('control-next-date').value || null,
        next_appt_time: document.getElementById('control-next-time').value || null,
        signature_doctor: appState.currentUser ? appState.currentUser.name : ''
    };

    try {
        await insertOrthodonticControl(control);
        closeOrthoControlModal();
        await renderOrthoControlsTable(patientId);
        alert("Control mensual de ortodoncia guardado con éxito.");
    } catch (err) {
        alert("Error al guardar control: " + err.message);
    }
}

export async function deleteOrthoControlFlow(controlId, appState) {
    if (!confirm("¿Está seguro de que desea eliminar este control mensual? Esta acción no se puede deshacer.")) return;
    const patientId = document.getElementById('ehr-patient-select').value;

    try {
        await deleteOrthodonticControl(controlId);
        await renderOrthoControlsTable(patientId);
    } catch (err) {
        alert("Error al eliminar control: " + err.message);
    }
}

export function printOrthoControl(controlId, appState) {
    const patientId = document.getElementById('ehr-patient-select').value;
    const patient = appState.patients.find(p => p.id === patientId);
    const control = activeControlsList.find(c => c.id === controlId);

    if (patient && control) {
        printOrthoControlSheet(control, patient);
    } else {
        alert("Error: No se pudo encontrar el paciente o control seleccionado.");
    }
}

export function setupOrthodontics(appState) {
    const historyForm = document.getElementById('ortho-history-form');
    if (historyForm) {
        historyForm.addEventListener('submit', (e) => saveOrthoHistory(e, appState));
    }

    const controlForm = document.getElementById('ortho-control-form');
    if (controlForm) {
        controlForm.addEventListener('submit', (e) => saveOrthoControlFlow(e, appState));
    }
}
