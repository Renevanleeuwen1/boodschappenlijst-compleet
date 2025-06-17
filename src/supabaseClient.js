
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = 'https://yidabysarmcsabejtijt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZGFieXNhcm1jc2FiZWp0aWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODgwNjUsImV4cCI6MjA2NTY2NDA2NX0.38nx1VZB8WwcIuq6InA2Ctctc0wSfpRZrEPlhjbZxTU';

export const supabase = createClient(supabaseUrl, supabaseKey);
