"use client";

import React from "react";
import { CallWidget } from "@/components/aimpact/webrtc";
import { Card } from "@/components/ui/card";
import { Phone, Video, Globe, Shield } from "lucide-react";

export default function WebRTCDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            WebRTC Integration Demo
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Experience seamless WebRTC calling with Janus Gateway integration. 
            Make audio and video calls directly from your browser with enterprise-grade quality.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <Phone className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">PSTN Calling</h3>
            <p className="text-gray-300 text-sm">
              Connect to any phone number via Telnyx SIP integration
            </p>
          </Card>

          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <Video className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">HD Video</h3>
            <p className="text-gray-300 text-sm">
              Crystal clear video conferencing with WebRTC technology
            </p>
          </Card>

          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <Globe className="w-12 h-12 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Global Reach</h3>
            <p className="text-gray-300 text-sm">
              Connect with anyone, anywhere in the world
            </p>
          </Card>

          <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20">
            <Shield className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Secure & Private</h3>
            <p className="text-gray-300 text-sm">
              End-to-end encryption with SSL/TLS security
            </p>
          </Card>
        </div>

        {/* Demo Instructions */}
        <Card className="p-8 bg-white/10 backdrop-blur-sm border-white/20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">Try It Now!</h2>
          <div className="space-y-4 text-gray-300">
            <p>
              Click the phone button in the bottom right corner to start a call:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>For WebRTC video calls, leave the phone number empty</li>
              <li>For PSTN calls, enter any valid phone number</li>
              <li>Use the quick dial options for fast access</li>
              <li>All calls are recorded in the communications database</li>
            </ul>
            <div className="pt-4 border-t border-white/20">
              <p className="text-sm">
                <strong>Server Status:</strong>{" "}
                <span className="text-green-400">
                  Janus Gateway Active at webrtc.aimpactnexus.ai
                </span>
              </p>
              <p className="text-sm mt-1">
                <strong>SSL Certificate:</strong>{" "}
                <span className="text-green-400">
                  Valid until September 2025
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* Integration Code Example */}
        <Card className="p-8 bg-black/50 backdrop-blur-sm border-white/20 max-w-3xl mx-auto mt-8">
          <h3 className="text-xl font-bold text-white mb-4">Integration Example</h3>
          <pre className="text-sm text-gray-300 overflow-x-auto">
{`import { CallWidget } from "@/components/aimpact/webrtc";

export default function MyApp() {
  return (
    <div>
      {/* Your app content */}
      <CallWidget />
    </div>
  );
}`}
          </pre>
        </Card>
      </div>

      {/* Call Widget */}
      <CallWidget />
    </div>
  );
}