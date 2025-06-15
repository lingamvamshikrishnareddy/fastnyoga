import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Server, Code, Coffee, Gift, DollarSign } from 'lucide-react';

const Donation = () => {
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const navigate = useNavigate();

  const predefinedAmounts = [10, 50, 100, 500, 1000, 5000];

  const handleDonate = () => {
    const amount = customAmount ? parseInt(customAmount) : selectedAmount;
    if (amount >= 10) {
      // Navigate to payment page with the selected amount
      navigate('/payment', { state: { donationAmount: amount } });
    }
  };

  const currentAmount = customAmount ? parseInt(customAmount) : selectedAmount;

  return (
    <div className="min-h-screen bg-white">
      {/* Donation Section */}
      <section className="py-20 bg-gradient-to-br from-orange-50 to-red-100">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Support Our Ad-Free Mission 🚀
              </h2>
              <p className="text-xl text-gray-700 mb-4">
                Help us keep SetCart running without ads - forever!
              </p>
              <p className="text-lg text-gray-600">
                Your donation covers development, server costs, and the skills that make this possible.
                <br />
                <span className="font-semibold text-orange-600">
                  Think of it as the cost of a Lays packet (₹10) for a lifetime of ad-free experience!
                </span>
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* What Your Donation Covers */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">What Your Support Covers</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Server className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Server & Infrastructure</h4>
                        <p className="text-gray-600">Keeping our platform fast and reliable 24/7</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Code className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Development & Features</h4>
                        <p className="text-gray-600">Continuous improvements and new features</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Coffee className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Developer Skills & Time</h4>
                        <p className="text-gray-600">Talented developers working to improve your experience</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Heart className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Ad-Free Forever Promise</h4>
                        <p className="text-gray-600">Your support helps us say NO to ads permanently</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Donation Form */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Support Level</h3>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Amount (₹)
                    </label>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {predefinedAmounts.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => {
                            setSelectedAmount(amount);
                            setCustomAmount('');
                          }}
                          className={`p-3 rounded-lg border-2 font-semibold transition-all duration-200 ${
                            selectedAmount === amount && !customAmount
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-200 hover:border-orange-300 text-gray-700'
                          }`}
                        >
                          ₹{amount}
                        </button>
                      ))}
                    </div>
                    
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Custom amount (₹10 minimum)"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setSelectedAmount(0);
                        }}
                        min="10"
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
                      />
                      <DollarSign className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-5 w-5 text-orange-600" />
                      <span className="font-semibold text-orange-800">Lifetime Membership Benefits</span>
                    </div>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Ad-free experience forever</li>
                      <li>• Priority customer support</li>
                      <li>• Early access to new features</li>
                      <li>• Supporter badge on your profile</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleDonate}
                    disabled={currentAmount < 10}
                    className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300 transform shadow-lg ${
                      currentAmount >= 10
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 hover:scale-105'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Support Us - ₹{currentAmount || 0}
                  </button>
                  
                  <p className="text-xs text-gray-500 text-center mt-4">
                    Secure payment • One-time contribution • Lifetime benefits
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <p className="text-lg text-gray-600">
                <span className="font-semibold">Why we need your support:</span> We believe in customer experience over ad revenue.
                <br />
                Your small contribution helps us maintain this principle forever.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Donation;