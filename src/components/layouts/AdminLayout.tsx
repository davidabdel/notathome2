import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/config';
import { FaKey, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <div className="admin-layout">
      <div className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h1>Not At Home</h1>
          <p>Admin Panel</p>
          <button 
            className="mobile-close-button" 
            onClick={toggleMobileMenu}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
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

      <div className="mobile-header">
        <button 
          className="mobile-menu-button" 
          onClick={toggleMobileMenu}
          aria-label="Open menu"
        >
          <FaBars />
        </button>
        <h1>Not At Home</h1>
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
      
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={toggleMobileMenu}></div>
      )}
      
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
          z-index: 100;
        }
        
        .sidebar-header {
          margin-bottom: 2rem;
          position: relative;
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

        .mobile-header {
          display: none;
          background-color: #1e293b;
          color: white;
          padding: 1rem;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .mobile-header h1 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
          text-align: center;
          flex: 1;
        }

        .mobile-menu-button, 
        .mobile-close-button {
          background: none;
          border: none;
          color: white;
          font-size: 1.25rem;
          cursor: pointer;
          display: none;
          padding: 0.5rem;
        }

        .mobile-close-button {
          position: absolute;
          top: 0;
          right: 0;
        }

        .mobile-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 90;
        }
        
        @media (max-width: 768px) {
          .admin-layout {
            flex-direction: column;
          }
          
          .admin-sidebar {
            position: fixed;
            top: 0;
            left: -280px;
            height: 100vh;
            width: 280px;
            transition: left 0.3s ease;
            overflow-y: auto;
          }

          .admin-sidebar.mobile-open {
            left: 0;
          }
          
          .mobile-header {
            display: flex;
          }

          .mobile-menu-button,
          .mobile-close-button {
            display: block;
          }

          .mobile-overlay {
            display: block;
          }
          
          .admin-content {
            margin-top: 0;
          }
          
          main {
            padding: 1rem;
          }

          footer {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout; 