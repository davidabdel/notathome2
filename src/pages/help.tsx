import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, FileText, MessageCircle, ExternalLink } from 'lucide-react';

export default function Help() {
    return (
        <div className="page-wrapper">
            <Head>
                <title>Help & Support - Not At Home</title>
                <meta name="description" content="Help and support for Not At Home application" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>

            <header className="header">
                <div className="header-content">
                    <Link href="/role-selection" className="back-link">
                        <ArrowLeft size={20} className="mr-2" />
                        Back
                    </Link>
                    <h1 className="header-title">Help & Support</h1>
                </div>
            </header>

            <main className="main-content">
                <div className="content-container">
                    <div className="hero-section">
                        <div className="icon-wrapper">
                            <HelpCircle size={48} />
                        </div>
                        <h2>How can we help you?</h2>
                        <p>Find answers to common questions and learn how to use the app.</p>
                    </div>

                    <div className="help-grid">
                        <div className="help-card">
                            <div className="card-icon">
                                <FileText size={24} />
                            </div>
                            <h3>User Guide</h3>
                            <p>Learn the basics of using Not At Home for your ministry.</p>
                            <span className="coming-soon">Coming Soon</span>
                        </div>

                        <div className="help-card">
                            <div className="card-icon">
                                <MessageCircle size={24} />
                            </div>
                            <h3>FAQ</h3>
                            <p>Frequently asked questions about accounts, sessions, and privacy.</p>
                            <span className="coming-soon">Coming Soon</span>
                        </div>

                        <a href="mailto:support@nothome.app" className="help-card link">
                            <div className="card-icon">
                                <ExternalLink size={24} />
                            </div>
                            <h3>Contact Support</h3>
                            <p>Need specific help? Reach out to our support team via email.</p>
                        </a>
                    </div>
                </div>
            </main>

            <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--color-bg-body);
          color: var(--color-text-main);
        }

        .header {
          background-color: var(--color-bg-card);
          border-bottom: 1px solid var(--color-border);
          padding: var(--space-4);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .header-content {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          position: relative;
        }

        .back-link {
          display: flex;
          align-items: center;
          color: var(--color-text-secondary);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
          position: absolute;
          left: 0;
        }

        .back-link:hover {
          color: var(--color-primary);
        }

        .header-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          width: 100%;
          text-align: center;
        }

        .main-content {
          flex: 1;
          padding: var(--space-8) var(--space-4);
          display: flex;
          justify-content: center;
        }

        .content-container {
          max-width: 800px;
          width: 100%;
        }

        .hero-section {
          text-align: center;
          margin-bottom: var(--space-10);
        }

        .icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: #eff6ff;
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto var(--space-6);
        }

        .hero-section h2 {
          font-size: 2rem;
          font-weight: 800;
          margin: 0 0 var(--space-2) 0;
          color: var(--color-text-main);
        }

        .hero-section p {
          font-size: 1.125rem;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .help-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-6);
        }

        .help-card {
          background-color: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: all 0.2s;
          text-decoration: none;
          color: inherit;
          position: relative;
          overflow: hidden;
        }

        .help-card.link:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary);
        }

        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background-color: var(--color-bg-surface);
          color: var(--color-text-main);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-4);
        }

        .help-card h3 {
          margin: 0 0 var(--space-2) 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-main);
        }

        .help-card p {
          margin: 0;
          font-size: 0.95rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }

        .coming-soon {
          display: inline-block;
          margin-top: var(--space-4);
          padding: 0.25rem 0.75rem;
          background-color: var(--color-bg-surface);
          color: var(--color-text-tertiary);
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .mr-2 { margin-right: var(--space-2); }
      `}</style>
        </div>
    );
}
