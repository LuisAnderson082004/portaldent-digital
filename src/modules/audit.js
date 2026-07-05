/* audit.js - Background Security Compliance Logger */

export function writeAuditLog(userId, userName, userRole, patientId, state, systemTimeStr) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;

    const newLog = {
        id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        userId,
        userName,
        userRole: getRoleNameSpanish(userRole),
        patientId: patient.id,
        patientName: `${patient.firstname} ${patient.lastname}`,
        patientHistory: patient.historyNumber.toString(),
        timestamp: systemTimeStr
    };

    state.auditLogs.unshift(newLog); // Prepend newer log entries
    return newLog;
}

function getRoleNameSpanish(role) {
    switch (role) {
        case 'admin': return 'Administrador';
        case 'receptionist': return 'Asistente / Recepcionista';
        case 'dentist': return 'Odontólogo';
        default: return 'Usuario';
    }
}