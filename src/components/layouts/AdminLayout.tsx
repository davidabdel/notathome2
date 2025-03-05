import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/config';
import { FaKey, FaSignOutAlt } from 'react-icons/fa';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        // Redirect to home page after successful logout
        router.push('/');
      }
    } catch (err) {
      console.error('Unexpected error during logout:', err);
    }
  };
  
  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h1>Not At Home</h1>
          <p>Admin Panel</p>
        </div>
        <nav className="sidebar-nav">
          <Link href="/admin" className={router.pathname === '/admin' ? 'active' : ''}>
            Dashboard
          </Link>
          <Link href="/admin/requests" className={router.pathname === '/admin/requests' ? 'active' : ''}>
            Congregation Requests
          </Link>
          <div className="sidebar-divider"></div>
          <Link href="/admin/change-password" className={router.pathname === '/admin/change-password' ? 'active' : ''}>
            <span className="nav-icon"><FaKey /></span> Change Password
          </Link>
          <button onClick={handleLogout} className="logout-button">
            <span className="nav-icon"><FaSignOutAlt /></span> Log Out
          </button>
        </nav>
      </div>
      <div className="admin-content">
        <main>{children}</main>
        <footer>
          <div className="footer-content">
            <Link href="/" className="footer-link">Home</Link>
            <span className="divider">•</span>
            <Link href="/admin" className="footer-link">Admin</Link>
            <span className="divider">•</span>
            <span className="copyright">© 2024 Not At Home</span>
          </div>
        </footer>
      </div>
      
      <style jsx>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
        }
        
        .admin-sidebar {
          width: 250px;
          background-color: #1e293b;
          color: white;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
        }
        
        .sidebar-header {
          margin-bottom: 2rem;
        }
        
        .sidebar-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
        }
        
        .sidebar-header p {
          font-size: 0.875rem;
          color: #94a3b8;
          margin: 0;
        }
        
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .sidebar-nav a {
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          color: #e2e8f0;
          text-decoration: none;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
        }
        
        .sidebar-nav a:hover {
          background-color: #334155;
        }
        
        .sidebar-nav a.active {
          background-color: #2563eb;
          color: white;
        }
        
        .logout-button {
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          color: #e2e8f0;
          background-color: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          font-size: 1rem;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
        }
        
        .logout-button:hover {
          background-color: #334155;
        }
        
        .nav-icon {
          margin-right: 0.5rem;
          display: flex;
          align-items: center;
        }
        
        .sidebar-divider {
          height: 1px;
          background-color: #334155;
          margin: 0.5rem 0;
        }
        
        .admin-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        main {
          flex: 1;
          padding: 2rem;
        }
        
        footer {
          padding: 1rem 2rem;
          border-top: 1px solid #e5e7eb;
        }
        
        .footer-content {
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .footer-link {
          color: #6b7280;
          text-decoration: none;
        }
        
        .footer-link:hover {
          color: #111827;
        }
        
        .divider {
          margin: 0 0.5rem;
        }
        
        @media (max-width: 768px) {
          .admin-layout {
            flex-direction: column;
          }
          
          .admin-sidebar {
            width: 100%;
            padding: 1rem;
          }
          
          .sidebar-header {
            margin-bottom: 1rem;
          }
          
          .sidebar-nav {
            flex-direction: row;
            overflow-x: auto;
            padding-bottom: 0.5rem;
          }
          
          .sidebar-nav a, .logout-button {
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout; 