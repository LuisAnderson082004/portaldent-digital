import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuración de Supabase (Reemplazar con credenciales reales del proyecto)
export const SUPABASE_URL = 'https://nliieundudfqheagmjhu.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_35hzrU2iMAqh6HMnPPukhQ_lWJc65MG';

// Determina si las credenciales siguen siendo placeholders
const isDefault = SUPABASE_URL.includes('your-project') || SUPABASE_ANON_KEY.includes('your-anon');

export const isPlaceholder = isDefault;

export const supabase = !isPlaceholder ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;