import React, { createContext, useContext, useState } from 'react';

export type ActiveSection = 'overview' | 'solemap' | 'analytics' | 'therapy' | 'alerts' | 'profile' | 'gear';

interface DashboardContextType {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  return (
    <DashboardContext.Provider
      value={{ activeSection, setActiveSection, sidebarCollapsed, setSidebarCollapsed }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextType {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
