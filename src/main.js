/* main.js - Application Bootloader & UI Controller with Supabase cloud async updates */

import { 
    initDB, 
    getPatients, 
    getAppointments, 
    getShifts, 
    getAuditLogs, 
    getUsers, 
    insertShift as insertShiftInDB, 
    deleteShift as deleteShiftInDB, 
    insertUser as insertUserInDB, 
    deleteUser as deleteUserInDB, 
    updateUser as updateUserInDB,
    updateAppointment
} from './utils/storage.js';
import { hashPassword, verifyUser, getRoleNameSpanish, checkSession, logout } from './auth/authEngine.js';
import { isWithinFourHours, saveAppointment, cancelAppointment } from './modules/appointments.js';
import { calculateAge, addPatient, addEvolutionNote } from './modules/patients.js';
import { saveBaselineState, applyTreatment } from './modules/odontogram.js';
import { writeAuditLog } from './modules/audit.js';
import { exportPatientPDFDirect } from './utils/pdf-generator.js';

// Application State
let appState = {
    currentUser: null,
    systemTime: new Date("2026-07-03T15:46:33-05:00"), // Baseline System Time
    users: [],
    patients: [],
    appointments: [],
    shifts: [],
    auditLogs: []
};

// UI Section States
const views = ['dashboard', 'patients', 'appointments', 'users', 'shifts', 'audit', 'odontogram'];

function switchView(targetView) {
    views.forEach(v => {
        const section = document.getElementById(`view-${v}`);
        if (section) section.classList.remove('active');
        
        const navItem = document.querySelector(`.nav-links li[data-tab="${v}"]`);
        if (navItem) navItem.classList.remove('active');
    });

    const activeSection = document.getElementById(`view-${targetView}`);
    if (activeSection) activeSection.classList.add('active');

    const activeNav = document.querySelector(`.nav-links li[data-tab="${targetView}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Title and Subtitle coordinator
    const title = document.getElementById('tab-title');
    const subtitle = document.getElementById('tab-subtitle');

    switch (targetView) {
        case 'dashboard':
            title.innerText = "Panel de Control";
            subtitle.innerText = "Resumen diario del estado de la clínica dental";
            renderDashboardStats();
            renderTimelineGrid();
            break;
        case 'patients':
            title.innerText = "Registro de Pacientes";
            subtitle.innerText = "Administración de historias clínicas e información de contacto";
            renderPatientsList();
            break;
        case 'appointments':
            title.innerText = "Agenda de Citas";
            subtitle.innerText = "Programación y verificación de depósitos de pacientes";
            renderAppointmentsList();
            break;
        case 'users':
            title.innerText = "Personal de la Clínica";
            subtitle.innerText = "Gestión de cuentas y accesos de administración y asistencia";
            renderUsersList();
            break;
        case 'shifts':
            title.innerText = "Turnos Laborales";
            subtitle.innerText = "Configuración de horarios semanales para odontólogos";
            renderShiftsList();
            break;
        case 'audit':
            title.innerText = "Bitácora de Auditoría";
            subtitle.innerText = "Registro inmutable de accesos EHR en cumplimiento con regulaciones";
            renderAuditTable();
            break;
        case 'odontogram':
            title.innerText = "Odontograma Clínico & EHR";
            subtitle.innerText = "Registro visual de tratamientos y evolución clínica";
            populateEHRSelector();
            clearEHRPanel();
            break;
    }
}

// SideNav bindings
document.querySelectorAll('.nav-links li').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        if (tab) switchView(tab);
    });
});

// Setup global listener to intercept clicks and handle view switches
window.switchView = switchView;

// Role UI restrictions
function setupRoleAccess(user) {
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = user.role === 'admin' ? '' : 'none';
    });

    document.querySelectorAll('.clinical-only').forEach(el => {
        const isClinical = (user.role === 'admin' || user.role === 'dentist');
        el.style.display = isClinical ? '' : 'none';
    });

    // Populate user profile info in navbar
    const avatarTxt = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('nav-user-avatar').innerText = avatarTxt;
    document.getElementById('nav-user-name').innerText = user.name;
    document.getElementById('nav-user-role').innerText = getRoleNameSpanish(user.role);
}

// Global clock simulation
function startSimulatedClock() {
    setInterval(() => {
        appState.systemTime.setSeconds(appState.systemTime.getSeconds() + 1);
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
        };
        const formatted = appState.systemTime.toLocaleDateString('es-PE', options);
        document.getElementById('system-time-display').innerHTML = `<i class="fa-regular fa-clock"></i> ${formatted}`;
    }, 1000);
}

// --- 1. LOGIN CONTROLLER ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username').value.trim();
    const passwordInput = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const submitBtn = document.getElementById('btn-login-submit');

    // Show loading spinner
    submitBtn.querySelector('.btn-text').classList.add('hidden');
    submitBtn.querySelector('.spinner').classList.remove('hidden');
    errorDiv.classList.add('hidden');

    try {
        const user = await verifyUser(usernameInput, passwordInput, appState.users);
        if (user) {
            appState.currentUser = user;
            sessionStorage.setItem('portaldent_session', JSON.stringify(user));
            
            // Setup dashboard
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('main-workspace').classList.add('active');
            setupRoleAccess(user);

            // Redirect based on role
            if (user.role === 'admin') switchView('users');
            else if (user.role === 'receptionist') switchView('patients');
            else if (user.role === 'dentist') switchView('odontogram');
        } else {
            errorDiv.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        errorDiv.classList.remove('hidden');
    } finally {
        submitBtn.querySelector('.btn-text').classList.remove('hidden');
        submitBtn.querySelector('.spinner').classList.add('hidden');
    }
});

// Logout handler
document.getElementById('btn-logout').addEventListener('click', async () => {
    await logout();
    appState.currentUser = null;
    document.getElementById('main-workspace').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');
});

// --- 2. PATIENTS UI CONTROLLER ---
function renderPatientsList() {
    const tbody = document.getElementById('patients-table-body');
    tbody.innerHTML = '';

    appState.patients.forEach(patient => {
        const tr = document.createElement('tr');
        tr.className = 'patient-row';
        tr.innerHTML = `
            <td><strong>${patient.historyNumber}</strong></td>
            <td>
                <div class="patient-title">${patient.firstname} ${patient.lastname}</div>
                <div class="patient-subtitle">${patient.email} | ${patient.address}</div>
            </td>
            <td><code>${patient.dni}</code></td>
            <td>${patient.phone}</td>
            <td>${patient.dob} (${calculateAge(patient.dob, appState.systemTime)} años)</td>
            <td>
                <button class="btn btn-outline btn-sm" id="btn-view-profile-${patient.id}">
                    <i class="fa-solid fa-folder-open"></i> Ver Expediente
                </button>
            </td>
        `;
        
        tr.querySelector(`#btn-view-profile-${patient.id}`).onclick = async () => {
            if (appState.currentUser.role === 'receptionist') {
                await triggerBackgroundAudit(patient.id);
                if (patient.evolutionNotes.length === 0) {
                    alert("No se puede exportar el resumen clínico porque el paciente aún no cuenta con notas de evolución.");
                } else {
                    exportPatientPDFDirect(patient.id, appState);
                }
            } else {
                populateEHRSelector();
                document.getElementById('ehr-patient-select').value = patient.id;
                loadEHRForPatient();
                switchView('odontogram');
            }
        };
        
        tbody.appendChild(tr);
    });
}

