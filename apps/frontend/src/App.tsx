import { Capacitor } from '@capacitor/core';
import { Suspense, lazy, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, HashRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import './App.css';
import { NativeDebugPanel } from './components/NativeDebugPanel';
import { FixedNavigation } from './components/FixedNavigation';

const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })),
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })),
);
const InventoryManagementPage = lazy(() =>
  import('./pages/InventoryManagementPage').then((module) => ({ default: module.InventoryManagementPage })),
);
const AddInventoryPage = lazy(() =>
  import('./pages/AddInventoryPage').then((module) => ({ default: module.AddInventoryPage })),
);
const SuppliersPage = lazy(() =>
  import('./pages/SuppliersPage').then((module) => ({ default: module.SuppliersPage })),
);
const PurchaseOrdersPage = lazy(() =>
  import('./pages/PurchaseOrdersPage').then((module) => ({ default: module.PurchaseOrdersPage })),
);
const GRNPage = lazy(() =>
  import('./pages/GRNPage').then((module) => ({ default: module.GRNPage })),
);
const CustomersPage = lazy(() =>
  import('./pages/CustomersPage').then((module) => ({ default: module.CustomersPage })),
);
const ReturnsPage = lazy(() =>
  import('./pages/ReturnsPage').then((module) => ({ default: module.ReturnsPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);
const SuperAdminPage = lazy(() =>
  import('./pages/SuperAdminPage').then((module) => ({ default: module.SuperAdminPage })),
);
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const GetAppPage = lazy(() => import('./pages/GetAppPage').then((module) => ({ default: module.GetAppPage })));
const ExecutiveDashboardPage = lazy(() =>
  import('./pages/ExecutiveDashboardPage').then((module) => ({ default: module.ExecutiveDashboardPage })),
);

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-xs font-semibold uppercase tracking-[0.6em] text-slate-400">
      Loading
    </div>
  );
}

function App() {
  const { isAuthenticated, user } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
  }));
  const theme = useThemeStore((state) => state.theme);
  const isAdmin = user?.role === 'admin';
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin);
  const isCompanyUser = isAuthenticated && !isPlatformAdmin;
  const authenticatedLandingPath = isPlatformAdmin ? '/superadmin' : '/dashboard';
  const isElectron =
    typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
  const isNativePlatform = isElectron || Capacitor.getPlatform() !== 'web';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  const Router = useMemo(() => {
    if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')) {
      return HashRouter;
    }
    return BrowserRouter;
  }, []);

  return (
    <Router>
      <div className="app">
        <FixedNavigation />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to={authenticatedLandingPath} replace />
                ) : isNativePlatform ? (
                  <Navigate to="/login" replace />
                ) : (
                  <HomePage />
                )
              }
            />
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to={authenticatedLandingPath} replace /> : <LoginPage />}
            />
            <Route
              path="/:tenantSlug/login"
              element={isAuthenticated ? <Navigate to={authenticatedLandingPath} replace /> : <LoginPage />}
            />
            <Route
              path="/get-app"
              element={<GetAppPage />}
            />
            <Route
              path="/checkout"
              element={
                isCompanyUser ? (
                  <CheckoutPage />
                ) : isPlatformAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                isCompanyUser ? (
                  <ExecutiveDashboardPage />
                ) : isPlatformAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/reports"
              element={
                isCompanyUser ? (
                  <ReportsPage />
                ) : isPlatformAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/inventory"
              element={
                isCompanyUser ? (
                  <AddInventoryPage />
                ) : isPlatformAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/inventory-management"
              element={
                isCompanyUser ? (
                  <InventoryManagementPage />
                ) : isPlatformAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/suppliers"
              element={
                isCompanyUser ? (
                  <SuppliersPage />
                ) : isPlatformAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/purchase-orders"
              element={
                isCompanyUser ? (
                  <PurchaseOrdersPage />
                ) : isPlatformAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/grn"
              element={
                isCompanyUser ? (
                  <GRNPage />
                ) : isPlatformAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/customers"
              element={
                isCompanyUser ? (
                  <CustomersPage />
                ) : isPlatformAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/returns"
              element={
                isCompanyUser ? (
                  <ReturnsPage />
                ) : isPlatformAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/settings"
              element={
                isCompanyUser && isAdmin ? (
                  <SettingsPage />
                ) : isPlatformAdmin ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/superadmin"
              element={
                isAuthenticated && isPlatformAdmin ? (
                  <Navigate to="/superadmin/dashboard" replace />
                ) : (
                  <Navigate to="/superadmin/login" replace />
                )
              }
            />
            <Route
              path="/superadmin/login"
              element={
                isAuthenticated && isPlatformAdmin ? (
                  <Navigate to="/superadmin/dashboard" replace />
                ) : (
                  <LoginPage variant="superadmin" />
                )
              }
            />
            <Route
              path="/superadmin/dashboard"
              element={
                isAuthenticated && isPlatformAdmin ? <SuperAdminPage /> : <Navigate to="/superadmin/login" replace />
              }
            />
            <Route
              path="/admin"
              element={
                isAuthenticated && isPlatformAdmin ? (
                  <Navigate to="/superadmin/dashboard" replace />
                ) : (
                  <Navigate to="/superadmin/login" replace />
                )
              }
            />
            <Route
              path="/admin/tenants"
              element={
                isAuthenticated && isPlatformAdmin ? (
                  <Navigate to="/superadmin/dashboard" replace />
                ) : (
                  <Navigate to="/superadmin/login" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" />
        <NativeDebugPanel />
      </div>
    </Router>
  );
}

export default App;
