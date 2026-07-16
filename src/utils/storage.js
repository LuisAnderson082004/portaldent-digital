/* storage.js - Asynchronous Storage Client Layer with Supabase support */

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient.js';

// Helper for unit testing isolation (test.html)
function isTestMode() {
    return typeof window !== 'undefined' && window.__portaldent_test_mode__;
}

// --- PATIENTS CLIENT METHODS ---
export async function getPatients() {
    if (isTestMode()) {
        return window.__mock_db_patients__ || [];
    }
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('historyNumber', { ascending: true });
    if (error) throw error;
    return data;
}

export async function insertPatient(patient) {
    if (isTestMode()) {
        window.__mock_db_patients__ = window.__mock_db_patients__ || [];
        window.__mock_db_patients__.push(patient);
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
    if (isTestMode()) {
        window.__mock_db_patients__ = window.__mock_db_patients__ || [];
        const idx = window.__mock_db_patients__.findIndex(p => p.id === id);
        if (idx > -1) {
            window.__mock_db_patients__[idx] = { ...window.__mock_db_patients__[idx], ...patientData };
            return window.__mock_db_patients__[idx];
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
    if (isTestMode()) {
        return window.__mock_db_appointments__ || [];
    }
    const { data, error } = await supabase
        .from('appointments')
        .select('*');
    if (error) throw error;
    return data;
}

export async function insertAppointment(appt) {
    if (isTestMode()) {
        window.__mock_db_appointments__ = window.__mock_db_appointments__ || [];
        window.__mock_db_appointments__.push(appt);
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
    if (isTestMode()) {
        window.__mock_db_appointments__ = window.__mock_db_appointments__ || [];
        const idx = window.__mock_db_appointments__.findIndex(a => a.id === id);
        if (idx > -1) {
            window.__mock_db_appointments__[idx] = { ...window.__mock_db_appointments__[idx], ...apptData };
            return window.__mock_db_appointments__[idx];
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
    if (isTestMode()) {
        window.__mock_db_appointments__ = window.__mock_db_appointments__ || [];
        window.__mock_db_appointments__ = window.__mock_db_appointments__.filter(a => a.id !== id);
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
    if (isTestMode()) {
        return window.__mock_db_shifts__ || [];
    }
    const { data, error } = await supabase
        .from('shifts')
        .select('*');
    if (error) throw error;
    return data;
}

export async function insertShift(shift) {
    if (isTestMode()) {
        window.__mock_db_shifts__ = window.__mock_db_shifts__ || [];
        window.__mock_db_shifts__.push(shift);
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

export async function deleteShift(id) {
    if (isTestMode()) {
        window.__mock_db_shifts__ = window.__mock_db_shifts__ || [];
        window.__mock_db_shifts__ = window.__mock_db_shifts__.filter(s => s.id !== id);
        return true;
    }
    const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}


// --- USERS / PROFILES CLIENT METHODS ---
export async function getUsers() {
    if (isTestMode()) {
        return window.__mock_db_users__ || [];
    }
    const { data, error } = await supabase
        .from('profiles')
        .select('*');
    if (error) throw error;
    return data;
}

export async function insertUser(user) {
    if (isTestMode()) {
        window.__mock_db_users__ = window.__mock_db_users__ || [];
        window.__mock_db_users__.push(user);
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
    if (isTestMode()) {
        window.__mock_db_users__ = window.__mock_db_users__ || [];
        const idx = window.__mock_db_users__.findIndex(u => u.id === id);
        if (idx > -1) {
            window.__mock_db_users__[idx] = { ...window.__mock_db_users__[idx], ...userData };
            return window.__mock_db_users__[idx];
        }
        throw new Error("Usuario no encontrado.");
    }
    
    // If updating own password
    if (userData.password) {
        const { error: authError } = await supabase.auth.updateUser({ password: userData.password });
        if (authError) throw authError;
    }

    const profileData = {
        name: userData.name,
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
    if (isTestMode()) {
        window.__mock_db_users__ = window.__mock_db_users__ || [];
        window.__mock_db_users__ = window.__mock_db_users__.filter(u => u.id !== id);
        return true;
    }
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// --- ODONTOGRAM RECORDS METHODS ---
export async function getOdontogramRecords(patientId) {
    if (isTestMode()) {
        return window.__mock_db_odontogram_records__ || [];
    }
    const { data, error } = await supabase
        .from('odontogram_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });
    if (error) {
        console.warn("Could not load odontogram_records, might not exist yet:", error.message);
        return [];
    }
    return data;
}

export async function insertOdontogramRecord(record) {
    if (isTestMode()) {
        window.__mock_db_odontogram_records__ = window.__mock_db_odontogram_records__ || [];
        const newRecord = { id: 'rec-' + Date.now(), created_at: new Date().toISOString(), ...record };
        window.__mock_db_odontogram_records__.push(newRecord);
        return newRecord;
    }
    const { data, error } = await supabase
        .from('odontogram_records')
        .insert([record])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteOdontogramRecord(id) {
    if (isTestMode()) {
        window.__mock_db_odontogram_records__ = window.__mock_db_odontogram_records__ || [];
        window.__mock_db_odontogram_records__ = window.__mock_db_odontogram_records__.filter(r => r.id !== id);
        return true;
    }
    const { error } = await supabase
        .from('odontogram_records')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// --- TREATMENTS CATALOG METHODS ---
export async function getTreatmentsCatalog() {
    if (isTestMode()) {
        if (!window.__mock_db_treatments_catalog__) {
            window.__mock_db_treatments_catalog__ = [
                { id: 'cat-1', nombre: 'Profilaxis Dental Simple', precio_soles: 80.00, precio_dolares: 22.00, categoria: 'Preventiva' },
                { id: 'cat-2', nombre: 'Curación Resina Compuesta Simple', precio_soles: 120.00, precio_dolares: 32.50, categoria: 'Restauradora' },
                { id: 'cat-3', nombre: 'Extracción Dental Simple', precio_soles: 100.00, precio_dolares: 27.00, categoria: 'Cirugía' }
            ];
        }
        return window.__mock_db_treatments_catalog__;
    }
    const { data, error } = await supabase
        .from('treatments_catalog')
        .select('*')
        .order('nombre', { ascending: true });
    if (error) throw error;
    return data;
}

export async function insertTreatmentInCatalog(treatment) {
    if (isTestMode()) {
        window.__mock_db_treatments_catalog__ = window.__mock_db_treatments_catalog__ || [];
        const newTreatment = { id: 'cat-' + Date.now(), ...treatment };
        window.__mock_db_treatments_catalog__.push(newTreatment);
        return newTreatment;
    }
    const { data, error } = await supabase
        .from('treatments_catalog')
        .insert([treatment])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateTreatmentInCatalog(id, data) {
    if (isTestMode()) {
        window.__mock_db_treatments_catalog__ = window.__mock_db_treatments_catalog__ || [];
        const idx = window.__mock_db_treatments_catalog__.findIndex(t => t.id === id);
        if (idx !== -1) {
            window.__mock_db_treatments_catalog__[idx] = { ...window.__mock_db_treatments_catalog__[idx], ...data };
            return window.__mock_db_treatments_catalog__[idx];
        }
        return null;
    }
    const { data: updated, error } = await supabase
        .from('treatments_catalog')
        .update(data)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return updated;
}

export async function deleteTreatmentFromCatalog(id) {
    if (isTestMode()) {
        window.__mock_db_treatments_catalog__ = window.__mock_db_treatments_catalog__ || [];
        window.__mock_db_treatments_catalog__ = window.__mock_db_treatments_catalog__.filter(t => t.id !== id);
        return true;
    }
    const { error } = await supabase
        .from('treatments_catalog')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// --- PATIENT TREATMENT PLAN METHODS ---
export async function getPatientTreatmentPlans(patientId) {
    if (isTestMode()) {
        window.__mock_db_patient_treatment_plan__ = window.__mock_db_patient_treatment_plan__ || [];
        return window.__mock_db_patient_treatment_plan__.filter(p => p.patient_id === patientId);
    }
    const { data, error } = await supabase
        .from('patient_treatment_plan')
        .select(`
            *,
            treatments_catalog:treatment_id (*)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

export async function insertPatientTreatmentPlan(record) {
    if (isTestMode()) {
        window.__mock_db_patient_treatment_plan__ = window.__mock_db_patient_treatment_plan__ || [];
        const catalog = window.__mock_db_treatments_catalog__ || [];
        const catItem = catalog.find(c => c.id === record.treatment_id) || {};
        const newRecord = {
            id: 'plan-' + Date.now(),
            created_at: new Date().toISOString(),
            ...record,
            treatments_catalog: catItem
        };
        window.__mock_db_patient_treatment_plan__.push(newRecord);
        return newRecord;
    }
    const { data, error } = await supabase
        .from('patient_treatment_plan')
        .insert([record])
        .select(`
            *,
            treatments_catalog:treatment_id (*)
        `)
        .single();
    if (error) throw error;
    return data;
}

export async function updatePatientTreatmentPlan(id, data) {
    if (isTestMode()) {
        window.__mock_db_patient_treatment_plan__ = window.__mock_db_patient_treatment_plan__ || [];
        const idx = window.__mock_db_patient_treatment_plan__.findIndex(p => p.id === id);
        if (idx !== -1) {
            window.__mock_db_patient_treatment_plan__[idx] = { ...window.__mock_db_patient_treatment_plan__[idx], ...data };
            return window.__mock_db_patient_treatment_plan__[idx];
        }
        return null;
    }
    const { data: updated, error } = await supabase
        .from('patient_treatment_plan')
        .update(data)
        .eq('id', id)
        .select(`
            *,
            treatments_catalog:treatment_id (*)
        `)
        .single();
    if (error) throw error;
    return updated;
}

export async function deletePatientTreatmentPlan(id) {
    if (isTestMode()) {
        window.__mock_db_patient_treatment_plan__ = window.__mock_db_patient_treatment_plan__ || [];
        window.__mock_db_patient_treatment_plan__ = window.__mock_db_patient_treatment_plan__.filter(p => p.id !== id);
        return true;
    }
    const { error } = await supabase
        .from('patient_treatment_plan')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}
