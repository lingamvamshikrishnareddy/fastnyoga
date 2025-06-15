import React from 'react';
import { Phone, Mail, MapPin, Instagram, Linkedin, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 text-gray-700 relative">
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white pointer-events-none"></div>
      
      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="group">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 transition-colors duration-300 group-hover:text-blue-600">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Fast
              </span>
              <span className="text-green-600">and</span>
              <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Yoga
              </span>
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed transition-colors duration-300 group-hover:text-gray-700 mb-4">
              Transform your health through the powerful combination of mindful fasting and yoga practice. A holistic approach to wellness.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              <a 
                href="https://www.instagram.com/setica.in/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 transition-all duration-300 hover:scale-110 group"
              >
                <Instagram className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors duration-300" />
              </a>
              <a 
                href="https://www.linkedin.com/company/setica" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 transition-all duration-300 hover:scale-110 group"
              >
                <Linkedin className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors duration-300" />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="/about-us" 
                  className="text-gray-600 hover:text-blue-600 transition-all duration-200 hover:translate-x-1 inline-block relative group"
                >
                  About Us
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
                </a>
              </li>
              <li>
                <a 
                  href="/fasting-timer" 
                  className="text-gray-600 hover:text-blue-600 transition-all duration-200 hover:translate-x-1 inline-block relative group"
                >
                  Fasting Timer
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
                </a>
              </li>
              <li>
                <a 
                  href="/yoga-exercises" 
                  className="text-gray-600 hover:text-blue-600 transition-all duration-200 hover:translate-x-1 inline-block relative group"
                >
                  Yoga Exercises
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
                </a>
              </li>
              <li>
                <a 
                  href="/health-benefits" 
                  className="text-gray-600 hover:text-blue-600 transition-all duration-200 hover:translate-x-1 inline-block relative group"
                >
                  Health Benefits
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
                </a>
              </li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 group">
                <Phone className="h-4 w-4 mt-1 text-gray-500 group-hover:text-blue-600 transition-colors duration-300" />
                <a 
                  href="tel:+918925311458" 
                  className="text-gray-600 hover:text-blue-600 transition-colors duration-300"
                >
                  +91 8925 311 458
                </a>
              </li>
              <li className="flex items-start gap-3 group">
                <Mail className="h-4 w-4 mt-1 text-gray-500 group-hover:text-blue-600 transition-colors duration-300" />
                <a 
                  href="mailto:lingamvamshikrishnareddy@proton.me" 
                  className="text-gray-600 hover:text-blue-600 transition-colors duration-300 break-all"
                >
                  lingamvamshikrishnareddy@proton.me
                </a>
              </li>
              <li className="flex items-start gap-3 group">
                <MapPin className="h-4 w-4 mt-1 text-gray-500 group-hover:text-blue-600 transition-colors duration-300" />
                <span className="text-gray-600 leading-relaxed">
                  2-7-1340/1, Vijayapal Colony-2,<br />
                  Hanamkonda, Warangal
                </span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-12 pt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-sm text-gray-600">Made with</span>
            <Heart className="h-4 w-4 text-red-500" />
            <span className="text-sm text-gray-600">by</span>
            <a 
              href="https://setica.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-300"
            >
              Setica
            </a>
          </div>
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} FastandYoga by Setica. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
