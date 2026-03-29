import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/finding-logo.png" alt="JobMatch Logo" className="h-35 w-auto" />
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-sm font-medium text-black border border-black rounded-md hover:bg-gray-100"
          >
            Log in
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-black mb-6">
            The place where seekers meet each other
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Find your dream job or hire the perfect candidate today.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-block px-8 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition"
          >
            Get Started
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="border-l-4 border-black pl-6">
            <h2 className="text-4xl font-bold text-black mb-4">What is FINDING?</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              We are a free job search and talent acquisition platform, a place where 
              job seekers and employers can connect beforehand.
            </p>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-black mb-3">For Job Seekers</h3>
              <p className="text-gray-600">
                Browse through thousands of job opportunities and connect directly with employers 
                to find your ideal position.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-black mb-3">For Employers</h3>
              <p className="text-gray-600">
                Post job openings and find talented candidates who match your requirements. 
                Connect with potential employees instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-black mb-4">Ready to get started?</h2>
        <p className="text-gray-600 mb-8">Join JobMatch today and start your journey.</p>
        <button
          onClick={() => navigate('/login')}
          className="inline-block px-8 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition"
        >
          Sign Up Now
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center text-gray-600 text-sm">
          <p>&copy; 2026 Finding. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
