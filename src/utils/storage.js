import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient.js';

// -------------------------------------------------------------
// PACIENTES (Tabla: pacientes)
// -------------------------------------------------------------
export async function getPatients() {
    try {
        const { data, error } = await supabase
            .from('pacientes')
            .select('id, numero_historia, dni, nombres, apellidos, fecha_nacimiento, telefono, correo, direccion')
            .order('numero_historia', { ascending: true });
        if (error) {
            console.warn("Aviso al consultar pacientes:", error.message);
            return [];
        }
        
        return (data || []).map(p => ({
            id: p.id,
            historyNumber: p.numero_historia,
            dni: p.dni,
            firstname: p.nombres,
            lastname: p.apellidos,
            dob: p.fecha_nacimiento,
            phone: p.telefono,
            email: p.correo,
            address: p.direccion
        }));
    } catch (err) {
        console.error("Error en getPatients:", err.message);
        return [];
    }
}

export async function getPatientClinicalData(id) {
    const { data, error } = await supabase
        .from('pacientes')
        .select('id, alergias, enfermedades_cronicas, odontograma, notas_evolucion')
        .eq('id', id)
        .single();
    if (error) throw error;

    return {
        id: data.id,
        allergies: data.alergias,
        chronic: data.enfermedades_cronicas,
        odontogram: data.odontograma,
        evolutionNotes: data.notas_evolucion
    };
}

export async function insertPatient(patient) {
    const dbRecord = {
        numero_historia: patient.historyNumber || patient.numero_historia,
        dni: patient.dni,
        nombres: patient.firstname || patient.nombres,
        apellidos: patient.lastname || patient.apellidos,
        fecha_nacimiento: patient.dob || patient.fecha_nacimiento,
        telefono: patient.phone || patient.telefono,
        correo: patient.email || patient.correo,
        direccion: patient.address || patient.direccion,
        alergias: patient.allergies || patient.alergias || 'Ninguna',
        enfermedades_cronicas: patient.chronic || patient.enfermedades_cronicas || 'Ninguna',
        notas_evolucion: patient.evolutionNotes || patient.notas_evolucion || [],
        odontograma: patient.odontogram || patient.odontograma || { baseline: {}, evolution: {}, baselineFrozen: false }
    };

    const { data, error } = await supabase
        .from('pacientes')
        .insert([dbRecord])
        .select()
        .single();
    if (error) throw error;

    return {
        id: data.id,
        historyNumber: data.numero_historia,
        dni: data.dni,
        firstname: data.nombres,
        lastname: data.apellidos,
        dob: data.fecha_nacimiento,
        phone: data.telefono,
        email: data.correo,
        address: data.direccion,
        allergies: data.alergias,
        chronic: data.enfermedades_cronicas,
        evolutionNotes: data.notas_evolucion,
        odontogram: data.odontograma
    };
}

export async function updatePatient(id, patientData) {
    const dbRecord = {};
    if (patientData.historyNumber !== undefined) dbRecord.numero_historia = patientData.historyNumber;
    if (patientData.dni !== undefined) dbRecord.dni = patientData.dni;
    if (patientData.firstname !== undefined) dbRecord.nombres = patientData.firstname;
    if (patientData.lastname !== undefined) dbRecord.apellidos = patientData.lastname;
    if (patientData.dob !== undefined) dbRecord.fecha_nacimiento = patientData.dob;
    if (patientData.phone !== undefined) dbRecord.telefono = patientData.phone;
    if (patientData.email !== undefined) dbRecord.correo = patientData.email;
    if (patientData.address !== undefined) dbRecord.direccion = patientData.address;
    if (patientData.allergies !== undefined) dbRecord.alergias = patientData.allergies;
    if (patientData.chronic !== undefined) dbRecord.enfermedades_cronicas = patientData.chronic;
    if (patientData.evolutionNotes !== undefined) dbRecord.notas_evolucion = patientData.evolutionNotes;
    if (patientData.odontogram !== undefined) dbRecord.odontograma = patientData.odontogram;

    const { data, error } = await supabase
        .from('pacientes')
        .update(dbRecord)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;

    return {
        id: data.id,
        historyNumber: data.numero_historia,
        dni: data.dni,
        firstname: data.nombres,
        lastname: data.apellidos,
        dob: data.fecha_nacimiento,
        phone: data.telefono,
        email: data.correo,
        address: data.direccion,
        allergies: data.alergias,
        chronic: data.enfermedades_cronicas,
        evolutionNotes: data.notas_evolucion,
        odontogram: data.odontograma
    };
}