function filterPatients() {
    const query = document.getElementById('patient-search-input').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#patients-table-body tr');
    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(query) ? '' : 'none';
    });
}

function openPatientModal() {
    document.getElementById('patient-modal-title').innerText = "Ficha de Admisión de Paciente";
    document.getElementById('patient-form').reset();
    document.getElementById('patient-id').value = '';
    document.getElementById('patient-modal').classList.add('active');
}

function closePatientModal() {
    document.getElementById('patient-modal').classList.remove('active');
}

document.getElementById('btn-add-patient-modal').onclick = openPatientModal;
document.getElementById('patient-search-input').oninput = filterPatients;

document.getElementById('patient-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('patient-id').value;
    const firstname = document.getElementById('pat-firstname').value.trim();
    const lastname = document.getElementById('pat-lastname').value.trim();
    const dni = document.getElementById('pat-dni').value.trim();
    const dob = document.getElementById('pat-dob').value;
    const phone = document.getElementById('pat-phone').value.trim();
    const email = document.getElementById('pat-email').value.trim();
    const address = document.getElementById('pat-address').value.trim();
    const allergies = document.getElementById('pat-allergies').value.trim();
    const chronic = document.getElementById('pat-chronic').value.trim();

    try {
        if (!id) {
            await addPatient({
                firstname, lastname, dni, dob, phone, email, address, allergies, chronic
            }, appState);
        }
        renderPatientsList();
        closePatientModal();
    } catch (err) {
        alert(err.message);
    }
});

