/* patients.js - Patient Admissions & Medical Records Versioning */

export function calculateAge(dobStr, systemTime) {
    const dob = new Date(dobStr);
    const diff = systemTime - dob;
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function addPatient(patientData, state) {
    const { id, firstname, lastname, dni, dob, phone, email, address, allergies, chronic } = patientData;

    // Validate DNI Format (must be exactly 8 digits)
    if (!/^[0-9]{8}$/.test(dni)) {
        throw new Error("El DNI debe contener exactamente 8 dígitos numéricos.");
    }

    // DNI duplicate checker
    const duplicate = state.patients.find(p => p.dni === dni && p.id !== id);
    if (duplicate) {
        throw new Error("Este DNI ya está registrado.");
    }

    if (!id) {
        // Generate automatic incremental Clinical History Number
        const maxHistory = state.patients.reduce((max, p) => p.historyNumber > max ? p.historyNumber : max, 10000);
        const newPatient = {
            id: 'pat-' + Date.now(),
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
        state.patients.push(newPatient);
        return newPatient;
    } else {
        // Edit existing patient details
        const patient = state.patients.find(p => p.id === id);
        if (!patient) throw new Error("Paciente no encontrado.");

        patient.firstname = firstname;
        patient.lastname = lastname;
        patient.dni = dni;
        patient.dob = dob;
        patient.phone = phone;
        patient.email = email;
        patient.address = address;
        patient.allergies = allergies || 'Ninguna';
        patient.chronic = chronic || 'Ninguna';
        return patient;
    }
}

export function addEvolutionNote(patientId, noteText, author, systemTimeStr, state) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) throw new Error("Paciente no encontrado.");

    const newVersionNum = patient.evolutionNotes.length + 1;
    const newNote = {
        version: newVersionNum,
        timestamp: systemTimeStr,
        author: author,
        content: noteText
    };

    patient.evolutionNotes.push(newNote);
    return newNote;
}