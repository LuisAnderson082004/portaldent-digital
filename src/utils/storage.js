/* storage.js - LocalStorage Layer Client */

export function loadState() {
    return {
        users: JSON.parse(localStorage.getItem('portaldent_users')) || [],
        patients: JSON.parse(localStorage.getItem('portaldent_patients')) || [],
        shifts: JSON.parse(localStorage.getItem('portaldent_shifts')) || [],
        appointments: JSON.parse(localStorage.getItem('portaldent_appointments')) || [],
        auditLogs: JSON.parse(localStorage.getItem('portaldent_audit')) || []
    };
}

export function saveState(state) {
    localStorage.setItem('portaldent_users', JSON.stringify(state.users));
    localStorage.setItem('portaldent_patients', JSON.stringify(state.patients));
    localStorage.setItem('portaldent_shifts', JSON.stringify(state.shifts));
    localStorage.setItem('portaldent_appointments', JSON.stringify(state.appointments));
    localStorage.setItem('portaldent_audit', JSON.stringify(state.auditLogs));
}

export async function initDB(hashPasswordFn) {
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