import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function Privacy() {
    return (
        <div className="page-wrapper">
            <Head>
                <title>Privacy Disclaimer - Not At Home</title>
                <meta name="description" content="Privacy Disclaimer for Not At Home application" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>

            <header className="header">
                <div className="header-content">
                    <Link href="/role-selection" className="back-link">
                        <ArrowLeft size={20} className="mr-2" />
                        Back
                    </Link>
                    <h1 className="header-title">Privacy Disclaimer</h1>
                </div>
            </header>

            <main className="main-content">
                <div className="content-card">
                    <div className="icon-wrapper">
                        <Shield size={48} />
                    </div>

                    <h2 className="section-title">Data Privacy & Usage</h2>

                    <div className="privacy-content">
                        <p>
                            The use of this app and the data recorded within it is solely at the discretion of the user.
                        </p>
                        <p>
                            As the app developer, we do not influence or control how the app is utilised and accept no
                            responsibility for its usage or the data collected by users.
                        </p>
                        <p>
                            It is the user's responsibility to ensure compliance with any applicable laws and regulations
                            of the applicable country regarding data collection, storage, and privacy.
                        </p>

                        <h3>Data Storage</h3>
                        <p>
                            This application stores data temporarily to facilitate the coordination of door-to-door outreach.
                            Session data is designed to be transient and is typically cleared after the session is ended.
                        </p>

                        <h3>Location Services</h3>
                        <p>
                            This application uses location services to display maps and help users identify their current position
                            relative to territory boundaries. Location data is processed locally on your device and is not
                            stored permanently on our servers for tracking purposes.
                        </p>
                    </div>

                    <div className="action-container">
                        <Link href="/role-selection" className="btn btn-primary">
                            I Understand
                        </Link>
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
          padding: var(--space-6) var(--space-4);
          display: flex;
          justify-content: center;
        }

        .content-card {
          background-color: var(--color-bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
          padding: var(--space-8);
          max-width: 640px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
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
          margin-bottom: var(--space-6);
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 var(--space-6) 0;
          color: var(--color-text-main);
          text-align: center;
        }

        .privacy-content {
          width: 100%;
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin-bottom: var(--space-8);
        }

        .privacy-content p {
          margin-bottom: var(--space-4);
        }

        .privacy-content h3 {
          color: var(--color-text-main);
          font-size: 1.125rem;
          font-weight: 600;
          margin: var(--space-6) 0 var(--space-3) 0;
        }

        .action-container {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 2rem;
          border-radius: var(--radius-lg);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }

        .btn-primary {
          background-color: var(--color-primary);
          color: white;
          border: none;
        }

        .btn-primary:hover {
          background-color: var(--color-primary-hover);
          transform: translateY(-1px);
        }

        .mr-2 { margin-right: var(--space-2); }

        @media (max-width: 640px) {
          .content-card {
            padding: var(--space-6);
          }
        }
      `}</style>
        </div>
    );
}