// --- 3. APPOINTMENTS UI CONTROLLER ---
function renderAppointmentsList() {
    const tbody = document.getElementById('appointments-table-body');
    tbody.innerHTML = '';

    appState.appointments.forEach(appt => {
        const tr = document.createElement('tr');
        
        // Check if editable (>4h)
        const isEditable = !isWithinFourHours(appt.date, appt.time, appState.systemTime);

        tr.innerHTML = `
            <td>
                <div class="appt-time"><i class="fa-regular fa-clock"></i> ${appt.time}</div>
                <div class="appt-date">${appt.date}</div>
            </td>
            <td>
                <div class="appt-patient-name">${appt.patientName}</div>
                <div class="appt-patient-dni">DNI: <code>${appt.patientDni}</code></div>
            </td>
            <td>${appt.dentistName}</td>
            <td><em>${appt.reason}</em></td>
            <td>
                <label class="switch">
                    <input type="checkbox" id="deposit-toggle-${appt.id}" ${appt.depositPaid ? 'checked' : ''} ${isEditable ? '' : 'disabled'}>
                    <span class="slider round"></span>
                </label>
                <span class="deposit-amount" id="deposit-label-${appt.id}">S/ ${appt.depositAmount.toFixed(2)}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-outline-danger btn-sm" id="btn-cancel-appt-${appt.id}" ${isEditable ? '' : 'disabled'}><i class="fa-solid fa-calendar-xmark"></i> Cancelar</button>
                </div>
            </td>
        `;

        // Toggle deposit checks
        const toggle = tr.querySelector(`#deposit-toggle-${appt.id}`);
        toggle.onchange = async () => {
            const isChecked = toggle.checked;
            const updatedAmount = isChecked ? 50.00 : 0.00;
            
            try {
                await saveAppointment({
                    id: appt.id,
                    patientId: appt.patientId,
                    dentistId: appt.dentistId,
                    date: appt.date,
                    time: appt.time,
                    reason: appt.reason,
                    depositPaid: isChecked,
                    depositAmount: updatedAmount
                }, appState, appState.systemTime);
                
                document.getElementById(`deposit-label-${appt.id}`).innerText = `S/ ${updatedAmount.toFixed(2)}`;
            } catch (err) {
                alert(err.message);
                toggle.checked = !isChecked; // revert
            }
        };

        // Cancel booking
        tr.querySelector(`#btn-cancel-appt-${appt.id}`).onclick = async () => {
            if (confirm("¿Está seguro de que desea cancelar y retirar esta cita programada?")) {
                try {
                    await cancelAppointment(appt.id, appState, appState.systemTime);
                    renderAppointmentsList();
                } catch (err) {
                    alert(err.message);
                }
            }
        };

        tbody.appendChild(tr);
    });
}

function openAppointmentModal() {
    document.getElementById('appointment-modal-title').innerText = "Programar Nueva Cita";
    document.getElementById('appointment-form').reset();
    document.getElementById('appointment-id').value = '';

    // Populate Patients dropdown options
    const patientSelect = document.getElementById('appt-patient');
    patientSelect.innerHTML = '<option value="">Seleccione un paciente...</option>';
    appState.patients.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = `${p.firstname} ${p.lastname} (DNI: ${p.dni})`;
        patientSelect.appendChild(opt);
    });

    // Populate Dentists dropdown options
    const dentistSelect = document.getElementById('appt-dentist');
    dentistSelect.innerHTML = '<option value="">Seleccione un odontólogo...</option>';
    appState.users.filter(u => u.role === 'dentist').forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.innerText = d.name;
        dentistSelect.appendChild(opt);
    });

    document.getElementById('appointment-modal').classList.add('active');
}

function closeAppointmentModal() {
    document.getElementById('appointment-modal').classList.remove('active');
}

document.getElementById('btn-add-appointment-modal').onclick = openAppointmentModal;

document.getElementById('appointment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('appointment-id').value;
    const patientId = document.getElementById('appt-patient').value;
    const dentistId = document.getElementById('appt-dentist').value;
    const date = document.getElementById('appt-date').value;
    const time = document.getElementById('appt-time').value;
    const reason = document.getElementById('appt-reason').value.trim();
    const depositPaid = document.getElementById('appt-deposit').checked;

    try {
        await saveAppointment({
            id: id || null,
            patientId,
            dentistId,
            date,
            time,
            reason,
            depositPaid,
            depositAmount: depositPaid ? 50.00 : 0.00
        }, appState, appState.systemTime);

        renderAppointmentsList();
        closeAppointmentModal();
    } catch (err) {
        alert(err.message);
    }
});

