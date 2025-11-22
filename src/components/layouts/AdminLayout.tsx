import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/config';
import { Key, LogOut, Menu, X, LayoutDashboard, FileText, Shield } from 'lucide-react';

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
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <Link href="/admin" className={router.pathname === '/admin' ? 'active' : ''}>
            <span className="nav-icon"><LayoutDashboard size={18} /></span> Dashboard
          </Link>
          <Link href="/admin/requests" className={router.pathname === '/admin/requests' ? 'active' : ''}>
            <span className="nav-icon"><FileText size={18} /></span> Congregation Requests
          </Link>
          <div className="sidebar-divider"></div>
          <Link href="/admin/change-password" className={router.pathname === '/admin/change-password' ? 'active' : ''}>
            <span className="nav-icon"><Key size={18} /></span> Change Password
          </Link>
          <button onClick={handleLogout} className="logout-button">
            <span className="nav-icon"><LogOut size={18} /></span> Log Out
          </button>
        </nav>
      </div>

      <div className="mobile-header">
        <button
          className="mobile-menu-button"
          onClick={toggleMobileMenu}
          aria-label="Open menu"
        >
          <Menu size={24} />
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
            <span className="copyright">© 2025 UConnect (International) Pty Ltd t/as nothome.app</span>
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
          background-color: var(--color-bg-body);
        }
        
        .admin-sidebar {
          width: 260px;
          background-color: #0f172a;
          color: white;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          z-index: 100;
          border-right: 1px solid #1e293b;
        }
        
        .sidebar-header {
          margin-bottom: 2rem;
          position: relative;
          padding-bottom: 1rem;
          border-bottom: 1px solid #1e293b;
        }
        
        .sidebar-header h1 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
          color: white;
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
          border-radius: 0.5rem;
          color: #cbd5e1;
          text-decoration: none;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          font-weight: 500;
        }
        
        .sidebar-nav a:hover {
          background-color: #1e293b;
          color: white;
        }
        
        .sidebar-nav a.active {
          background-color: var(--color-primary);
          color: white;
        }
        
        .logout-button {
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          color: #ef4444;
          background-color: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          font-size: 1rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          font-weight: 500;
          margin-top: auto;
        }
        
        .logout-button:hover {
          background-color: rgba(239, 68, 68, 0.1);
        }
        
        .nav-icon {
          margin-right: 0.75rem;
          display: flex;
          align-items: center;
        }
        
        .sidebar-divider {
          height: 1px;
          background-color: #1e293b;
          margin: 0.5rem 0;
        }
        
        .admin-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }
        
        main {
          flex: 1;
          padding: 2rem;
        }
        
        footer {
          padding: 1.5rem 2rem;
          border-top: 1px solid var(--color-border);
          background-color: var(--color-bg-card);
        }
        
        .footer-content {
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 0.875rem;
          color: var(--color-text-tertiary);
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .footer-link {
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: color 0.2s;
        }
        
        .footer-link:hover {
          color: var(--color-primary);
        }
        
        .divider {
          color: var(--color-border);
        }

        .mobile-header {
          display: none;
          background-color: #0f172a;
          color: white;
          padding: 1rem;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .mobile-header h1 {
          font-size: 1.125rem;
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
          border-radius: 0.375rem;
        }
        
        .mobile-menu-button:hover,
        .mobile-close-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .mobile-close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
        }

        .mobile-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
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
            transition: transform 0.3s ease;
            transform: translateX(0);
            overflow-y: auto;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.2);
          }

          .admin-sidebar.mobile-open {
            transform: translateX(280px);
          }
          
          .mobile-header {
            display: flex;
          }

          .mobile-menu-button,
          .mobile-close-button {
            display: flex;
            align-items: center;
            justify-content: center;
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
            padding: 1.5rem 1rem;
          }
          
          .copyright {
            width: 100%;
            text-align: center;
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;