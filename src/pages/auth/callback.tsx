import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/config';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const routeUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/');
          return;
        }

        const userId = session.user.id;

        // Enforce first-login password reset if flagged
        const mustReset = (session.user as any)?.user_metadata?.require_password_reset;
        if (mustReset) {
          router.replace('/auth/set-password');
          return;
        }

        // Try a few times to allow role inserts to propagate after signup/approval
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);

          if (!rolesError && roles) {
            const roleNames = roles.map(r => r.role);
            if (session.user.email === 'david@uconnect.com.au' || roleNames.includes('admin')) {
              router.replace('/admin');
              return;
            }
            if (roleNames.includes('congregation_admin')) {
              router.replace('/congregation');
              return;
            }
            break; // No admin roles found, proceed with member flow
          }

          // PGRST116 (no rows found) or transient read issues: small backoff
          await new Promise(r => setTimeout(r, 700));
        }

        const selectedRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
        if (selectedRole === 'group_overseer') {
          router.replace('/dashboard');
          return;
        }

        router.replace('/role-selection');
      } catch (e: any) {
        console.error('Auth callback error:', e);
        setError(e?.message || 'Unexpected error');
        router.replace('/');
      }
    };

    routeUser();
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column' }}>
      <div className="loading-spinner" />
      <p>Signing you in...</p>
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      <style jsx>{`
        .loading-spinner {
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 3px solid #2563eb;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
