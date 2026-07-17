/* appointments.js - Scheduling & Booking Business Rules with Supabase integrations */

import { insertAppointment, updateAppointment, deleteAppointment } from '../utils/storage.js';

export function isWithinFourHours(apptDateStr, apptTimeStr, systemTime) {
    const apptDateTime = new Date(`${apptDateStr}T${apptTimeStr}:00-05:00`);
    const diffMs = apptDateTime - systemTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours < 4;
}

export async function saveAppointment(apptData, state, systemTime) {
    const { id, patientId, reason, dentistId, depositPaid, date, time } = apptData;

    // 1. Check deposit paid validation
    if (!depositPaid) {
        throw new Error("Debe activar la verificación de pago (S/ 50.00) para confirmar la cita.");
    }

    if (!patientId) {
        throw new Error("Debe seleccionar un paciente de la lista.");
    }

    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) throw new Error("Paciente no encontrado.");

    const dentist = state.users.find(u => u.id === dentistId);
    if (!dentist) throw new Error("Odontólogo no encontrado.");

    if (id) {
        // RESCHEDULE / EDIT
        const appt = state.appointments.find(a => a.id === id);
        if (!appt) throw new Error("Cita no encontrada.");

        // Check 4-hour limit on the original slot before permitting changes
        if (isWithinFourHours(appt.date, appt.time, systemTime)) {
            throw new Error(`ERROR OPERATIVO: No se puede modificar ni reagendar una cita programada a menos de 4 horas de su inicio (${appt.time}).`);
        }

        // Apply changes
        const updatedFields = {
            patientId,
            patientName: `${patient.firstname} ${patient.lastname}`,
            patientDni: patient.dni,
            dentistId,
            dentistName: dentist.name,
            reason,
            depositPaid: true, // Preserves status and credit
            depositAmount: 50.00,
            date,
            time
        };

        const updated = await updateAppointment(id, updatedFields);
        
        // Update in-memory state
        Object.assign(appt, updated);
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
            depositPaid: true,
            depositAmount: 50.00,
            reminderSent: false
        };

        const inserted = await insertAppointment(newAppt);
        state.appointments.push(inserted);
    }
}

export async function cancelAppointment(apptId, state, systemTime) {
    const appt = state.appointments.find(a => a.id === apptId);
    if (!appt) throw new Error("Cita no encontrada.");

    // Check 4-hour limit
    if (isWithinFourHours(appt.date, appt.time, systemTime)) {
        throw new Error(`ERROR OPERATIVO: No se puede cancelar la cita porque faltan menos de 4 horas para el bloque programado (${appt.time}).`);
    }

    await deleteAppointment(apptId);
    state.appointments = state.appointments.filter(a => a.id !== apptId);
}
