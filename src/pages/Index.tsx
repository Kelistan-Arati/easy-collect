import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/Header';
import AppSidebar from '@/components/AppSidebar';
import Dashboard from '@/components/Dashboard';
import BorrowerManager from '@/components/BorrowerManager';
import LoanManager from '@/components/LoanManager';
import Reports from '@/components/Reports';
import Settings from '@/components/Settings';
import { getBorrowers, getLoans, getDashboardStats } from '@/lib/database';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  // All hooks must be defined before any return
  const { user, loading } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [language, setLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const queryClient = useQueryClient();

  const { data: borrowers = [], isLoading: borrowersLoading, error: borrowersError } = useQuery({
    queryKey: ['borrowers'],
    queryFn: getBorrowers,
    enabled: !!user && !loading
  });

  const { data: loans = [], isLoading: loansLoading, error: loansError } = useQuery({
    queryKey: ['loans'],
    queryFn: getLoans,
    enabled: !!user && !loading
  });

  const { data: dashboardStats, error: dashboardError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    enabled: !!user && !loading
  });

  useEffect(() => {
    if (borrowersError) {
      console.error('Error loading borrowers:', borrowersError);
      toast({
        title: 'Error loading borrowers',
        description: 'Please check your connection and try again.',
        variant: 'destructive'
      });
    }
  }, [borrowersError]);

  useEffect(() => {
    if (loansError) {
      console.error('Error loading loans:', loansError);
      toast({
        title: 'Error loading loans',
        description: 'Please check your connection and try again.',
        variant: 'destructive'
      });
    }
  }, [loansError]);

  useEffect(() => {
    if (dashboardError) {
      console.error('Error loading dashboard stats:', dashboardError);
    }
  }, [dashboardError]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['borrowers'] });
    queryClient.invalidateQueries({ queryKey: ['loans'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const renderContent = () => {
    if (borrowersLoading || loansLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard language={language} borrowers={borrowers} loans={loans} dashboardStats={dashboardStats} />;
      case 'borrowers':
        return <BorrowerManager language={language} borrowers={borrowers} onDataChange={refreshData} />;
      case 'loans':
        return <LoanManager language={language} loans={loans} borrowers={borrowers} onDataChange={refreshData} />;
      case 'reports':
        return <Reports language={language} borrowers={borrowers} loans={loans} />;
      case 'settings':
        return <Settings language={language} setLanguage={setLanguage} />;
      default:
        return <Dashboard language={language} borrowers={borrowers} loans={loans} dashboardStats={dashboardStats} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 w-full flex">
      <div className={cn('flex-1 flex flex-col w-full transition-all duration-300')}>
        <Header
          isDark={isDark}
          setIsDark={setIsDark}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
        <main className="flex-1 transition-colors duration-200 overflow-auto pt-16 pb-20 md:pb-4">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default Index;
