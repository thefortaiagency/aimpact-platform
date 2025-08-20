'use client';

import React, { useState, useEffect } from 'react';

export default function TestPage() {
  const [message, setMessage] = useState('Loading...');
  const [apiTest, setApiTest] = useState('Testing API...');

  useEffect(() => {
    console.log('React useEffect is running!');
    setMessage('React is working!');
    
    // Test the Gmail API
    fetch('/api/aimpact/gmail/folders')
      .then(response => {
        console.log('API Response status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('API Data:', data);
        if (data.success) {
          setApiTest(`API works! Found ${data.folders.length} folders`);
        } else {
          setApiTest('API failed: ' + data.error);
        }
      })
      .catch(error => {
        console.error('API Error:', error);
        setApiTest('API Error: ' + error.message);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Gmail Interface Debug Test</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h2 className="font-semibold text-blue-900">React Test:</h2>
            <p className="text-blue-800">{message}</p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <h2 className="font-semibold text-green-900">API Test:</h2>
            <p className="text-green-800">{apiTest}</p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg">
            <h2 className="font-semibold text-purple-900">Instructions:</h2>
            <p className="text-purple-800">
              If you can see "React is working!" above, then React is loading correctly.
              If the API test shows folder count, then the Gmail API is working.
              Check the browser console for detailed logs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}