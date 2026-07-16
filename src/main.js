/* main.js - Application Bootloader & UI Controller with Supabase cloud async updates */

import { 
    getPatients, 
    getAppointments, 
    getShifts, 
    getUsers, 
    insertShift as insertShiftInDB, 
    deleteShift as deleteShiftInDB, 
    insertUser as insertUserInDB, 
    deleteUser as deleteUserInDB, 
    updateUser as updateUserInDB,
    updateAppointment,
    updatePatient as updatePatientInDB,
    getOdontogramRecords,
    insertOdontogramRecord,
    deleteOdontogramRecord,
    getTreatmentsCatalog,
    insertTreatmentInCatalog,
    updateTreatmentInCatalog,
    deleteTreatmentFromCatalog,
    getPatientTreatmentPlans,
    insertPatientTreatmentPlan,
    updatePatientTreatmentPlan,
    deletePatientTreatmentPlan
} from './utils/storage.js';
import { hashPassword, verifyUser, getRoleNameSpanish, checkSession, logout } from './auth/authEngine.js';
import { isWithinFourHours, saveAppointment, cancelAppointment } from './modules/appointments.js';
import { calculateAge, addPatient, addEvolutionNote } from './modules/patients.js';
import { saveBaselineState, OdontogramController } from './modules/odontogram.js';
import { exportPatientPDFDirect } from './utils/pdf-generator.js';

// Application State
let appState = {
    currentUser: null,
    users: [],
    patients: [],
    appointments: [],
    shifts: [],
    treatmentsCatalog: [],
    patientTreatmentPlans: [],
    systemTime: new Date("2026-07-03T15:46:33-05:00") // Simulated clock baseline
};

// UI State Constants
const adultUpperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const childUpperTeeth = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const childLowerTeeth = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const adultLowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

let currentOdontogramMode = 'baseline'; // baseline or evolution
let selectedToothId = null;
let selectedSurfaceName = null;
let activeReminderApptId = null;

// Clock tick utility
function startSimulatedClock() {
    setInterval(() => {
        appState.systemTime.setSeconds(appState.systemTime.getSeconds() + 1);
        const clockDisp = document.getElementById('clock-display');
        if (clockDisp) {
            clockDisp.innerText = appState.systemTime.toLocaleTimeString('es-PE', { hour12: true });
        }
        const dateDisp = document.getElementById('date-display');
        if (dateDisp) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateDisp.innerText = appState.systemTime.toLocaleDateString('es-PE', options);
        }
    }, 1000);
}

// Global Date Formatter
function formatDateSpanish(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Router Coordinator
function switchView(viewId) {
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    const activeSection = document.getElementById(`view-${viewId}`);
    if (activeSection) activeSection.classList.add('active');

    const activeMenuItem = document.getElementById(`menu-${viewId}`);
    if (activeMenuItem) activeMenuItem.classList.add('active');

    const viewTitle = document.getElementById('view-title');
    const viewSubtitle = document.getElementById('view-subtitle');

    switch (viewId) {
        case 'patients':
            viewTitle.innerText = "Gestión de Pacientes";
            viewSubtitle.innerText = "Admisión, búsqueda e historias clínicas del centro médico.";
            renderPatientsList();
            break;
        case 'calendar':
            viewTitle.innerText = "Agenda Médica";
            viewSubtitle.innerText = "Control de citas operativas, asignación de turnos y validación de abonos.";
            loadCalendar();
            break;
        case 'reminders':
            viewTitle.innerText = "Recordatorios de Citas";
            viewSubtitle.innerText = "Seguimiento telefónico y envío de plantillas de comunicación clínica.";
            renderRemindersList();
            break;
        case 'odontogram':
            viewTitle.innerText = "Ficha Odontológica y EHR";
            viewSubtitle.innerText = "Monitoreo de antecedentes, registro de evolución y odontograma legal.";
            populateEHRSelector();
            break;
        case 'users':
            viewTitle.innerText = "Gestión de Personal";
            viewSubtitle.innerText = "Registro de credenciales, alta de personal y asignación de roles.";
            renderUsersList();
            break;
        case 'shifts':
            viewTitle.innerText = "Turnos Médicos";
            viewSubtitle.innerText = "Configuración de horarios laborales semanales para el personal de odontología.";
            renderShiftsList();
            break;
        case 'treatment-plan':
            viewTitle.innerText = "Planes de Tratamiento";
            viewSubtitle.innerText = "Presupuestos operativos y control de procedimientos clínicos planificados.";
            initializeTreatmentPlanView();
            break;
        case 'tarifario':
            viewTitle.innerText = "Tarifario y Catálogo Clínico";
            viewSubtitle.innerText = "Gestión de tarifas oficiales y catálogo de procedimientos odontológicos.";
            renderTarifarioList();
            break;
    }
}

// -------------------------------------------------------------
// LOGIN HANDLER
// -------------------------------------------------------------
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login-submit');
    const text = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');
    const errorMsg = document.getElementById('login-error');

    text.classList.add('hidden');
    spinner.classList.remove('hidden');
    errorMsg.classList.add('hidden');
    btn.disabled = true;

    const usernameInput = document.getElementById('login-username').value.trim();
    const passwordInput = document.getElementById('login-password').value;

    setTimeout(async () => {
        const matched = await verifyUser(usernameInput, passwordInput, appState.users);
        
        text.classList.remove('hidden');
        spinner.classList.add('hidden');
        btn.disabled = false;

        if (matched) {
            appState.currentUser = matched;
            sessionStorage.setItem('portaldent_session', JSON.stringify(matched));
            
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('main-workspace').classList.add('active');
            
            setupRoleAccess(matched);
            
            if (matched.role === 'admin') switchView('users');
            else if (matched.role === 'receptionist') switchView('patients');
            else if (matched.role === 'dentist') switchView('odontogram');
        } else {
            errorMsg.classList.remove('hidden');
        }
    }, 800);
});

// -------------------------------------------------------------
// USER MANAGEMENT & SHIFTS UI (ADMIN CRUD)
// -------------------------------------------------------------
function renderUsersList() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    appState.users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${u.name}</strong></td>
            <td><code>${u.username}</code></td>
            <td><span class="badge badge-info">${getRoleNameSpanish(u.role)}</span></td>
            <td>
                <button class="btn btn-outline btn-sm" id="btn-edit-user-${u.id}"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger-outline btn-sm" id="btn-delete-user-${u.id}"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        
        tr.querySelector(`#btn-edit-user-${u.id}`).onclick = () => editUser(u.id);
        tr.querySelector(`#btn-delete-user-${u.id}`).onclick = () => deleteUser(u.id);
        tbody.appendChild(tr);
    });
}

function openUserModal() {
    document.getElementById('user-modal-title').innerText = "Agregar Personal Clínico";
    document.getElementById('user-form').reset();
    document.getElementById('user-id-field').value = '';
    document.getElementById('user-username').disabled = false;
    document.getElementById('user-password').required = true;
    document.getElementById('user-password').disabled = false;
    document.getElementById('user-password-hint').innerText = "Ingrese una contraseña segura.";
    document.getElementById('user-modal').classList.add('active');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
}

function editUser(userId) {
    const user = appState.users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('user-modal-title').innerText = "Editar Personal Clínico";
    document.getElementById('user-id-field').value = user.id;
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-username').value = user.username;
    document.getElementById('user-username').disabled = true; // Deshabilitar nombre de usuario para evitar desincronizar con Auth de Supabase
    document.getElementById('user-role').value = user.role;
    
    const isSelf = appState.currentUser && appState.currentUser.id === userId;
    if (isSelf) {
        document.getElementById('user-password').required = false;
        document.getElementById('user-password').disabled = false;
        document.getElementById('user-password').value = '';
        document.getElementById('user-password-hint').innerText = "Deje en blanco si no desea modificar su contraseña.";
    } else {
        document.getElementById('user-password').required = false;
        document.getElementById('user-password').disabled = true;
        document.getElementById('user-password').value = '';
        document.getElementById('user-password-hint').innerText = "Por seguridad, cambie contraseñas borrando y recreando el usuario.";
    }

    document.getElementById('user-modal').classList.add('active');
}

async function deleteUser(userId) {
    const isSelf = appState.currentUser && appState.currentUser.id === userId;
    if (isSelf) {
        alert("Seguridad: No se puede eliminar a sí mismo mientras está logueado.");
        return;
    }

    if (confirm("¿Está seguro que desea eliminar a este usuario? Perderá el acceso de forma inmediata.")) {
        try {
            await deleteUserInDB(userId);
            appState.users = appState.users.filter(u => u.id !== userId);
            renderUsersList();
        } catch (err) {
            alert(err.message);
        }
    }
}

document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('user-id-field').value;
    const name = document.getElementById('user-name').value.trim();
    const username = document.getElementById('user-username').value.trim();
    const role = document.getElementById('user-role').value;
    const password = document.getElementById('user-password').value;

    const duplicate = appState.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== id);
    if (duplicate) {
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
                    role
                };
                if (password && appState.currentUser && appState.currentUser.id === id) {
                    updatedFields.password = password;
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

// Time formatting helper
function formatTime12Hour(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${String(hour12).padStart(2, '0')}:${minute} ${suffix}`;
}

// SHIFTS UI
function renderShiftsList() {
    const tbody = document.getElementById('shifts-table-body');
    tbody.innerHTML = '';

    appState.shifts.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.dentistName}</strong></td>
            <td>${getDaySpanish(s.day)}</td>
            <td>${formatTime12Hour(s.start)}</td>
            <td>${formatTime12Hour(s.end)}</td>
            <td>
                <button class="btn btn-danger-outline btn-sm" id="btn-delete-shift-${s.id}"><i class="fa-solid fa-trash"></i> Eliminar</button>
            </td>
        `;
        
        tr.querySelector(`#btn-delete-shift-${s.id}`).onclick = () => deleteShift(s.id);
        tbody.appendChild(tr);
    });
}

