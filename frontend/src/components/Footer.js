import React from 'react';
import { Heart, Mail, Twitter, Github } from 'lucide-react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Company</h3>
            <div className="flex items-center text-gray-600">
              Made with <Heart className="h-4 w-4 mx-1 text-red-500" /> by Our Team
            </div>
            <p className="text-gray-600">
              Helping you achieve your health goals through mindful fasting
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Links</h3>
            <div className="flex flex-col space-y-2">
              <a href="/about" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="/blog" className="text-gray-600 hover:text-gray-900">Blog</a>
              <a href="/contact" className="text-gray-600 hover:text-gray-900">Contact</a>
              <a href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy Policy</a>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Connect</h3>
            <div className="flex space-x-4">
              <a href="mailto:contact@example.com" className="text-gray-600 hover:text-gray-900">
                <Mail className="h-6 w-6" />
              </a>
              <a href="https://twitter.com/example" className="text-gray-600 hover:text-gray-900">
                <Twitter className="h-6 w-6" />
              </a>
              <a href="https://github.com/example" className="text-gray-600 hover:text-gray-900">
                <Github className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-gray-600">
            © {currentYear} www.setica.in. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;