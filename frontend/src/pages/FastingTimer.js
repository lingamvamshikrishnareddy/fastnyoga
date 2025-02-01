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
        <title>Fasting Timer</title>
      </Helmet>
      <FastingTimer />
    </>
  );
};

export default FastingTimerPage;