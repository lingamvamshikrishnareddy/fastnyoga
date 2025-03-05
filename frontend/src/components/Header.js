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
];

const Navigation = ({ links }) => (
  <div className="hidden md:flex items-center space-x-1">
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
      <div className="absolute top-16 right-0 left-0 bg-white border-t border-gray-200">
        {links.map(({ to, label }) => (
          <NavigationLink key={to} to={to}>
            {label}
          </NavigationLink>
        ))}
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
        scale: 1.2,
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
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16 relative">
          {/* Logo */}
          <Link
            to="/"
            ref={logoRef}
            className="flex items-center text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors duration-200"
          >
            Fastinjoy
          </Link>

          {/* Navigation Links */}
          {user && (
            <div className="flex items-center gap-2">
              <Navigation links={NAVIGATION_LINKS} />
              <MobileMenu links={NAVIGATION_LINKS} isOpen={isMenuOpen} toggleMenu={toggleMenu} />

              {/* Logout Button */}
              <button
                onClick={logout}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
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