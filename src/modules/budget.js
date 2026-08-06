import { 
    getPatientTreatmentPlans, 
    updatePatient,
    getPatientClinicalData
} from '../utils/storage.js';

export function setupBudgetPatientSearch(appState) {
    const searchInput = document.getElementById('budget-patient-search');
    const resultsDropdown = document.getElementById('budget-patient-search-results');
    const select = document.getElementById('budget-patient-select');
    const clearBtn = document.getElementById('budget-patient-search-clear');

    if (!searchInput || !resultsDropdown) return;

    const toggleClearBtn = () => {
        if (clearBtn) {
            if (searchInput.value) {
                clearBtn.classList.remove('hidden');
            } else {
                clearBtn.classList.add('hidden');
            }
        }
    };

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        resultsDropdown.innerHTML = '';
        toggleClearBtn();

        if (!query) {
            resultsDropdown.classList.add('hidden');
            return;
        }

        const matches = appState.patients.filter(p => 
            p.firstname.toLowerCase().includes(query) || 
            p.lastname.toLowerCase().includes(query) || 
            p.dni.includes(query)
        );

        if (matches.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'search-result-item text-muted';
            noResults.innerText = 'No se encontraron pacientes';
            resultsDropdown.appendChild(noResults);
        } else {
            matches.forEach(p => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                const statusText = (p.odontogram && p.odontogram.disabled) ? ' <span class="badge badge-danger">Inactivo</span>' : '';
                item.innerHTML = `
                    <span class="search-result-name">${p.firstname} ${p.lastname}${statusText}</span>
                    <span class="search-result-dni">DNI: ${p.dni}</span>
                `;
                item.addEventListener('click', () => {
                    select.value = p.id;
                    searchInput.value = `${p.firstname} ${p.lastname}`;
                    toggleClearBtn();
                    resultsDropdown.classList.add('hidden');
                    loadBudgetForPatient(p.id, appState);
                });
                resultsDropdown.appendChild(item);
            });
            resultsDropdown.classList.remove('hidden');
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            select.value = '';
            toggleClearBtn();
            resultsDropdown.classList.add('hidden');
            clearBudgetPanel();
        });
    }

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
            resultsDropdown.classList.add('hidden');
        }
    });
}

export function clearBudgetPanel() {
    const tableBody = document.getElementById('budget-table-body');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Seleccione un paciente en la ficha clínica / odontograma primero.</td></tr>';
    
    const nameHeader = document.getElementById('budget-patient-name-header');
    if (nameHeader) nameHeader.innerText = '-';
    
    const subtotal = document.getElementById('budget-subtotal');
    if (subtotal) subtotal.innerText = 'S/ 0.00';
    
    const totalDiscount = document.getElementById('budget-total-discount');
    if (totalDiscount) totalDiscount.innerText = 'S/ 0.00';
    
    const deposit = document.getElementById('budget-deposit');
    if (deposit) deposit.innerText = 'S/ 0.00';
    
    const finalTotal = document.getElementById('budget-final-total');
    if (finalTotal) finalTotal.innerText = 'S/ 0.00';
    
    const notice = document.getElementById('budget-deposit-notice');
    if (notice) notice.classList.add('hidden');
    
    
    const pdfBtn = document.getElementById('btn-export-pdf');
    const helpTxt = document.getElementById('export-help-text');
    if (pdfBtn && helpTxt) {
        pdfBtn.disabled = true;
        helpTxt.classList.remove('hidden');
    }
}

export function initializeBudgetView(appState) {
    let patientId = document.getElementById('ehr-patient-select')?.value;
    if (!patientId && appState.selectedPatientId) {
        patientId = appState.selectedPatientId;
        const ehrSelect = document.getElementById('ehr-patient-select');
        if (ehrSelect) ehrSelect.value = patientId;
    }

    const searchInput = document.getElementById('budget-patient-search');
    const select = document.getElementById('budget-patient-select');

    if (patientId) {
        appState.selectedPatientId = patientId;
        const patient = appState.patients.find(p => p.id === patientId);
        if (patient && select && searchInput) {
            select.value = patientId;
            searchInput.value = `${patient.firstname} ${patient.lastname}`;
            const clearBtn = document.getElementById('budget-patient-search-clear');
            if (clearBtn) clearBtn.classList.remove('hidden');
            loadBudgetForPatient(patientId, appState);
        }
    } else {
        clearBudgetPanel();
    }
}

