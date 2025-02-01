import React from 'react';

const HealthBenefits = () => {
  const benefits = [
    "May assist with weight management",
    "Potential improvements in insulin sensitivity",
    "Possible reduction in inflammation",
    "May support brain health",
    "May improve heart health",
    "Could promote longevity",
    "May enhance metabolic flexibility",
    "Can improve cellular repair processes (autophagy)",
    "May reduce oxidative stress",
    "Can support healthy aging",
    "May help with blood sugar control",
    "Might enhance hormone balance",
    "May improve mental clarity and concentration",
    "Can support gut health",
    "May contribute to reduced risk of chronic diseases",
    "May help reduce bad cholesterol levels",
    "Can improve mood and mental well-being",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 text-center mb-8">
            Potential Health Benefits of Fasting
          </h1>
          
          <p className="text-lg text-gray-700 mb-8 text-center">
            Research suggests that intermittent fasting may offer several health benefits:
          </p>

          <div className="grid gap-4 md:grid-cols-2 mb-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-start p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full mr-3" />
                <p className="text-gray-700">{benefit}</p>
              </div>
            ))}
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <p className="text-yellow-700">
              Remember to consult with a healthcare professional before starting any new fasting regimen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthBenefits;