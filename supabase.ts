import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rtwraygowrhercdwbyyl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d3JheWdvd3JoZXJjZHdieXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDM5NDUsImV4cCI6MjA5MTIxOTk0NX0.V-Si13bzExzrk_RSEPT_h93EMIgfMhsyCsWkh-9418M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);