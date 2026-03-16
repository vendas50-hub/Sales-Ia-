import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ajpmeyptgqdubcfzxcgz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Zr-Hc_ZGpMtht9yCi6YFpQ_NRRZ4r_f';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);