export async function loadBudgetForPatient(patientId, appState) {
    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient) return;

    try {
        const clinical = await getPatientClinicalData(patientId);
        Object.assign(patient, clinical);
    } catch (err) {
        console.error("Error loading patient clinical data for budget:", err.message);
    }

    
    const nameHeader = document.getElementById('budget-patient-name-header');
    if (nameHeader) nameHeader.innerText = `${patient.firstname} ${patient.lastname} (DNI: ${patient.dni})`;

    
    const pdfBtn = document.getElementById('btn-export-pdf');
    const helpTxt = document.getElementById('export-help-text');
    if (pdfBtn && helpTxt) {
        pdfBtn.disabled = false;
        helpTxt.classList.add('hidden');
    }

    
    let plans = [];
    try {
        plans = await getPatientTreatmentPlans(patientId);
    } catch (err) {
        console.error("Error loading treatment plans for budget:", err.message);
    }

    
    const hasDeposit = appState.appointments.some(appt => appt.patientId === patientId && appt.depositPaid);

    
    const tbody = document.getElementById('budget-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (plans.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay procedimientos planificados para este paciente.</td></tr>';
        recalculateBudgetTotals(hasDeposit);
        return;
    }

    
    if (!patient.odontogram) {
        patient.odontogram = { baseline: {}, evolution: {}, baselineFrozen: false };
    }
    if (!patient.odontogram.discounts) {
        patient.odontogram.discounts = {};
    }

    plans.forEach(item => {
        const basePrice = parseFloat(item.precio_soles_aplicado);
        const toothLabel = item.tooth_id ? `Pieza ${item.tooth_id}` : 'General';
        const savedDiscountPercent = patient.odontogram.discounts[item.id] || 0;

        const tr = document.createElement('tr');
        tr.dataset.itemId = item.id;
        tr.dataset.basePrice = basePrice;

        tr.innerHTML = `
            <td><strong>${item.treatments_catalog?.nombre || 'Procedimiento'}</strong></td>
            <td>${toothLabel}</td>
            <td>S/ ${basePrice.toFixed(2)}</td>
            <td>
                <input type="number" min="0" max="100" class="form-control budget-discount-input" 
                       value="${savedDiscountPercent}" style="width: 80px; padding: 4px 8px; text-align: right;" 
                       oninput="recalculateBudgetRow(this, appState)">
            </td>
            <td class="row-discount-amount">S/ 0.00</td>
            <td class="row-final-price" style="font-weight: 600;">S/ 0.00</td>
        `;

        tbody.appendChild(tr);
        recalculateRowValues(tr, savedDiscountPercent);

        const discountInput = tr.querySelector('.budget-discount-input');
        if (discountInput) {
            discountInput.addEventListener('input', () => recalculateBudgetRow(discountInput, appState));
        }
    });

    recalculateBudgetTotals(hasDeposit);
}

export function recalculateRowValues(tr, discountPercent) {
    const basePrice = parseFloat(tr.dataset.basePrice);
    const discountAmount = basePrice * (discountPercent / 100);
    const finalPrice = Math.max(0, basePrice - discountAmount);

    const discountEl = tr.querySelector('.row-discount-amount');
    const finalEl = tr.querySelector('.row-final-price');
    if (discountEl) discountEl.innerText = `S/ ${discountAmount.toFixed(2)}`;
    if (finalEl) finalEl.innerText = `S/ ${finalPrice.toFixed(2)}`;
}

