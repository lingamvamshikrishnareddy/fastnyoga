import React, { Suspense } from 'react';
import { Routes, Route, Navigate, BrowserRouter as Router } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Import auth provider first for proper context setup
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layout Components
import Header from './components/Header';
import Footer from './components/Footer';

// Public pages
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import HealthBenefits from './pages/HealthBenefits';
import YogaExercises from './pages/YogaExercises';
import BMRCalculator from './components/BMRCalculator';

// Use lazy loading for components that depend on auth
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const FastingTimer = React.lazy(() => import('./pages/FastingTimer'));

const App = () => {
  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            
            <main className="flex-grow container mx-auto px-4 py-8">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/health-benefits" element={<HealthBenefits />} />
                <Route path="/bmr-calculator" element={<BMRCalculator />} />
                <Route path="/yoga-exercises" element={<YogaExercises />} />
                
                {/* Protected Routes with suspense for auth-dependent components */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={
                    <Suspense fallback={<div>Loading dashboard...</div>}>
                      <Dashboard />
                    </Suspense>
                  } />
                  <Route path="/fasting-timer" element={
                    <Suspense fallback={<div>Loading timer...</div>}>
                      <FastingTimer />
                    </Suspense>
                  } />
                </Route>
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            
            <Footer />
          </div>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
};

export default App;