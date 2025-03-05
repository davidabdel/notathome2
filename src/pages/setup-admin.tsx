import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function SetupAdmin() {
  const [copied, setCopied] = useState(false);
  
  const sqlScript = `-- Temporarily disable RLS for the congregations table
ALTER TABLE congregations DISABLE ROW LEVEL SECURITY;

-- Check if Admin Congregation already exists
DO $$
DECLARE
  congregation_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM congregations WHERE name = 'Admin Congregation'
  ) INTO congregation_exists;
  
  IF NOT congregation_exists THEN
    -- Insert the Admin Congregation
    INSERT INTO congregations (name, pin_code, status)
    VALUES ('Admin Congregation', '123456', 'active');
    
    RAISE NOTICE 'Admin Congregation created successfully';
  ELSE
    RAISE NOTICE 'Admin Congregation already exists';
    
    -- Update the congregation to ensure it's active
    UPDATE congregations 
    SET status = 'active' 
    WHERE name = 'Admin Congregation';
    
    RAISE NOTICE 'Admin Congregation status updated to active';
  END IF;
END $$;

-- Show the congregation for verification
SELECT * FROM congregations WHERE name = 'Admin Congregation';

-- Re-enable RLS for the congregations table
ALTER TABLE congregations ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations for super admins
DROP POLICY IF EXISTS super_admin_all ON congregations;
CREATE POLICY super_admin_all ON congregations
  FOR ALL
  USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  ));`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container">
      <Head>
        <title>Setup Admin - Not At Home</title>
        <meta name="description" content="Set up the admin congregation for Not At Home" />
      </Head>

      <main>
        <h1>Setup Admin Congregation</h1>
        
        <div className="instructions">
          <p>
            Due to Row Level Security (RLS) policies in Supabase, we need to set up the Admin Congregation directly in the SQL Editor.
          </p>
          <p>
            Follow these steps:
          </p>
          <ol>
            <li>Go to your Supabase project dashboard</li>
            <li>Click on "SQL Editor" in the left sidebar</li>
            <li>Create a new query</li>
            <li>Copy and paste the SQL script below</li>
            <li>Run the script</li>
            <li>Return to the app and try logging in with:<br />
              <strong>Congregation Name:</strong> Admin Congregation<br />
              <strong>PIN Code:</strong> 123456
            </li>
          </ol>
          
          <div className="troubleshooting">
            <h3>Troubleshooting</h3>
            <p>If you're still having issues logging in:</p>
            <ol>
              <li>Visit the <Link href="/check-tables">Check Tables</Link> page to verify that the congregation exists and is active</li>
              <li>Make sure you're entering the exact congregation name: "Admin Congregation" (with a space)</li>
              <li>Make sure you're entering the PIN code: "123456"</li>
              <li>Check the browser console for any error messages</li>
            </ol>
          </div>
        </div>
        
        <div className="sql-container">
          <div className="sql-header">
            <h2>SQL Script</h2>
            <button 
              onClick={copyToClipboard} 
              className="copy-button"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <pre className="sql-code">{sqlScript}</pre>
        </div>
        
        <div className="actions">
          <Link href="/" className="button">
            Return to Home
          </Link>
          <Link href="/check-tables" className="button secondary">
            Check Tables
          </Link>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        
        main {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        h1 {
          font-size: 2rem;
          margin-bottom: 1rem;
          color: #333;
        }
        
        h2 {
          font-size: 1.5rem;
          margin: 0;
          color: #444;
        }
        
        h3 {
          font-size: 1.25rem;
          margin: 1.5rem 0 0.75rem;
          color: #444;
        }
        
        .instructions {
          background-color: #f9fafb;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .instructions p {
          margin-bottom: 1rem;
          line-height: 1.5;
        }
        
        .instructions ol {
          padding-left: 1.5rem;
        }
        
        .instructions li {
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }
        
        .troubleshooting {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }
        
        .troubleshooting p {
          margin-bottom: 0.75rem;
        }
        
        .sql-container {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .sql-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background-color: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .copy-button {
          padding: 0.5rem 1rem;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        
        .copy-button:hover {
          background-color: #1d4ed8;
        }
        
        .sql-code {
          margin: 0;
          padding: 1.5rem;
          overflow-x: auto;
          font-family: monospace;
          font-size: 0.875rem;
          line-height: 1.7;
          color: #334155;
          background-color: #f8fafc;
        }
        
        .actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1rem;
        }
        
        .button {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        
        .button:hover {
          background-color: #1d4ed8;
        }
        
        .button.secondary {
          background-color: #4b5563;
        }
        
        .button.secondary:hover {
          background-color: #374151;
        }
      `}</style>
    </div>
  );
} 