// -------------------------------------------------------------
// CITAS (Tabla: citas)
// -------------------------------------------------------------
export async function getAppointments() {
    try {
        const { data, error } = await supabase
            .from('citas')
            .select('*');
        if (error) {
            console.warn("Aviso al consultar citas:", error.message);
            return [];
        }

        return (data || []).map(a => ({
            id: a.id,
            patientId: a.paciente_id,
            patientName: a.nombre_paciente,
            patientDni: a.dni_paciente,
            dentistId: a.odontologo_id,
            dentistName: a.nombre_odontologo,
            date: a.fecha,
            time: a.hora,
            reason: a.motivo,
            depositPaid: a.abono_confirmado,
            depositAmount: a.monto_abono,
            reminderSent: a.recordatorio_enviado
        }));
    } catch (err) {
        console.error("Error en getAppointments:", err.message);
        return [];
    }
}

export async function insertAppointment(appt) {
    const dbRecord = {
        id: appt.id,
        paciente_id: appt.patientId,
        nombre_paciente: appt.patientName,
        dni_paciente: appt.patientDni,
        odontologo_id: appt.dentistId,
        nombre_odontologo: appt.dentistName,
        fecha: appt.date,
        hora: appt.time,
        motivo: appt.reason,
        abono_confirmado: appt.depositPaid !== undefined ? appt.depositPaid : true,
        monto_abono: appt.depositAmount !== undefined ? appt.depositAmount : 50.00,
        recordatorio_enviado: appt.reminderSent !== undefined ? appt.reminderSent : false
    };

    const { data, error } = await supabase
        .from('citas')
        .insert([dbRecord])
        .select()
        .single();
    if (error) throw error;

    return {
        id: data.id,
        patientId: data.paciente_id,
        patientName: data.nombre_paciente,
        patientDni: data.dni_paciente,
        dentistId: data.odontologo_id,
        dentistName: data.nombre_odontologo,
        date: data.fecha,
        time: data.hora,
        reason: data.motivo,
        depositPaid: data.abono_confirmado,
        depositAmount: data.monto_abono,
        reminderSent: data.recordatorio_enviado
    };
}

export async function updateAppointment(id, apptData) {
    const dbRecord = {};
    if (apptData.patientId !== undefined) dbRecord.paciente_id = apptData.patientId;
    if (apptData.patientName !== undefined) dbRecord.nombre_paciente = apptData.patientName;
    if (apptData.patientDni !== undefined) dbRecord.dni_paciente = apptData.patientDni;
    if (apptData.dentistId !== undefined) dbRecord.odontologo_id = apptData.dentistId;
    if (apptData.dentistName !== undefined) dbRecord.nombre_odontologo = apptData.dentistName;
    if (apptData.date !== undefined) dbRecord.fecha = apptData.date;
    if (apptData.time !== undefined) dbRecord.hora = apptData.time;
    if (apptData.reason !== undefined) dbRecord.motivo = apptData.reason;
    if (apptData.depositPaid !== undefined) dbRecord.abono_confirmado = apptData.depositPaid;
    if (apptData.depositAmount !== undefined) dbRecord.monto_abono = apptData.depositAmount;
    if (apptData.reminderSent !== undefined) dbRecord.recordatorio_enviado = apptData.reminderSent;

    const { data, error } = await supabase
        .from('citas')
        .update(dbRecord)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;

    return {
        id: data.id,
        patientId: data.paciente_id,
        patientName: data.nombre_paciente,
        patientDni: data.dni_paciente,
        dentistId: data.odontologo_id,
        dentistName: data.nombre_odontologo,
        date: data.fecha,
        time: data.hora,
        reason: data.motivo,
        depositPaid: data.abono_confirmado,
        depositAmount: data.monto_abono,
        reminderSent: data.recordatorio_enviado
    };
}

