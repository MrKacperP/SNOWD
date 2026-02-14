"use client";

import React from "react";
import Link from "next/link";
import {
  Snowflake,
  MapPin,
  MessageSquare,
  Shield,
  DollarSign,
  Users,
  ChevronRight,
  Star,
  ArrowRight,
  Truck,
  GraduationCap,
  CreditCard,
  Banknote,
  Clock,
  Lock,
} from "lucide-react";

export default function LandingPage() {
  const features = [
    { icon: MessageSquare, title: "In-App Messaging", desc: "Coordinate directly with your operator. Track ETA, progress updates, and handle payments — all within the chat.", color: "blue" },
    { icon: DollarSign, title: "Flexible Payments", desc: "Pay with cash, credit card, or e-Transfer. We accommodate all forms of payment so nothing gets in the way.", color: "green" },
    { icon: MapPin, title: "Local Operators", desc: "Find verified operators in your neighbourhood. From professional businesses to students earning extra cash.", color: "purple" },
    { icon: Shield, title: "Trusted & Secure", desc: "Verified profiles, ratings, and reviews help you choose the right operator. Your data is always protected.", color: "cyan" },
    { icon: Clock, title: "Real-Time Tracking", desc: "Track your operator's ETA and job progress in real-time. Know exactly when your snow will be cleared.", color: "orange" },
    { icon: Users, title: "For Everyone", desc: "Professional snow plow operators, landscaping companies, and high school students — everyone is welcome.", color: "pink" },
  ];

  const colorClasses: Record<string, string> = {
    blue: "bg-[#4361EE]/10 text-[#4361EE]",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    cyan: "bg-cyan-50 text-cyan-600",
    orange: "bg-orange-50 text-orange-600",
    pink: "bg-pink-50 text-pink-600",
  };

  const clientSteps = [
    { step: "1", title: "Sign up & set your property", desc: "Create your free account and tell us about your property size and snow removal needs." },
    { step: "2", title: "Find a local operator", desc: "Browse operators near you, compare prices, read reviews, and pick the best fit." },
    { step: "3", title: "Chat & track progress", desc: "Message your operator, get real-time ETA updates, and track the job from start to finish." },
    { step: "4", title: "Pay your way", desc: "Pay with cash, credit, or e-Transfer. Easy and flexible — whatever works for you." },
  ];

  const operatorSteps = [
    { step: "1", title: "Create your operator profile", desc: "List your equipment, services, pricing, and service area. Students welcome!" },
    { step: "2", title: "Receive job requests", desc: "Clients in your area will find and request your services. Accept jobs that work for you." },
    { step: "3", title: "Complete the job", desc: "Update your status, send ETA updates, and communicate directly with the client." },
    { step: "4", title: "Get paid", desc: "Receive payment via cash, credit, or e-Transfer. Build your reputation with great reviews." },
  ];

  const trackingSteps = [
    { label: "Request Sent", done: true, active: false },
    { label: "Accepted", done: true, active: false },
    { label: "En Route", done: true, active: false },
    { label: "In Progress", done: false, active: true },
    { label: "Completed", done: false, active: false },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Snowflake className="w-8 h-8 text-[#4361EE]" />
            <span className="text-2xl font-bold text-[#4361EE]">snowd</span>
            <span className="text-2xl font-light text-gray-400">.ca</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition hidden sm:block">
              Sign In
            </Link>
            <Link href="/signup" className="px-5 py-2.5 text-sm font-semibold bg-[#4361EE] text-white rounded-xl hover:bg-[#3651D4] transition">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#4361EE]/10 rounded-full blur-3xl opacity-40" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-50 rounded-full blur-3xl opacity-40" />
        </div>
        
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#4361EE]/10 text-[#4361EE] rounded-full text-sm font-medium mb-6">
              <Snowflake className="w-4 h-4" />
              Built for Canadian winters
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              Snow removal,<br />
              <span className="text-[#4361EE]">made simple.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Connect with local snow removal operators in your neighbourhood — from professional plowing services to students with shovels. Get your snow cleared fast.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
              <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-[#4361EE] text-white rounded-xl font-semibold hover:bg-[#3651D4] transition text-lg flex items-center justify-center gap-2 shadow-lg shadow-[#4361EE]/25">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/signup" className="w-full sm:w-auto px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition text-lg flex items-center justify-center gap-2">
                <Truck className="w-5 h-5" /> I&apos;m an Operator
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-10 text-sm text-gray-400">
              <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> All provinces</div>
              <div className="flex items-center gap-1"><Users className="w-4 h-4" /> 100% Canadian</div>
              <div className="flex items-center gap-1"><Shield className="w-4 h-4" /> Secure payments</div>
            </div>
          </div>
          
          {/* Hero Image Placeholder */}
          <div className="mt-16 relative">
            <div className="aspect-video rounded-3xl bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-50 border border-gray-200 shadow-2xl overflow-hidden">
              <div className="w-full h-full flex items-center justify-center relative">
                {/* Simulated app interface preview */}
                <div className="absolute inset-0 bg-[#4361EE]/5" />
                <div className="relative z-10 flex flex-col items-center gap-4 p-8">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl max-w-md w-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-[#4361EE] rounded-full flex items-center justify-center">
                        <Snowflake className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Snow Removal Request</p>
                        <p className="text-sm text-gray-500">Ottawa, ON • Driveway</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Status</span>
                        <span className="font-medium text-green-600">✓ In Progress</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Operator</span>
                        <span className="font-medium text-gray-900">Jake&apos;s Snow Services</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">ETA</span>
                        <span className="font-medium text-[#4361EE]">8 minutes</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>Real-time tracking & updates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Preview Cards */}
      <section className="pb-16 md:pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[#4361EE]/10 rounded-3xl p-6 md:p-10 border border-[#4361EE]/15">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Operator Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-[#4361EE]/15 rounded-xl flex items-center justify-center text-[#4361EE] font-bold text-lg">J</div>
                  <div>
                    <p className="font-semibold text-gray-900">Jake&apos;s Snow Services</p>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
                      <span className="text-xs text-gray-400 ml-1">(23)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                  <MapPin className="w-3.5 h-3.5" /> Ottawa, ON
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-semibold text-sm">From $25</span>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs font-medium flex items-center gap-0.5">
                    <GraduationCap className="w-3 h-3" /> Student
                  </span>
                </div>
              </div>

              {/* Chat Preview */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-3 font-medium">IN-APP MESSAGING</p>
                <div className="space-y-2.5">
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-md text-sm max-w-[80%]">Hi! I&apos;m on my way</div>
                  </div>
                  <div className="flex justify-center">
                    <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs border border-purple-200">
                      <Clock className="w-3 h-3 inline mr-1" />ETA: 10 minutes
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-[#4361EE] text-white px-3 py-2 rounded-2xl rounded-br-md text-sm max-w-[80%]">Great, thanks!</div>
                  </div>
                  <div className="flex justify-center">
                    <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs border border-green-200">
                      <DollarSign className="w-3 h-3 inline mr-1" />$40 — Cash payment
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 mb-3 font-medium">JOB TRACKING</p>
                <div className="space-y-3">
                  {trackingSteps.map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${s.done ? "bg-green-100 text-green-600" : s.active ? "bg-[#4361EE]/15 text-[#4361EE] ring-2 ring-[#4361EE]/30" : "bg-gray-100 text-gray-400"}`}>
                        {s.done ? "\u2713" : i + 1}
                      </div>
                      <span className={`text-sm ${s.done ? "text-green-600" : s.active ? "text-[#4361EE] font-medium" : "text-gray-400"}`}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Everything you need for snow removal</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Whether you need your driveway cleared or want to earn money removing snow — snowd.ca has you covered.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition">
                  <div className={`w-12 h-12 ${colorClasses[f.color]} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900">{f.title}</h3>
                  <p className="text-gray-500 mt-2 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 md:py-24 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4361EE]/10/50 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How it works</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Get started in minutes — whether you need snow cleared or want to earn money removing it.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Client Flow */}
            <div className="relative">
              <div className="sticky top-32">
                <h3 className="font-bold text-xl text-[#4361EE] mb-6 flex items-center gap-2">
                  <div className="w-10 h-10 bg-[#4361EE]/15 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  For Clients
                </h3>
                <div className="space-y-6">
                  {clientSteps.map((item, idx) => (
                    <div key={item.step} className="flex gap-4 group">
                      <div className="relative">
                        <div className="w-10 h-10 bg-[#4361EE]/15 text-[#4361EE] rounded-xl flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-[#4361EE] group-hover:text-white transition-all shadow-sm">{item.step}</div>
                        {idx < clientSteps.length - 1 && (
                          <div className="absolute top-10 left-5 w-0.5 h-12 bg-gradient-to-b from-blue-200 to-transparent" />
                        )}
                      </div>
                      <div className="pt-1">
                        <h4 className="font-semibold text-gray-900 group-hover:text-[#4361EE] transition">{item.title}</h4>
                        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Operator Flow */}
            <div className="relative">
              <div className="sticky top-32">
                <h3 className="font-bold text-xl text-green-600 mb-6 flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  For Operators
                </h3>
                <div className="space-y-6">
                  {operatorSteps.map((item, idx) => (
                    <div key={item.step} className="flex gap-4 group">
                      <div className="relative">
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-green-600 group-hover:text-white transition-all shadow-sm">{item.step}</div>
                        {idx < operatorSteps.length - 1 && (
                          <div className="absolute top-10 left-5 w-0.5 h-12 bg-gradient-to-b from-green-200 to-transparent" />
                        )}
                      </div>
                      <div className="pt-1">
                        <h4 className="font-semibold text-gray-900 group-hover:text-green-600 transition">{item.title}</h4>
                        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Visual indicator */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#4361EE]/10 to-green-50 rounded-full border border-gray-200">
              <Clock className="w-5 h-5 text-[#4361EE]" />
              <span className="text-sm font-medium text-gray-700">Get matched with operators in under 5 minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-50 rounded-full blur-3xl opacity-30 -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#4361EE]/10 rounded-full blur-3xl opacity-30 -z-10" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Pay however you like</h2>
          <p className="text-gray-500 mb-10 max-w-xl mx-auto">We support all major payment methods so both clients and operators can transact comfortably.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Banknote className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Cash</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Simple and direct. Pay your operator in person when the job is done.</p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-8 h-8 text-[#4361EE]" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Credit Card</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Secure online payments powered by Stripe. Coming soon!</p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Interac e-Transfer</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Canada&apos;s favourite way to send money. Quick and easy.</p>
            </div>
          </div>
          
          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span>Secure transactions</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#4361EE]" />
              <span>Encrypted payments</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span>Trusted by Canadians</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#4361EE] rounded-3xl p-8 md:p-14 text-center text-white">
            <Snowflake className="w-12 h-12 mx-auto mb-4 text-white/50" />
            <h2 className="text-3xl md:text-4xl font-bold">Ready for a snow-free driveway?</h2>
            <p className="text-[#4361EE]/20 mt-3 text-lg max-w-lg mx-auto">Join snowd.ca today and connect with local snow removal operators in minutes.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-white text-[#4361EE] rounded-xl font-semibold hover:bg-[#4361EE]/10 transition text-lg flex items-center justify-center gap-2 shadow-lg">
                Sign Up Free <ChevronRight className="w-5 h-5" />
              </Link>
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 border-2 border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition text-lg flex items-center justify-center">
                I have an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-[#4361EE]" />
            <span className="font-bold text-[#4361EE]">snowd</span>
            <span className="font-light text-gray-400">.ca</span>
          </div>
          <p className="text-sm text-gray-400">&copy; 2026 snowd.ca &mdash; Made in Canada</p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="#" className="hover:text-gray-600 transition">Privacy</Link>
            <Link href="#" className="hover:text-gray-600 transition">Terms</Link>
            <Link href="#" className="hover:text-gray-600 transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