// --- 4. USERS UI CONTROLLER (Admin Only) ---
function renderUsersList() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    appState.users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${user.name}</strong></td>
            <td><code>${user.username}</code></td>
            <td><span class="badge ${user.role === 'admin' ? 'badge-danger' : user.role === 'dentist' ? 'badge-info' : 'badge-success'}">${getRoleNameSpanish(user.role)}</span></td>
            <td>
                <button class="btn btn-outline-danger btn-sm" id="btn-delete-user-${user.id}"><i class="fa-solid fa-user-minus"></i> Eliminar</button>
            </td>
        `;

        tr.querySelector(`#btn-delete-user-${user.id}`).onclick = async () => {
            if (user.id === appState.currentUser.id) {
                alert("Seguridad del Sistema: No puedes eliminar tu propio usuario en sesión.");
                return;
            }
            if (confirm(`¿Está seguro de eliminar la cuenta de ${user.name}? Se retirarán sus credenciales.`)) {
                try {
                    await deleteUserInDB(user.id);
                    appState.users = appState.users.filter(u => u.id !== user.id);
                    renderUsersList();
                } catch (err) {
                    alert(err.message);
                }
            }
        };

        tbody.appendChild(tr);
    });
}

function openUserModal() {
    document.getElementById('user-form').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-modal').classList.add('active');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
}

document.getElementById('btn-add-user-modal').onclick = openUserModal;

document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('user-id').value;
    const name = document.getElementById('user-name').value.trim();
    const username = document.getElementById('user-username').value.trim();
    const role = document.getElementById('user-role').value;
    const password = document.getElementById('user-password').value;

    if (password.length < 6) {
        alert("La contraseña debe contar con al menos 6 caracteres por seguridad.");
        return;
    }

    // Verify duplicate username
    const dup = appState.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== id);
    if (dup) {
        alert("El nombre de usuario ya está registrado por otro personal.");
        return;
    }

    try {
        if (!id) {
            const hash = await hashPassword(password);
            const newUser = {
                id: 'usr-' + Date.now(),
                name,
                username,
                role,
                passwordHash: hash,
                password: password
            };
            const inserted = await insertUserInDB(newUser);
            appState.users.push(inserted);
        } else {
            const idx = appState.users.findIndex(u => u.id === id);
            if (idx > -1) {
                const updatedFields = {
                    name,
                    username,
                    role
                };
                if (password) {
                    updatedFields.passwordHash = await hashPassword(password);
                }
                const updated = await updateUserInDB(id, updatedFields);
                Object.assign(appState.users[idx], updated);
            }
        }

        renderUsersList();
        closeUserModal();
    } catch (err) {
        alert(err.message);
    }
});

// --- 5. SHIFTS UI CONTROLLER (Admin Only) ---
function renderShiftsList() {
    const tbody = document.getElementById('shifts-table-body');
    tbody.innerHTML = '';

    appState.shifts.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.dentistName}</strong></td>
            <td>${s.day}</td>
            <td><code class="text-success">${s.start}</code></td>
            <td><code class="text-danger">${s.end}</code></td>
            <td>
                <button class="btn btn-danger-outline btn-sm" id="btn-delete-shift-${s.id}"><i class="fa-solid fa-trash"></i> Eliminar</button>
            </td>
        `;

        tr.querySelector(`#btn-delete-shift-${s.id}`).onclick = () => deleteShift(s.id);

        tbody.appendChild(tr);
    });
}

async function deleteShift(id) {
    if (confirm("¿Está seguro de eliminar esta asignación horaria?")) {
        try {
            await deleteShiftInDB(id);
            appState.shifts = appState.shifts.filter(s => s.id !== id);
            renderShiftsList();
        } catch (err) {
            alert(err.message);
        }
    }
}

function openShiftModal() {
    document.getElementById('shift-form').reset();
    
    const select = document.getElementById('shift-dentist');
    select.innerHTML = '<option value="">Seleccione odontólogo...</option>';
    appState.users.filter(u => u.role === 'dentist').forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.innerText = d.name;
        select.appendChild(opt);
    });

    document.getElementById('shift-modal').classList.add('active');
}

function closeShiftModal() {
    document.getElementById('shift-modal').classList.remove('active');
}

document.getElementById('btn-add-shift-modal').onclick = openShiftModal;

