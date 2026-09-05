import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function Layout() {
  const { user } = useAuth();

  // If a buyer / customer accesses internal app routes, immediately route them to their portal
  if (user?.role === 'CUSTOMER') {
    return <Navigate to="/portal/dashboard" replace />;
  }

  return (
    <div className="app-layout flex min-h-screen bg-cream text-navy font-sans antialiased">
      <Sidebar />
      <div className="main-content flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopNav />
        <div className="page-content flex-1 p-4 md:p-6 w-full max-w-[1700px] mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