function getDaySpanish(day) {
    const days = {
        'Monday': 'Lunes', 'Tuesday': 'Martes', 'Wednesday': 'Miércoles',
        'Thursday': 'Jueves', 'Friday': 'Viernes', 'Saturday': 'Sábado', 'Sunday': 'Domingo'
    };
    return days[day] || day;
}

function openShiftModal() {
    // Reset form and select default workdays (Monday-Friday)
    document.getElementById('shift-form').reset();
    const defaultDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    document.querySelectorAll('input[name="shift-days"]').forEach(cb => {
        cb.checked = defaultDays.includes(cb.value);
    });

    const select = document.getElementById('shift-dentist');
    select.innerHTML = '';

    const dentists = appState.users.filter(u => u.role === 'dentist');
    if (dentists.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.innerText = 'No hay odontólogos registrados';
        option.disabled = true;
        select.appendChild(option);
    } else {
        dentists.forEach(d => {
            const option = document.createElement('option');
            option.value = d.id;
            option.innerText = d.name;
            select.appendChild(option);
        });
    }

    document.getElementById('shift-modal').classList.add('active');
}

function closeShiftModal() {
    document.getElementById('shift-modal').classList.remove('active');
}

document.getElementById('shift-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dentistId = document.getElementById('shift-dentist').value;
    const start = document.getElementById('shift-start').value;
    const end = document.getElementById('shift-end').value;

    if (!dentistId) {
        alert("Error: Por favor, registre y seleccione un odontólogo primero.");
        return;
    }

    const dentist = appState.users.find(u => u.id === dentistId);
    if (!dentist) {
        alert("Error: Odontólogo no encontrado.");
        return;
    }

    const startHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    if (startHour >= endHour) {
        alert("Error de Horario: La hora de salida debe ser posterior a la hora de entrada.");
        return;
    }

    const selectedDays = Array.from(document.querySelectorAll('input[name="shift-days"]:checked')).map(cb => cb.value);
    if (selectedDays.length === 0) {
        alert("Error: Debe seleccionar al menos un día laboral.");
        return;
    }

    // Check for duplicate shifts for the selected dentist and days to prevent collisions
    const duplicateDays = selectedDays.filter(day => 
        appState.shifts.some(s => s.dentistId === dentistId && s.day === day)
    );
    if (duplicateDays.length > 0) {
        const dayNames = duplicateDays.map(d => getDaySpanish(d)).join(', ');
        alert(`Conflicto de Horarios: El odontólogo ya cuenta con turnos registrados para los siguientes días: ${dayNames}. Remueva los turnos existentes antes de registrar otros nuevos.`);
        return;
    }

    try {
        // Insert shifts in sequence
        for (const day of selectedDays) {
            const newShift = {
                id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'shf-' + Date.now() + Math.random().toString(36).substring(2, 7),
                dentistId,
                dentistName: dentist.name,
                day,
                start,
                end
            };

            const inserted = await insertShiftInDB(newShift);
            appState.shifts.push(inserted);
        }
        
        renderShiftsList();
        closeShiftModal();
    } catch (err) {
        alert("Error al registrar los turnos: " + err.message);
    }
});

async function deleteShift(shiftId) {
    if (confirm("¿Desea remover el turno de este odontólogo?")) {
        try {
            await deleteShiftInDB(shiftId);
            appState.shifts = appState.shifts.filter(s => s.id !== shiftId);
            renderShiftsList();
        } catch (err) {
            alert(err.message);
        }
    }
}

function setupRoleAccess(user) {
    document.getElementById('user-display-name').innerText = user.name;
    document.getElementById('user-display-role').innerText = getRoleNameSpanish(user.role);

    const adminOnly = document.querySelectorAll('.admin-only');
    const clinicalOnly = document.querySelectorAll('.clinical-only');

    if (user.role === 'admin') {
        adminOnly.forEach(el => el.classList.remove('hidden'));
        clinicalOnly.forEach(el => el.classList.remove('hidden'));
    } else if (user.role === 'dentist') {
        adminOnly.forEach(el => el.classList.add('hidden'));
        clinicalOnly.forEach(el => el.classList.remove('hidden'));
    } else {
        adminOnly.forEach(el => el.classList.add('hidden'));
        clinicalOnly.forEach(el => el.classList.add('hidden'));
    }
}

// -------------------------------------------------------------
// PATIENTS UI
// -------------------------------------------------------------
function renderPatientsList() {
    const tbody = document.getElementById('patients-table-body');
    tbody.innerHTML = '';

    appState.patients.forEach(patient => {
        const tr = document.createElement('tr');
        const isDisabled = patient.odontogram && patient.odontogram.disabled;
        if (isDisabled) {
            tr.style.opacity = '0.65';
        }

        tr.innerHTML = `
            <td><strong>#${patient.historyNumber}</strong></td>
            <td>${patient.dni}</td>
            <td>${patient.firstname} ${patient.lastname}</td>
            <td>${formatDateSpanish(patient.dob)}</td>
            <td>${patient.phone}</td>
            <td>${patient.email}</td>
            <td>
                <span class="badge ${isDisabled ? 'badge-danger' : 'badge-success'}">
                    ${isDisabled ? 'Inactivo' : 'Activo'}
                </span>
            </td>
            <td>
                <button class="btn btn-outline btn-sm" id="btn-edit-patient-${patient.id}" title="Editar Información">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn ${isDisabled ? 'btn-success-outline' : 'btn-danger-outline'} btn-sm" id="btn-toggle-patient-${patient.id}" title="${isDisabled ? 'Activar Paciente' : 'Desactivar Paciente'}">
                    <i class="fa-solid ${isDisabled ? 'fa-user-check' : 'fa-user-slash'}"></i>
                </button>
                <button class="btn btn-outline btn-sm" id="btn-view-profile-${patient.id}" title="Ver Expediente">
                    <i class="fa-solid fa-folder-open"></i> Expediente
                </button>
            </td>
        `;
        
        tr.querySelector(`#btn-edit-patient-${patient.id}`).onclick = () => editPatient(patient.id);
        tr.querySelector(`#btn-toggle-patient-${patient.id}`).onclick = () => togglePatientStatus(patient.id);
        
        tr.querySelector(`#btn-view-profile-${patient.id}`).onclick = async () => {
            if (appState.currentUser.role === 'receptionist') {
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

function editPatient(patientId) {
    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient) return;

    document.getElementById('patient-modal-title').innerText = "Editar Información de Paciente";
    document.getElementById('patient-id-field').value = patient.id;
    document.getElementById('patient-firstname').value = patient.firstname;
    document.getElementById('patient-lastname').value = patient.lastname;
    document.getElementById('patient-dni').value = patient.dni;
    document.getElementById('patient-dob').value = patient.dob;
    document.getElementById('patient-phone').value = patient.phone;
    document.getElementById('patient-email').value = patient.email;
    document.getElementById('patient-address').value = patient.address;
    document.getElementById('patient-allergies').value = patient.allergies || '';
    document.getElementById('patient-chronic').value = patient.chronic || '';
    
    document.getElementById('patient-dni-error').classList.add('hidden');
    document.getElementById('patient-modal').classList.add('active');
}

async function togglePatientStatus(patientId) {
    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient) return;

    const isDisabled = patient.odontogram && patient.odontogram.disabled;
    const actionText = isDisabled ? "ACTIVAR" : "DESACTIVAR";
    
    if (confirm(`¿Está seguro que desea ${actionText} a este paciente?`)) {
        try {
            if (!patient.odontogram) {
                patient.odontogram = {
                    baselineFrozen: false,
                    baseline: {},
                    evolution: {}
                };
            }
            patient.odontogram.disabled = !isDisabled;
            
            await updatePatientInDB(patientId, { odontogram: patient.odontogram });
            renderPatientsList();
        } catch (err) {
            alert(err.message);
        }
    }
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
    document.getElementById('patient-id-field').value = '';
    document.getElementById('patient-dni-error').classList.add('hidden');
    document.getElementById('patient-modal').classList.add('active');
}

function closePatientModal() {
    document.getElementById('patient-modal').classList.remove('active');
}

document.getElementById('patient-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('patient-id-field').value;
    const firstname = document.getElementById('patient-firstname').value.trim();
    const lastname = document.getElementById('patient-lastname').value.trim();
    const dni = document.getElementById('patient-dni').value.trim();
    const dob = document.getElementById('patient-dob').value;
    const phone = document.getElementById('patient-phone').value.trim();
    const email = document.getElementById('patient-email').value.trim();
    const address = document.getElementById('patient-address').value.trim();
    const allergies = document.getElementById('patient-allergies').value.trim();
    const chronic = document.getElementById('patient-chronic').value.trim();

    try {
        if (!id) {
            await addPatient({
                firstname, lastname, dni, dob, phone, email, address, allergies, chronic
            }, appState);
        } else {
            const idx = appState.patients.findIndex(p => p.id === id);
            if (idx > -1) {
                const existing = appState.patients[idx];
                if (existing.dni !== dni) {
                    const duplicate = appState.patients.find(p => p.dni === dni && p.id !== id);
                    if (duplicate) {
                        throw new Error("Este DNI ya está registrado.");
                    }
                }
                
                const updatedFields = {
                    firstname,
                    lastname,
                    dni,
                    dob,
                    phone,
                    email,
                    address,
                    allergies: allergies || 'Ninguna',
                    chronic: chronic || 'Ninguna'
                };
                
                const updated = await updatePatientInDB(id, updatedFields);
                Object.assign(appState.patients[idx], updated);
            }
        }
        renderPatientsList();
        closePatientModal();
    } catch (err) {
        if (err.message === "Este DNI ya está registrado.") {
            document.getElementById('patient-dni-error').classList.remove('hidden');
        } else {
            alert(err.message);
        }
    }
});

// -------------------------------------------------------------
// OPERATIONAL CALENDAR UI
// -------------------------------------------------------------
function loadCalendar() {
    const dateSel = document.getElementById('calendar-date-selector');
    if (!dateSel.value) {
        dateSel.value = appState.systemTime.toISOString().split('T')[0];
    }
    const selectedDate = dateSel.value;
    
    const parts = selectedDate.split('-');
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('calendar-grid-header-day').innerText = dateObj.toLocaleDateString('es-PE', options);

    const dentistFilter = document.getElementById('calendar-dentist-filter');
    const currentFilterVal = dentistFilter.value;
    dentistFilter.innerHTML = '';

    const dentists = appState.users.filter(u => u.role === 'dentist');
    dentists.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.innerText = d.name;
        dentistFilter.appendChild(opt);
    });

    if (currentFilterVal && dentists.some(d => d.id === currentFilterVal)) {
        dentistFilter.value = currentFilterVal;
    } else if (dentists.length > 0) {
        dentistFilter.value = dentists[0].id;
    }

    const selectedDentistId = dentistFilter.value;
    const gridContainer = document.getElementById('calendar-grid-rows');
    gridContainer.innerHTML = '';

    const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    hours.forEach(h => {
        const timeStr = `${String(h).padStart(2, '0')}:00`;
        const displayTime = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
        const appointment = appState.appointments.find(app => 
            app.date === selectedDate && 
            app.time === timeStr && 
            app.dentistId === selectedDentistId
        );

        const row = document.createElement('div');
        row.className = 'calendar-row';

        const timeCell = document.createElement('div');
        timeCell.className = 'time-cell';
        timeCell.innerText = `${displayTime} - ${h + 1 > 12 ? h + 1 - 12 : h + 1}:00 ${h + 1 >= 12 ? 'PM' : 'AM'}`;
        row.appendChild(timeCell);

        const slotCell = document.createElement('div');
        slotCell.className = 'slot-cell';
        slotCell.onclick = () => handleSlotClick(selectedDate, timeStr, selectedDentistId, appointment);

        if (appointment) {
            slotCell.innerHTML = `
                <div class="slot-appointment-card booked">
                    <div class="appointment-meta">
                        <strong>${appointment.patientName}</strong>
                        <span><i class="fa-solid fa-tooth"></i> Motivo: ${appointment.reason}</span>
                    </div>
                    <div class="appointment-actions">
                        ${appointment.depositPaid ? '<span class="badge badge-warning"><i class="fa-solid fa-circle-dollar-to-slot"></i> Abono S/ 50</span>' : ''}
                        <i class="fa-solid fa-lock"></i> Reservado
                    </div>
                </div>
            `;
        } else {
            slotCell.innerHTML = `
                <div class="slot-appointment-card free">
                    <span><i class="fa-solid fa-circle-plus"></i> Disponible</span>
                </div>
            `;
        }

        row.appendChild(slotCell);
        gridContainer.appendChild(row);
    });
}

