// Header Component
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';

const NavigationLink = ({ to, children }) => (
  <Link
    to={to}
    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 rounded-md hover:bg-gray-50"
  >
    {children}
  </Link>
);

const NAVIGATION_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/fasting-timer', label: 'Fasting Timer' },
  { to: '/yoga-exercises', label: 'Yoga Exercises' },
  { to: '/bmr-calculator', label: 'BMR Calculator' },
  { to: '/health-benefits', label: 'Health Benefits' },
  { to: '/Donation', label: 'Donate'}
];

const Navigation = ({ links }) => (
  <div className="hidden md:flex items-center space-x-8">
    {links.map(({ to, label }) => (
      <NavigationLink key={to} to={to}>
        {label}
      </NavigationLink>
    ))}
  </div>
);

const MobileMenu = ({ links, isOpen, toggleMenu }) => (
  <div className="md:hidden">
    <button
      onClick={toggleMenu}
      className="text-gray-600 hover:text-blue-600 focus:outline-none focus:text-blue-600"
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {isOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
    {isOpen && (
      <div className="absolute top-16 right-0 left-0 bg-white border-t border-gray-200 z-50">
        <div className="flex flex-col">
          {links.map(({ to, label }) => (
            <NavigationLink key={to} to={to}>
              {label}
            </NavigationLink>
          ))}
        </div>
      </div>
    )}
  </div>
);

const Header = () => {
  const { user, logout } = useAuth();
  const logoRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!logoRef.current) return;

    const logoAnimation = gsap.timeline({
      repeat: -1,
      repeatDelay: 10
    });

    logoAnimation
      .to(logoRef.current, {
        duration: 2,
        opacity: 0.7,
        scale: 1.05,
        ease: 'power2.inOut',
      })
      .to(logoRef.current, {
        duration: 2,
        opacity: 1,
        scale: 1,
        ease: 'power2.inOut',
      });

    return () => logoAnimation.kill();
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16 relative">
          {/* Logo */}
          <Link
            to="/"
            ref={logoRef}
            className="flex items-center text-2xl font-bold transition-all duration-300 hover:scale-105 mr-8"
          >
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Fast
            </span>
            <span className="text-green-600 mx-1">and</span>
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Yoga
            </span>
          </Link>

          {/* Navigation Links */}
          {user && (
            <div className="flex items-center flex-1 justify-end">
              <div className="flex items-center space-x-6 mr-6">
                <Navigation links={NAVIGATION_LINKS} />
              </div>
              
              {/* Mobile Menu */}
              <div className="md:hidden mr-4">
                <MobileMenu links={NAVIGATION_LINKS} isOpen={isMenuOpen} toggleMenu={toggleMenu} />
              </div>
              
              {/* Logout Button */}
              <button
                onClick={logout}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
