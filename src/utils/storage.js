/* storage.js - Asynchronous Storage Client Layer with Supabase support */

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient.js';

// --- PATIENTS CLIENT METHODS ---
export async function getPatients() {
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('historyNumber', { ascending: true });
    if (error) throw error;
    return data;
}

export async function insertPatient(patient) {
    const { data, error } = await supabase
        .from('patients')
        .insert([patient])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updatePatient(id, patientData) {
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
    const { data, error } = await supabase
        .from('appointments')
        .select('*');
    if (error) throw error;
    return data;
}

export async function insertAppointment(appt) {
    const { data, error } = await supabase
        .from('appointments')
        .insert([appt])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateAppointment(id, apptData) {
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
    const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// --- SHIFTS CLIENT METHODS ---
export async function getShifts() {
    const { data, error } = await supabase
        .from('shifts')
        .select('*');
    if (error) throw error;
    return data;
}

export async function insertShift(shift) {
    const { data, error } = await supabase
        .from('shifts')
        .insert([shift])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteShift(id) {
    const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// --- USERS / PROFILES CLIENT METHODS ---
export async function getUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*');
    if (error) throw error;
    return data;
}

export async function insertUser(user) {
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

// --- ODONTOGRAM RECORDS METHODS ---
export async function getOdontogramRecords(patientId) {
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
    const { data, error } = await supabase
        .from('odontogram_records')
        .insert([record])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteOdontogramRecord(id) {
    const { error } = await supabase
        .from('odontogram_records')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// --- TREATMENTS CATALOG METHODS ---
export async function getTreatmentsCatalog() {
    const { data, error } = await supabase
        .from('treatments_catalog')
        .select('*')
        .order('nombre', { ascending: true });
    if (error) throw error;
    return data;
}

export async function insertTreatmentInCatalog(treatment) {
    const { data, error } = await supabase
        .from('treatments_catalog')
        .insert([treatment])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateTreatmentInCatalog(id, data) {
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
    const { error } = await supabase
        .from('treatments_catalog')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// --- PATIENT TREATMENT PLAN METHODS ---
export async function getPatientTreatmentPlans(patientId) {
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
    const { error } = await supabase
        .from('patient_treatment_plan')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}