document.getElementById('shift-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dentistId = document.getElementById('shift-dentist').value;
    const day = document.getElementById('shift-day').value;
    const start = document.getElementById('shift-start').value;
    const end = document.getElementById('shift-end').value;

    const dentist = appState.users.find(u => u.id === dentistId);

    const startHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    if (startHour >= endHour) {
        alert("Error de Horario: La hora de salida debe ser posterior a la hora de entrada.");
        return;
    }

    try {
        const newShift = {
            id: crypto.randomUUID(),
            dentistId,
            dentistName: dentist.name,
            day,
            start,
            end
        };

        const inserted = await insertShiftInDB(newShift);
        appState.shifts.push(inserted);
        renderShiftsList();
        closeShiftModal();
    } catch (err) {
        alert(err.message);
    }
});

// --- 6. AUDIT COMPLIANCE CONTROLLER (Admin Only) ---
function renderAuditTable() {
    const tbody = document.getElementById('audit-table-body');
    tbody.innerHTML = '';

    appState.auditLogs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${log.timestamp}</code></td>
            <td><strong>${log.userName}</strong></td>
            <td><span class="badge badge-outline">${log.userRole}</span></td>
            <td><span class="text-success"><i class="fa-solid fa-eye"></i> Acceso de Lectura a EHR</span></td>
            <td><strong>${log.patientName}</strong></td>
            <td><code>${log.patientHistory}</code></td>
        `;
        tbody.appendChild(tr);
    });
}

async function triggerBackgroundAudit(patientId) {
    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient || !appState.currentUser) return;

    try {
        const log = await writeAuditLog(appState.currentUser, patient, appState.systemTime.toISOString());
        appState.auditLogs.unshift(log);
        if (document.getElementById('view-audit').classList.contains('active')) {
            renderAuditTable();
        }
    } catch (err) {
        console.error("Auditor compliance write failed:", err.message);
    }
}

// -------------------------------------------------------------
// EHR & NOTE VERSIONING
// -------------------------------------------------------------
function populateEHRSelector() {
    const select = document.getElementById('ehr-patient-select');
    select.innerHTML = '<option value="">-- Seleccione un Paciente --</option>';

    appState.patients.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.innerText = `${p.firstname} ${p.lastname} (DNI: ${p.dni})`;
        select.appendChild(option);
    });
}

function loadEHRForPatient() {
    const patientId = document.getElementById('ehr-patient-select').value;
    if (!patientId) {
        clearEHRPanel();
        return;
    }

    triggerBackgroundAudit(patientId);

    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient) return;

    // Update search input to match selected patient
    const searchInput = document.getElementById('ehr-patient-search');
    if (searchInput) {
        searchInput.value = `${patient.firstname} ${patient.lastname} (DNI: ${patient.dni})`;
    }

    document.getElementById('ehr-history-number').innerText = `#${patient.historyNumber}`;
    document.getElementById('ehr-dni').innerText = patient.dni;
    document.getElementById('ehr-age').innerText = calculateAge(patient.dob, appState.systemTime) + ' años';
    document.getElementById('ehr-phone').innerText = patient.phone;
    document.getElementById('ehr-general-background').innerText = patient.chronic;

    const alertCard = document.getElementById('medical-alerts-card');
    const alertContent = document.getElementById('medical-alerts-content');
    
    if (patient.allergies && patient.allergies.toLowerCase() !== 'ninguna' && patient.allergies.toLowerCase() !== 'ninguno') {
        alertCard.classList.remove('hidden');
        alertContent.innerHTML = `<strong>ALERGIAS PRESENTES:</strong> ${patient.allergies}`;
    } else {
        alertCard.classList.add('hidden');
    }

    renderEvolutionNotesList(patient);
    renderOdontogramInteractive(patient);
    checkEhrPDFExportCapability(patient);
}

function clearEHRPanel() {
    document.getElementById('ehr-history-number').innerText = "-";
    document.getElementById('ehr-dni').innerText = "-";
    document.getElementById('ehr-age').innerText = "-";
    document.getElementById('ehr-phone').innerText = "-";
    document.getElementById('ehr-general-background').innerText = "Ninguno especificado.";
    document.getElementById('medical-alerts-card').classList.add('hidden');
    document.getElementById('notes-timeline').innerHTML = '<p class="text-muted text-center py-4">Seleccione un paciente para cargar su historial clínico.</p>';
    document.getElementById('ehr-notes-count').innerText = "0";
    document.getElementById('btn-export-pdf').disabled = true;
    document.getElementById('export-help-text').classList.remove('hidden');
    
    // Clear search input
    const searchInput = document.getElementById('ehr-patient-search');
    if (searchInput) {
        searchInput.value = '';
    }
    
    document.getElementById('odontogram-adult-upper').innerHTML = '';
    document.getElementById('odontogram-child-upper').innerHTML = '';
    document.getElementById('odontogram-child-lower').innerHTML = '';
    document.getElementById('odontogram-adult-lower').innerHTML = '';
}