function changeCalendarDay(days) {
    const dateSel = document.getElementById('calendar-date-selector');
    if (!dateSel.value) return;
    const parts = dateSel.value.split('-');
    const currentDate = new Date(parts[0], parts[1] - 1, parts[2]);
    currentDate.setDate(currentDate.getDate() + days);
    
    const pad = (n) => String(n).padStart(2, '0');
    dateSel.value = `${currentDate.getFullYear()}-${pad(currentDate.getMonth()+1)}-${pad(currentDate.getDate())}`;
    loadCalendar();
}

function handleSlotClick(date, time, dentistId, appointment) {
    if (appState.currentUser.role === 'dentist') {
        alert("Atención: Los odontólogos solo cuentan con permisos de visualización en la agenda.");
        return;
    }

    document.getElementById('appointment-id-field').value = appointment ? appointment.id : '';
    document.getElementById('appointment-date').value = date;
    document.getElementById('appointment-time').value = time;
    
    const displayHour = parseInt(time.split(':')[0]);
    const displayFormatted = `${displayHour > 12 ? displayHour - 12 : displayHour}:00 ${displayHour >= 12 ? 'PM' : 'AM'} - ${displayHour + 1 > 12 ? displayHour + 1 - 12 : displayHour + 1}:00 ${displayHour + 1 >= 12 ? 'PM' : 'AM'}`;
    document.getElementById('appointment-slot-info').innerHTML = `
        <strong>Fecha:</strong> ${date} | <strong>Horario:</strong> ${displayFormatted}
    `;

    const dentistSelect = document.getElementById('appointment-dentist');
    dentistSelect.innerHTML = '';
    appState.users.filter(u => u.role === 'dentist').forEach(d => {
        const option = document.createElement('option');
        option.value = d.id;
        option.innerText = d.name;
        dentistSelect.appendChild(option);
    });
    dentistSelect.value = dentistId;

    document.getElementById('appointment-patient-search').value = '';
    const patientDropdown = document.getElementById('appointment-patient');
    patientDropdown.innerHTML = '';
    patientDropdown.style.display = 'none';

    const cancelBtn = document.getElementById('btn-cancel-appointment');
    if (appointment) {
        cancelBtn.style.display = 'inline-flex';
        const opt = document.createElement('option');
        opt.value = appointment.patientId;
        opt.innerText = `${appointment.patientName} (${appointment.patientDni})`;
        opt.selected = true;
        patientDropdown.appendChild(opt);
        patientDropdown.style.display = 'block';
        
        document.getElementById('appointment-patient-search').value = appointment.patientName;
        document.getElementById('appointment-reason').value = appointment.reason;
        document.getElementById('appointment-deposit').checked = appointment.depositPaid;
    } else {
        cancelBtn.style.display = 'none';
        document.getElementById('appointment-reason').value = '';
        document.getElementById('appointment-deposit').checked = false;
    }

    toggleDepositValidation();
    document.getElementById('deposit-error-msg').classList.add('hidden');
    document.getElementById('appointment-modal').classList.add('active');
}

function searchPatientForAppointment() {
    const query = document.getElementById('appointment-patient-search').value.toLowerCase().trim();
    const dropdown = document.getElementById('appointment-patient');
    dropdown.innerHTML = '';

    if (query.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    const matches = appState.patients.filter(p => 
        !(p.odontogram && p.odontogram.disabled) &&
        (p.firstname.toLowerCase().includes(query) || 
        p.lastname.toLowerCase().includes(query) || 
        p.dni.includes(query))
    );

    if (matches.length > 0) {
        matches.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.innerText = `${p.firstname} ${p.lastname} (DNI: ${p.dni})`;
            dropdown.appendChild(opt);
        });
        dropdown.style.display = 'block';
    } else {
        const opt = document.createElement('option');
        opt.disabled = true;
        opt.innerText = 'No se encontraron pacientes';
        dropdown.appendChild(opt);
        dropdown.style.display = 'block';
    }
}

document.getElementById('appointment-patient').addEventListener('change', (e) => {
    const selectedText = e.target.options[e.target.selectedIndex].text;
    document.getElementById('appointment-patient-search').value = selectedText.split(' (')[0];
    document.getElementById('appointment-patient').style.display = 'none';
});

function toggleDepositValidation() {
    const checked = document.getElementById('appointment-deposit').checked;
    const label = document.getElementById('deposit-status-label');
    if (checked) {
        label.classList.add('text-success');
        label.classList.remove('text-danger');
        document.getElementById('deposit-error-msg').classList.add('hidden');
    } else {
        label.classList.remove('text-success');
        label.classList.add('text-danger');
    }
}

function closeAppointmentModal() {
    document.getElementById('appointment-modal').classList.remove('active');
}

document.getElementById('appointment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('appointment-id-field').value;
    const patientId = document.getElementById('appointment-patient').value;
    const reason = document.getElementById('appointment-reason').value.trim();
    const dentistId = document.getElementById('appointment-dentist').value;
    const depositPaid = document.getElementById('appointment-deposit').checked;
    
    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;

    try {
        await saveAppointment({
            id, patientId, reason, dentistId, depositPaid, date, time
        }, appState, appState.systemTime);
        loadCalendar();
        closeAppointmentModal();
    } catch (err) {
        alert(err.message);
    }
});

async function cancelAppointmentFlow() {
    const id = document.getElementById('appointment-id-field').value;
    if (!id) return;

    try {
        await cancelAppointment(id, appState, appState.systemTime);
        loadCalendar();
        closeAppointmentModal();
    } catch (err) {
        alert(err.message);
    }
}

// -------------------------------------------------------------
// REMINDERS UI
// -------------------------------------------------------------
function renderRemindersList() {
    const tbody = document.getElementById('reminders-table-body');
    tbody.innerHTML = '';

    const todayStr = appState.systemTime.toISOString().split('T')[0];
    const todayAppointments = appState.appointments.filter(a => a.date === todayStr);

    if (todayAppointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay citas programadas para el día de hoy (${formatDateSpanish(todayStr)}).</td></tr>`;
        return;
    }

    todayAppointments.forEach(appt => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${appt.patientName}</td>
            <td>${appt.patientDni}</td>
            <td><strong>${appt.time}</strong></td>
            <td>${appt.dentistName}</td>
            <td>S/ ${appt.depositAmount.toFixed(2)}</td>
            <td>
                <span class="badge ${appt.reminderSent ? 'badge-success' : 'badge-danger'}">
                    ${appt.reminderSent ? 'Recordatorio Enviado' : 'Pendiente'}
                </span>
            </td>
            <td>
                <button class="btn btn-outline btn-sm" id="btn-remind-${appt.id}">
                    <i class="fa-solid fa-envelope"></i> Enviar Mensaje
                </button>
            </td>
        `;
        
        tr.querySelector(`#btn-remind-${appt.id}`).onclick = () => openReminderTemplateModal(appt.id);
        tbody.appendChild(tr);
    });
}