export function recalculateBudgetRow(input, appState) {
    let val = parseFloat(input.value);
    if (isNaN(val) || val < 0) {
        val = 0;
    } else if (val > 100) {
        val = 100;
        input.value = 100;
    }

    const tr = input.closest('tr');
    if (tr) {
        recalculateRowValues(tr, val);
    }
    
    let patientId = document.getElementById('budget-patient-select')?.value || (appState && appState.selectedPatientId) || document.getElementById('ehr-patient-select')?.value;
    const hasDeposit = appState && appState.appointments ? appState.appointments.some(appt => appt.patientId === patientId && appt.depositPaid) : false;
    recalculateBudgetTotals(hasDeposit);
}

export function recalculateBudgetTotals(hasDeposit) {
    let subtotal = 0;
    let totalDiscount = 0;

    const rows = document.querySelectorAll('#budget-table-body tr');
    rows.forEach(tr => {
        if (!tr.dataset.basePrice) return;
        const basePrice = parseFloat(tr.dataset.basePrice);
        const input = tr.querySelector('.budget-discount-input');
        const discountPercent = input ? (parseFloat(input.value) || 0) : 0;
        
        subtotal += basePrice;
        totalDiscount += basePrice * (discountPercent / 100);
    });

    const depositAmount = hasDeposit ? 50.00 : 0.00;
    const finalTotal = Math.max(0, subtotal - totalDiscount - depositAmount);

    const subTotalEl = document.getElementById('budget-subtotal');
    if (subTotalEl) subTotalEl.innerText = `S/ ${subtotal.toFixed(2)}`;

    const totalDiscountEl = document.getElementById('budget-total-discount');
    if (totalDiscountEl) totalDiscountEl.innerText = `S/ ${totalDiscount.toFixed(2)}`;

    const depositEl = document.getElementById('budget-deposit');
    if (depositEl) depositEl.innerText = `S/ ${depositAmount.toFixed(2)}`;

    const finalTotalEl = document.getElementById('budget-final-total');
    if (finalTotalEl) finalTotalEl.innerText = `S/ ${finalTotal.toFixed(2)}`;

    
    const depositNotice = document.getElementById('budget-deposit-notice');
    if (depositNotice) {
        if (hasDeposit) {
            depositNotice.classList.remove('hidden');
        } else {
            depositNotice.classList.add('hidden');
        }
    }
}

export async function saveBudgetDiscounts(appState) {
    const select = document.getElementById('budget-patient-select');
    let patientId = select ? select.value : '';
    if (!patientId && appState.selectedPatientId) {
        patientId = appState.selectedPatientId;
    }
    if (!patientId) {
        const ehrSelect = document.getElementById('ehr-patient-select');
        if (ehrSelect) patientId = ehrSelect.value;
    }

    if (!patientId) {
        alert("Debe seleccionar un paciente primero.");
        return;
    }

    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient) return;

    if (!patient.odontogram) {
        patient.odontogram = { baseline: {}, evolution: {}, baselineFrozen: false };
    }
    patient.odontogram.discounts = patient.odontogram.discounts || {};

    const rows = document.querySelectorAll('#budget-table-body tr');
    rows.forEach(tr => {
        const itemId = tr.dataset.itemId;
        if (!itemId) return;
        const input = tr.querySelector('.budget-discount-input');
        const discountPercent = input ? (parseFloat(input.value) || 0) : 0;
        patient.odontogram.discounts[itemId] = discountPercent;
    });

    try {
        const btn = document.getElementById('btn-save-budget-discounts');
        if (btn) btn.disabled = true;
        
        await updatePatient(patient.id, { odontogram: patient.odontogram });
        
        // Recalculate totals on account summary ON SAVE
        const hasDeposit = appState.appointments.some(appt => appt.patientId === patient.id && appt.depositPaid);
        recalculateBudgetTotals(hasDeposit);

        alert("Descuentos del presupuesto guardados con éxito. Se ha actualizado el resumen de cuenta.");
    } catch (err) {
        alert("Error al guardar descuentos: " + err.message);
    } finally {
        const btn = document.getElementById('btn-save-budget-discounts');
        if (btn) btn.disabled = false;
    }
}

export function setupBudget(appState) {
    const saveBtn = document.getElementById('btn-save-budget-discounts');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => saveBudgetDiscounts(appState));
    }
}
