/* authEngine.js - Authentication & RBAC Engine with Supabase integration */

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
    // Convert local clinic usernames to emails internally for Supabase Auth
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
        // Retrieve profile details and RBAC role from the profiles table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error("Supabase Profile Retrieval Error:", profileError.message);
            return null;
        }

        return {
            id: data.user.id,
            name: profile.name,
            username: profile.username,
            role: profile.role
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
