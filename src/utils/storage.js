/* storage.js - Asynchronous Storage Client Layer with Supabase support and LocalStorage fallback */

import { supabase, isPlaceholder } from './supabaseClient.js';

// Local database retrieval for LocalStorage fallback mode
function getLocalDB() {
    if (window.__portaldent_test_mode__) {
        return {
            users: window.__mock_db_users__ || [],
            patients: window.__mock_db_patients__ || [],
            shifts: window.__mock_db_shifts__ || [],
            appointments: window.__mock_db_appointments__ || [],
            auditLogs: window.__mock_db_auditLogs__ || []
        };
    }
    return {
        users: JSON.parse(localStorage.getItem('portaldent_users')) || [],
        patients: JSON.parse(localStorage.getItem('portaldent_patients')) || [],
        shifts: JSON.parse(localStorage.getItem('portaldent_shifts')) || [],
        appointments: JSON.parse(localStorage.getItem('portaldent_appointments')) || [],
        auditLogs: JSON.parse(localStorage.getItem('portaldent_audit')) || []
    };
}

function saveLocalDB(db) {
    if (window.__portaldent_test_mode__) {
        window.__mock_db_users__ = db.users;
        window.__mock_db_patients__ = db.patients;
        window.__mock_db_shifts__ = db.shifts;
        window.__mock_db_appointments__ = db.appointments;
        window.__mock_db_auditLogs__ = db.auditLogs;
        return;
    }
    localStorage.setItem('portaldent_users', JSON.stringify(db.users));
    localStorage.setItem('portaldent_patients', JSON.stringify(db.patients));
    localStorage.setItem('portaldent_shifts', JSON.stringify(db.shifts));
    localStorage.setItem('portaldent_appointments', JSON.stringify(db.appointments));
    localStorage.setItem('portaldent_audit', JSON.stringify(db.auditLogs));
}

// --- PATIENTS CLIENT METHODS ---
export async function getPatients() {
    if (isPlaceholder) {
        return getLocalDB().patients;
    }
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('historyNumber', { ascending: true });
    if (error) throw error;
    return data;
}

