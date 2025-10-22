import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const DebugNavigation: React.FC = () => {
  const router = useRouter();
  
  const isActive = (path: string) => {
    return router.pathname === path;
  };
  
  return (
    <div className="debug-nav-container">
      <div className="debug-nav-header">
        <h3>Tools</h3>
      </div>
      <nav className="debug-nav">
        <Link href="/email-settings" className={`debug-nav-link ${isActive('/email-settings') ? 'active' : ''}`}>
          Email Settings
        </Link>
        <Link href="/" className="debug-nav-link home-link">
          Back to Home
        </Link>
      </nav>
      
      <style jsx>{`
        .debug-nav-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          width: 180px;
          transition: transform 0.3s ease;
        }
        
        .debug-nav-container:hover {
          transform: translateY(-5px);
        }
        
        .debug-nav-header {
          background-color: #3b82f6;
          color: white;
          padding: 10px 15px;
        }
        
        .debug-nav-header h3 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .debug-nav {
          display: flex;
          flex-direction: column;
        }
        
        .debug-nav-link {
          padding: 10px 15px;
          color: #1e293b;
          text-decoration: none;
          font-size: 0.85rem;
          border-bottom: 1px solid #f1f5f9;
          transition: background-color 0.2s;
        }
        
        .debug-nav-link:hover {
          background-color: #f8fafc;
        }
        
        .debug-nav-link.active {
          background-color: #dbeafe;
          font-weight: 500;
          color: #1d4ed8;
        }
        
        .home-link {
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

export default DebugNavigation;
