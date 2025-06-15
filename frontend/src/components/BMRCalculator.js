import React, { useState } from 'react';
import { Calculator, Activity, TrendingUp, Clock } from 'lucide-react';

const BMRCalculator = () => {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('male');
  const [bmr, setBMR] = useState(null);
  const [walkingData, setWalkingData] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateWalkingMetrics = (age, weight, height, gender) => {
    // Calculate stride length based on height and gender
    const strideLength = gender === 'male' 
      ? height * 0.415 // cm to cm
      : height * 0.413; // cm to cm
    
    // Convert stride length to meters
    const strideLengthM = strideLength / 100;
    
    // Age-based fitness factor (younger people can typically walk more)
    let ageFactor = 1.0;
    if (age < 30) ageFactor = 1.2;
    else if (age < 50) ageFactor = 1.0;
    else if (age < 65) ageFactor = 0.85;
    else ageFactor = 0.7;
    
    // Weight-based factor (optimal weight range performs better)
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    let weightFactor = 1.0;
    if (bmi < 18.5) weightFactor = 0.8;
    else if (bmi <= 24.9) weightFactor = 1.0;
    else if (bmi <= 29.9) weightFactor = 0.85;
    else weightFactor = 0.7;
    
    // Base daily walking capacity (steps)
    const baseSteps = 8000;
    const adjustedSteps = Math.round(baseSteps * ageFactor * weightFactor);
    
    // Calculate distances
    const dailyDistanceM = adjustedSteps * strideLengthM;
    const dailyDistanceKm = dailyDistanceM / 1000;
    const dailyDistanceMiles = dailyDistanceKm * 0.621371;
    
    // Weekly totals
    const weeklySteps = adjustedSteps * 7;
    const weeklyDistanceKm = dailyDistanceKm * 7;
    const weeklyDistanceMiles = dailyDistanceMiles * 7;
    
    // Calories burned per step (rough estimate based on weight)
    const caloriesPerStep = weight * 0.00005; // Approximation
    const dailyCaloriesBurned = Math.round(adjustedSteps * caloriesPerStep);
    const weeklyCaloriesBurned = dailyCaloriesBurned * 7;
    
    return {
      dailySteps: adjustedSteps,
      weeklySteps,
      dailyDistanceKm: Math.round(dailyDistanceKm * 100) / 100,
      dailyDistanceMiles: Math.round(dailyDistanceMiles * 100) / 100,
      weeklyDistanceKm: Math.round(weeklyDistanceKm * 100) / 100,
      weeklyDistanceMiles: Math.round(weeklyDistanceMiles * 100) / 100,
      dailyCaloriesBurned,
      weeklyCaloriesBurned,
      strideLength: Math.round(strideLength),
    };
  };

  const handleCalculate = () => {
    if (!age || !weight || !height) return;
    
    setLoading(true);

    setTimeout(() => {
      // BMR Calculation using Harris-Benedict Equation
      let bmrResult;
      if (gender === 'male') {
        bmrResult = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
      } else {
        bmrResult = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
      }
      
      // Walking calculations
      const walkingMetrics = calculateWalkingMetrics(
        parseInt(age), 
        parseFloat(weight), 
        parseFloat(height), 
        gender
      );
      
      setBMR(Math.round(bmrResult));
      setWalkingData(walkingMetrics);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <Calculator className="h-8 w-8 mr-3" />
              <h2 className="text-3xl font-bold">BMR & Walking Calculator</h2>
            </div>
            <p className="text-center text-green-100 max-w-2xl mx-auto">
              Calculate your Basal Metabolic Rate and discover your personalized walking recommendations for optimal health
            </p>
          </div>
          
          <div className="p-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter your age"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    min="0"
                    max="120"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Enter your weight"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    min="0"
                    max="300"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="Enter your height"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    min="0"
                    max="300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleCalculate}
                disabled={loading || !age || !weight || !height}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-6 rounded-xl font-medium hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all disabled:opacity-50 transform hover:scale-105"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </div>
                ) : (
                  'Calculate BMR & Walking Plan'
                )}
              </button>
            </div>

            {bmr && walkingData && (
              <div className="mt-10 space-y-6">
                {/* BMR Results */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-100">
                  <div className="flex items-center mb-4">
                    <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      Your Basal Metabolic Rate
                    </h3>
                  </div>
                  <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                    {bmr} calories/day
                  </div>
                  <p className="text-sm text-gray-600">
                    This is the number of calories your body burns at rest to maintain basic life functions.
                  </p>
                </div>

                {/* Walking Recommendations */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-2xl border border-green-100">
                  <div className="flex items-center mb-6">
                    <Activity className="h-6 w-6 text-green-600 mr-2" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      Personalized Walking Plan
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="text-2xl font-bold text-green-600">{walkingData.dailySteps.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Daily Steps</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="text-2xl font-bold text-blue-600">{walkingData.dailyDistanceKm} km</div>
                      <div className="text-sm text-gray-600">Daily Distance</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="text-2xl font-bold text-purple-600">{walkingData.dailyCaloriesBurned}</div>
                      <div className="text-sm text-gray-600">Calories Burned</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Daily Targets</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• Steps: {walkingData.dailySteps.toLocaleString()}</li>
                        <li>• Distance: {walkingData.dailyDistanceKm} km ({walkingData.dailyDistanceMiles} miles)</li>
                        <li>• Calories: {walkingData.dailyCaloriesBurned}</li>
                        <li>• Your stride: {walkingData.strideLength} cm</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Weekly Goals</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• Steps: {walkingData.weeklySteps.toLocaleString()}</li>
                        <li>• Distance: {walkingData.weeklyDistanceKm} km ({walkingData.weeklyDistanceMiles} miles)</li>
                        <li>• Calories: {walkingData.weeklyCaloriesBurned.toLocaleString()}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Educational Note */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-100">
                  <div className="flex items-start">
                    <Clock className="h-6 w-6 text-amber-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Why Not Just 10,000 Steps?</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        The "10,000 steps" rule is a marketing myth! Your optimal step count depends on your age, weight, height, and fitness level. 
                        This personalized calculation considers your body composition and physical capabilities to recommend a more effective walking routine 
                        that's tailored specifically for you.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BMRCalculator;