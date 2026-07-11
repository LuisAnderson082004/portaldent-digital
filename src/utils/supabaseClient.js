import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuración de Supabase
export const SUPABASE_URL = 'https://nliieundudfqheagmjhu.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_35hzrU2iMAqh6HMnPPukhQ_lWJc65MG';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
