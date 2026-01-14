import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Layout/Navbar';
import './App.css';
import React, { Suspense, lazy } from 'react';

// Lazy Load Pages
const FormList = lazy(() => import('./pages/FormList'));
const FormEditor = lazy(() => import('./pages/FormEditor'));
const FormViewer = lazy(() => import('./pages/FormViewer'));
const FormResults = lazy(() => import('./pages/FormResults'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const UserList = lazy(() => import('./pages/admin/UserList'));
const RoleList = lazy(() => import('./pages/admin/RoleList'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user || (!user.is_platform_admin && !user.is_superuser)) return <Navigate to="/" replace />;
  return children;
};

// Layout wrapper to conditionally hide Navbar on public viewer
const Layout = ({ children }) => {
  const location = useLocation();
  // Hide navbar only on public form viewer (exact match /forms/:id or /forms/:slug, but not /results)
  // Updated regex to handle non-numeric slugs if needed
  const isPublicViewer = /^\/forms\/[^/]+$/.test(location.pathname);

  return (
    <div className="App" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isPublicViewer && <Navbar />}

      <main className="main-content" style={{ flexGrow: 1 }}>
        {children}
      </main>

      {!isPublicViewer && (
        <footer className="main-footer" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          <div className="container">
            <p>&copy; 2026 eForms - Intelligent Forms Management</p>
          </div>
        </footer>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Suspense fallback={<div className="loading-screen">Loading Application...</div>}>
            <Routes>
              <Route path="/" element={<FormList />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forms/:id" element={<FormViewer />} />
              {/* Admin Routes */}
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <UserList />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <AdminRoute>
                    <RoleList />
                  </AdminRoute>
                }
              />
              <Route
                path="/forms/:id/results"
                element={
                  <ProtectedRoute>
                    <FormResults />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/new"
                element={
                  <ProtectedRoute>
                    <FormEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit/:id"
                element={
                  <ProtectedRoute>
                    <FormEditor />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
