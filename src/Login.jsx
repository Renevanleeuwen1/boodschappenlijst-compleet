import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from './supabaseClient';



export default function Login() {
  return (
    <div style={{ maxWidth: 400, margin: 'auto' }}>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={[]} // leeg laten voor alleen email/wachtwoord
      />
    </div>
  );
}
