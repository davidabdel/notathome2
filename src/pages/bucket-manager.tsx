import React from 'react';
import Link from 'next/link';
import BucketManager from '../components/BucketManager';

const BucketManagerPage: React.FC = () => {
  return (
    <div className="container">
      <header>
        <h1>Storage Bucket Manager</h1>
        <div className="nav-links">
          <Link href="/debug" className="nav-link">Debug</Link>
          <Link href="/storage-debug" className="nav-link">Storage Debug</Link>
          <Link href="/" className="nav-link">Home</Link>
        </div>
      </header>
      
      <main>
        <p className="description">
          This page helps you manage the maps storage bucket. It uses the API endpoints to ensure proper access and permissions.
        </p>
        
        <BucketManager />
      </main>
      
      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 15px;
        }
        
        h1 {
          font-size: 1.8rem;
          color: #1e293b;
          margin: 0;
        }
        
        .nav-links {
          display: flex;
          gap: 15px;
        }
        
        .nav-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 1rem;
        }
        
        .description {
          color: #64748b;
          font-size: 1rem;
          margin-bottom: 20px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

export default BucketManagerPage;
