import React from 'react';
import FloatingParticles from './FloatingParticles';
import TopNavbar from './TopNavbar';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div style={{ background: 'var(--clr-bg)', minHeight: '100vh' }}>
      {/* Ambient particles */}
      <FloatingParticles />

      {/* Top navbar */}
      <TopNavbar />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          paddingTop: '60px',
          paddingBottom: '0',
        }}
        className="dashboard-main dashboard-grid-bg"
      >
        <div
          style={{
            marginLeft: '240px',
            padding: '2rem',
            minHeight: 'calc(100vh - 60px)',
          }}
          className="dashboard-content"
        >
          {children}

          <footer style={{
            marginTop: '3rem',
            padding: '1.5rem 0 0.5rem',
            borderTop: '1px solid var(--clr-border)',
            fontSize: '0.72rem',
            color: 'var(--clr-text-muted)',
            lineHeight: 1.6,
            textAlign: 'center',
            maxWidth: '800px',
            margin: '3rem auto 0',
          }}>
            <p style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--clr-warning)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ⚕ Medical Disclaimer
            </p>
            <p>
              SoleIQ is for investigational and wellness monitoring purposes only. Not FDA cleared for diagnosis or treatment.{' '}
              All recommendations are informational and do not constitute medical advice. Consult your healthcare provider{' '}
              before making any changes to your treatment plan. In case of emergency, call 911.
            </p>
          </footer>
        </div>
      </main>

      <style>{`
        @media (max-width: 767px) {
          .dashboard-content {
            margin-left: 0 !important;
            padding: 1rem !important;
            padding-bottom: 70px !important;
          }
        }
      `}</style>
    </div>
  );
}
