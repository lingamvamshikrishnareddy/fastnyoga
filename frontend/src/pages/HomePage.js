import React from 'react';
import HomePageComponent from '../components/HomePage';
import { Helmet } from "react-helmet-async"; // ✅ Import Helmet correctly

const HomePage = () => {
  return (
    <>
      <Helmet>
        <title>Fastinjoy - Your Wellness Journey Begins Here</title>
        <meta 
          name="description" 
          content="Transform your life with Fastinjoy's personalized fasting plans, guided yoga sessions, and nutritional guidance."
        />
      </Helmet>
      <HomePageComponent />
    </>
  );
};

export default HomePage;