export async function insertPatient(patient) {
    if (isPlaceholder) {
        const db = getLocalDB();
        db.patients.push(patient);
        saveLocalDB(db);
        return patient;
    }
    const { data, error } = await supabase
        .from('patients')
        .insert([patient])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updatePatient(id, patientData) {
    if (isPlaceholder) {
        const db = getLocalDB();
        const idx = db.patients.findIndex(p => p.id === id);
        if (idx > -1) {
            db.patients[idx] = { ...db.patients[idx], ...patientData };
            saveLocalDB(db);
            return db.patients[idx];
        }
        throw new Error("Paciente no encontrado.");
    }
    const { data, error } = await supabase
        .from('patients')
        .update(patientData)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// --- APPOINTMENTS CLIENT METHODS ---
export async function getAppointments() {
    if (isPlaceholder) {
        return getLocalDB().appointments;
    }
    const { data, error } = await supabase
        .from('appointments')
        .select('*');
    if (error) throw error;
    return data;
}

export async function insertAppointment(appt) {
    if (isPlaceholder) {
        const db = getLocalDB();
        db.appointments.push(appt);
        saveLocalDB(db);
        return appt;
    }
    const { data, error } = await supabase
        .from('appointments')
        .insert([appt])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateAppointment(id, apptData) {
    if (isPlaceholder) {
        const db = getLocalDB();
        const idx = db.appointments.findIndex(a => a.id === id);
        if (idx > -1) {
            db.appointments[idx] = { ...db.appointments[idx], ...apptData };
            saveLocalDB(db);
            return db.appointments[idx];
        }
        throw new Error("Cita no encontrada.");
    }
    const { data, error } = await supabase
        .from('appointments')
        .update(apptData)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteAppointment(id) {
    if (isPlaceholder) {
        const db = getLocalDB();
        db.appointments = db.appointments.filter(a => a.id !== id);
        saveLocalDB(db);
        return true;
    }
    const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// --- SHIFTS CLIENT METHODS ---
export async function getShifts() {
    if (isPlaceholder) {
        return getLocalDB().shifts;
    }
    const { data, error } = await supabase
        .from('shifts')
        .select('*');
    if (error) throw error;
    return data;
}

export async function insertShift(shift) {
    if (isPlaceholder) {
        const db = getLocalDB();
        db.shifts.push(shift);
        saveLocalDB(db);
        return shift;
    }
    const { data, error } = await supabase
        .from('shifts')
        .insert([shift])
        .select()
        .single();
    if (error) throw error;
    return data;
}

// --- AUDIT LOGS CLIENT METHODS ---
export async function getAuditLogs() {
    if (isPlaceholder) {
        return getLocalDB().auditLogs;
    }
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
    if (error) throw error;
    return data;
}

export async function insertAuditLog(log) {
    if (isPlaceholder) {
        const db = getLocalDB();
        db.auditLogs.unshift(log);
        saveLocalDB(db);
        return log;
    }
    const { data, error } = await supabase
        .from('audit_logs')
        .insert([log])
        .select()
        .single();
    if (error) throw error;
    return data;
}

// --- USERS / PROFILES CLIENT METHODS ---
export async function getUsers() {
    if (isPlaceholder) {
        return getLocalDB().users;
    }
    const { data, error } = await supabase
        .from('profiles')
        .select('*');
    if (error) throw error;
    return data;
}

export async function insertUser(user) {
    if (isPlaceholder) {
        const db = getLocalDB();
        db.users.push(user);
        saveLocalDB(db);
        return user;
    }

    // Create a temporary Supabase client with persistSession: false to avoid logging out the current admin
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
    });

    const email = `${user.username.toLowerCase()}@portaldent.com`;
    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: email,
        password: user.password
    });

    if (authError) throw authError;

    const profileData = {
        id: authData.user.id, // Real UUID from Supabase Auth
        name: user.name,
        username: user.username,
        role: user.role
    };

    const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateUser(id, userData) {
    if (isPlaceholder) {
        const db = getLocalDB();
        const idx = db.users.findIndex(u => u.id === id);
        if (idx > -1) {
            db.users[idx] = { ...db.users[idx], ...userData };
            saveLocalDB(db);
            return db.users[idx];
        }
        throw new Error("Usuario no encontrado.");
    }
    const profileData = {
        name: userData.name,
        username: userData.username,
        role: userData.role
    };
    const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteUser(id) {
    if (isPlaceholder) {
        const db = getLocalDB();
        db.users = db.users.filter(u => u.id !== id);
        saveLocalDB(db);
        return true;
    }
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// Database initializer (mock local seeder)
export async function initDB(hashPasswordFn) {
    if (isPlaceholder) {
        if (!localStorage.getItem('portaldent_db_initialized')) {
            const adminHash = await hashPasswordFn('admin123');
            const receptionistHash = await hashPasswordFn('receptionist123');
            const dentistHash = await hashPasswordFn('dentist123');

            const users = [
                { id: 'usr-admin', name: 'Dr. Hugo Boss (Director)', username: 'admin', role: 'admin', passwordHash: adminHash },
                { id: 'usr-receptionist', name: 'Lic. Sofía Beltrán', username: 'receptionist', role: 'receptionist', passwordHash: receptionistHash },
                { id: 'usr-dentist1', name: 'Dr. Alejandro Ruiz', username: 'dentist', role: 'dentist', passwordHash: dentistHash },
                { id: 'usr-dentist2', name: 'Dra. Gabriela Loli', username: 'dentist2', role: 'dentist', passwordHash: dentistHash }
            ];

            const patients = [
                {
                    id: 'pat-10001',
                    historyNumber: 10001,
                    firstname: 'Juan',
                    lastname: 'Pérez García',
                    dni: '12345678',
                    dob: '1985-05-12',
                    phone: '987654321',
                    email: 'juan.perez@gmail.com',
                    address: 'Av. Larco 456, Miraflores',
                    allergies: 'Alérgico a la Penicilina y al Látex',
                    chronic: 'Ninguna',
                    evolutionNotes: [],
                    odontogram: {
                        baselineFrozen: false,
                        baseline: {},
                        evolution: {}
                    }
                },
                {
                    id: 'pat-10002',
                    historyNumber: 10002,
                    firstname: 'María',
                    lastname: 'Gómez Torres',
                    dni: '87654321',
                    dob: '1990-11-20',
                    phone: '912345678',
                    email: 'maria.gomez@hotmail.com',
                    address: 'Calle Lima 123, San Isidro',
                    allergies: 'Ninguna',
                    chronic: 'Hipertensión arterial leve controlada',
                    evolutionNotes: [
                        {
                            version: 1,
                            timestamp: "2026-06-15T10:00:00-05:00",
                            author: "Dr. Alejandro Ruiz",
                            content: "Paciente asiste a evaluación diagnóstica de rutina. Se reporta molestia leve en el cuadrante superior derecho al consumir bebidas frías."
                        },
                        {
                            version: 2,
                            timestamp: "2026-07-02T11:30:00-05:00",
                            author: "Dr. Alejandro Ruiz",
                            content: "Se realiza profilaxis dental completa. Se indica cepillado con técnica de Bass y uso diario de hilo dental."
                        }
                    ],
                    odontogram: {
                        baselineFrozen: true,
                        baseline: {
                            "16": "absent",
                            "18": "absent"
                        },
                        evolution: {
                            "14": {
                                surfaces: { "occlusal": "curation" },
                                notes: { "occlusal": "Restauración de resina compuesta estética realizada con éxito." }
                            }
                        }
                    }
                }
            ];

            const shifts = [
                { id: 'shift-1', dentistId: 'usr-dentist1', dentistName: 'Dr. Alejandro Ruiz', day: 'Friday', start: '09:00', end: '19:00' },
                { id: 'shift-2', dentistId: 'usr-dentist2', dentistName: 'Dra. Gabriela Loli', day: 'Monday', start: '09:00', end: '15:00' }
            ];

            const appointments = [
                {
                    id: 'app-1',
                    patientId: 'pat-10002',
                    patientName: 'María Gómez Torres',
                    patientDni: '87654321',
                    dentistId: 'usr-dentist1',
                    dentistName: 'Dr. Alejandro Ruiz',
                    date: '2026-07-03',
                    time: '10:00',
                    reason: 'Evaluación y Profilaxis',
                    depositPaid: true,
                    depositAmount: 50.00,
                    reminderSent: false
                },
                {
                    id: 'app-2',
                    patientId: 'pat-10001',
                    patientName: 'Juan Pérez García',
                    patientDni: '12345678',
                    dentistId: 'usr-dentist1',
                    dentistName: 'Dr. Alejandro Ruiz',
                    date: '2026-07-03',
                    time: '18:00',
                    reason: 'Dolor Molar Agudo',
                    depositPaid: true,
                    depositAmount: 50.00,
                    reminderSent: false
                },
                {
                    id: 'app-3',
                    patientId: 'pat-10001',
                    patientName: 'Juan Pérez García',
                    patientDni: '12345678',
                    dentistId: 'usr-dentist2',
                    dentistName: 'Dra. Gabriela Loli',
                    date: '2026-07-06',
                    time: '11:00',
                    reason: 'Consulta General',
                    depositPaid: true,
                    depositAmount: 50.00,
                    reminderSent: false
                }
            ];

            const auditLogs = [
                {
                    id: 'log-1',
                    userId: 'usr-receptionist',
                    userName: 'Lic. Sofía Beltrán',
                    userRole: 'Asistente',
                    patientId: 'pat-10002',
                    patientName: 'María Gómez Torres',
                    patientHistory: '10002',
                    timestamp: '2026-07-03T10:15:22-05:00'
                }
            ];

            localStorage.setItem('portaldent_users', JSON.stringify(users));
            localStorage.setItem('portaldent_patients', JSON.stringify(patients));
            localStorage.setItem('portaldent_shifts', JSON.stringify(shifts));
            localStorage.setItem('portaldent_appointments', JSON.stringify(appointments));
            localStorage.setItem('portaldent_audit', JSON.stringify(auditLogs));
            localStorage.setItem('portaldent_db_initialized', 'true');
        }
    }
}