function openReminderTemplateModal(apptId) {
    const appt = appState.appointments.find(a => a.id === apptId);
    if (!appt) return;

    activeReminderApptId = apptId;

    const displayHour = parseInt(appt.time.split(':')[0]);
    const formattedTime = `${displayHour > 12 ? displayHour - 12 : displayHour}:00 ${displayHour >= 12 ? 'PM' : 'AM'}`;
    const templateText = `Estimado(a) ${appt.patientName}, le recordamos su cita dental programada para el día de HOY a las ${formattedTime} con el especialista ${appt.dentistName} en la Clínica PortalDent Digital. Agradecemos su puntualidad.`;

    document.getElementById('reminder-template-text').innerText = templateText;
    document.getElementById('reminder-modal').classList.add('active');
}

function closeReminderModal() {
    document.getElementById('reminder-modal').classList.remove('active');
}

async function copyReminderText() {
    const text = document.getElementById('reminder-template-text').innerText;
    navigator.clipboard.writeText(text).then(async () => {
        alert("Mensaje copiado al portapapeles.");
        if (activeReminderApptId) {
            const index = appState.appointments.findIndex(a => a.id === activeReminderApptId);
            if (index > -1) {
                appState.appointments[index].reminderSent = true;
                try {
                    await updateAppointment(activeReminderApptId, { reminderSent: true });
                    renderRemindersList();
                } catch (err) {
                    console.error("Error updating reminder on DB:", err.message);
                }
            }
        }
        closeReminderModal();
    });
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
        const statusText = (p.odontogram && p.odontogram.disabled) ? ' (Inactivo)' : '';
        option.innerText = `${p.firstname} ${p.lastname} (DNI: ${p.dni})${statusText}`;
        select.appendChild(option);
    });
}

// EHR UI functions
async function loadEHRForPatient() {
    const patientId = document.getElementById('ehr-patient-select').value;
    if (!patientId) {
        clearEHRPanel();
        return;
    }

    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient) return;

    try {
        const odoState = await OdontogramController.loadPatientOdontogram(patientId);
        patient.odontogram = {
            ...patient.odontogram,
            baseline: odoState.baseline,
            evolution: odoState.evolution
        };
        OdontogramController.isFrozen = !!(patient.odontogram && patient.odontogram.baselineFrozen);
    } catch (err) {
        console.error("Error loading odontogram records:", err.message);
    }

    // Update search input to match selected patient
    const searchInput = document.getElementById('ehr-patient-search');
    if (searchInput) {
        searchInput.value = `${patient.firstname} ${patient.lastname}`;
        const clearBtn = document.getElementById('ehr-patient-search-clear');
        if (clearBtn) clearBtn.classList.remove('hidden');
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
    drawOdontogramTeethLayout(patient);
    updateOdontogramControls(patient);

    const pdfBtn = document.getElementById('btn-export-pdf');
    const helpTxt = document.getElementById('export-help-text');
    if (patient.evolutionNotes.length > 0) {
        pdfBtn.disabled = false;
        helpTxt.classList.add('hidden');
    } else {
        pdfBtn.disabled = true;
        helpTxt.classList.remove('hidden');
    }
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
        const clearBtn = document.getElementById('ehr-patient-search-clear');
        if (clearBtn) clearBtn.classList.add('hidden');
    }
    
    document.getElementById('odontogram-adult-upper').innerHTML = '';
    document.getElementById('odontogram-child-upper').innerHTML = '';
    document.getElementById('odontogram-child-lower').innerHTML = '';
    document.getElementById('odontogram-adult-lower').innerHTML = '';
}

function renderEvolutionNotesList(patient) {
    const timeline = document.getElementById('notes-timeline');
    timeline.innerHTML = '';
    document.getElementById('ehr-notes-count').innerText = patient.evolutionNotes.length;

    if (patient.evolutionNotes.length === 0) {
        timeline.innerHTML = '<p class="text-muted text-center py-4">Sin notas registradas. Agregue una nueva nota de evolución clínica.</p>';
        return;
    }

    const sortedNotes = [...patient.evolutionNotes].sort((a, b) => b.version - a.version);

    sortedNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        
        const noteDate = new Date(note.timestamp);
        const dateFormatted = noteDate.toLocaleString('es-PE', { hour12: true });

        item.innerHTML = `
            <div class="timeline-meta">Versión V${note.version} — ${dateFormatted}</div>
            <div class="timeline-content">${note.content}</div>
            <div class="timeline-author"><i class="fa-solid fa-signature"></i> Firmado por: ${note.author}</div>
        `;
        timeline.appendChild(item);
    });
}

document.getElementById('add-evolution-note-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = document.getElementById('ehr-patient-select').value;
    if (!patientId) return;

    const noteText = document.getElementById('new-note-text').value.trim();
    
    const systemTimeStr = appState.systemTime.toISOString();
    try {
        await addEvolutionNote(patientId, noteText, appState.currentUser.name, systemTimeStr, appState);
        document.getElementById('new-note-text').value = '';
        loadEHRForPatient();
    } catch (err) {
        alert(err.message);
    }
});

// -------------------------------------------------------------
// INTERACTIVE ODONTOGRAM RENDER
// -------------------------------------------------------------
function drawOdontogramTeethLayout(patient) {
    drawOdontogramTeethLayoutForContainer(patient, {
        adultUpper: 'odontogram-adult-upper',
        childUpper: 'odontogram-child-upper',
        childLower: 'odontogram-child-lower',
        adultLower: 'odontogram-adult-lower'
    });
}

function drawOdontogramTeethLayoutForContainer(patient, containerIds) {
    const adultUpper = document.getElementById(containerIds.adultUpper);
    const childUpper = document.getElementById(containerIds.childUpper);
    const childLower = document.getElementById(containerIds.childLower);
    const adultLower = document.getElementById(containerIds.adultLower);

    if (!adultUpper || !childUpper || !childLower || !adultLower) return;

    adultUpper.innerHTML = '';
    childUpper.innerHTML = '';
    childLower.innerHTML = '';
    adultLower.innerHTML = '';

    const fragAdultUpper = document.createDocumentFragment();
    const fragChildUpper = document.createDocumentFragment();
    const fragChildLower = document.createDocumentFragment();
    const fragAdultLower = document.createDocumentFragment();

    adultUpperTeeth.forEach(tId => {
        const el = createToothElement(tId, patient);
        fragAdultUpper.appendChild(el);
        const toothBaseline = patient.odontogram.baseline[tId] || null;
        const toothEvolution = patient.odontogram.evolution[tId] || null;
        OdontogramController.toothStateCache.set(tId, JSON.stringify({ toothBaseline, toothEvolution }));
    });

    childUpperTeeth.forEach(tId => {
        const el = createToothElement(tId, patient);
        fragChildUpper.appendChild(el);
        const toothBaseline = patient.odontogram.baseline[tId] || null;
        const toothEvolution = patient.odontogram.evolution[tId] || null;
        OdontogramController.toothStateCache.set(tId, JSON.stringify({ toothBaseline, toothEvolution }));
    });

    childLowerTeeth.forEach(tId => {
        const el = createToothElement(tId, patient);
        fragChildLower.appendChild(el);
        const toothBaseline = patient.odontogram.baseline[tId] || null;
        const toothEvolution = patient.odontogram.evolution[tId] || null;
        OdontogramController.toothStateCache.set(tId, JSON.stringify({ toothBaseline, toothEvolution }));
    });

    adultLowerTeeth.forEach(tId => {
        const el = createToothElement(tId, patient);
        fragAdultLower.appendChild(el);
        const toothBaseline = patient.odontogram.baseline[tId] || null;
        const toothEvolution = patient.odontogram.evolution[tId] || null;
        OdontogramController.toothStateCache.set(tId, JSON.stringify({ toothBaseline, toothEvolution }));
    });

    adultUpper.appendChild(fragAdultUpper);
    childUpper.appendChild(fragChildUpper);
    childLower.appendChild(fragChildLower);
    adultLower.appendChild(fragAdultLower);
}

function updateSingleToothDOM(tId, patient) {
    if (!OdontogramController.didToothStateChange(tId)) {
        console.log(`[Odontograma MEMOIZACIÓN]: Pieza ${tId} no cambió. Omitiendo renderizado.`);
        return;
    }
    console.log(`[Odontograma RENDER]: Re-renderizando pieza ${tId}.`);
    const newToothEl = createToothElement(tId, patient);
    const existingToothEl = document.getElementById(`tooth-block-${tId}`);
    if (existingToothEl && existingToothEl.parentNode) {
        existingToothEl.parentNode.replaceChild(newToothEl, existingToothEl);
    }
}

