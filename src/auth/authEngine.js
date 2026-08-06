import { supabase } from '../utils/supabaseClient.js';

export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function verifyUser(username, password, usersList) {
    const email = username.includes('@') ? username : `${username.toLowerCase()}@portaldent.com`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error("Supabase Auth Error:", error.message);
        return null;
    }

    if (data && data.user) {
        const { data: profile, error: profileError } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error("Supabase Profile Retrieval Error:", profileError.message);
            return null;
        }

        return {
            id: data.user.id,
            name: profile.nombre_completo,
            username: profile.usuario,
            role: profile.rol
        };
    }

    return null;
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

export async function logout() {
    sessionStorage.removeItem('portaldent_session');
    await supabase.auth.signOut();
}
