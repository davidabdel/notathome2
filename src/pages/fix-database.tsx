import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import FixDatabaseButton from '../components/FixDatabaseButton';
import DatabaseDiagnostic from '../components/DatabaseDiagnostic';
import { supabase } from '../../supabase/config';

interface SchemaInfo {
  tables: {
    territory_maps: {
      exists: boolean;
      error: string | null;
    };
    user_roles: {
      exists: boolean;
      error: string | null;
    };
    congregations: {
      exists: boolean;
      error: string | null;
    };
  };
  functions: {
    execute_sql: {
      exists: boolean;
    };
  };
  storage: {
    maps_bucket: {
      exists: boolean;
    };
  };
  security: {
    rls_enabled: boolean;
    policies_exist: boolean;
  };
  environment: {
    supabase_url: boolean;
    supabase_key: boolean;
    service_role_key: boolean;
  };
}

interface DiagnosticResult {
  schema: SchemaInfo;
  issues: string[];
  needs_fixing: boolean;
}

const FixDatabasePage: React.FC = () => {
  const [showSql, setShowSql] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const sqlScript = `
-- Create the territory_maps table if it doesn't exist
CREATE TABLE IF NOT EXISTS territory_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT,
  congregation_id UUID NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on congregation_id for faster queries
CREATE INDEX IF NOT EXISTS territory_maps_congregation_id_idx ON territory_maps(congregation_id);

-- Enable Row Level Security
ALTER TABLE territory_maps ENABLE ROW LEVEL SECURITY;

-- Create policies for congregation admins
DROP POLICY IF EXISTS congregation_admins_select ON territory_maps;
CREATE POLICY congregation_admins_select ON territory_maps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.congregation_id = territory_maps.congregation_id
      AND user_roles.role IN ('congregation_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS congregation_admins_insert ON territory_maps;
CREATE POLICY congregation_admins_insert ON territory_maps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.congregation_id = territory_maps.congregation_id
      AND user_roles.role IN ('congregation_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS congregation_admins_update ON territory_maps;
CREATE POLICY congregation_admins_update ON territory_maps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.congregation_id = territory_maps.congregation_id
      AND user_roles.role IN ('congregation_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS congregation_admins_delete ON territory_maps;
CREATE POLICY congregation_admins_delete ON territory_maps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.congregation_id = territory_maps.congregation_id
      AND user_roles.role IN ('congregation_admin', 'admin')
    )
  );

-- Add contact_email column to congregations table if it doesn't exist
ALTER TABLE congregations 
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add map_count column to congregations table if it doesn't exist
ALTER TABLE congregations 
ADD COLUMN IF NOT EXISTS map_count INTEGER DEFAULT 0;

-- Create execute_sql function if it doesn't exist
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE sql_query;
  result := '{"success": true}'::JSONB;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;

-- Refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');
  `;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    alert('SQL script copied to clipboard!');
  };

  const handleDiagnosticComplete = (result: DiagnosticResult) => {
    setDiagnosticResult(result);
  };

  const createSessionsTable = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            code VARCHAR(6) NOT NULL UNIQUE,
            congregation_id UUID REFERENCES congregations(id),
            created_by UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            UNIQUE(code)
          );
          
          -- Create session_participants table
          CREATE TABLE IF NOT EXISTS session_participants (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            session_id UUID REFERENCES sessions(id),
            user_id UUID NOT NULL,
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Enable RLS on sessions table
          ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
          
          -- Policy for congregation members to view their sessions
          CREATE POLICY view_congregation_sessions ON sessions
            FOR SELECT USING (
              congregation_id IN (
                SELECT congregation_id FROM user_roles 
                WHERE user_id = auth.uid()
              )
            );
            
          -- Policy for creating sessions (congregation admins only)
          CREATE POLICY create_sessions ON sessions
            FOR INSERT WITH CHECK (
              auth.uid() IN (
                SELECT user_id FROM user_roles 
                WHERE congregation_id = sessions.congregation_id
              )
            );
            
          -- Policy for updating sessions (creator only)
          CREATE POLICY update_sessions ON sessions
            FOR UPDATE USING (
              created_by = auth.uid() OR
              auth.uid() IN (
                SELECT user_id FROM user_roles 
                WHERE congregation_id = sessions.congregation_id 
                AND role IN ('congregation_admin', 'admin')
              )
            );
        `
      });
      
      if (error) {
        throw error;
      }
      
      setSuccess('Sessions table created successfully');
    } catch (err: any) {
      console.error('Error creating sessions table:', err);
      setError(err.message || 'Failed to create sessions table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fix-database-page">
      <Head>
        <title>Fix Database Schema | Not At Home</title>
        <meta name="description" content="Fix database schema for Not At Home application" />
      </Head>

      <div className="container">
        <h1>Fix Database Schema</h1>
        <p className="description">
          This page allows you to fix the database schema for the Not At Home application.
          Use this if you're experiencing issues with missing tables or columns.
        </p>

        <div className="card">
          <DatabaseDiagnostic onDiagnosticComplete={handleDiagnosticComplete} />
        </div>

        <div className="card">
          <h2>Territory Maps Table</h2>
          <p>
            Fix the territory_maps table and related objects (indexes, policies, storage bucket).
            This is useful if you're seeing errors related to territory maps.
          </p>
          <FixDatabaseButton 
            buttonText="Fix Territory Maps Schema" 
            diagnosticResult={diagnosticResult}
            fixTarget="territory_maps"
            onSuccess={() => {
              alert('Database schema fixed successfully! You can now return to the congregation dashboard.');
              // Refresh the diagnostic after fixing
              const diagnosticElement = document.querySelector('.refresh-button') as HTMLButtonElement;
              if (diagnosticElement) {
                diagnosticElement.click();
              }
            }}
          />
        </div>

        <div className="card">
          <h2>Execute SQL Function</h2>
          <p>
            Fix the execute_sql function that allows direct SQL execution.
            This is needed for some advanced database operations.
          </p>
          <FixDatabaseButton 
            buttonText="Fix Execute SQL Function" 
            diagnosticResult={diagnosticResult}
            fixTarget="execute_sql"
            onSuccess={() => {
              // Refresh the diagnostic after fixing
              const diagnosticElement = document.querySelector('.refresh-button') as HTMLButtonElement;
              if (diagnosticElement) {
                diagnosticElement.click();
              }
            }}
          />
        </div>

        <div className="card">
          <h2>Contact Email Column</h2>
          <p>
            Add the contact_email column to the congregations table.
            This is needed for congregation requests to work properly.
          </p>
          <FixDatabaseButton 
            buttonText="Add Contact Email Column" 
            diagnosticResult={diagnosticResult}
            fixTarget="contact_email"
            onSuccess={() => {
              // Refresh the diagnostic after fixing
              const diagnosticElement = document.querySelector('.refresh-button') as HTMLButtonElement;
              if (diagnosticElement) {
                diagnosticElement.click();
              }
            }}
          />
        </div>

        <div className="card">
          <h2>Map Count Column</h2>
          <p>
            Add the map_count column to the congregations table.
            This is needed for territory map setup to work properly.
          </p>
          <FixDatabaseButton 
            buttonText="Add Map Count Column" 
            diagnosticResult={diagnosticResult}
            fixTarget="map_count"
            onSuccess={() => {
              // Refresh the diagnostic after fixing
              const diagnosticElement = document.querySelector('.refresh-button') as HTMLButtonElement;
              if (diagnosticElement) {
                diagnosticElement.click();
              }
            }}
          />
        </div>

        <div className="card">
          <h2>Manual Fix with SQL</h2>
          <p>
            If the automatic fix doesn't work, you can run the following SQL script directly in the Supabase SQL Editor.
            This will create the territory_maps table and set up the necessary policies.
          </p>
          <div className="sql-actions">
            <button 
              className="toggle-sql-button"
              onClick={() => setShowSql(!showSql)}
            >
              {showSql ? 'Hide SQL Script' : 'Show SQL Script'}
            </button>
            
            <button 
              className="copy-sql-button"
              onClick={handleCopyToClipboard}
            >
              Copy SQL to Clipboard
            </button>
          </div>
          
          {showSql && (
            <pre className="sql-code">
              {sqlScript}
            </pre>
          )}
          
          <div className="steps">
            <h3>Steps to run the SQL script:</h3>
            <ol>
              <li>Log in to your Supabase dashboard</li>
              <li>Go to the SQL Editor</li>
              <li>Paste the SQL script</li>
              <li>Click "Run" to execute the script</li>
              <li>Return to the application and refresh the page</li>
            </ol>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            className="action-button"
            onClick={createSessionsTable}
            disabled={loading}
          >
            Create Sessions Table
          </button>
        </div>

        <div className="links">
          <Link href="/congregation">
            <div className="link-button">Return to Congregation Dashboard</div>
          </Link>
          <Link href="/manual-fix">
            <div className="link-button manual-fix-button">Go to Manual Fix Page</div>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .fix-database-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #f8fafc;
          padding: 2rem;
        }

        .container {
          max-width: 800px;
          width: 100%;
        }

        h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1rem;
        }

        .description {
          color: #64748b;
          margin-bottom: 2rem;
        }

        .card {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 1.5rem 0 0.5rem 0;
        }

        .card p {
          color: #64748b;
          margin-bottom: 1.5rem;
        }

        .sql-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .toggle-sql-button, .copy-sql-button {
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .toggle-sql-button:hover, .copy-sql-button:hover {
          background-color: #1d4ed8;
        }

        .sql-code {
          background-color: #1e293b;
          color: #e2e8f0;
          padding: 1rem;
          border-radius: 0.375rem;
          overflow-x: auto;
          font-family: monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          white-space: pre;
        }

        .steps {
          margin-top: 1.5rem;
        }

        ol {
          margin-left: 1.5rem;
          color: #64748b;
        }

        li {
          margin-bottom: 0.5rem;
        }

        .links {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
        }

        .link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
          cursor: pointer;
        }

        .link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default FixDatabasePage; 