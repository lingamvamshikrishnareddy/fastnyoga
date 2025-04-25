import React from 'react';
import FastingTimer from '../components/FastingTimer';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const FastingTimerPage = () => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', {
        state: {
          redirect: '/fasting-timer',
          message: 'Please login to access the fasting timer'
        }
      });
    }
  }, [navigate]);
  
  return (
    <>
      <Helmet>
        <title>Fasting Timer | Track Your Intermittent Fasting</title>
        <meta name="description" content="Track and manage your intermittent fasting schedule with our easy-to-use timer." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fasting Timer</h1>
          <p className="text-gray-600 mt-2">
            Track your intermittent fasting progress and stay motivated.
          </p>
        </div>
        
        <FastingTimer />
        
        <div className="mt-12 bg-blue-50 p-6 rounded-xl">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Fasting Benefits</h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="inline-block bg-blue-100 rounded-full p-1 mr-3 mt-1">
                <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <span>Improved metabolic health and insulin sensitivity</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block bg-blue-100 rounded-full p-1 mr-3 mt-1">
                <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <span>Cellular repair through autophagy</span>
            </li>
            <li className="flex items-start">
              <span className="inline-block bg-blue-100 rounded-full p-1 mr-3 mt-1">
                <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <span>Reduced inflammation and oxidative stress</span>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default FastingTimerPage;