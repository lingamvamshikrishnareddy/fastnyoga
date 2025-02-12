import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';


import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Layout Components
import Header from './components/Header';
import Footer from './components/Footer';

// Public Pages
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import HealthBenefits from './pages/HealthBenefits';

// Protected Pages
import Dashboard from './pages/Dashboard';
import FastingTimer from './pages/FastingTimer'; // Moved from components to pages

import YogaExercises from './pages/YogaExercises';

// Components
import BMRCalculator from './components/BMRCalculator';


const App = () => {
  return (
    <HelmetProvider> {/* ✅ Wrap the app in HelmetProvider */}
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

              {/* Protected Routes */}
              <Route element={<PrivateRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/fasting-timer" element={<FastingTimer />} />
                <Route path="/yoga-exercises" element={<YogaExercises />} />
                <Route path="/bmr-calculator" element={<BMRCalculator />} />
                
              </Route>

              {/* Catch all route - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </AuthProvider>
    </HelmetProvider>
  );
};

export default App;