function renderEvolutionNotesList(patient) {
    const timeline = document.getElementById('notes-timeline');
    timeline.innerHTML = '';

    if (!patient.evolutionNotes || patient.evolutionNotes.length === 0) {
        timeline.innerHTML = '<p class="text-muted text-center py-4">El paciente aún no cuenta con notas de evolución registradas.</p>';
        document.getElementById('ehr-notes-count').innerText = "0";
        return;
    }

    // Sort descending by version/timestamp
    const sorted = [...patient.evolutionNotes].sort((a, b) => b.version - a.version);
    document.getElementById('ehr-notes-count').innerText = sorted.length;

    sorted.forEach(note => {
        const entry = document.createElement('div');
        entry.className = 'timeline-entry';
        entry.innerHTML = `
            <div class="timeline-badge">v${note.version}</div>
            <div class="timeline-card">
                <div class="timeline-card-header">
                    <strong>${note.author}</strong>
                    <span class="timeline-time">${note.timestamp}</span>
                </div>
                <div class="timeline-card-body">
                    <p>${note.content}</p>
                </div>
            </div>
        `;
        timeline.appendChild(entry);
    });
}

// Add evolution note trigger
document.getElementById('btn-add-note').onclick = async () => {
    const patientId = document.getElementById('ehr-patient-select').value;
    const txt = document.getElementById('new-note-text').value;

    if (!patientId) return;

    try {
        await addEvolutionNote(patientId, txt, appState.currentUser.name, appState.systemTime.toISOString(), appState);
        document.getElementById('new-note-text').value = '';
        
        // Reload notes list and check PDF export availability
        const patient = appState.patients.find(p => p.id === patientId);
        renderEvolutionNotesList(patient);
        checkEhrPDFExportCapability(patient);
    } catch (err) {
        alert(err.message);
    }
};

// Direct PDF export trigger
document.getElementById('btn-export-pdf').onclick = () => {
    const patientId = document.getElementById('ehr-patient-select').value;
    if (patientId) {
        exportPatientPDFDirect(patientId, appState);
    }
};

// --- 7. ODONTOGRAM CANVAS & CANVAS BUILDER ---
const UPPER_TEETH = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];
const CHILD_UPPER = ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"];
const CHILD_LOWER = ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"];
const LOWER_TEETH = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];

let selectedToothState = {
    patientId: null,
    toothId: null,
    surface: null
};

function renderOdontogramInteractive(patient) {
    const baselineFrozen = patient.odontogram?.baselineFrozen || false;
    const btnFreeze = document.getElementById('btn-freeze-baseline');
    const badgeFrozen = document.getElementById('badge-baseline-frozen');

    if (baselineFrozen) {
        btnFreeze.classList.add('hidden');
        badgeFrozen.classList.remove('hidden');
    } else {
        btnFreeze.classList.remove('hidden');
        badgeFrozen.classList.add('hidden');
    }

    btnFreeze.onclick = async () => {
        if (confirm("Al congelar la Línea Base, ya no podrás catalogar piezas como ausentes o curaciones históricas. ¿Deseas continuar?")) {
            try {
                await saveBaselineState(patient.id, appState);
                renderOdontogramInteractive(patient);
            } catch (err) {
                alert(err.message);
            }
        }
    };

    // Render arches
    buildArchInteractive(document.getElementById('odontogram-adult-upper'), UPPER_TEETH, patient);
    buildArchInteractive(document.getElementById('odontogram-child-upper'), CHILD_UPPER, patient);
    buildArchInteractive(document.getElementById('odontogram-child-lower'), CHILD_LOWER, patient);
    buildArchInteractive(document.getElementById('odontogram-adult-lower'), LOWER_TEETH, patient);
}

