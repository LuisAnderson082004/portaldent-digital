/* appointments.js - Appointments scheduling business module with Async constraints */

import { insertAppointment, updateAppointment, deleteAppointment } from '../utils/storage.js';

export function isWithinFourHours(dateStr, timeStr, currentDateTime) {
    const apptDateTime = new Date(`${dateStr}T${timeStr}:00`);
    const diffMs = apptDateTime - currentDateTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    // Returns true if the difference is positive and less than 4 hours
    return diffHours >= 0 && diffHours < 4;
}

export async function saveAppointment(apptData, state, currentDateTime) {
    const { id, patientId, dentistId, date, time, reason, depositPaid, depositAmount } = apptData;

    if (!patientId || !dentistId || !date || !time || !reason) {
        throw new Error("Todos los campos obligatorios de la cita deben ser completados.");
    }

    // Retrieve full entity references
    const patient = state.patients.find(p => p.id === patientId);
    const dentist = state.users.find(u => u.id === dentistId);

    if (!patient) throw new Error("Paciente no encontrado.");
    if (!dentist) throw new Error("Odontólogo no encontrado.");

    // Enforce 4h clinical limit for modifications
    if (id) {
        const existing = state.appointments.find(a => a.id === id);
        if (existing) {
            // Check if modification is within 4 hours of the original appointment time
            if (isWithinFourHours(existing.date, existing.time, currentDateTime)) {
                throw new Error("LÍMITE CLÍNICO: No se pueden modificar o reprogramar citas a menos de 4 horas de su inicio.");
            }
        }
    }

    if (id) {
        // UPDATE EXISTING APPOINTMENT
        const idx = state.appointments.findIndex(a => a.id === id);
        if (idx === -1) throw new Error("Cita no encontrada.");

        // Check for double booking conflicts (excluding this appointment)
        const conflict = state.appointments.find(a => a.date === date && a.time === time && a.dentistId === dentistId && a.id !== id);
        if (conflict) {
            throw new Error("Conflicto de Horario: El odontólogo ya cuenta con una reserva activa en este bloque.");
        }

        const updated = {
            patientId,
            patientName: `${patient.firstname} ${patient.lastname}`,
            patientDni: patient.dni,
            dentistId,
            dentistName: dentist.name,
            date,
            time,
            reason,
            depositPaid: !!depositPaid,
            depositAmount: parseFloat(depositAmount) || 0
        };

        await updateAppointment(id, updated);
        
        // Update in-memory state
        Object.assign(state.appointments[idx], updated);
        return state.appointments[idx];
    } else {
        // NEW APPOINTMENT
        // Check for double booking conflicts
        const conflict = state.appointments.find(a => a.date === date && a.time === time && a.dentistId === dentistId);
        if (conflict) {
            throw new Error("Conflicto de Horario: El odontólogo ya cuenta con una reserva activa en este bloque.");
        }

        const newAppt = {
            id: crypto.randomUUID(),
            patientId,
            patientName: `${patient.firstname} ${patient.lastname}`,
            patientDni: patient.dni,
            dentistId,
            dentistName: dentist.name,
            date,
            time,
            reason,
            depositPaid: !!depositPaid,
            depositAmount: parseFloat(depositAmount) || 0,
            reminderSent: false
        };

        const inserted = await insertAppointment(newAppt);
        state.appointments.push(inserted);
        return inserted;
    }
}

export async function cancelAppointment(id, state, currentDateTime) {
    const idx = state.appointments.findIndex(a => a.id === id);
    if (idx === -1) throw new Error("Cita no encontrada.");

    const appt = state.appointments[idx];

    // Enforce 4h clinical limit for cancellations
    if (isWithinFourHours(appt.date, appt.time, currentDateTime)) {
        throw new Error("LÍMITE CLÍNICO: No se pueden cancelar citas a menos de 4 horas de su inicio.");
    }

    await deleteAppointment(id);
    state.appointments.splice(idx, 1);
    return true;
}