import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Sun, Users, Book } from 'lucide-react';
import AuthModal from './AuthModal';

// Constants remain the same
const FEATURES = [
  {
    icon: <Sun className="w-8 h-8" />,
    title: "Personalized Fasting Plans",
    description: "AI-powered fasting protocols tailored to your unique body type and lifestyle"
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: "Guided Yoga Sessions",
    description: "Expert-led yoga practices for all skill levels, from beginners to advanced"
  },
  {
    icon: <Book className="w-8 h-8" />,
    title: "Nutritional Guidance",
    description: "Customized meal plans and expert nutrition advice to support your wellness journey"
  }
];

const STEPS = [
  { number: "01", title: "Sign Up", description: "Create your account and tell us about your wellness aspirations" },
  { number: "02", title: "Get Your Plan", description: "Receive a personalized fasting and wellness plan tailored just for you" },
  { number: "03", title: "Track Progress", description: "Log your activities and monitor your improvements with our intuitive tools" },
  { number: "04", title: "Achieve Results", description: "Reach your wellness goals with our ongoing support and community" }
];

const FAQS = [
  {
    question: "What is intermittent fasting?",
    answer: "Intermittent fasting is an eating pattern that cycles between periods of fasting and eating, promoting various health benefits."
  },
  {
    question: "Is yoga suitable for beginners?",
    answer: "Absolutely! Our yoga programs cater to all levels, including complete beginners, ensuring a safe and enjoyable experience."
  },
  {
    question: "How often should I practice yoga?",
    answer: "We recommend starting with 2-3 sessions per week and increasing frequency as you progress."
  },
  {
    question: "Can I customize my fasting schedule?",
    answer: "Yes! Our app allows you to customize your fasting schedule based on your lifestyle and goals."
  }
];

const HomePage = () => {
  const [activeFaqIndex, setActiveFaqIndex] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState({ isOpen: false, type: null });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleAuthSuccess = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setShowModal({ isOpen: false, type: null });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthModal
        isOpen={showModal.isOpen}
        type={showModal.type}
        onClose={() => setShowModal({ isOpen: false, type: null })}
        onSuccess={handleAuthSuccess}
      />
      
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-500 to-blue-600">
        <div className="max-w-6xl mx-auto text-center text-white">
          <h1 className="text-5xl font-bold mb-6">Welcome to Fastinjoy</h1>
          <p className="text-xl mb-8">Your personal fasting, yoga, and wellness companion</p>
          <div className="space-x-4">
            {isAuthenticated ? (
              <button onClick={handleLogout} className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                Logout
              </button>
            ) : (
              <>
                <Link to="/login" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                  Login
                </Link>
                <Link to="/register" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Transform Your Life With Our Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-blue-500 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 px-4 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((step, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-3xl font-bold text-blue-500 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow">
                <button 
                  className="w-full px-6 py-4 text-left font-semibold flex justify-between items-center"
                  onClick={() => setActiveFaqIndex(activeFaqIndex === index ? null : index)}
                >
                  {faq.question}
                  <ChevronDown className={`transform transition-transform ${activeFaqIndex === index ? 'rotate-180' : ''}`} />
                </button>
                {activeFaqIndex === index && (
                  <div className="px-6 py-4 text-gray-600 border-t">{faq.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-500 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Start Your Wellness Journey Today</h2>
          <p className="text-xl mb-8">Join thousands of satisfied users and transform your life with Fastinjoy</p>
          {!isAuthenticated && (
            <Link to="/register" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Get Started Now
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">About Us</h3>
            <p className="text-gray-600">Fastinjoy is your comprehensive wellness platform, combining the power of intermittent fasting, yoga, and mindful nutrition.</p>
          </div>
          <p className="text-center text-gray-500">&copy; {new Date().getFullYear()} Fastinjoy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;