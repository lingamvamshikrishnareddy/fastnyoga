import React, { Suspense } from 'react';
import { Routes, Route, Navigate, BrowserRouter as Router } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Import providers first for proper context setup
import { AuthProvider } from './context/AuthContext';
import { FastingProvider } from './context/FastingContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import the API service
import { fasts } from './utils/api';

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
import AboutUs from './pages/Aboutus';
import Donation from './pages/Donation';
import Payment from './pages/Payment';

// Auth-dependent components
import FastingTimer from './components/FastingTimer';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

const App = () => {
  return (
    <HelmetProvider>
      <Router>
        {/* AuthProvider wraps everything that needs authentication */}
        <AuthProvider>
          {/* FastingProvider wraps all routes for persistent timer state */}
          <FastingProvider apiService={fasts}>
            <div className="min-h-screen flex flex-col">
              <Header />
              
              <main className="flex-grow">
                <Routes>
                  {/* --- Public Routes --- */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/health-benefits" element={<HealthBenefits />} />
                  <Route path="/bmr-calculator" element={<BMRCalculator />} />
                  <Route path="/yoga-exercises" element={<YogaExercises />} />
                  <Route path="/about-us" element={<AboutUs />} />
                  
                  {/* --- Donation Routes --- */}
                  <Route path="/donation" element={<Donation />} />
                  <Route path="/payment" element={<Payment />} />
                  
                  {/* --- Protected Routes --- */}
                  {/* These routes will only be accessible if the user is logged in */}
                  <Route element={<ProtectedRoute />}>
                    <Route
                      path="/dashboard"
                      element={
                        <Suspense fallback={
                          <div className="flex justify-center items-center min-h-screen">
                            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
                          </div>
                        }>
                          <Dashboard />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/fasting-timer"
                      element={<FastingTimer />}
                    />
                  </Route>
                  
                  {/* --- Fallback Route --- */}
                  {/* Any other path will redirect to the home page */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              
              <Footer />
            </div>
          </FastingProvider>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
};

export default App;