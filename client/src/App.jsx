import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import WorkspacePage from './pages/WorkspacePage';
import PipelinePage from './pages/PipelinePage';
import ApprovalPage from './pages/ApprovalPage';
import WarehousePage from './pages/WarehousePage';
import BillingPage from './pages/BillingPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import ReportsPage from './pages/ReportsPage';
import FinanceDealsPage from './pages/FinanceDealsPage';

// Portal imports
import PortalQuotePage from './pages/portal/PortalQuotePage';
import PortalLayout from './components/portal/PortalLayout';
import PortalDashboard from './pages/portal/PortalDashboard';
import PortalNewRequirement from './pages/portal/PortalNewRequirement';
import PortalRequirementDetail from './pages/portal/PortalRequirementDetail';

import LandingPage from './pages/LandingPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /><p>Loading...</p></div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PortalProtectedRoute({ children }) {
  const token = localStorage.getItem('df360_portal_token');
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* 1. Public Landing Page at root */}
      <Route path="/" element={<LandingPage />} />

      {/* 2. Authentication Pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* 3. Internal Workspace — protected, with sidebar layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/approvals" element={<ApprovalPage />} />
        <Route path="/warehouse" element={<WarehousePage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/finance/deals" element={<FinanceDealsPage />} />
      </Route>

      {/* 4. Customer Portal — separate layout, separate auth */}
      <Route path="/portal/login" element={<Navigate to="/" replace />} />
      <Route path="/portal/quotation/:id" element={<PortalQuotePage />} />
      <Route path="/portal/quote/:token" element={<PortalQuotePage />} />
      <Route element={<PortalProtectedRoute><PortalLayout /></PortalProtectedRoute>}>
        <Route path="/portal/dashboard" element={<PortalDashboard />} />
        <Route path="/portal/new-requirement" element={<PortalNewRequirement />} />
        <Route path="/portal/requirement/:id" element={<PortalRequirementDetail />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
