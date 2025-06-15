import React, { useState } from 'react';

const WellnessBenefits = () => {
  const [activeTab, setActiveTab] = useState('fasting');

  const fastingBenefits = [
    {
      title: "Weight Management & Fat Loss",
      description: "Promotes sustainable weight loss by reducing caloric intake and enhancing fat oxidation during fasting periods."
    },
    {
      title: "Enhanced Insulin Sensitivity",
      description: "Improves the body's ability to regulate blood sugar levels and reduces insulin resistance, potentially lowering diabetes risk."
    },
    {
      title: "Cellular Autophagy Activation",
      description: "Triggers the body's natural cellular cleanup process, removing damaged proteins and organelles for optimal cellular function."
    },
    {
      title: "Reduced Inflammation Markers",
      description: "Studies show decreased levels of inflammatory markers like CRP, IL-6, and TNF-alpha throughout the body."
    },
    {
      title: "Improved Brain Health & Cognition",
      description: "Enhances production of BDNF (brain-derived neurotrophic factor), supporting memory, learning, and neuroprotection."
    },
    {
      title: "Cardiovascular Health Enhancement",
      description: "May reduce blood pressure, improve cholesterol profiles, and decrease risk factors for heart disease."
    },
    {
      title: "Longevity & Anti-Aging Benefits",
      description: "Activates longevity pathways and may extend lifespan through improved cellular maintenance and stress resistance."
    },
    {
      title: "Enhanced Metabolic Flexibility",
      description: "Improves the body's ability to switch between burning glucose and fat for energy, optimizing metabolic efficiency."
    },
    {
      title: "Hormone Optimization",
      description: "Can improve growth hormone production, cortisol regulation, and enhance overall hormonal balance."
    },
    {
      title: "Mental Clarity & Focus",
      description: "Many practitioners report improved concentration, mental sharpness, and cognitive performance during fasting periods."
    },
    {
      title: "Digestive System Rest",
      description: "Allows the digestive system to rest and repair, potentially improving gut health and reducing digestive issues."
    },
    {
      title: "Cancer Risk Reduction",
      description: "Preliminary research suggests fasting may help reduce cancer risk through various cellular protective mechanisms."
    }
  ];

  const yogaBenefits = [
    {
      title: "Enhanced Flexibility & Mobility",
      description: "Regular practice gradually increases range of motion in joints and muscles, reducing stiffness and improving daily movement."
    },
    {
      title: "Stress Reduction & Anxiety Relief",
      description: "Activates the parasympathetic nervous system, reducing cortisol levels and promoting deep relaxation and mental calm."
    },
    {
      title: "Improved Strength & Balance",
      description: "Builds functional strength throughout the body while enhancing proprioception and balance through various poses and flows."
    },
    {
      title: "Better Sleep Quality",
      description: "Regular practice can improve sleep onset, duration, and quality through stress reduction and nervous system regulation."
    },
    {
      title: "Enhanced Respiratory Function",
      description: "Pranayama (breathing exercises) improves lung capacity, oxygen efficiency, and overall respiratory health."
    },
    {
      title: "Pain Management & Relief",
      description: "Can help alleviate chronic pain conditions including back pain, arthritis, and headaches through gentle movement and stretching."
    },
    {
      title: "Improved Posture & Spinal Health",
      description: "Strengthens core muscles and promotes spinal alignment, countering the effects of prolonged sitting and poor posture."
    },
    {
      title: "Mental Health & Emotional Well-being",
      description: "Regular practice can reduce symptoms of depression and anxiety while promoting emotional regulation and self-awareness."
    },
    {
      title: "Enhanced Mind-Body Connection",
      description: "Develops greater awareness of physical sensations, emotions, and thoughts, fostering mindfulness and presence."
    },
    {
      title: "Improved Circulation & Heart Health",
      description: "Gentle movements and inversions can improve blood flow, reduce blood pressure, and support cardiovascular health."
    },
    {
      title: "Boosted Immune System",
      description: "Regular practice may enhance immune function through stress reduction and improved lymphatic circulation."
    },
    {
      title: "Increased Energy & Vitality",
      description: "Many practitioners experience sustained energy levels and reduced fatigue through improved circulation and stress management."
    },
    {
      title: "Enhanced Concentration & Focus",
      description: "Meditation and mindful movement practices improve attention span, mental clarity, and cognitive function."
    },
    {
      title: "Social Connection & Community",
      description: "Group classes provide opportunities for social interaction and community building, supporting mental and emotional health."
    }
  ];

  const walkingBenefits = [
    {
      title: "Cardiovascular Fitness Improvement",
      description: "Regular walking strengthens the heart, improves circulation, and reduces risk of heart disease and stroke."
    },
    {
      title: "Weight Management & Calorie Burning",
      description: "Burns calories effectively, supports healthy weight maintenance, and can contribute to gradual, sustainable weight loss."
    },
    {
      title: "Bone Density & Joint Health",
      description: "Weight-bearing exercise that strengthens bones, reduces osteoporosis risk, and maintains joint mobility and flexibility."
    },
    {
      title: "Mental Health & Mood Enhancement",
      description: "Releases endorphins and other mood-boosting chemicals, reducing symptoms of depression and anxiety naturally."
    },
    {
      title: "Improved Muscle Strength & Endurance",
      description: "Strengthens leg muscles, core, and improves overall muscular endurance, especially with varied terrain and inclines."
    },
    {
      title: "Enhanced Immune System Function",
      description: "Moderate exercise like walking can boost immune system efficiency and reduce susceptibility to common illnesses."
    },
    {
      title: "Better Sleep Patterns",
      description: "Regular walking, especially in natural light, helps regulate circadian rhythms and improves sleep quality and duration."
    },
    {
      title: "Diabetes Prevention & Management",
      description: "Helps regulate blood sugar levels, improves insulin sensitivity, and reduces risk of type 2 diabetes."
    },
    {
      title: "Cognitive Function & Brain Health",
      description: "Increases blood flow to the brain, potentially reducing dementia risk and improving memory and cognitive performance."
    },
    {
      title: "Digestive Health Improvement",
      description: "Gentle movement aids digestion, reduces bloating, and can help maintain regular bowel movements."
    },
    {
      title: "Stress Reduction & Relaxation",
      description: "Provides time for mental decompression, reduces cortisol levels, and offers meditative benefits through rhythmic movement."
    },
    {
      title: "Increased Energy & Vitality",
      description: "Regular walking combats fatigue, increases overall energy levels, and improves physical stamina throughout the day."
    },
    {
      title: "Social Interaction Opportunities",
      description: "Walking with others or joining walking groups provides social benefits and accountability for maintaining the habit."
    },
    {
      title: "Low-Impact Exercise Benefits",
      description: "Gentle on joints while still providing significant health benefits, making it accessible for most fitness levels and ages."
    },
    {
      title: "Improved Longevity",
      description: "Studies consistently show that regular walking is associated with increased lifespan and healthier aging."
    }
  ];

  const tabData = {
    fasting: {
      title: "Intermittent Fasting",
      subtitle: "Ancient Practice, Modern Science",
      benefits: fastingBenefits,
      description: "Intermittent fasting involves cycling between periods of eating and fasting. This ancient practice has gained significant scientific attention for its potential health benefits.",
      warning: "Always consult with a healthcare professional before starting any fasting regimen, especially if you have underlying health conditions."
    },
    yoga: {
      title: "Yoga Practice",
      subtitle: "Unity of Mind, Body, and Spirit",
      benefits: yogaBenefits,
      description: "Yoga is an ancient practice that combines physical postures, breathing techniques, and meditation to promote overall well-being and harmony.",
      warning: "Start slowly and listen to your body. Consider working with a qualified instructor, especially when beginning your practice."
    },
    walking: {
      title: "Regular Walking",
      subtitle: "Simple Steps to Better Health",
      benefits: walkingBenefits,
      description: "Walking is one of the most accessible and beneficial forms of exercise, suitable for people of all ages and fitness levels.",
      warning: "Start with comfortable distances and gradually increase. Wear appropriate footwear and stay hydrated during longer walks."
    }
  };

  const currentData = tabData[activeTab];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Complete Wellness Guide
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover the science-backed benefits of three powerful wellness practices that can transform your health and well-being
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center mb-8 bg-white rounded-2xl p-2 shadow-lg">
          {Object.entries(tabData).map(([key, data]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-6 py-3 mx-1 my-1 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === key
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {data.title}
            </button>
          ))}
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header for current tab */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
            <h2 className="text-4xl font-bold mb-2">{currentData.title}</h2>
            <p className="text-xl opacity-90 mb-4">{currentData.subtitle}</p>
            <p className="text-lg opacity-80 leading-relaxed">{currentData.description}</p>
          </div>

          {/* Benefits Grid */}
          <div className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Health Benefits & Advantages
            </h3>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {currentData.benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="group p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105 border border-gray-100"
                >
                  <div className="flex items-start mb-3">
                    <div className="flex-shrink-0 w-3 h-3 mt-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mr-3" />
                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {benefit.title}
                    </h4>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Important Notice */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-6 rounded-lg shadow-md">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 mt-1 mr-3">
                  <svg className="text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-2">Important Notice:</h4>
                  <p className="text-yellow-800 leading-relaxed">
                    {currentData.warning}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
              <h4 className="font-semibold text-gray-900 mb-3">Getting Started:</h4>
              <div className="text-gray-700 leading-relaxed">
                {activeTab === 'fasting' && (
                  <p>Begin with shorter fasting windows (12-14 hours) and gradually extend as your body adapts. Popular methods include 16:8 (16 hours fasting, 8 hours eating) or 5:2 (normal eating 5 days, restricted calories 2 days).</p>
                )}
                {activeTab === 'yoga' && (
                  <p>Start with beginner-friendly classes or online videos. Focus on proper alignment over advanced poses. Even 10-15 minutes daily can provide significant benefits. Consider different styles like Hatha, Vinyasa, or Restorative yoga.</p>
                )}
                {activeTab === 'walking' && (
                  <p>Aim for at least 150 minutes of moderate walking per week, as recommended by health organizations. Start with 10-15 minute walks and gradually increase duration and pace. Track your steps and set achievable daily goals.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-8 p-6 bg-white rounded-2xl shadow-lg">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Ready to Transform Your Health?
          </h3>
          <p className="text-gray-600 mb-4">
            Combining these three practices can create a powerful synergy for optimal health and well-being.
          </p>
          <p className="text-sm text-gray-500">
            Remember: Consistency is key. Start small, be patient with yourself, and celebrate every step forward on your wellness journey.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WellnessBenefits;