function createToothElement(tId, patient) {
    const div = document.createElement('div');
    div.className = 'tooth-block';
    div.id = `tooth-block-${tId}`;
    div.setAttribute('data-tooth', tId);

    const baselineData = patient.odontogram.baseline[tId] || { findings: [], surfaces: {} };
    const evolutionData = patient.odontogram.evolution[tId] || { findings: [], surfaces: {} };

    // Evolution overrides baseline status (absent / extracted)
    const toothStatus = evolutionData.status || baselineData.status || null;

    if (toothStatus === 'absent' || toothStatus === 'extracted') {
        div.classList.add('absent');
    }

    div.onclick = (e) => {
        if (e.target.tagName.toLowerCase() === 'polygon' || e.target.tagName.toLowerCase() === 'path') return;
        selectToothBlock(tId);
    };

    const isLower = (tId >= 31 && tId <= 48) || (tId >= 71 && tId <= 85);

    const rootConfig = getToothRootConfig(tId);
    const rootSvg = buildRootSVG(rootConfig, isLower);

    const crownW = 40;
    const crownH = 40;
    const rootH = rootConfig.height;
    const totalH = crownH + rootH;
    const svgW = crownW + 10; // extra margin for multi-root spread

    const svgWrapper = document.createElement('div');
    svgWrapper.className = 'tooth-svg-wrapper';
    svgWrapper.style.width = svgW + 'px';
    svgWrapper.style.height = totalH + 'px';

    const crownOffsetY = isLower ? rootH : 0;
    const rootOffsetY = isLower ? 0 : crownH;
    const cX = (svgW - crownW) / 2; // center crown horizontally

    let svgStr = `<svg class="tooth-svg" viewBox="0 0 ${svgW} ${totalH}" width="${svgW}" height="${totalH}">`;

    // --- ROOTS ---
    svgStr += rootSvg(cX, rootOffsetY, crownW, isLower);

    // --- CROWN (5-surface interactive polygons) ---
    const l = cX;
    const r = cX + crownW;
    const t = crownOffsetY;
    const b = crownOffsetY + crownH;
    const il = cX + crownW * 0.3;
    const ir = cX + crownW * 0.7;
    const it = crownOffsetY + crownH * 0.3;
    const ib = crownOffsetY + crownH * 0.7;
    const midX = cX + crownW / 2;
    const midY = crownOffsetY + crownH / 2;

    svgStr += `<polygon points="${l},${t} ${r},${t} ${ir},${it} ${il},${it}" class="surface buccal" data-surface="buccal"></polygon>`;
    svgStr += `<polygon points="${r},${t} ${r},${b} ${ir},${ib} ${ir},${it}" class="surface distal" data-surface="distal"></polygon>`;
    svgStr += `<polygon points="${l},${b} ${r},${b} ${ir},${ib} ${il},${ib}" class="surface lingual" data-surface="lingual"></polygon>`;
    svgStr += `<polygon points="${l},${t} ${l},${b} ${il},${ib} ${il},${it}" class="surface mesial" data-surface="mesial"></polygon>`;
    svgStr += `<polygon points="${il},${it} ${ir},${it} ${ir},${ib} ${il},${ib}" class="surface occlusal" data-surface="occlusal"></polygon>`;

    // Merge active findings
    const activeFindings = [...baselineData.findings, ...evolutionData.findings];

    activeFindings.forEach(f => {
        const color = f.estado ? '#0043c7' : '#ef4444'; // Azul vs Rojo
        const textY = isLower ? totalH - 1.5 : 9.5;

        switch (f.tipo) {
            case 'A': // Diente Ausente / Extracción
                svgStr += `<line x1="${l + 2}" y1="${t + 2}" x2="${r - 2}" y2="${b - 2}" stroke="${color}" stroke-width="2.5" />`;
                svgStr += `<line x1="${r - 2}" y1="${t + 2}" x2="${l + 2}" y2="${b - 2}" stroke="${color}" stroke-width="2.5" />`;
                break;
            case 'CD': // Corona Definitiva
            case 'CT': // Corona Temporal
                svgStr += `<circle cx="${midX}" cy="${midY}" r="21" stroke="${color}" stroke-width="2.5" fill="none" />`;
                svgStr += `<text x="${midX}" y="${textY}" font-size="8" font-weight="800" fill="${color}" text-anchor="middle">${f.tipo === 'CD' ? 'CD' : 'CT'}</text>`;
                break;
            case 'AOF': // Aparato Ortodóntico Fijo
                const sqY = isLower ? rootOffsetY + rootH - 8 : rootOffsetY + 2;
                // Square 1
                svgStr += `<rect x="${midX - 12}" y="${sqY}" width="6" height="6" stroke="${color}" stroke-width="1.2" fill="none" />`;
                svgStr += `<line x1="${midX - 12}" y1="${sqY}" x2="${midX - 6}" y2="${sqY + 6}" stroke="${color}" stroke-width="1" />`;
                svgStr += `<line x1="${midX - 6}" y1="${sqY}" x2="${midX - 12}" y2="${sqY + 6}" stroke="${color}" stroke-width="1" />`;
                // Square 2
                svgStr += `<rect x="${midX + 6}" y="${sqY}" width="6" height="6" stroke="${color}" stroke-width="1.2" fill="none" />`;
                svgStr += `<line x1="${midX + 6}" y1="${sqY}" x2="${midX + 12}" y2="${sqY + 6}" stroke="${color}" stroke-width="1" />`;
                svgStr += `<line x1="${midX + 12}" y1="${sqY}" x2="${midX + 6}" y2="${sqY + 6}" stroke="${color}" stroke-width="1" />`;
                // Connecting line
                svgStr += `<line x1="${midX - 6}" y1="${sqY + 3}" x2="${midX + 6}" y2="${sqY + 3}" stroke="${color}" stroke-width="1.5" />`;
                break;
            case 'AOR': // Aparato Ortodóntico Removible
                const zzY = isLower ? rootOffsetY + rootH - 4 : rootOffsetY + 4;
                svgStr += `<path d="M ${l} ${zzY} L ${l+10} ${zzY-4} L ${l+20} ${zzY+4} L ${l+30} ${zzY-4} L ${r} ${zzY}" stroke="${color}" stroke-width="1.8" fill="none" />`;
                break;
            case 'DES': // Desgaste
                svgStr += `<text x="${midX}" y="${textY}" font-size="8" font-weight="800" fill="${color}" text-anchor="middle">DES</text>`;
                break;
            case 'DIA': // Diastema
                svgStr += `<path d="M ${l - 1} ${t + 10} Q ${l - 4} ${midY} ${l - 1} ${b - 10}" stroke="${color}" stroke-width="2" fill="none"/>`;
                svgStr += `<path d="M ${r + 1} ${t + 10} Q ${r + 4} ${midY} ${r + 1} ${b - 10}" stroke="${color}" stroke-width="2" fill="none"/>`;
                break;
            case 'DIS': // Discromico
                svgStr += `<text x="${midX}" y="${textY}" font-size="8" font-weight="800" fill="${color}" text-anchor="middle">DIS</text>`;
                break;
            case 'ECT': // Ectópico
                svgStr += `<text x="${midX}" y="${textY}" font-size="9.5" font-weight="800" fill="${color}" text-anchor="middle">E</text>`;
                break;
            case 'CLV': // Clavija
                svgStr += `<polygon points="${midX},${t - 1} ${l + 1},${b - 1} ${r - 1},${b - 1}" stroke="${color}" stroke-width="1.8" fill="none" />`;
                break;
            case 'EXT': // Extruido
                const arrExtY = isLower ? rootOffsetY + rootH + 12 : rootOffsetY - 12;
                const tipExtY = isLower ? rootOffsetY + rootH : rootOffsetY;
                svgStr += `<line x1="${midX}" y1="${arrExtY}" x2="${midX}" y2="${tipExtY}" stroke="${color}" stroke-width="2" />`;
                svgStr += `<polygon points="${midX},${tipExtY} ${midX-3},${isLower ? tipExtY+5 : tipExtY-5} ${midX+3},${isLower ? tipExtY+5 : tipExtY-5}" fill="${color}" />`;
                break;
            case 'INT': // Intruido
                const arrIntY = isLower ? rootOffsetY + rootH : rootOffsetY;
                const tipIntY = isLower ? rootOffsetY + rootH + 12 : rootOffsetY - 12;
                svgStr += `<line x1="${midX}" y1="${arrIntY}" x2="${midX}" y2="${tipIntY}" stroke="${color}" stroke-width="2" />`;
                svgStr += `<polygon points="${midX},${tipIntY} ${midX-3},${isLower ? tipIntY-5 : tipIntY+5} ${midX+3},${isLower ? tipIntY-5 : tipIntY+5}" fill="${color}" />`;
                break;
            case 'EDT': // Edéntulo Total
                svgStr += `<line x1="${l}" y1="${midY}" x2="${r}" y2="${midY}" stroke="${color}" stroke-width="2.5" />`;
                break;
            case 'FRA': // Fractura
                svgStr += `<line x1="${l + 4}" y1="${t + 8}" x2="${r - 4}" y2="${b - 8}" stroke="${color}" stroke-width="2.5" />`;
                break;
            case 'GEM': // Geminación/Fusión
                const gemY = isLower ? totalH - 4 : 8;
                svgStr += `<circle cx="${midX - 5}" cy="${gemY}" r="4.5" stroke="${color}" stroke-width="1.5" fill="none" />`;
                svgStr += `<circle cx="${midX + 5}" cy="${gemY}" r="4.5" stroke="${color}" stroke-width="1.5" fill="none" />`;
                break;
            case 'GIR': // Giroversión
                const girY = isLower ? totalH - 5 : 5;
                svgStr += `<path d="M ${midX - 10} ${girY} Q ${midX} ${isLower ? girY - 6 : girY + 6} ${midX + 10} ${girY}" fill="none" stroke="${color}" stroke-width="1.5" />`;
                svgStr += `<polygon points="${midX+10},${girY} ${midX+6},${isLower ? girY-3 : girY+3} ${midX+6},${isLower ? girY+3 : girY-3}" fill="${color}" />`;
                break;
            case 'IMPAC': // Impactación
                svgStr += `<text x="${midX}" y="${textY}" font-size="9.5" font-weight="800" fill="${color}" text-anchor="middle">I</text>`;
                break;
            case 'IMP': // Implante
                svgStr += `<text x="${midX}" y="${rootOffsetY + rootH / 2 + 3}" font-size="9" font-weight="800" fill="${color}" text-anchor="middle">IMP</text>`;
                break;
            case 'MAC': // Macrodoncia
                svgStr += `<text x="${midX}" y="${textY}" font-size="8" font-weight="800" fill="${color}" text-anchor="middle">MAC</text>`;
                break;
            case 'MIC': // Microdoncia
                svgStr += `<text x="${midX}" y="${textY}" font-size="8" font-weight="800" fill="${color}" text-anchor="middle">MIC</text>`;
                break;
            case 'MIG': // Migración
                svgStr += `<line x1="${l + 2}" y1="${midY}" x2="${r - 2}" y2="${midY}" stroke="${color}" stroke-width="2" />`;
                svgStr += `<polygon points="${r-2},${midY} ${r-6},${midY-3} ${r-6},${midY+3}" fill="${color}" />`;
                break;
            case 'MOV': // Movilidad
                svgStr += `<text x="${midX}" y="${textY}" font-size="8" font-weight="800" fill="${color}" text-anchor="middle">MOV</text>`;
                break;
            case 'PF': // Prótesis Fija
                svgStr += `<line x1="${l}" y1="${t + 12}" x2="${r}" y2="${t + 12}" stroke="${color}" stroke-width="2" />`;
                svgStr += `<line x1="${l}" y1="${t + 28}" x2="${r}" y2="${t + 28}" stroke="${color}" stroke-width="2" />`;
                svgStr += `<text x="${midX}" y="${textY}" font-size="8" font-weight="800" fill="${color}" text-anchor="middle">PF</text>`;
                break;
            case 'PR': // Prótesis Removible
                const prY = isLower ? rootOffsetY + rootH - 8 : rootOffsetY + 2;
                svgStr += `<line x1="${l}" y1="${prY}" x2="${r}" y2="${prY}" stroke="${color}" stroke-width="1.8" />`;
                svgStr += `<line x1="${l}" y1="${prY + 4}" x2="${r}" y2="${prY + 4}" stroke="${color}" stroke-width="1.8" />`;
                break;
            case 'PT': // Prótesis Total
                svgStr += `<line x1="${l}" y1="${t + 10}" x2="${r}" y2="${t + 10}" stroke="${color}" stroke-width="2" />`;
                svgStr += `<line x1="${l}" y1="${t + 30}" x2="${r}" y2="${t + 30}" stroke="${color}" stroke-width="2" />`;
                svgStr += `<text x="${midX}" y="${textY}" font-size="8" font-weight="800" fill="${color}" text-anchor="middle">PT</text>`;
                break;
            case 'RR': // Remanente Radicular
                svgStr += `<text x="${midX}" y="${rootOffsetY + rootH / 2 + 3}" font-size="9" font-weight="800" fill="#ef4444" text-anchor="middle">RR</text>`;
                break;
            case 'SI': // Semi-impactación
                svgStr += `<text x="${midX}" y="${textY}" font-size="8" font-weight="800" fill="${color}" text-anchor="middle">SI</text>`;
                break;
            case 'SUP': // Supernumerario
                const supY = isLower ? totalH - 6 : 10;
                svgStr += `<circle cx="${midX}" cy="${supY}" r="6" stroke="${color}" stroke-width="1.2" fill="none" />`;
                svgStr += `<text x="${midX}" y="${isLower ? totalH - 3.5 : 12.5}" font-size="7.5" font-weight="800" fill="${color}" text-anchor="middle">S</text>`;
                break;
            case 'TRA': // Transposición
                const traY = isLower ? totalH - 6 : 8;
                svgStr += `<path d="M ${midX-8} ${traY} Q ${midX} ${isLower ? traY-4 : traY+4} ${midX+8} ${traY}" stroke="${color}" stroke-width="1.2" fill="none" />`;
                svgStr += `<path d="M ${midX-8} ${traY+2} Q ${midX} ${isLower ? traY+6 : traY-2} ${midX+8} ${traY+2}" stroke="${color}" stroke-width="1.2" fill="none" />`;
                break;
            case 'TP': // Tratamiento Pulpar
                svgStr += `<line x1="${midX}" y1="${t + 20}" x2="${midX}" y2="${rootOffsetY + rootH}" stroke="${color}" stroke-width="2.2" />`;
                svgStr += `<text x="${midX}" y="${textY}" font-size="8" font-weight="800" fill="${color}" text-anchor="middle">TP</text>`;
                break;
        }
    });

    svgStr += `</svg>`;
    svgWrapper.innerHTML = svgStr;

    // Apply color treatments to surfaces
    const surfaces = svgWrapper.querySelectorAll('.surface');
    surfaces.forEach(poly => {
        const surfName = poly.getAttribute('data-surface');
        poly.onclick = (event) => selectSurfaceClick(event, tId, surfName);

        // Find active surface finding (evolution overrides baseline)
        let activeSurf = null;
        if (evolutionData.surfaces && evolutionData.surfaces[surfName]) {
            activeSurf = evolutionData.surfaces[surfName];
        } else if (baselineData.surfaces && baselineData.surfaces[surfName]) {
            activeSurf = baselineData.surfaces[surfName];
        }

        if (activeSurf) {
            const fillClass = activeSurf.estado ? 'curation-filled' : 'pathology-filled';
            poly.classList.add(fillClass);
        }
    });

    // Build the tooth block layout
    const numberLabel = document.createElement('span');
    numberLabel.className = 'tooth-number';
    numberLabel.innerText = tId;

    if (isLower) {
        div.appendChild(svgWrapper);
        div.appendChild(numberLabel);
    } else {
        div.appendChild(numberLabel);
        div.appendChild(svgWrapper);
    }

    return div;
}

