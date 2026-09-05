import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function Layout() {
  return (
    <div className="app-layout flex min-h-screen bg-cream text-navy font-sans antialiased">
      <Sidebar />
      <div className="main-content flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopNav />
        <div className="page-content flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
