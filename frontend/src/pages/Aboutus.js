import React, { useState } from 'react';
import { Zap, Heart, Users, Target, Truck, Shield, Coffee, Code, Server, Gift, Star, DollarSign } from 'lucide-react';

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              We're Young, Nimble & 
              <span className="text-blue-600"> Lightning Fast</span>
            </h1>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              A Setica startup that puts customers first, built on transparency, speed, and win-win relationships for everyone in our ecosystem.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                <span className="text-blue-600 font-semibold">No Dark Patterns</span>
              </div>
              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                <span className="text-green-600 font-semibold">100% Transparent</span>
              </div>
              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                <span className="text-purple-600 font-semibold">Customer First</span>
              </div>
              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                <span className="text-red-600 font-semibold">Ad-Free Forever</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                We're building the future of healthy products with a purpose-driven approach, 
                focusing on creating value for everyone in our ecosystem - completely ad-free.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">What Makes Us Different</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Lightning Fast Delivery</h4>
                      <p className="text-gray-600">Quick commerce that actually delivers on time, every time.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Complete Transparency</h4>
                      <p className="text-gray-600">No hidden fees, no dark patterns - just honest, upfront pricing.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Heart className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Customer Care</h4>
                      <p className="text-gray-600">Every decision we make starts with "How does this help our customers?"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Star className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Ad-Free Experience</h4>
                      <p className="text-gray-600">We will never run ads - your experience matters more than ad revenue.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Purpose Over Profit</h3>
                <p className="text-gray-700 mb-4">
                  We're not just another profit-maximizing company. We believe in sustainable growth 
                  that benefits everyone - customers, our team.
                </p>
                <p className="text-gray-700">
                  Decent profits, zero toxic culture, and independent values that encourage 
                  every team member to thrive - all while keeping our platform completely ad-free.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-8">Built by Passion</h2>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 md:p-12 rounded-2xl">
              <div className="max-w-2xl mx-auto">
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  "I built Fastandyoga from the ground up because I believe Fasting and yoga  can be done better. 
                  No dark patterns, no toxic culture, no ads - just honest business that creates value for everyone involved."
                </p>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-xl font-bold text-gray-900">Lingam Vamshi Krishna Reddy</h3>
                  <p className="text-blue-600 font-semibold">Founder & CEO, Setica</p>
                  <p className="text-gray-600 mt-2">Solo founder building the future of ad-free quick-commerce</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;