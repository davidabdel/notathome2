import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../../supabase/config';

export default function DebugClient() {
  const [debugInfo, setDebugInfo] = useState<any>({
    loading: true,
    error: null,
    session: null,
    userRoles: null,
    congregations: null,
    envVars: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'defined' : 'undefined',
      NEXT_PUBLIC_SUPABASE_URL_LENGTH: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'defined' : 'undefined',
      NEXT_PUBLIC_SUPABASE_KEY_LENGTH: process.env.NEXT_PUBLIC_SUPABASE_KEY?.length || 0,
    }
  });

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        // Check session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        let userRolesData = null;
        let userRolesError = null;
        let congregationsData = null;
        let congregationsError = null;
        
        // Only try to get user roles if we have a session
        if (sessionData?.session) {
          // Get user roles
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', sessionData.session.user.id);
          
          userRolesData = roles;
          userRolesError = rolesError;
          
          // Get congregations
          const { data: congregations, error: congsError } = await supabase
            .from('congregations')
            .select('*')
            .limit(5);
          
          congregationsData = congregations;
          congregationsError = congsError;
        }
        
        setDebugInfo({
          loading: false,
          session: {
            data: sessionData,
            error: sessionError
          },
          userRoles: {
            data: userRolesData,
            error: userRolesError
          },
          congregations: {
            data: congregationsData,
            error: congregationsError
          },
          envVars: {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'defined' : 'undefined',
            NEXT_PUBLIC_SUPABASE_URL_LENGTH: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
            NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'defined' : 'undefined',
            NEXT_PUBLIC_SUPABASE_KEY_LENGTH: process.env.NEXT_PUBLIC_SUPABASE_KEY?.length || 0,
          }
        });
      } catch (error) {
        setDebugInfo({
          loading: false,
          error: error instanceof Error ? error.message : String(error),
          session: null,
          userRoles: null,
          congregations: null,
          envVars: {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'defined' : 'undefined',
            NEXT_PUBLIC_SUPABASE_URL_LENGTH: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
            NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'defined' : 'undefined',
            NEXT_PUBLIC_SUPABASE_KEY_LENGTH: process.env.NEXT_PUBLIC_SUPABASE_KEY?.length || 0,
          }
        });
      }
    };
    
    runDiagnostics();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <Head>
        <title>Client-Side Debug - Not At Home</title>
        <meta name="robots" content="noindex" />
      </Head>
      
      <h1>Client-Side Debug Information</h1>
      
      {debugInfo.loading ? (
        <p>Loading diagnostics...</p>
      ) : debugInfo.error ? (
        <div style={{ color: 'red' }}>
          <h2>Error</h2>
          <pre>{JSON.stringify(debugInfo.error, null, 2)}</pre>
        </div>
      ) : (
        <>
          <h2>Environment Variables</h2>
          <pre>{JSON.stringify(debugInfo.envVars, null, 2)}</pre>
          
          <h2>Session</h2>
          <pre>{JSON.stringify({
            exists: !!debugInfo.session?.data?.session,
            error: debugInfo.session?.error
          }, null, 2)}</pre>
          
          {debugInfo.session?.data?.session && (
            <>
              <h3>User ID</h3>
              <pre>{debugInfo.session.data.session.user.id}</pre>
              
              <h3>User Email</h3>
              <pre>{debugInfo.session.data.session.user.email}</pre>
            </>
          )}
          
          <h2>User Roles</h2>
          <pre>{JSON.stringify({
            count: debugInfo.userRoles?.data?.length || 0,
            error: debugInfo.userRoles?.error
          }, null, 2)}</pre>
          
          {debugInfo.userRoles?.data && debugInfo.userRoles.data.length > 0 && (
            <pre>{JSON.stringify(debugInfo.userRoles.data, null, 2)}</pre>
          )}
          
          <h2>Congregations</h2>
          <pre>{JSON.stringify({
            count: debugInfo.congregations?.data?.length || 0,
            error: debugInfo.congregations?.error
          }, null, 2)}</pre>
          
          {debugInfo.congregations?.data && debugInfo.congregations.data.length > 0 && (
            <pre>{JSON.stringify(debugInfo.congregations.data, null, 2)}</pre>
          )}
        </>
      )}
    </div>
  );
} 