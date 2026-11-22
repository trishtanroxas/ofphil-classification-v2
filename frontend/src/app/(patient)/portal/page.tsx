'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PatientAppShell from '@/components/PatientAppShell';

function PatientPortalContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applications' | 'profile' | 'settings'>('dashboard');

  // Loading skeleton effect state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show smooth initial skeleton loading effect
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (tabParam === 'applications' || tabParam === 'profile' || tabParam === 'settings') {
      setActiveTab(tabParam);
    } else {
      setActiveTab('dashboard');
    }
  }, [tabParam]);

  // Beneficiary mock identity matching the user's reference screenshot
  const patient = {
    name: 'Tarcila Magpantay',
    username: 'MSW_FA_0125-01',
    patient_id: 'PAT-PORTAL-99033A68',
    sex: 'F',
    residence: 'Block 4 Lot 12',
    contact: '0918 123 4567',
    email: 'tarcila.m@gmail.com',
  };

  // Missing requirements list
  const missingRequirements = [
    'Certificate of Indigency',
    'Government Valid ID',
    'Medical Expense Quotation',
    'Clinical Case Study / Medical Abstract',
    'Proof of Income / Payslip',
    'Utility Bill',
  ];

  // Selected missing requirement in Applications tab
  const [selectedDocType, setSelectedDocType] = useState('Certificate of Indigency');
  const [optionalNote, setOptionalNote] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Profile form state (Tab 3: My Profile)
  const [profileName, setProfileName] = useState('Tarcila Magpantay');
  const [profileEmail, setProfileEmail] = useState('tarcila.m@gmail.com');
  const [profilePhone, setProfilePhone] = useState('0918 555 9876');
  const [profileSaved, setProfileSaved] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [passUpdated, setPassUpdated] = useState(false);

  // Settings & Preferences state (Tab 4: Settings & Preferences - matching uploaded screenshot)
  const [settingsActiveSubTab, setSettingsActiveSubTab] = useState<'profile' | 'security' | 'appointments' | 'notifications' | 'privacy' | 'accessibility' | 'account'>('profile');
  const [settingsFullName, setSettingsFullName] = useState('Tarcila Magpantay');
  const [settingsEmail, setSettingsEmail] = useState('tarcila.m@gmail.com');
  const [settingsPhone, setSettingsPhone] = useState('0918 123 4567');
  const [settingsAddress, setSettingsAddress] = useState('Block 4 Lot 12');
  const [settingsEmergency, setSettingsEmergency] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassUpdated(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPassUpdated(false), 3000);
  };

  const handleSettingsProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  return (
    <PatientAppShell
      activeTab={activeTab}
      pageTitle={
        activeTab === 'dashboard'
          ? 'Patient Dashboard'
          : activeTab === 'applications'
          ? 'My Assistance Applications'
          : activeTab === 'profile'
          ? 'Beneficiary Profile & Settings'
          : 'Patient Account & Preferences'
      }
      pageSubtitle="Ophthalmological Foundation of the Philippines — AI-Assisted Patient Intake & Evaluation"
    >
      {/* SKELETON LOADING SHIMMER STATE */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-28 rounded-2xl skeleton w-full" />
          <div className="h-36 rounded-2xl skeleton w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="h-28 rounded-2xl skeleton" />
            <div className="h-28 rounded-2xl skeleton" />
            <div className="h-28 rounded-2xl skeleton" />
          </div>
          <div className="h-64 rounded-2xl skeleton w-full" />
        </div>
      ) : (
        <>
          {/* ========================================================
              TAB 1: PATIENT DASHBOARD
             ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Urgent Clinic Notifications & Missing Requirements Banner */}
              <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-5 text-[#92400E] shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-bell text-[#D97706] text-sm" />
                  <span className="font-bold text-xs uppercase tracking-wider text-[#B45309]">
                    Urgent Clinic Notifications &amp; Missing Requirements
                  </span>
                </div>

                {/* Application 1 alert */}
                <div className="text-xs mb-3">
                  <p className="font-medium text-[#78350F] mb-2 leading-relaxed">
                    Application <strong>APP-FA-6BD98359</strong> (Cataract Senile Mature): Please submit your lacking requirements (6 remaining):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missingRequirements.map((req, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedDocType(req);
                          setActiveTab('applications');
                        }}
                        className="px-2.5 py-1 rounded-md bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-semibold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <i className="fa-solid fa-upload text-[10px]" />
                        <span>Upload {req}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Application 2 alert */}
                <div className="text-xs pt-3 border-t border-[#FDE68A]/60">
                  <p className="font-medium text-[#78350F] mb-2 leading-relaxed">
                    Application <strong>APP-FA-9264EB46</strong> (Cataract Senile Mature): Please submit your lacking requirements (6 remaining):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missingRequirements.map((req, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedDocType(req);
                          setActiveTab('applications');
                        }}
                        className="px-2.5 py-1 rounded-md bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-semibold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <i className="fa-solid fa-upload text-[10px]" />
                        <span>Upload {req}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Welcome Hero Green Card */}
              <div className="rounded-2xl bg-gradient-to-r from-[#064826] to-[#0B6B3A] p-6 sm:p-7 text-white shadow-sm">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold mb-3 border border-white/15">
                  <span className="w-2 h-2 rounded-full bg-[#86EFAC] animate-pulse" />
                  Masterlist Verified Beneficiary
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold font-['Outfit'] tracking-tight mb-3 text-white">
                  Welcome, {patient.name}
                </h1>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-emerald-100 font-medium">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-id-card text-[11px]" />
                    <span>Patient ID: <strong>{patient.patient_id}</strong></span>
                  </span>
                  <span>•</span>
                  <span>Sex: <strong>{patient.sex}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-location-dot text-[11px]" />
                    <span>Residence: <strong>{patient.residence}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-phone text-[11px]" />
                    <span>Contact: <strong>{patient.contact}</strong></span>
                  </span>
                </div>
              </div>

              {/* 3 Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Metric 1 */}
                <div className="bg-white rounded-2xl p-5 border border-[#EEF2EF] shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466] mb-1">
                      Clinic Encounters
                    </div>
                    <div className="text-3xl font-bold font-['Outfit'] text-[#10241A]">
                      2
                    </div>
                    <div className="text-[11px] text-[#5A7466] mt-1">
                      Recorded outpatient &amp; clinic visits
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center text-lg">
                    <i className="fa-solid fa-hospital-user" />
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white rounded-2xl p-5 border border-[#EEF2EF] shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466] mb-1">
                      Upcoming Appointments
                    </div>
                    <div className="text-3xl font-bold font-['Outfit'] text-[#0B6B3A]">
                      0
                    </div>
                    <div className="text-[11px] text-[#5A7466] mt-1">
                      Coordinated clinic consultations
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg">
                    <i className="fa-solid fa-calendar-check" />
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white rounded-2xl p-5 border border-[#EEF2EF] shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466] mb-1">
                      Assistance Filings
                    </div>
                    <div className="text-3xl font-bold font-['Outfit'] text-[#10241A]">
                      2
                    </div>
                    <div className="text-[11px] text-[#5A7466] mt-1">
                      Charity eligibility requests
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg">
                    <i className="fa-solid fa-clipboard-check" />
                  </div>
                </div>
              </div>

              {/* Appointments & Schedule Empty State Card */}
              <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-calendar-days text-[#0B6B3A] text-sm" />
                    <div>
                      <h3 className="font-['Outfit'] text-[15px] font-bold text-[#10241A]">
                        Appointments &amp; Schedule in Clinic
                      </h3>
                      <p className="text-[11px] text-[#5A7466]">
                        Provided and scheduled by Clinic Administration, Nursing Staff, and Medical Social Workers
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#FAFBF8] border border-[#EEF2EF] text-[#5A7466]">
                    0 Upcoming Scheduled
                  </span>
                </div>

                <div className="py-12 text-center text-[#5A7466] bg-[#FAFBF8] rounded-xl border border-dashed border-[#D5E2D9]">
                  <i className="fa-regular fa-calendar-xmark text-3xl text-[#9DBFA9] mb-2 block" />
                  <p className="text-xs font-medium">You have no upcoming appointments scheduled at this moment.</p>
                </div>
              </div>

              {/* History Record Table Card */}
              <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs overflow-hidden">
                <div className="p-5 border-b border-[#EEF2EF] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-file-medical text-[#0B6B3A] text-sm" />
                    <div>
                      <h3 className="font-['Outfit'] text-[15px] font-bold text-[#10241A]">
                        History Record of Patient in Clinic
                      </h3>
                      <p className="text-[11px] text-[#5A7466]">
                        Chronological medical encounters, surgical records, ophthalmology diagnoses, and fee quotations
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#FAFBF8] border border-[#EEF2EF] text-[#5A7466]">
                    2 Encounters Logged
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#24352B]">
                    <thead className="bg-[#FAFBF8] text-[#5A7466] text-[11px] uppercase tracking-wider border-b border-[#EEF2EF]">
                      <tr>
                        <th className="py-3 px-5 font-semibold">Encounter ID</th>
                        <th className="py-3 px-5 font-semibold">Visit Date</th>
                        <th className="py-3 px-5 font-semibold">Diagnosis &amp; Eye Laterality</th>
                        <th className="py-3 px-5 font-semibold">Procedure / Intervention</th>
                        <th className="py-3 px-5 font-semibold">Attending Doctor &amp; Consultant</th>
                        <th className="py-3 px-5 font-semibold">Medical Quotation</th>
                        <th className="py-3 px-5 font-semibold">Encounter Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF2EF]">
                      <tr className="hover:bg-[#FAFBF8] transition">
                        <td className="py-3.5 px-5 font-mono font-bold text-[#10241A]">
                          APP-FA-6BD98359
                        </td>
                        <td className="py-3.5 px-5 text-[#5A7466] whitespace-nowrap">
                          11/10/2026
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-[#10241A]">Cataract Senile Mature</div>
                          <div className="text-[11px] text-[#5A7466]">OS (Left Eye)</div>
                        </td>
                        <td className="py-3.5 px-5 text-[#10241A]">
                          Phacoemulsification with IOL
                        </td>
                        <td className="py-3.5 px-5 text-[#5A7466]">
                          Clinic Doctor
                        </td>
                        <td className="py-3.5 px-5 font-bold text-[#0B6B3A]">
                          ₱7,000.00
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Evidential Docs
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-[#FAFBF8] transition">
                        <td className="py-3.5 px-5 font-mono font-bold text-[#10241A]">
                          APP-FA-9264EB46
                        </td>
                        <td className="py-3.5 px-5 text-[#5A7466] whitespace-nowrap">
                          11/12/2026
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-[#10241A]">Cataract Senile Mature</div>
                          <div className="text-[11px] text-[#5A7466]">OD (Right Eye)</div>
                        </td>
                        <td className="py-3.5 px-5 text-[#10241A]">
                          Phacoemulsification with IOL
                        </td>
                        <td className="py-3.5 px-5 text-[#5A7466]">
                          Clinic Doctor
                        </td>
                        <td className="py-3.5 px-5 font-bold text-[#0B6B3A]">
                          ₱7,000.00
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Evidential Docs
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: MY ASSISTANCE APPLICATIONS
             ======================================================== */}
          {activeTab === 'applications' && (
            <div className="space-y-6">
              {/* Urgent Clinic Alert */}
              <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-5 text-[#92400E] shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-bell text-[#D97706] text-sm" />
                  <span className="font-bold text-xs uppercase tracking-wider text-[#B45309]">
                    Urgent Clinic Notifications &amp; Missing Requirements
                  </span>
                </div>
                <div className="text-xs mb-3">
                  <p className="font-medium text-[#78350F] mb-2 leading-relaxed">
                    Application <strong>APP-FA-6BD98359</strong> (Cataract Senile Mature): Please submit your lacking requirements (6 remaining):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missingRequirements.map((req, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedDocType(req)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition ${
                          selectedDocType === req
                            ? 'bg-[#0B6B3A] text-white ring-2 ring-[#0B6B3A]/30'
                            : 'bg-[#D97706] hover:bg-[#B45309] text-white'
                        }`}
                      >
                        <i className="fa-solid fa-upload text-[10px]" />
                        <span>Upload {req}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assistance Applications Tracking Header */}
              <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <i className="fa-solid fa-clipboard-list text-[#0B6B3A] text-base" />
                    <h2 className="font-['Outfit'] text-lg font-bold text-[#10241A] m-0">
                      My Assistance Applications
                    </h2>
                  </div>
                  <p className="text-xs text-[#5A7466] m-0">
                    Track your two-step evaluation: Socioeconomic Screening followed by Evidential Document Submission.
                  </p>
                </div>

                {/* Single Application Container */}
                <div className="border border-[#EEF2EF] rounded-xl p-5 mb-4 bg-[#FAFBF8]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EEF2EF] mb-4">
                    <div>
                      <div className="text-[11px] font-mono text-[#0B6B3A] font-bold">
                        APPLICATION REF: APP-FA-6BD98359 • SUBMITTED: 11/10/2026
                      </div>
                      <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] mt-0.5">
                        Cataract Senile Mature
                      </h3>
                      <div className="text-xs text-[#5A7466]">
                        Proposed Procedure: Phacoemulsification with IOL • Quotation: <strong className="text-[#0B6B3A]">₱7,000.00</strong>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0] flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-check text-xs" />
                      <span>Step 1 Approved • Evidential Documents Active</span>
                    </span>
                  </div>

                  {/* 2-Step Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Step 1 Card */}
                    <div className="bg-white p-4 rounded-xl border border-[#EEF2EF] text-xs">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EEF2EF]">
                        <span className="font-bold text-[#10241A] flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-[#E8F5EC] text-[#0B6B3A] inline-flex items-center justify-center text-[10px]">1</span>
                          Step 1: Socioeconomic Profile Screening
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F5EC] text-[#0B6B3A]">
                          ✓ Passed
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-[#5A7466]">
                        <li>• Monthly Household Income: <strong className="text-[#10241A]">₱6,000.00</strong></li>
                        <li>• Number of Dependents: <strong className="text-[#10241A]">1</strong></li>
                        <li>• Monthly Utility Bill: <strong className="text-[#10241A]">₱0.00</strong></li>
                        <li>• Maintenance Medicines: <strong className="text-[#10241A]">None</strong></li>
                        <li>• Household Members: <strong className="text-[#10241A]">2 listed</strong></li>
                      </ul>
                      <div className="mt-3 pt-2 border-t border-[#EEF2EF] text-[11px] text-[#5A7466]">
                        Evaluator: <strong>Medical Social Work Department</strong><br />
                        Note: <em>&ldquo;General Intake Sheet Submitted, Pending MSW Evaluation &amp; Scoring&rdquo;</em>
                      </div>
                    </div>

                    {/* Step 2 Card */}
                    <div className="bg-white p-4 rounded-xl border border-[#EEF2EF] text-xs">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EEF2EF]">
                        <span className="font-bold text-[#10241A] flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center justify-center text-[10px]">2</span>
                          Step 2: Formal Evidential Documents
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700">
                          Submission Active
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#5A7466] mb-3 leading-relaxed">
                        <strong className="text-[#0B6B3A]">Step 1 Approved!</strong> Our Medical Social Workers require the following evidential documents to finalize your charity grant:
                      </p>

                      {/* Document Badges */}
                      <div className="bg-[#FFFBEB] p-3 rounded-lg border border-[#FDE68A] mb-3">
                        <div className="text-[10px] font-bold text-[#92400E] uppercase mb-1.5">
                          Documents Still Required (Click a badge to select &amp; upload):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {missingRequirements.map((req, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedDocType(req)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                                selectedDocType === req
                                  ? 'bg-[#D97706] text-white border-[#D97706]'
                                  : 'bg-white text-[#92400E] border-[#FCD34D] hover:bg-[#FEF3C7]'
                              }`}
                            >
                              {req}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Upload Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          setUploadSuccess(true);
                          setTimeout(() => setUploadSuccess(false), 3000);
                        }}
                        className="space-y-3"
                      >
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1 text-[11px]">
                            Missing Requirement / Document Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={selectedDocType}
                            onChange={(e) => setSelectedDocType(e.target.value)}
                            className="w-full h-9 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          >
                            {missingRequirements.map((r, i) => (
                              <option key={i} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1 text-[11px]">
                            Choose Document File (JPG, PNG, PDF) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="file"
                            required
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="w-full text-xs text-[#5A7466] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E8F5EC] file:text-[#0B6B3A] hover:file:bg-[#D5E6DC] cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1 text-[11px]">
                            Optional Note to Medical Social Worker
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Updated Certificate of Indigency from Barangay..."
                            value={optionalNote}
                            onChange={(e) => setOptionalNote(e.target.value)}
                            className="w-full h-8 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>

                        {uploadSuccess && (
                          <div className="text-xs text-[#0B6B3A] font-bold p-2 bg-[#E8F5EC] rounded-lg">
                            ✓ Document uploaded successfully and forwarded to caseworker!
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                        >
                          <i className="fa-solid fa-cloud-arrow-up text-xs" />
                          <span>Submit Missing Requirement &amp; Notify Social Worker</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: MY PROFILE (Beneficiary Profile & Settings)
             ======================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Avatar Card */}
                <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-[#E6F1EA] text-[#0B6B3A] flex items-center justify-center text-3xl font-bold font-['Outfit'] mb-4 border-2 border-[#A7F3D0]">
                    {patient.name.charAt(0)}
                  </div>
                  <h3 className="font-['Outfit'] text-lg font-bold text-[#10241A] mb-0.5">
                    {patient.name}
                  </h3>
                  <div className="text-xs font-mono text-[#5A7466] mb-4">
                    @{patient.username}
                  </div>

                  <div className="w-full space-y-2.5 text-xs text-left pt-4 border-t border-[#EEF2EF]">
                    <div className="flex justify-between">
                      <span className="text-[#5A7466]">Account Type</span>
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-[#E8F5EC] text-[#0B6B3A]">
                        Beneficiary
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5A7466]">Charity ID</span>
                      <span className="font-mono font-bold text-[#10241A]">{patient.patient_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5A7466]">Account Status</span>
                      <span className="font-bold text-[#0B6B3A] flex items-center gap-1">
                        <i className="fa-solid fa-circle-check text-[11px]" /> Active
                      </span>
                    </div>
                  </div>

                  {/* Privacy protection notice */}
                  <div className="mt-6 p-3 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF] text-[11px] text-[#5A7466] text-left leading-relaxed">
                    <strong className="text-[#0B6B3A] block mb-1">
                      <i className="fa-solid fa-shield-halved mr-1" /> Healthcare Privacy Protected
                    </strong>
                    Your records are handled in strict compliance with medical confidentiality standards. Only assigned social workers can view your case history.
                  </div>
                </div>

                {/* Right Column: Forms */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Personal & Contact Information Card */}
                  <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
                    <div className="mb-4">
                      <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] mb-1">
                        Personal &amp; Contact Information
                      </h3>
                      <p className="text-xs text-[#5A7466]">
                        Keep your contact information up to date so the medical social service team can reach you regarding assistance releases and interview schedules.
                      </p>
                    </div>

                    <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-semibold text-[#10241A] mb-1">
                          Full Legal Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Mobile / Contact Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-[#10241A] mb-1">
                          System Username (Non-editable)
                        </label>
                        <input
                          type="text"
                          value={patient.username}
                          readOnly
                          className="w-full h-10 px-3.5 border border-[#EEF2EF] rounded-lg text-xs bg-[#FAFBF8] text-[#5A7466] cursor-not-allowed"
                        />
                        <span className="text-[11px] text-[#5A7466] mt-1 block">
                          Username is permanently assigned to your charity patient record.
                        </span>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        {profileSaved && (
                          <span className="text-xs text-[#0B6B3A] font-bold">
                            ✓ Profile information saved successfully!
                          </span>
                        )}
                        <button
                          type="submit"
                          className="ml-auto px-5 py-2.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                        >
                          <i className="fa-solid fa-floppy-disk text-xs" />
                          <span>Save Profile Changes</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Change My Portal Password Card */}
                  <div className="bg-white rounded-2xl border border-[#EEF2EF] shadow-xs p-6">
                    <div className="mb-4">
                      <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] mb-1 flex items-center gap-2">
                        <i className="fa-solid fa-key text-[#0B6B3A]" />
                        <span>Change My Portal Password</span>
                      </h3>
                      <p className="text-xs text-[#5A7466]">
                        Maintain strong credentials to protect sensitive ophthalmology patient records, consultation schedules, and clinical logs.
                      </p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-semibold text-[#10241A] mb-1">
                          Current Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPass ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter your existing account password"
                            required
                            className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPass(!showCurrentPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9E96]"
                          >
                            <i className={`fa-regular ${showCurrentPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            New Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            required
                            className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-[#10241A] mb-1">
                            Confirm New Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                            className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#EEF2EF] flex items-center justify-between">
                        {passUpdated && (
                          <span className="text-[11px] text-[#0B6B3A] font-bold">
                            ✓ Password updated successfully!
                          </span>
                        )}
                        <button
                          type="submit"
                          className="ml-auto px-5 py-2.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                        >
                          <i className="fa-solid fa-shield-check text-[11px]" />
                          <span>Update Password</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: SETTINGS & PREFERENCES (Matching User's Reference Screenshot)
             ======================================================== */}
          {activeTab === 'settings' && (
            <div className="w-full pb-12">
              {/* Horizontal 7-Tab Navigation Bar matching screenshot */}
              <div className="bg-white border border-[#D5E2D9] rounded-2xl p-2 mb-6 shadow-xs overflow-x-auto">
                <div className="flex items-center gap-1 sm:gap-2 min-w-max">
                  <button
                    type="button"
                    onClick={() => setSettingsActiveSubTab('profile')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                      settingsActiveSubTab === 'profile'
                        ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                        : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <i className="fa-solid fa-user text-xs" />
                    <span>01. My Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsActiveSubTab('security')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                      settingsActiveSubTab === 'security'
                        ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                        : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <i className="fa-solid fa-lock text-xs" />
                    <span>02. Account Security</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsActiveSubTab('appointments')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                      settingsActiveSubTab === 'appointments'
                        ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                        : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <i className="fa-regular fa-calendar-check text-xs" />
                    <span>03. Appointment Preferences</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsActiveSubTab('notifications')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                      settingsActiveSubTab === 'notifications'
                        ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                        : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <i className="fa-solid fa-bell text-xs" />
                    <span>04. Notifications</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsActiveSubTab('privacy')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                      settingsActiveSubTab === 'privacy'
                        ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                        : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <i className="fa-solid fa-shield-halved text-xs" />
                    <span>05. Privacy &amp; Consent</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsActiveSubTab('accessibility')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                      settingsActiveSubTab === 'accessibility'
                        ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                        : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <i className="fa-solid fa-universal-access text-xs" />
                    <span>06. Accessibility</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsActiveSubTab('account')}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border-0 ${
                      settingsActiveSubTab === 'account'
                        ? 'text-[#0B6B3A] border-b-2 border-[#0B6B3A] bg-[#E8F5EC]/60 font-bold'
                        : 'text-[#64748B] hover:text-[#10241A] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <i className="fa-solid fa-user-gear text-xs" />
                    <span>07. Account Management</span>
                  </button>
                </div>
              </div>

              {/* Card Container */}
              <div className="bg-white rounded-2xl border border-[#D5E2D9] p-6 sm:p-8 shadow-xs">
                {/* SUBTAB 01: Beneficiary Personal Details */}
                {settingsActiveSubTab === 'profile' && (
                  <div>
                    <div className="mb-6">
                      <h3 className="font-['Outfit'] text-lg font-bold text-[#10241A] flex items-center gap-2 m-0 mb-1.5">
                        <i className="fa-solid fa-user text-[#0B6B3A] text-base" />
                        <span>Beneficiary Personal Details</span>
                      </h3>
                      <p className="text-xs text-[#5A7466] m-0 leading-relaxed">
                        Your verified patient details on file with the OFPHIL Eye Center. You may update your contact details and emergency relative below.
                      </p>
                    </div>

                    <form onSubmit={handleSettingsProfileSubmit} className="space-y-6">
                      {/* Row 1: Full Name & Email Address */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-[#334155] mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={settingsFullName}
                            onChange={(e) => setSettingsFullName(e.target.value)}
                            required
                            className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#334155] mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={settingsEmail}
                            onChange={(e) => setSettingsEmail(e.target.value)}
                            className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                          />
                        </div>
                      </div>

                      {/* Row 2: Assigned Patient ID & Contact Mobile Number */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-[#334155] mb-2">
                            Assigned Patient ID No.
                          </label>
                          <input
                            type="text"
                            value={patient.patient_id}
                            readOnly
                            className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm font-mono bg-[#F8FAFC] text-[#5A7466] cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#334155] mb-2">
                            Contact Mobile Number (For OTP)
                          </label>
                          <input
                            type="tel"
                            value={settingsPhone}
                            onChange={(e) => setSettingsPhone(e.target.value)}
                            required
                            className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                          />
                        </div>
                      </div>

                      {/* Row 3: Registered Home Address & Emergency Contact Relative */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-[#334155] mb-2">
                            Registered Home Address
                          </label>
                          <input
                            type="text"
                            value={settingsAddress}
                            onChange={(e) => setSettingsAddress(e.target.value)}
                            className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#334155] mb-2">
                            Emergency Contact Relative
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Maria Magpantay (Daughter - 0917-000-1111)"
                            value={settingsEmergency}
                            onChange={(e) => setSettingsEmergency(e.target.value)}
                            className="w-full h-12 px-4 border border-[#CBD5E1] rounded-xl text-sm bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 transition"
                          />
                        </div>
                      </div>

                      {/* Action Button matching screenshot */}
                      <div className="flex items-center justify-between pt-4 border-t border-[#EEF2EF]">
                        {settingsSaved ? (
                          <span className="text-xs text-[#0B6B3A] font-bold">
                            ✓ Details updated and recorded on file!
                          </span>
                        ) : <span />}

                        <button
                          type="submit"
                          className="px-6 py-3 rounded-xl bg-[#0B6B3A] hover:bg-[#064826] text-white text-xs font-bold border-none cursor-pointer flex items-center gap-2 transition shadow-md"
                        >
                          <i className="fa-solid fa-floppy-disk text-xs" />
                          <span>Save My Profile Details</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* SUBTAB 02: Account Security */}
                {settingsActiveSubTab === 'security' && (
                  <div className="space-y-4 text-xs">
                    <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2">
                      <i className="fa-solid fa-lock text-[#0B6B3A]" />
                      <span>Account Security &amp; Sign-In Password</span>
                    </h3>
                    <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF] space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[#5A7466]">Login Identifier:</span>
                        <strong className="text-[#10241A] font-mono">{patient.patient_id}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#5A7466]">Account Verification:</span>
                        <span className="px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-[#E8F5EC] text-[#0B6B3A]">
                          Verified Beneficiary (ID + DOB + OTP)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              {/* SUBTAB 03: Appointment Preferences */}
              {settingsActiveSubTab === 'appointments' && (
                <div className="space-y-4 text-xs">
                  <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2">
                    <i className="fa-solid fa-calendar-check text-[#0B6B3A]" />
                    <span>Clinic Visit &amp; Follow-Up Reminders</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-[#10241A] mb-1">
                        Preferred Reminder Channel
                      </label>
                      <select className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]">
                        <option>SMS Mobile Text &amp; Email (Recommended)</option>
                        <option>SMS Text Message Only</option>
                        <option>Email Notification Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#10241A] mb-1">
                        Reminder Timing
                      </label>
                      <select className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]">
                        <option>2 Days and 1 Day Prior to Scheduled Eye Checkup</option>
                        <option>1 Day Prior Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 04: Notifications */}
              {settingsActiveSubTab === 'notifications' && (
                <div className="space-y-4 text-xs">
                  <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2">
                    <i className="fa-solid fa-bell text-[#0B6B3A]" />
                    <span>Application Status Alerts</span>
                  </h3>
                  <div className="space-y-2.5 max-w-lg">
                    <label className="p-3.5 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8] flex items-center justify-between cursor-pointer">
                      <span>Email alert when my surgery financial subsidy is approved</span>
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#0B6B3A]" />
                    </label>
                    <label className="p-3.5 rounded-xl border border-[#EEF2EF] bg-[#FAFBF8] flex items-center justify-between cursor-pointer">
                      <span>Notice when medical social worker requests additional documents</span>
                      <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#0B6B3A]" />
                    </label>
                  </div>
                </div>
              )}

              {/* SUBTAB 05: Privacy & Consent */}
              {settingsActiveSubTab === 'privacy' && (
                <div className="space-y-4 text-xs">
                  <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-[#0B6B3A]" />
                    <span>Data Privacy Notice &amp; Beneficiary Consent</span>
                  </h3>
                  <div className="bg-[#FAFBF8] p-4 rounded-xl border border-[#EEF2EF] text-[#5A7466] leading-relaxed">
                    <strong className="text-[#0B6B3A] block mb-1">Under Republic Act No. 10173 (Data Privacy Act of 2012):</strong>
                    Your income details, hospital bill quotations, and medical diagnoses are kept strictly confidential. They are viewed solely by accredited OFPHIL medical social workers to disburse surgery subsidies.
                  </div>
                  <div className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check" />
                    <span>Patient Electronic Consent on File (Agreed during application intake).</span>
                  </div>
                </div>
              )}

              {/* SUBTAB 06: Accessibility */}
              {settingsActiveSubTab === 'accessibility' && (
                <div className="space-y-4 text-xs">
                  <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2">
                    <i className="fa-solid fa-universal-access text-[#0B6B3A]" />
                    <span>Display &amp; Visual Comfort (Low-Vision Reading Aid)</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-[#10241A] mb-1">
                        Font Size (Reading Aid for Eye Patients)
                      </label>
                      <select className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]">
                        <option>Standard (100%)</option>
                        <option>Comfortable Reading (110%)</option>
                        <option>Large Text (120% — Recommended for low-vision patients)</option>
                        <option>Extra Large Text (130%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#10241A] mb-1">
                        Visual Theme &amp; Contrast Mode
                      </label>
                      <select className="w-full h-10 px-3.5 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]">
                        <option>Studio Clinical Light (Default)</option>
                        <option>Ophthalmic High-Contrast Mode (Bold Borders for Cataract)</option>
                        <option>Dark / Low-Glare Mode</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 07: Account Management */}
              {settingsActiveSubTab === 'account' && (
                <div className="space-y-4 text-xs">
                  <h3 className="font-['Outfit'] text-[16px] font-bold text-[#10241A] flex items-center gap-2">
                    <i className="fa-solid fa-user-xmark text-[#0B6B3A]" />
                    <span>Personal Data Correction &amp; Help Desk</span>
                  </h3>
                  <p className="text-[#5A7466]">
                    If you need to correct your medical quotation, change your mobile number, or request account review, our clinic desk is ready to help.
                  </p>
                  <div className="flex gap-3">
                    <Link
                      href="/login-patient"
                      className="px-4 py-2.5 rounded-lg border border-[#D5E2D9] text-[#10241A] font-semibold hover:bg-[#FAFBF8] transition"
                    >
                      Sign Out of Portal
                    </Link>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
        </>
      )}
    </PatientAppShell>
  );
}

export default function PatientPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFBF8] p-8 space-y-6 animate-pulse">
          <div className="h-20 rounded-2xl skeleton w-full" />
          <div className="h-64 rounded-2xl skeleton w-full" />
        </div>
      }
    >
      <PatientPortalContent />
    </Suspense>
  );
}