export async function deleteAppointment(id) {
    const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// -------------------------------------------------------------
// HORARIOS Y TURNOS (Tabla: horarios_turnos)
// -------------------------------------------------------------
export async function getShifts() {
    try {
        const { data, error } = await supabase
            .from('horarios_turnos')
            .select('*');
        if (error) {
            console.warn("Aviso al consultar turnos de Supabase:", error.message);
            return [];
        }

        return (data || []).map(s => ({
            id: s.id,
            dentistId: s.odontologo_id,
            dentistName: s.nombre_odontologo,
            dayOfWeek: s.dia_semana,
            day: s.dia_semana,
            startTime: s.hora_inicio,
            start: s.hora_inicio,
            endTime: s.hora_fin,
            end: s.hora_fin,
            active: s.activo
        }));
    } catch (err) {
        console.error("Error en getShifts:", err.message);
        return [];
    }
}

export async function insertShift(shift) {
    const dbRecord = {
        odontologo_id: shift.dentistId,
        nombre_odontologo: shift.dentistName,
        dia_semana: shift.dayOfWeek || shift.day,
        hora_inicio: shift.startTime || shift.start,
        hora_fin: shift.endTime || shift.end,
        activo: shift.active !== undefined ? shift.active : true
    };

    if (shift.id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(shift.id)) {
        dbRecord.id = shift.id;
    }

    const { data, error } = await supabase
        .from('horarios_turnos')
        .insert([dbRecord])
        .select()
        .single();
    if (error) throw error;

    return {
        id: data.id,
        dentistId: data.odontologo_id,
        dentistName: data.nombre_odontologo,
        dayOfWeek: data.dia_semana,
        day: data.dia_semana,
        startTime: data.hora_inicio,
        start: data.hora_inicio,
        endTime: data.hora_fin,
        end: data.hora_fin,
        active: data.activo
    };
}

export async function deleteShift(id) {
    const { error } = await supabase
        .from('horarios_turnos')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// -------------------------------------------------------------
// PERFILES Y USUARIOS (Tabla: perfiles)
// -------------------------------------------------------------
export async function getUsers() {
    try {
        const { data, error } = await supabase
            .from('perfiles')
            .select('*');
        if (error) {
            console.warn("Aviso al consultar perfiles:", error.message);
            return [];
        }

        return (data || []).map(u => ({
            id: u.id,
            name: u.nombre_completo,
            username: u.usuario,
            role: u.rol
        }));
    } catch (err) {
        console.error("Error en getUsers:", err.message);
        return [];
    }
}

export async function insertUser(user) {
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
        id: authData.user.id,
        nombre_completo: user.name,
        usuario: user.username,
        rol: user.role
    };

    const { data, error } = await supabase
        .from('perfiles')
        .insert([profileData])
        .select()
        .single();
    if (error) throw error;

    return {
        id: data.id,
        name: data.nombre_completo,
        username: data.usuario,
        role: data.rol
    };
}

export async function updateUser(id, userData) {
    if (userData.password) {
        const { error: authError } = await supabase.auth.updateUser({ password: userData.password });
        if (authError) throw authError;
    }

    const profileData = {
        nombre_completo: userData.name,
        rol: userData.role
    };

    const { data, error } = await supabase
        .from('perfiles')
        .update(profileData)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;

    return {
        id: data.id,
        name: data.nombre_completo,
        username: data.usuario,
        role: data.rol
    };
}

export async function deleteUser(id) {
    const { error } = await supabase
        .from('perfiles')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// -------------------------------------------------------------
// ODONTOGRAMA (Tabla: registros_odontograma)
// -------------------------------------------------------------
export async function getOdontogramRecords(patientId) {
    const { data, error } = await supabase
        .from('registros_odontograma')
        .select('*')
        .eq('paciente_id', patientId)
        .order('creado_en', { ascending: true });
    if (error) return [];
    return data;
}

export async function insertOdontogramRecord(record) {
    const dbRecord = {
        paciente_id: record.patient_id,
        pieza_dental_id: record.tooth_id,
        tipo: record.tipo || record.tipo_hallazgo || record.type || 'Hallazgo',
        superficie: record.surface || null,
        especificaciones: record.specifications || '',
        creado_por: record.creado_por || record.created_by || record.author_id || 'Sistema'
    };

    const { data, error } = await supabase
        .from('registros_odontograma')
        .insert([dbRecord])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteOdontogramRecord(id) {
    const { error } = await supabase
        .from('registros_odontograma')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// -------------------------------------------------------------
// CATALOGO TRATAMIENTOS (Tabla: catalogo_tratamientos)
// -------------------------------------------------------------
export async function getTreatmentsCatalog() {
    try {
        const { data, error } = await supabase
            .from('catalogo_tratamientos')
            .select('*')
            .order('nombre', { ascending: true });
        if (error) {
            console.warn("Aviso al consultar catalogo_tratamientos:", error.message);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error("Error en getTreatmentsCatalog:", err.message);
        return [];
    }
}

export async function insertTreatmentInCatalog(treatment) {
    const { data, error } = await supabase
        .from('catalogo_tratamientos')
        .insert([treatment])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateTreatmentInCatalog(id, data) {
    const { data: updated, error } = await supabase
        .from('catalogo_tratamientos')
        .update(data)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return updated;
}

export async function deleteTreatmentFromCatalog(id) {
    const { error } = await supabase
        .from('catalogo_tratamientos')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// -------------------------------------------------------------
// PLANES DE TRATAMIENTO (Tabla: planes_tratamiento_paciente)
// -------------------------------------------------------------
export async function getPatientTreatmentPlans(patientId) {
    const { data, error } = await supabase
        .from('planes_tratamiento_paciente')
        .select(`
            *,
            catalogo_tratamientos:tratamiento_id (*)
        `)
        .eq('paciente_id', patientId)
        .order('creado_en', { ascending: true });
    if (error) throw error;

    return data.map(item => ({
        ...item,
        patient_id: item.paciente_id,
        treatment_id: item.tratamiento_id,
        tooth_id: item.pieza_dental_id,
        treatments_catalog: item.catalogo_tratamientos || item.treatments_catalog
    }));
}

export async function insertPatientTreatmentPlan(record) {
    const dbRecord = {
        paciente_id: record.patient_id,
        tratamiento_id: record.treatment_id,
        pieza_dental_id: record.tooth_id,
        estado: record.estado || 'pendiente',
        precio_soles_aplicado: record.precio_soles_aplicado,
        precio_dolares_aplicado: record.precio_dolares_aplicado || 0
    };

    const { data, error } = await supabase
        .from('planes_tratamiento_paciente')
        .insert([dbRecord])
        .select(`
            *,
            catalogo_tratamientos:tratamiento_id (*)
        `)
        .single();
    if (error) throw error;

    return {
        ...data,
        patient_id: data.paciente_id,
        treatment_id: data.tratamiento_id,
        tooth_id: data.pieza_dental_id,
        treatments_catalog: data.catalogo_tratamientos || data.treatments_catalog
    };
}

export async function updatePatientTreatmentPlan(id, data) {
    const dbRecord = {};
    if (data.estado !== undefined) dbRecord.estado = data.estado;
    if (data.fecha_ejecucion !== undefined) dbRecord.fecha_ejecucion = data.fecha_ejecucion;

    const { data: updated, error } = await supabase
        .from('planes_tratamiento_paciente')
        .update(dbRecord)
        .eq('id', id)
        .select(`
            *,
            catalogo_tratamientos:tratamiento_id (*)
        `)
        .single();
    if (error) throw error;

    return {
        ...updated,
        patient_id: updated.paciente_id,
        treatment_id: updated.tratamiento_id,
        tooth_id: updated.pieza_dental_id,
        treatments_catalog: updated.catalogo_tratamientos || updated.treatments_catalog
    };
}

export async function deletePatientTreatmentPlan(id) {
    const { error } = await supabase
        .from('planes_tratamiento_paciente')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// -------------------------------------------------------------
// ORTODONCIA (Tablas: fichas_ortodoncia & controles_mensuales_ortodoncia)
// -------------------------------------------------------------
export async function getOrthodonticRecord(patientId) {
    const { data, error } = await supabase
        .from('fichas_ortodoncia')
        .select('*')
        .eq('paciente_id', patientId)
        .maybeSingle();
    if (error) throw error;

    if (!data) return null;
    return {
        id: data.id,
        patient_id: data.paciente_id,
        malocclusion_type: data.tipo_maloclusion,
        bracket_type: data.tipo_bracket,
        archwire_upper: data.arco_superior,
        archwire_lower: data.arco_inferior,
        notes: data.notas
    };
}

export async function saveOrthodonticRecord(record) {
    const dbRecord = {
        paciente_id: record.patient_id,
        tipo_maloclusion: record.malocclusion_type,
        tipo_bracket: record.bracket_type,
        arco_superior: record.archwire_upper,
        arco_inferior: record.archwire_lower,
        notas: record.notes
    };

    if (record.id) {
        const { data, error } = await supabase
            .from('fichas_ortodoncia')
            .update(dbRecord)
            .eq('id', record.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('fichas_ortodoncia')
            .insert([dbRecord])
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}

export async function getOrthodonticControls(patientId) {
    const { data, error } = await supabase
        .from('controles_mensuales_ortodoncia')
        .select('*')
        .eq('paciente_id', patientId)
        .order('fecha', { ascending: false });
    if (error) throw error;

    return data.map(c => ({
        id: c.id,
        patient_id: c.paciente_id,
        date: c.fecha,
        archwire_changed: c.cambio_arco,
        elastic_configuration: c.configuracion_elasticos,
        repairs_made: c.reparaciones_realizadas,
        observations: c.observaciones,
        next_appointment: c.proxima_cita,
        attended_by: c.atendido_por
    }));
}

export async function insertOrthodonticControl(control) {
    const dbRecord = {
        paciente_id: control.patient_id,
        fecha: control.date,
        cambio_arco: control.archwire_changed,
        configuracion_elasticos: control.elastic_configuration,
        reparaciones_realizadas: control.repairs_made,
        observaciones: control.observations,
        proxima_cita: control.next_appointment,
        atendido_por: control.attended_by
    };

    const { data, error } = await supabase
        .from('controles_mensuales_ortodoncia')
        .insert([dbRecord])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteOrthodonticControl(id) {
    const { error } = await supabase
        .from('controles_mensuales_ortodoncia')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}