function buildArchInteractive(container, teethList, patient) {
    container.innerHTML = '';

    const baseline = patient.odontogram?.baseline || {};
    const evolution = patient.odontogram?.evolution || {};

    teethList.forEach(tNum => {
        const isAbsent = (baseline[tNum] === 'absent');
        
        const block = document.createElement('div');
        block.className = `tooth-block ${isAbsent ? 'absent' : ''}`;
        block.id = `tooth-block-${tNum}`;

        block.innerHTML = `
            <span class="tooth-number">${tNum}</span>
            <div class="tooth-svg-wrapper">
                <svg class="tooth-svg" width="40" height="40" viewBox="0 0 80 80">
                    <!-- Top surface (vestibular/buccal) -->
                    <polygon class="surface surface-top" points="5,5 75,5 55,25 25,25" data-surface="vestibular"></polygon>
                    <!-- Right surface (distal/mesial) -->
                    <polygon class="surface surface-right" points="75,5 75,75 55,55 55,25" data-surface="distal"></polygon>
                    <!-- Bottom surface (lingual/palatine) -->
                    <polygon class="surface surface-bottom" points="25,55 55,55 75,75 5,75" data-surface="lingual"></polygon>
                    <!-- Left surface (mesial/distal) -->
                    <polygon class="surface surface-left" points="5,5 25,25 25,55 5,75" data-surface="mesial"></polygon>
                    <!-- Center surface (occlusal/incisal) -->
                    <polygon class="surface surface-center" points="25,25 55,25 55,55 25,55" data-surface="occlusal"></polygon>
                </svg>
                <div class="absent-cross"></div>
            </div>
        `;

        // Color coding matching patient state
        // 1. Baseline states
        if (baseline[tNum] && baseline[tNum] !== 'absent') {
            const bState = baseline[tNum];
            block.querySelectorAll('.surface').forEach(surf => {
                surf.classList.add(`${bState}-filled`);
            });
        }

        // 2. Evolution states
        const toothEvol = evolution[tNum];
        if (toothEvol) {
            if (toothEvol.surfaces) {
                Object.keys(toothEvol.surfaces).forEach(surfName => {
                    const stateType = toothEvol.surfaces[surfName];
                    const element = block.querySelector(`.surface-${surfName === 'vestibular' ? 'top' : surfName === 'distal' ? 'right' : surfName === 'lingual' ? 'bottom' : surfName === 'mesial' ? 'left' : 'center'}`);
                    if (element) element.classList.add(`${stateType}-filled`);
                });
            }
        }

        // Interactive clicks (Clinical staff only)
        if (appState.currentUser.role === 'admin' || appState.currentUser.role === 'dentist') {
            block.querySelectorAll('.surface').forEach(polygon => {
                polygon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const surfName = polygon.getAttribute('data-surface');
                    showTreatmentSelector(patient.id, tNum, surfName);
                });
            });

            // Double click to toggle absent state
            block.addEventListener('dblclick', async (e) => {
                e.stopPropagation();
                if (patient.odontogram?.baselineFrozen) {
                    alert("Línea base congelada: No se puede extraer la pieza dental.");
                    return;
                }
                const makeAbsent = !block.classList.contains('absent');
                try {
                    await applyTreatment({
                        patientId: patient.id,
                        toothId: tNum,
                        surfaceName: 'occlusal',
                        type: makeAbsent ? 'absent' : 'clear',
                        note: makeAbsent ? 'Pieza dental ausente registrada en línea base.' : 'Registro retirado del historial.'
                    }, appState, appState.currentUser.name, appState.systemTime.toISOString());
                    
                    renderOdontogramInteractive(patient);
                    renderEvolutionNotesList(patient);
                } catch (err) {
                    alert(err.message);
                }
            });
        }

        container.appendChild(block);
    });
}

function showTreatmentSelector(patientId, toothId, surfaceName) {
    selectedToothState = { patientId, toothId, surfaceName };

    // Clear styling selections
    document.querySelectorAll('.tooth-block').forEach(b => b.classList.remove('selected-tooth'));
    document.getElementById(`tooth-block-${toothId}`).classList.add('selected-tooth');

    document.getElementById('selected-tooth-id').innerText = toothId;
    document.getElementById('selected-surface-name').innerText = surfaceName.toUpperCase();
    
    // Clear note text
    document.getElementById('treatment-note-input').value = '';

    const panel = document.getElementById('treatment-editor-panel');
    panel.classList.remove('hidden');
}

function hideTreatmentSelector() {
    document.getElementById('treatment-editor-panel').classList.add('hidden');
    document.querySelectorAll('.tooth-block').forEach(b => b.classList.remove('selected-tooth'));
}

window.hideTreatmentSelector = hideTreatmentSelector;

// Save treatment click
document.getElementById('btn-save-tooth-treatment').onclick = async () => {
    const { patientId, toothId, surfaceName } = selectedToothState;
    const notesInput = document.getElementById('treatment-note-input').value.trim();

    // Find selected type button (caries or curation)
    const activeBtn = document.querySelector('.select-btn.active');
    if (!activeBtn) {
        alert("Por favor seleccione si registrará una Patología (Caries) o Tratamiento (Resina).");
        return;
    }
    const type = activeBtn.getAttribute('data-type');

    if (!notesInput) {
        alert("Por favor agregue una nota descriptiva de la pieza dental.");
        return;
    }

    try {
        await applyTreatment({
            patientId,
            toothId,
            surfaceName,
            type,
            note: notesInput
        }, appState, appState.currentUser.name, appState.systemTime.toISOString());

        const patient = appState.patients.find(p => p.id === patientId);
        renderOdontogramInteractive(patient);
        renderEvolutionNotesList(patient);
        hideTreatmentSelector();
    } catch (err) {
        alert(err.message);
    }
};