// Tooth root configuration based on FDI clinical anatomy
function getToothRootConfig(tId) {
    // Child teeth (FDI 51-85)
    if (tId >= 51 && tId <= 85) {
        const childMolars = [54, 55, 64, 65, 74, 75, 84, 85];
        if (childMolars.includes(tId)) {
            return { roots: 2, height: 22, type: 'child-molar' };
        }
        return { roots: 1, height: 18, type: 'child-single' };
    }

    // Adult teeth (FDI 11-48)
    // Upper molars (18, 17, 16, 26, 27, 28) -> 3 roots
    if ([18, 17, 16, 26, 27, 28].includes(tId)) return { roots: 3, height: 30, type: 'molar-3' };
    // Upper premolars (15, 14, 24, 25) -> 2 roots
    if ([15, 14, 24, 25].includes(tId)) return { roots: 2, height: 26, type: 'premolar-2' };
    // Canines (13, 23) -> 1 long root
    if ([13, 23].includes(tId)) return { roots: 1, height: 28, type: 'canine' };
    // Incisors (12, 11, 21, 22) -> 1 root
    if ([12, 11, 21, 22].includes(tId)) return { roots: 1, height: 24, type: 'incisor' };

    // Lower molars (48, 47, 46, 36, 37, 38) -> 2 roots
    if ([48, 47, 46, 36, 37, 38].includes(tId)) return { roots: 2, height: 28, type: 'molar-2' };
    // Lower premolars (45, 44, 34, 35) -> 1 root
    if ([45, 44, 34, 35].includes(tId)) return { roots: 1, height: 24, type: 'premolar-1' };
    // Canines (43, 33) -> 1 root
    if ([43, 33].includes(tId)) return { roots: 1, height: 26, type: 'canine' };
    // Incisors (42, 41, 31, 32) -> 1 root
    if ([42, 41, 31, 32].includes(tId)) return { roots: 1, height: 22, type: 'incisor' };

    return { roots: 1, height: 22, type: 'default' };
}

