import React, { useState } from 'react';
import { 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Clock, 
  Truck, 
  Users, 
  ChevronRight, 
  Stethoscope, 
  Database,
  CheckCircle2,
  Lock,
  Menu,
  X,
  FileText,
  AlertCircle,
  ArrowRightCircle,
  Briefcase
} from 'lucide-react';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFlow, setActiveFlow] = useState('NURSE');

  // Smooth scroll handler
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  const FLOW_DATA: Record<string, any> = {
    'NURSE': {
      title: "Nurse Station",
      role: "Requester",
      icon: Activity,
      color: "pink",
      steps: [
        "Uses item from almirah (Quantity reduces automatically)",
        "Almirah stock low → raises request",
        "Goes to Sister In-Charge for approval",
        "Receives items from Dept store (Updates almirah inventory)",
        "Views almirah stock anytime (Shows current consumables)"
      ],
      note: "Nurses do NOT deal with central store or vendor directly.",
      permission: "Read/Write Local",
      uiTip: "Click 'Request' to ask for stock. Click 'Products' to see Almirah contents."
    },
    'SISTER': {
      title: "Sister In-Charge",
      role: "Approver",
      icon: ShieldCheck,
      color: "indigo",
      steps: [
        "Receives nurse requests (Approves if department stock available)",
        "If not available → sends to HOD",
        "Manages department inventory (Adds/Removes stock)",
        "Manages internal transfers (Can borrow/loan items from other wards)",
        "Marks items received after central store dispatch"
      ],
      note: "Sister is the gatekeeper of the ward inventory.",
      permission: "Approve/Transfer"
    },
    'HOD': {
      title: "HOD/Admin",
      role: "Authority",
      icon: Users,
      color: "purple",
      steps: [
        "Approves/Rejects large requests (Especially when dept has zero stock)",
        "Confirms priorities (Only valid needs go to central store)",
        "Resolves complaints (Items damaged/defective)",
        "Oversees full department inventory & Accountability"
      ],
      note: "HOD decides what moves beyond the ward.",
      permission: "Full Department Control"
    },
    'INVENTORY': {
      title: "Central Store",
      role: "Provider",
      icon: Truck,
      color: "emerald",
      steps: [
        "Dispatch Stage: Sends items to departments after HOD approval",
        "Vendor Stage: Requests to vendor if not in-stock",
        "Receives Vendor Delivery (Adds products into central inventory)",
        "Expiry + Batch Tracking",
        "Logs vendor transactions (Bills stored separately)"
      ],
      note: "Ensures zero downtime in supply.",
      permission: "Global Inventory Write"
    },
    'VENDOR': {
      title: "Vendor (Exception)",
      role: "External",
      icon: AlertCircle,
      color: "amber",
      steps: [
        "Trigger: Request arrives but product NOT in central store",
        "Inventory staff enters ETA",
        "Vendor delivers items",
        "Central store receives & logs bill",
        "Store dispatches to requester (Normal path resumes)"
      ],
      note: "Vendor only enters when hospital has no stock.",
      permission: "External Portal Access"
    }
  };

  const flowKeys = Object.keys(FLOW_DATA);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      
      {/* --- Navigation --- */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-500">
                MediStock
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</button>
              <button onClick={() => scrollToSection('roles')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Roles</button>
              <button onClick={() => scrollToSection('workflow')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">How it Works</button>
              <div className="h-6 w-px bg-slate-200"></div>
              <button 
                onClick={handleGetStarted}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 transform hover:-translate-y-0.5"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-600">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 p-4 space-y-4 shadow-xl absolute w-full">
            <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 font-medium text-slate-600">Features</button>
            <button onClick={() => scrollToSection('roles')} className="block w-full text-left py-2 font-medium text-slate-600">Roles</button>
            <button onClick={() => scrollToSection('workflow')} className="block w-full text-left py-2 font-medium text-slate-600">How it Works</button>
            <hr className="border-slate-100" />
            <button onClick={handleGetStarted} className="block w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Get Started</button>
          </div>
        )}
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-50 -z-10"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-teal-50 rounded-full blur-3xl opacity-50 -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-8 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Next Gen Inventory Management v2.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight">
            Seamless Supply. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
              Better Patient Care.
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-10 leading-relaxed">
            Orchestrate your entire hospital's inventory from the nurse's station to the central warehouse. 
            Reduce waste, track expiry, and ensure the right tools are always at hand.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => scrollToSection('workflow')}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 hover:shadow-2xl hover:shadow-blue-300 hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Explore Workflows <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={handleGetStarted}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all hover:border-slate-300 flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5 text-slate-400" /> Get Started
            </button>
          </div>
          
          {/* Trust Badges */}
          <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-center gap-8 text-slate-400 grayscale opacity-70">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-300">Trusted by Modern Healthcare Facilities</p>
          </div>
        </div>
      </section>

      {/* --- Roles Grid (RESTORED) --- */}
      <section id="roles" className="py-20 bg-white border-b border-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-16">
             <h2 className="text-3xl font-bold text-slate-900">Key Roles</h2>
             <p className="text-slate-500 mt-2">Built for every stakeholder in the hospital ecosystem.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Nurse */}
              <div className="group bg-slate-50 p-6 rounded-2xl hover:shadow-lg transition-all hover:-translate-y-1 border border-slate-100">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-pink-500 transition-colors">
                  <Activity className="w-6 h-6 text-pink-600 group-hover:text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">Nurse / Ward</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Consumes stock from Almirah and raises local requests. No vendor interaction.
                </p>
              </div>

              {/* Sister */}
              <div className="group bg-slate-50 p-6 rounded-2xl hover:shadow-lg transition-all hover:-translate-y-1 border border-slate-100">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-500 transition-colors">
                  <ShieldCheck className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">Sister In-Charge</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Approves nurse requests, manages Dept Store, and loans items between wards.
                </p>
              </div>

              {/* HOD */}
              <div className="group bg-slate-50 p-6 rounded-2xl hover:shadow-lg transition-all hover:-translate-y-1 border border-slate-100">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors">
                  <Users className="w-6 h-6 text-purple-600 group-hover:text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">HOD / Admin</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Overrides approvals, handles budget complaints, and interacts with Central Store.
                </p>
              </div>

              {/* Inventory */}
              <div className="group bg-slate-50 p-6 rounded-2xl hover:shadow-lg transition-all hover:-translate-y-1 border border-slate-100">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors">
                  <Truck className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">Inventory Staff</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Manages central warehouse, dispatches stock, creates product IDs, and handles vendors.
                </p>
              </div>
           </div>
        </div>
      </section>

      {/* --- Interactive Workflow Section --- */}
      <section id="workflow" className="py-24 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Orchestrated Workflow</h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Follow the journey of a request through our hierarchical system.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            
            {/* Process Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 overflow-x-auto">
              <div className="flex min-w-max p-4 md:justify-center">
                {flowKeys.map((key, index) => {
                  const isActive = activeFlow === key;
                  const isLast = index === flowKeys.length - 1;
                  
                  return (
                    <div key={key} className="flex items-center">
                      <button
                        onClick={() => setActiveFlow(key)}
                        className={`
                          group flex items-center gap-3 px-6 py-3 rounded-full border transition-all duration-200
                          ${isActive 
                            ? `bg-white border-${FLOW_DATA[key].color}-500 shadow-md scale-105 z-10 ring-1 ring-${FLOW_DATA[key].color}-200` 
                            : 'bg-transparent border-transparent hover:bg-slate-100 opacity-60 hover:opacity-100'
                          }
                        `}
                      >
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-white
                          ${isActive ? `bg-${FLOW_DATA[key].color}-500` : 'bg-slate-400'}
                        `}>
                          {React.createElement(FLOW_DATA[key].icon, { className: "w-4 h-4" })}
                        </div>
                        <div className="text-left">
                           <div className={`text-xs font-bold uppercase tracking-wider ${isActive ? `text-${FLOW_DATA[key].color}-600` : 'text-slate-500'}`}>
                             {FLOW_DATA[key].role}
                           </div>
                           <div className={`font-bold whitespace-nowrap ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                             {FLOW_DATA[key].title}
                           </div>
                        </div>
                      </button>
                      
                      {!isLast && (
                        <div className="mx-2 text-slate-300">
                          <ArrowRightCircle className="w-5 h-5 opacity-50" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-8 md:p-12 bg-white min-h-[500px]">
              <div className="flex flex-col lg:flex-row gap-12 items-start">
                 {/* Left: Enhanced Timeline */}
                 <div className="flex-1 animate-fade-in">
                    <div className="flex items-center gap-4 mb-8">
                      <div className={`p-4 rounded-2xl bg-${FLOW_DATA[activeFlow].color}-50 border border-${FLOW_DATA[activeFlow].color}-100`}>
                        {React.createElement(FLOW_DATA[activeFlow].icon, { className: `w-8 h-8 text-${FLOW_DATA[activeFlow].color}-600` })}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">Workflow Steps</h3>
                        <p className="text-slate-500 text-sm">Follow the standard operating procedure below.</p>
                      </div>
                    </div>

                    <div className="relative pl-6 space-y-8">
                      {/* Timeline Line */}
                      <div className="absolute left-[1.65rem] top-4 bottom-4 w-px bg-slate-200 -z-10"></div>
                      
                      {FLOW_DATA[activeFlow].steps.map((step: string, index: number) => (
                        <div key={index} className="flex gap-6 items-start group">
                          <div className={`
                            relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 
                            bg-white border-2 border-${FLOW_DATA[activeFlow].color}-500 text-${FLOW_DATA[activeFlow].color}-600 font-bold shadow-sm
                            group-hover:bg-${FLOW_DATA[activeFlow].color}-50 transition-colors
                          `}>
                            {index + 1}
                          </div>
                          <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                            <p className="text-slate-700 font-medium leading-relaxed">{step}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>

                 {/* Right: System Access Card (Redesigned) */}
                 <div className="w-full lg:w-1/3">
                    <div className="sticky top-28 space-y-6">
                      {/* ID Badge Style Card */}
                      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden relative">
                        <div className={`h-24 bg-gradient-to-r from-${FLOW_DATA[activeFlow].color}-500 to-${FLOW_DATA[activeFlow].color}-400`}></div>
                        <div className="px-6 pb-6">
                           <div className="relative -mt-10 mb-4 flex justify-between items-end">
                              <div className="bg-white p-1.5 rounded-2xl shadow-sm">
                                <div className={`w-20 h-20 bg-${FLOW_DATA[activeFlow].color}-50 rounded-xl flex items-center justify-center`}>
                                   {React.createElement(FLOW_DATA[activeFlow].icon, { className: `w-10 h-10 text-${FLOW_DATA[activeFlow].color}-600` })}
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-${FLOW_DATA[activeFlow].color}-100 text-${FLOW_DATA[activeFlow].color}-700`}>
                                {FLOW_DATA[activeFlow].permission}
                              </span>
                           </div>
                           
                           <h4 className="text-xl font-bold text-slate-900 mb-1">{FLOW_DATA[activeFlow].title}</h4>
                           <p className="text-sm text-slate-500 mb-6">{FLOW_DATA[activeFlow].role}</p>

                           <div className="space-y-4">
                              <div className="bg-slate-50 p-4 rounded-xl text-sm border border-slate-100">
                                <p className="text-slate-700 leading-relaxed italic">
                                  "{FLOW_DATA[activeFlow].note}"
                                </p>
                              </div>
                              
                              {FLOW_DATA[activeFlow].uiTip && (
                                <div className="flex items-start gap-3 text-xs text-slate-500 bg-yellow-50/50 p-3 rounded-lg border border-yellow-100">
                                  <div className="mt-0.5">💡</div>
                                  <p>{FLOW_DATA[activeFlow].uiTip}</p>
                                </div>
                              )}
                           </div>
                        </div>
                      </div>

                      {/* Quick Stat */}
                      <div className="bg-slate-900 rounded-xl p-5 text-white flex justify-between items-center shadow-lg shadow-slate-200">
                        <div>
                           <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">System Access</p>
                           <p className="font-bold">Authorized</p>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Features Grid --- */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                Intelligent features for <br />
                <span className="text-blue-600">modern hospitals.</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                We've built specific tools for every scenario in a hospital environment, from emergency stockouts to routine audits.
              </p>
              
              <div className="space-y-6">
                {[
                  { title: "Export Transactions", desc: "Download safe logs and clean transaction records for audits.", icon: FileText },
                  { title: "Smart Almirah Management", desc: "Digital twin of your physical ward almirahs. Know exactly what's on the shelf.", icon: Database },
                  { title: "Vendor Integration", desc: "Seamlessly generate purchase orders and log bills when stock hits zero.", icon: Truck },
                  { title: "Role-Based Security", desc: "Strict permission controls ensure nurses can't approve their own requests.", icon: Lock },
                ].map((feature, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{feature.title}</h4>
                      <p className="text-slate-500 text-sm mt-1">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Visual/Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-teal-400 rounded-3xl transform rotate-3 scale-105 opacity-20 blur-lg"></div>
              <div className="relative bg-slate-900 rounded-3xl p-8 border border-slate-700 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[80px] opacity-20"></div>
                
                {/* Mock UI in Dark Mode */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-red-500"></div>
                       <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                       <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-xs font-mono text-slate-500">REQUEST_LOG_V2.tsx</div>
                  </div>

                  {/* Mock Request Card 1 */}
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                    <div>
                      <div className="text-blue-400 text-xs font-bold mb-1">REQ-102 • PENDING VENDOR</div>
                      <div className="text-white font-medium">Surgical Catheter (Type B)</div>
                      <div className="text-slate-400 text-xs mt-1">ETA: 24 Hours • Staff: John D.</div>
                    </div>
                    <Clock className="text-blue-500 w-5 h-5" />
                  </div>

                  {/* Mock Request Card 2 */}
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                     <div>
                      <div className="text-emerald-400 text-xs font-bold mb-1">REQ-105 • DISPATCHED</div>
                      <div className="text-white font-medium">Paracetamol IV (500mg)</div>
                      <div className="text-slate-400 text-xs mt-1">Approved by HOD • 100 Units</div>
                    </div>
                    <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                  </div>

                  <div className="bg-blue-600/20 p-4 rounded-xl border border-blue-500/30 text-center">
                    <span className="text-blue-300 text-sm font-medium">Alert: Central Stock Low on 3 items</span>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
           <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[100px] opacity-30 transform -translate-y-1/2"></div>
           <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-500 rounded-full blur-[80px] opacity-20"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-bold mb-6">Ready to optimize your inventory?</h2>
          <p className="text-slate-300 text-lg mb-10">
            Join the network of efficient hospitals using MediStock to save lives and resources.
          </p>
          <div className="flex justify-center gap-4">
             <button 
               onClick={handleGetStarted}
               className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-900/50"
             >
               Get Started Now
             </button>
          </div>
          <p className="mt-8 text-sm text-slate-500">No credit card required for demo • ISO 27001 Certified Security</p>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
           <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                 <Stethoscope className="w-5 h-5 text-blue-600" />
                 <span className="text-lg font-bold text-white">MediStock</span>
              </div>
              <p className="max-w-xs text-sm">
                Empowering healthcare professionals with tools to manage inventory efficiently, ensuring patient care never stops waiting for supplies.
              </p>
           </div>
           
          
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-900 text-center text-xs text-slate-600">
           © 2025 MediStock Systems. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;