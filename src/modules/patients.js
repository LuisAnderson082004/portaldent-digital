/* patients.js - Patients Business Module with Async validations */

import { insertPatient, updatePatient } from '../utils/storage.js';

export function calculateAge(dobString) {
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

export async function addPatient(patientData, state) {
    const { firstname, lastname, dni, dob, phone, email, address, allergies, chronic } = patientData;

    if (!firstname || !lastname || !dni || !dob || !phone || !email || !address) {
        throw new Error("Todos los campos obligatorios del paciente deben ser completados.");
    }

    if (!/^[0-9]{8}$/.test(dni)) {
        throw new Error("El DNI debe contener exactamente 8 dígitos numéricos.");
    }

    // DNI duplicate checker
    const duplicate = state.patients.find(p => p.dni === dni);
    if (duplicate) {
        throw new Error("Este DNI ya está registrado.");
    }

    // Generate automatic incremental Clinical History Number
    const maxHistory = state.patients.reduce((max, p) => p.historyNumber > max ? p.historyNumber : max, 10000);
    const newPatient = {
        id: crypto.randomUUID(),
        historyNumber: maxHistory + 1,
        firstname,
        lastname,
        dni,
        dob,
        phone,
        email,
        address,
        allergies: allergies || 'Ninguna',
        chronic: chronic || 'Ninguna',
        evolutionNotes: [],
        odontogram: {
            baselineFrozen: false,
            baseline: {},
            evolution: {}
        }
    };

    const inserted = await insertPatient(newPatient);
    state.patients.push(inserted);
    return inserted;
}

export async function addEvolutionNote(patientId, noteText, author, timestamp, state) {
    if (!noteText.trim()) {
        throw new Error("La nota de evolución no puede estar vacía.");
    }

    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) {
        throw new Error("Paciente no encontrado.");
    }

    if (!patient.evolutionNotes) {
        patient.evolutionNotes = [];
    }

    const nextVersion = patient.evolutionNotes.length + 1;
    const newNote = {
        version: nextVersion,
        timestamp,
        author,
        content: noteText
    };

    patient.evolutionNotes.push(newNote);
    
    // Persist patient update asynchronously
    await updatePatient(patientId, { evolutionNotes: patient.evolutionNotes });
    return newNote;
}