/* authEngine.js - Authentication & RBAC Engine */

export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function verifyUser(username, password, usersList) {
    const user = usersList.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return null;
    const inputHash = await hashPassword(password);
    return user.passwordHash === inputHash ? user : null;
}

export function getRoleNameSpanish(role) {
    switch (role) {
        case 'admin': return 'Administrador';
        case 'receptionist': return 'Asistente / Recepcionista';
        case 'dentist': return 'Odontólogo';
        default: return 'Usuario';
    }
}

export function checkSession() {
    const session = sessionStorage.getItem('portaldent_session');
    return session ? JSON.parse(session) : null;
}

export function logout() {
    sessionStorage.removeItem('portaldent_session');
}