// Build root SVG paths as a function that takes position params
function buildRootSVG(config, isLower) {
    return function(cX, rootOffsetY, crownW, isLower) {
        let svg = '';
        const rootColor = '#e8ddd3';
        const rootStroke = '#b8a898';
        const midX = cX + crownW / 2;

        if (config.roots === 1) {
            // Single root - tapered shape
            const w = crownW * 0.28;
            if (isLower) {
                // Root goes UP from rootOffsetY
                svg += `<path d="M${midX - w},${rootOffsetY + config.height} 
                         Q${midX - w * 0.6},${rootOffsetY + config.height * 0.4} ${midX},${rootOffsetY} 
                         Q${midX + w * 0.6},${rootOffsetY + config.height * 0.4} ${midX + w},${rootOffsetY + config.height}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
            } else {
                // Root goes DOWN from rootOffsetY
                svg += `<path d="M${midX - w},${rootOffsetY} 
                         Q${midX - w * 0.6},${rootOffsetY + config.height * 0.6} ${midX},${rootOffsetY + config.height} 
                         Q${midX + w * 0.6},${rootOffsetY + config.height * 0.6} ${midX + w},${rootOffsetY}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
            }
        } else if (config.roots === 2) {
            // Two roots - spread apart
            const spread = crownW * 0.18;
            const w = crownW * 0.18;
            const leftX = midX - spread;
            const rightX = midX + spread;

            if (isLower) {
                svg += `<path d="M${leftX - w},${rootOffsetY + config.height} 
                         Q${leftX - w * 0.3},${rootOffsetY + config.height * 0.35} ${leftX},${rootOffsetY} 
                         Q${leftX + w * 0.3},${rootOffsetY + config.height * 0.35} ${leftX + w},${rootOffsetY + config.height}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
                svg += `<path d="M${rightX - w},${rootOffsetY + config.height} 
                         Q${rightX - w * 0.3},${rootOffsetY + config.height * 0.35} ${rightX},${rootOffsetY} 
                         Q${rightX + w * 0.3},${rootOffsetY + config.height * 0.35} ${rightX + w},${rootOffsetY + config.height}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
            } else {
                svg += `<path d="M${leftX - w},${rootOffsetY} 
                         Q${leftX - w * 0.3},${rootOffsetY + config.height * 0.65} ${leftX},${rootOffsetY + config.height} 
                         Q${leftX + w * 0.3},${rootOffsetY + config.height * 0.65} ${leftX + w},${rootOffsetY}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
                svg += `<path d="M${rightX - w},${rootOffsetY} 
                         Q${rightX - w * 0.3},${rootOffsetY + config.height * 0.65} ${rightX},${rootOffsetY + config.height} 
                         Q${rightX + w * 0.3},${rootOffsetY + config.height * 0.65} ${rightX + w},${rootOffsetY}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
            }
        } else if (config.roots === 3) {
            // Three roots (upper molars) - two buccal + one palatal
            const w = crownW * 0.14;
            const leftX = midX - crownW * 0.22;
            const rightX = midX + crownW * 0.22;

            if (isLower) {
                // Center root (palatal)
                svg += `<path d="M${midX - w * 0.8},${rootOffsetY + config.height} 
                         Q${midX - w * 0.4},${rootOffsetY + config.height * 0.3} ${midX},${rootOffsetY} 
                         Q${midX + w * 0.4},${rootOffsetY + config.height * 0.3} ${midX + w * 0.8},${rootOffsetY + config.height}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
                // Left root
                svg += `<path d="M${leftX - w},${rootOffsetY + config.height} 
                         Q${leftX - w * 0.3},${rootOffsetY + config.height * 0.4} ${leftX},${rootOffsetY + config.height * 0.15} 
                         Q${leftX + w * 0.3},${rootOffsetY + config.height * 0.4} ${leftX + w},${rootOffsetY + config.height}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
                // Right root
                svg += `<path d="M${rightX - w},${rootOffsetY + config.height} 
                         Q${rightX - w * 0.3},${rootOffsetY + config.height * 0.4} ${rightX},${rootOffsetY + config.height * 0.15} 
                         Q${rightX + w * 0.3},${rootOffsetY + config.height * 0.4} ${rightX + w},${rootOffsetY + config.height}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
            } else {
                // Center root (palatal) - longest
                svg += `<path d="M${midX - w * 0.8},${rootOffsetY} 
                         Q${midX - w * 0.4},${rootOffsetY + config.height * 0.7} ${midX},${rootOffsetY + config.height} 
                         Q${midX + w * 0.4},${rootOffsetY + config.height * 0.7} ${midX + w * 0.8},${rootOffsetY}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
                // Left root
                svg += `<path d="M${leftX - w},${rootOffsetY} 
                         Q${leftX - w * 0.3},${rootOffsetY + config.height * 0.6} ${leftX},${rootOffsetY + config.height * 0.85} 
                         Q${leftX + w * 0.3},${rootOffsetY + config.height * 0.6} ${leftX + w},${rootOffsetY}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
                // Right root
                svg += `<path d="M${rightX - w},${rootOffsetY} 
                         Q${rightX - w * 0.3},${rootOffsetY + config.height * 0.6} ${rightX},${rootOffsetY + config.height * 0.85} 
                         Q${rightX + w * 0.3},${rootOffsetY + config.height * 0.6} ${rightX + w},${rootOffsetY}" 
                         fill="${rootColor}" stroke="${rootStroke}" stroke-width="1.2" class="tooth-root"/>`;
            }
        }
        return svg;
    };
}

async function selectToothBlock(tId) {
    const patientId = document.getElementById('ehr-patient-select').value;
    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient) return;

    if (currentOdontogramMode === 'baseline') {
        if (patient.odontogram.baselineFrozen) {
            alert("La ficha diagnóstica inicial está congelada y no puede modificarse.");
            return;
        }
        openFindingModal(tId, null);
    } else {
        openFindingModal(tId, null);
    }
}

function selectSurfaceClick(event, tId, surface) {
    event.stopPropagation();
    const patientId = document.getElementById('ehr-patient-select').value;
    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient) return;

    if (currentOdontogramMode === 'baseline' && patient.odontogram.baselineFrozen) {
        alert("La ficha diagnóstica inicial está congelada y no puede modificarse.");
        return;
    }

    openFindingModal(tId, surface);
}

function highlightToothBlock(tId) {
    document.querySelectorAll('.tooth-block').forEach(b => {
        b.classList.remove('selected-tooth');
        b.querySelectorAll('.surface').forEach(s => s.style.stroke = '');
    });

    const activeBlock = document.getElementById(`tooth-block-${tId}`);
    if (activeBlock) {
        activeBlock.classList.add('selected-tooth');
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

function setOdontogramMode(mode) {
    currentOdontogramMode = mode;
    
    document.getElementById('btn-odontogram-mode-baseline').classList.remove('active');
    document.getElementById('btn-odontogram-mode-evolution').classList.remove('active');
    
    document.getElementById('baseline-actions').classList.add('hidden');
    document.getElementById('evolution-actions').classList.add('hidden');

    const helpText = document.getElementById('odontogram-help-text');

    if (mode === 'baseline') {
        document.getElementById('btn-odontogram-mode-baseline').classList.add('active');
        document.getElementById('baseline-actions').classList.remove('hidden');
        helpText.innerText = "Modo Inicial (Baseline): Configure el estado de ingreso del paciente. Al guardar, este registro se congelará y firmará legalmente.";
    } else {
        document.getElementById('btn-odontogram-mode-evolution').classList.add('active');
        document.getElementById('evolution-actions').classList.remove('hidden');
        helpText.innerText = "Modo Evolución: Haga clic en piezas o superficies dentales para registrar evoluciones, curaciones o tratamientos.";
    }

    selectedToothId = null;
    selectedSurfaceName = null;
    
    const patientId = document.getElementById('ehr-patient-select').value;
    if (patientId) {
        const patient = appState.patients.find(p => p.id === patientId);
        updateOdontogramControls(patient);
    }
}

function updateOdontogramControls(patient) {
    const saveBtn = document.getElementById('btn-save-baseline');
    const indicator = document.getElementById('baseline-saved-indicator');

    if (patient.odontogram && patient.odontogram.baselineFrozen) {
        saveBtn.classList.add('hidden');
        indicator.classList.remove('hidden');
    } else {
        saveBtn.classList.remove('hidden');
        indicator.classList.add('hidden');
    }
}

async function saveBaselineStateFlow() {
    const patientId = document.getElementById('ehr-patient-select').value;
    if (!patientId) return;

    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient) return;

    if (confirm("¿Está seguro que desea CONGELAR el estado inicial del odontograma? Esta acción firmará digitalmente el baseline y lo hará inalterable por ley.")) {
        try {
            saveBaselineState(patient);
            OdontogramController.isFrozen = true;
            await updatePatientInDB(patient.id, { odontogram: patient.odontogram });
            updateOdontogramControls(patient);
            alert("El estado inicial de admisión ha sido congelado correctamente.");
        } catch (err) {
            alert(err.message);
        }
    }
}

function openFindingModal(tId, surface) {
    const patientId = document.getElementById('ehr-patient-select').value;
    if (!patientId) {
        alert("Debe seleccionar un paciente primero.");
        return;
    }
    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient) return;

    highlightToothBlock(tId);

    document.getElementById('finding-tooth-id').value = tId;
    document.getElementById('finding-tooth-display').value = `Pieza FDI ${tId}`;
    
    document.getElementById('finding-surface-name').value = surface || '';
    document.getElementById('finding-surface-display').value = surface ? getSurfaceNameSpanish(surface) : 'Toda la pieza';

    // Reset fields
    document.getElementById('finding-type-select').value = '';
    document.getElementById('finding-state-select').value = 'true';
    document.getElementById('finding-specifications').value = '';

    // Filter findings select options based on surface or whole tooth
    const typeSelect = document.getElementById('finding-type-select');
    const groups = typeSelect.querySelectorAll('optgroup');
    groups.forEach(g => {
        const label = g.getAttribute('label');
        if (surface) {
            g.style.display = (label === 'Superficies Dentales') ? 'block' : 'none';
        } else {
            g.style.display = (label === 'Superficies Dentales') ? 'none' : 'block';
        }
    });

    document.getElementById('odontogram-finding-modal').classList.add('active');
}

function closeFindingModal() {
    document.getElementById('odontogram-finding-modal').classList.remove('active');
}

// Handler for finding form submit
document.getElementById('odontogram-finding-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientId = document.getElementById('ehr-patient-select').value;
    if (!patientId) return;

    const patient = appState.patients.find(p => p.id === patientId);
    if (!patient) return;

    const toothId = parseInt(document.getElementById('finding-tooth-id').value);
    const surface = document.getElementById('finding-surface-name').value || null;
    const tipo_hallazgo = document.getElementById('finding-type-select').value;
    const estado = document.getElementById('finding-state-select').value === 'true';
    const especificaciones = document.getElementById('finding-specifications').value.trim();

    if (!tipo_hallazgo) {
        alert("Debe seleccionar un tipo de hallazgo.");
        return;
    }

    const isBaseline = currentOdontogramMode === 'baseline';

    try {
        // Atomic transaction: validation, DB saving, and state update
        await OdontogramController.saveOdontogramRecord({
            tooth_id: toothId,
            surface,
            tipo_hallazgo,
            estado,
            especificaciones
        }, isBaseline, appState.currentUser.id);

        // Synchronize in-memory patient odontogram state
        patient.odontogram.baseline = OdontogramController.reconstructedState.baseline;
        patient.odontogram.evolution = OdontogramController.reconstructedState.evolution;

        // Perform selective tooth re-rendering (pure JS memoized check)
        updateSingleToothDOM(toothId, patient);

        // Auto-generate evolution log note
        const typeLabel = document.getElementById('finding-type-select').options[document.getElementById('finding-type-select').selectedIndex].text;
        const logText = `[ODONTOGRAMA ${isBaseline ? 'INICIAL' : 'EVOLUTIVO'}]: Se registra ${typeLabel}. Estado: ${estado ? 'Buen estado / Existente' : 'Mal estado / Patología / Requerido'}. Especificación: ${especificaciones}`;
        const systemTimeStr = appState.systemTime.toISOString();
        await addEvolutionNote(patientId, logText, appState.currentUser.name, systemTimeStr, appState);

        // Refresh evolution notes list in UI without reloading/redrawing all teeth
        renderEvolutionNotesList(patient);

        closeFindingModal();
    } catch (err) {
        alert("Error al registrar hallazgo: " + err.message);
    }
});

function exportPatientPDF() {
    const patientId = document.getElementById('ehr-patient-select').value;
    if (!patientId) return;
    exportPatientPDFDirect(patientId, appState);
}

async function logoutFlow() {
    try {
        await logout();
    } catch (err) {
        console.error("Error signing out:", err.message);
    }
    window.location.reload();
}

// -------------------------------------------------------------
// BIND GLOBAL WINDOW EVENT HANDLERS FOR BACKWARD COMPATIBILITY
// -------------------------------------------------------------
window.switchView = switchView;
window.logout = logoutFlow;
window.changeCalendarDay = changeCalendarDay;
window.loadCalendar = loadCalendar;
window.filterPatients = filterPatients;
window.openPatientModal = openPatientModal;
window.closePatientModal = closePatientModal;
window.searchPatientForAppointment = searchPatientForAppointment;
window.toggleDepositValidation = toggleDepositValidation;
window.closeAppointmentModal = closeAppointmentModal;
window.cancelAppointmentFlow = cancelAppointmentFlow;
window.openReminderTemplateModal = openReminderTemplateModal;
window.closeReminderModal = closeReminderModal;
window.copyReminderText = copyReminderText;
window.loadEHRForPatient = loadEHRForPatient;
window.setOdontogramMode = setOdontogramMode;
window.saveBaselineState = saveBaselineStateFlow;
window.closeFindingModal = closeFindingModal;
window.exportPatientPDF = exportPatientPDF;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.openShiftModal = openShiftModal;
window.closeShiftModal = closeShiftModal;
window.deleteShift = deleteShift;
window.selectSurfaceClick = selectSurfaceClick;
window.editPatient = editPatient;
window.togglePatientStatus = togglePatientStatus;
window.openTarifarioModal = openTarifarioModal;
window.closeTarifarioModal = closeTarifarioModal;
window.deleteTarifarioCatalogItem = deleteTarifarioCatalogItem;
window.toggleTreatmentPlanStatus = toggleTreatmentPlanStatus;
window.deleteTreatmentPlanItem = deleteTreatmentPlanItem;

// Application Initialization Bootstrap
async function bootstrap() {
    // Fetch active clinic state asynchronously from database
    try {
        appState.users = await getUsers();
        appState.patients = await getPatients();
        appState.shifts = await getShifts();
        appState.appointments = await getAppointments();
        appState.treatmentsCatalog = await getTreatmentsCatalog();
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
    setupSidebarToggle();
}

function setupSidebarToggle() {
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const workspace = document.getElementById('main-workspace');

    if (toggleBtn && workspace) {
        toggleBtn.addEventListener('click', () => {
            workspace.classList.toggle('collapsed-sidebar');
        });
    }
}

function setupPatientSearch() {
    const searchInput = document.getElementById('ehr-patient-search');
    const resultsDropdown = document.getElementById('ehr-patient-search-results');
    const select = document.getElementById('ehr-patient-select');
    const clearBtn = document.getElementById('ehr-patient-search-clear');

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
                    loadEHRForPatient();
                });
                resultsDropdown.appendChild(item);
            });
        }

        resultsDropdown.classList.remove('hidden');
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            select.value = '';
            toggleClearBtn();
            resultsDropdown.classList.add('hidden');
            loadEHRForPatient();
            searchInput.focus();
        });
    }

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

// ============================================================================
// CLINICAL TARIFARIO CRUD FUNCTIONS
// ============================================================================
async function renderTarifarioList() {
    const tbody = document.getElementById('tarifario-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
        appState.treatmentsCatalog = await getTreatmentsCatalog();
    } catch (err) {
        console.error("Error fetching treatments catalog:", err.message);
    }

    appState.treatmentsCatalog.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge badge-info">${item.categoria}</span></td>
            <td><strong>${item.nombre}</strong></td>
            <td>S/ ${parseFloat(item.precio_soles).toFixed(2)}</td>
            <td>$ ${parseFloat(item.precio_dolares).toFixed(2)}</td>
            <td>
                <button class="btn btn-outline btn-sm mr-1" onclick="openTarifarioModal('${item.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="btn btn-danger-outline btn-sm" onclick="deleteTarifarioCatalogItem('${item.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openTarifarioModal(itemId = '') {
    const modal = document.getElementById('tarifario-modal');
    const form = document.getElementById('tarifario-form');
    form.reset();
    
    if (itemId) {
        document.getElementById('tarifario-modal-title').innerText = "Editar Procedimiento";
        const item = appState.treatmentsCatalog.find(t => t.id === itemId);
        if (item) {
            document.getElementById('tarifario-item-id').value = item.id;
            document.getElementById('tarifario-nombre').value = item.nombre;
            document.getElementById('tarifario-categoria').value = item.categoria;
            document.getElementById('tarifario-precio-soles').value = item.precio_soles;
            document.getElementById('tarifario-precio-dolares').value = item.precio_dolares;
        }
    } else {
        document.getElementById('tarifario-modal-title').innerText = "Nuevo Procedimiento";
        document.getElementById('tarifario-item-id').value = '';
    }
    
    modal.classList.add('active');
}

function closeTarifarioModal() {
    document.getElementById('tarifario-modal').classList.remove('active');
}

document.getElementById('tarifario-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('tarifario-item-id').value;
    const nombre = document.getElementById('tarifario-nombre').value.trim();
    const categoria = document.getElementById('tarifario-categoria').value;
    const precio_soles = parseFloat(document.getElementById('tarifario-precio-soles').value);
    const precio_dolares = parseFloat(document.getElementById('tarifario-precio-dolares').value);

    const itemData = { nombre, categoria, precio_soles, precio_dolares };

    try {
        if (id) {
            await updateTreatmentInCatalog(id, itemData);
        } else {
            await insertTreatmentInCatalog(itemData);
        }
        closeTarifarioModal();
        await renderTarifarioList();
    } catch (err) {
        alert("Error al guardar en catálogo: " + err.message);
    }
});

async function deleteTarifarioCatalogItem(id) {
    if (confirm("¿Está seguro que desea eliminar este procedimiento del catálogo?")) {
        try {
            await deleteTreatmentFromCatalog(id);
            await renderTarifarioList();
        } catch (err) {
            alert("Error al eliminar del catálogo: " + err.message);
        }
    }
}

// ============================================================================
// PATIENT TREATMENT PLAN CRUD & WORKFLOW
// ============================================================================
async function initializeTreatmentPlanView() {
    const patientId = document.getElementById('ehr-patient-select').value;
    const patientNameLabel = document.getElementById('treatment-plan-patient-name');
    
    const treatmentSelect = document.getElementById('plan-treatment-select');
    const toothSelect = document.getElementById('plan-tooth-select');

    if (!patientId) {
        patientNameLabel.innerText = "Ningún paciente seleccionado";
        document.getElementById('treatment-plan-table-body').innerHTML = '<tr><td colspan="6" class="text-center text-muted">Seleccione un paciente en la ficha clínica primero.</td></tr>';
        return;
    }

    const patient = appState.patients.find(p => p.id === patientId);
    if (patient) {
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
        opt.innerText = `${item.nombre} (S/ ${parseFloat(item.precio_soles).toFixed(2)} | $ ${parseFloat(item.precio_dolares).toFixed(2)})`;
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

    // Render read-only odontogram reference
    drawOdontogramTeethLayoutForContainer(patient, {
        adultUpper: 'odontogram-treatment-plan-adult-upper',
        childUpper: 'odontogram-treatment-plan-child-upper',
        childLower: 'odontogram-treatment-plan-child-lower',
        adultLower: 'odontogram-treatment-plan-adult-lower'
    });

    // Load and render patient treatment plan items
    await loadPatientTreatmentPlans(patientId);
}

async function loadPatientTreatmentPlans(patientId) {
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
    let dollarsPending = 0;
    let dollarsDone = 0;

    appState.patientTreatmentPlans.forEach(item => {
        const soles = parseFloat(item.precio_soles_aplicado);
        const dollars = parseFloat(item.precio_dolares_aplicado);

        if (item.estado === 'realizado') {
            solesDone += soles;
            dollarsDone += dollars;
        } else {
            solesPending += soles;
            dollarsPending += dollars;
        }

        const toothLabel = item.tooth_id ? `Pieza ${item.tooth_id}` : 'General';
        const isDone = item.estado === 'realizado';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.treatments_catalog?.nombre || 'Procedimiento'}</strong></td>
            <td>${toothLabel}</td>
            <td>S/ ${soles.toFixed(2)}</td>
            <td>$ ${dollars.toFixed(2)}</td>
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
    document.getElementById('plan-total-dollars-pending').innerText = `$ ${dollarsPending.toFixed(2)}`;
    document.getElementById('plan-total-dollars-done').innerText = `$ ${dollarsDone.toFixed(2)}`;
}

document.getElementById('add-treatment-plan-form').addEventListener('submit', async (e) => {
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
        precio_dolares_aplicado: treatment.precio_dolares // Historical price preserved
    };

    try {
        await insertPatientTreatmentPlan(record);
        document.getElementById('add-treatment-plan-form').reset();
        await loadPatientTreatmentPlans(patientId);
    } catch (err) {
        alert("Error al agregar al plan: " + err.message);
    }
});

async function toggleTreatmentPlanStatus(planId, currentStatus) {
    const nextStatus = currentStatus === 'realizado' ? 'pendiente' : 'realizado';
    const executionDate = nextStatus === 'realizado' ? appState.systemTime.toISOString() : null;

    try {
        await updatePatientTreatmentPlan(planId, { estado: nextStatus, fecha_ejecucion: executionDate });
        const patientId = document.getElementById('ehr-patient-select').value;
        await loadPatientTreatmentPlans(patientId);
    } catch (err) {
        alert("Error al cambiar estado: " + err.message);
    }
}

async function deleteTreatmentPlanItem(planId) {
    if (confirm("¿Está seguro que desea eliminar este procedimiento del plan de tratamiento?")) {
        try {
            await deletePatientTreatmentPlan(planId);
            const patientId = document.getElementById('ehr-patient-select').value;
            await loadPatientTreatmentPlans(patientId);
        } catch (err) {
            alert("Error al eliminar del plan: " + err.message);
        }
    }
}

// Trigger bootstrap
bootstrap();