// Panel selection buttons
document.querySelectorAll('.select-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

// --- 8. DASHBOARD TIMELINE RENDERING ---
function renderDashboardStats() {
    document.getElementById('stat-patients-count').innerText = appState.patients.length;
    
    // Appointments scheduled for system date
    const dateStr = appState.systemTime.toISOString().split('T')[0];
    const todayAppts = appState.appointments.filter(a => a.date === dateStr);
    document.getElementById('stat-appointments-today').innerText = todayAppts.length;

    // Total deposit amounts verified
    const totalDeposits = appState.appointments.reduce((sum, a) => a.depositPaid ? sum + a.depositAmount : sum, 0);
    document.getElementById('stat-deposits-count').innerText = `S/ ${totalDeposits.toFixed(2)}`;
}

function renderTimelineGrid() {
    const grid = document.getElementById('timeline-grid');
    grid.innerHTML = '';

    const dateStr = appState.systemTime.toISOString().split('T')[0];
    document.getElementById('agenda-date').innerText = dateStr;

    // Filter appointments for today
    const todayAppts = appState.appointments.filter(a => a.date === dateStr);

    for (let hour = 9; hour <= 19; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        const item = document.createElement('div');
        item.className = 'timeline-slot';

        // Check if an appointment is booked for this slot
        const appt = todayAppts.find(a => a.time.substring(0, 5) === timeStr);

        if (appt) {
            item.innerHTML = `
                <div class="slot-time">${timeStr}</div>
                <div class="slot-details booked">
                    <strong>${appt.patientName}</strong> (${appt.reason}) <br>
                    <small><i class="fa-solid fa-user-doctor"></i> Odontólogo: ${appt.dentistName}</small>
                </div>
            `;
        } else {
            item.innerHTML = `
                <div class="slot-time">${timeStr}</div>
                <div class="slot-details free">
                    <span class="text-muted"><i class="fa-solid fa-circle-check text-success"></i> Horario Libre y Disponible</span>
                </div>
            `;
        }

        grid.appendChild(item);
    }
}

// Application Initialization Bootstrap
async function bootstrap() {
    await initDB(hashPassword);
    
    // Fetch active clinic state asynchronously from database
    try {
        appState.users = await getUsers();
        appState.patients = await getPatients();
        appState.shifts = await getShifts();
        appState.appointments = await getAppointments();
        appState.auditLogs = await getAuditLogs();
    } catch (err) {
        console.error("Error loading application state from database:", err.message);
    }

    startSimulatedClock();

    // Session validation
    const session = checkSession();
    if (session) {
        appState.currentUser = session;
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('main-workspace').classList.add('active');
        setupRoleAccess(session);
        if (session.role === 'admin') switchView('users');
        else if (session.role === 'receptionist') switchView('patients');
        else if (session.role === 'dentist') switchView('odontogram');
    }

    setupPatientSearch();
}

function setupPatientSearch() {
    const searchInput = document.getElementById('ehr-patient-search');
    const resultsDropdown = document.getElementById('ehr-patient-search-results');
    const select = document.getElementById('ehr-patient-select');

    if (!searchInput || !resultsDropdown) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        resultsDropdown.innerHTML = '';

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
                item.innerHTML = `
                    <span class="search-result-name">${p.firstname} ${p.lastname}</span>
                    <span class="search-result-dni">DNI: ${p.dni}</span>
                `;
                item.addEventListener('click', () => {
                    select.value = p.id;
                    searchInput.value = `${p.firstname} ${p.lastname} (DNI: ${p.dni})`;
                    resultsDropdown.classList.add('hidden');
                    loadEHRForPatient();
                });
                resultsDropdown.appendChild(item);
            });
        }

        resultsDropdown.classList.remove('hidden');
    });

    // Handle clicks outside the dropdown to close it
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.searchable-select')) {
            resultsDropdown.classList.add('hidden');
        }
    });

    // Show all options if user focuses on the search input without text
    searchInput.addEventListener('focus', () => {
        if (!searchInput.value) {
            searchInput.dispatchEvent(new Event('input'));
        }
    });
}

// Trigger bootstrap
bootstrap();