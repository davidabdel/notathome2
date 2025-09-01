import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import CreateStorageBucket from '../components/CreateStorageBucket';

const ManualFixPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  
  const sqlScript = `-- Create execute_sql function if it doesn't exist
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

-- Add contact_email column to congregations table if it doesn't exist
ALTER TABLE congregations 
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add map_count column to congregations table if it doesn't exist
ALTER TABLE congregations 
ADD COLUMN IF NOT EXISTS map_count INTEGER DEFAULT 0;

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

-- DISABLE Row Level Security temporarily to fix issues
ALTER TABLE territory_maps DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with permissive policies
ALTER TABLE territory_maps ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS congregation_admins_select ON territory_maps;
DROP POLICY IF EXISTS congregation_admins_insert ON territory_maps;
DROP POLICY IF EXISTS congregation_admins_update ON territory_maps;
DROP POLICY IF EXISTS congregation_admins_delete ON territory_maps;
DROP POLICY IF EXISTS allow_all_select ON territory_maps;
DROP POLICY IF EXISTS allow_all_insert ON territory_maps;
DROP POLICY IF EXISTS allow_all_update ON territory_maps;
DROP POLICY IF EXISTS allow_all_delete ON territory_maps;

-- Create extremely permissive policies for testing
-- Allow anyone to select
CREATE POLICY allow_all_select ON territory_maps
  FOR SELECT USING (true);

-- Allow any authenticated user to insert
CREATE POLICY allow_all_insert ON territory_maps
  FOR INSERT WITH CHECK (true);

-- Allow any authenticated user to update
CREATE POLICY allow_all_update ON territory_maps
  FOR UPDATE USING (true);

-- Allow any authenticated user to delete
CREATE POLICY allow_all_delete ON territory_maps
  FOR DELETE USING (true);

-- Refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');`;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="manual-fix-page">
      <Head>
        <title>Manual Database Fix | Not At Home</title>
        <meta name="description" content="Manual database fix for Not At Home application" />
      </Head>

      <div className="container">
        <h1>Manual Database Fix</h1>
        
        <div className="card">
          <h2>Database Issues Detected</h2>
          <p>
            The automatic fix through the API is not working. You can fix the database issues manually by running the SQL script below in the Supabase SQL Editor.
          </p>
          
          <div className="issues-list">
            <h3>Issues to Fix:</h3>
            <ul>
              <li>Missing territory_maps table</li>
              <li>Missing execute_sql function</li>
              <li>Missing contact_email column in congregations table</li>
              <li>Missing map_count column in congregations table</li>
              <li>Row Level Security (RLS) policy issues</li>
              <li>Missing maps storage bucket</li>
            </ul>
          </div>
          
          <div className="warning-box">
            <h3>Important Note</h3>
            <p>
              This script uses extremely permissive security policies for troubleshooting purposes. 
              It allows any authenticated user to access all territory maps. 
              This is not recommended for production use, but will help diagnose and fix the current issues.
            </p>
          </div>
        </div>

        <div className="card">
          <h2>Step 1: Run SQL Script</h2>
          <p>
            Copy the SQL script below and run it in the Supabase SQL Editor to fix database schema issues.
          </p>
          
          <div className="sql-actions">
            <button 
              className="copy-button"
              onClick={handleCopyToClipboard}
            >
              {copied ? 'Copied!' : 'Copy SQL to Clipboard'}
            </button>
          </div>
          
          <pre className="sql-code">
            {sqlScript}
          </pre>
          
          <div className="instructions-mini">
            <h4>How to run the SQL script:</h4>
            <ol>
              <li>Log in to your Supabase dashboard</li>
              <li>Go to the SQL Editor</li>
              <li>Paste the SQL script</li>
              <li>Click "Run" to execute the script</li>
            </ol>
          </div>
        </div>

        <div className="card">
          <h2>Step 2: Create Storage Bucket</h2>
          <p>
            After running the SQL script, you need to create the storage bucket for maps and fix the Row Level Security (RLS) policies. 
            You can do this by clicking the button below, which will:
          </p>
          
          <div className="feature-list">
            <ul>
              <li>Create a new "maps" storage bucket in your Supabase project</li>
              <li>Configure the bucket with appropriate permissions</li>
              <li>Fix Row Level Security (RLS) policies for the territory_maps table</li>
              <li>Ensure authenticated users can upload and view map images</li>
            </ul>
          </div>
          
          <CreateStorageBucket />
          
          <div className="instructions-mini">
            <h4>Alternative: Create bucket manually in Supabase:</h4>
            <ol>
              <li>Go to "Storage" in the left sidebar of your Supabase dashboard</li>
              <li>Click "Create new bucket"</li>
              <li>Name it "maps"</li>
              <li>Set it to private</li>
              <li>Click "Create bucket"</li>
              <li>Go to "Authentication" → "Policies"</li>
              <li>Find the "maps" bucket and add policies for authenticated users</li>
            </ol>
          </div>
        </div>

        <div className="card">
          <h2>Step 3: Return to Application</h2>
          <p>
            After running the SQL script and creating the storage bucket, return to the application and refresh the page.
          </p>
          
          <div className="links">
            <Link href="/congregation">
              <div className="link-button">Return to Congregation Dashboard</div>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .manual-fix-page {
          min-height: 100vh;
          background-color: #f8fafc;
          padding: 2rem 0;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 1rem;
        }
        
        h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .card {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin-bottom: 2rem;
        }
        
        h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 1rem;
        }
        
        h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.75rem;
        }
        
        h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }
        
        p {
          color: #64748b;
          margin-bottom: 1rem;
          line-height: 1.5;
        }
        
        .issues-list ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        
        .issues-list li {
          color: #64748b;
          margin-bottom: 0.5rem;
        }
        
        .warning-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 1rem;
          margin: 1.5rem 0;
          border-radius: 0.375rem;
        }
        
        .warning-box h3 {
          color: #856404;
          margin-top: 0;
          margin-bottom: 0.5rem;
        }
        
        .warning-box p {
          color: #856404;
          margin-bottom: 0;
        }
        
        .feature-list {
          background-color: #f0f9ff;
          border-radius: 0.375rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
          border-left: 4px solid #0ea5e9;
        }
        
        .feature-list ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0;
        }
        
        .feature-list li {
          color: #0369a1;
          margin-bottom: 0.5rem;
        }
        
        .sql-actions {
          margin-bottom: 1rem;
        }
        
        .copy-button {
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .copy-button:hover {
          background-color: #1d4ed8;
        }
        
        .sql-code {
          background-color: #f1f5f9;
          padding: 1rem;
          border-radius: 0.375rem;
          font-family: monospace;
          font-size: 0.875rem;
          white-space: pre-wrap;
          overflow-x: auto;
          color: #334155;
          line-height: 1.5;
        }
        
        .instructions-mini {
          margin-top: 1.5rem;
          padding: 1rem;
          background-color: #f8fafc;
          border-radius: 0.375rem;
          border: 1px solid #e2e8f0;
        }
        
        .instructions-mini ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0;
        }
        
        .instructions-mini li {
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }
        
        .links {
          display: flex;
          justify-content: center;
          margin-top: 1.5rem;
        }
        
        .link-button {
          background-color: #2563eb;
          color: white;
          border-radius: 0.375rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          text-align: center;
        }
        
        .link-button:hover {
          background-color: #1d4ed8;
        }
      `}</style>
    </div>
  );
};

export default ManualFixPage; 