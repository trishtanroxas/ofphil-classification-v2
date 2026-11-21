'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FileText, Wand2, Download, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function DocumentGenerationPage() {
  const [docType, setDocType] = useState('Barangay Indigency Certificate');
  const [applicantName, setApplicantName] = useState('Juan Dela Cruz');
  const [jurisdiction, setJurisdiction] = useState('Barangay San Antonio, Pasig City');
  const [includeOfficialSeal, setIncludeOfficialSeal] = useState(true);
  const [generatedDoc, setGeneratedDoc] = useState<any>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratedDoc({
      title: docType,
      applicant: applicantName,
      jurisdiction: jurisdiction,
      dateIssued: '2026-11-19',
      hasSeal: includeOfficialSeal,
      hasSignature: true,
      syntheticRef: `SYN-DOC-${Math.floor(Math.random() * 900000 + 100000)}`
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#10241A]">
            2. Synthetic Document Generation
          </h1>
          <p className="text-xs text-[#5A7466]">
            Procedurally render synthetic certificates and clinical abstracts with customizable seals and signatures for OCR/YOLO training.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm space-y-4">
            <h2 className="text-sm font-heading font-semibold text-[#10241A] flex items-center gap-2">
              <Wand2 size={16} className="text-[#0B6B3A]" /> Generator Parameters
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#10241A] mb-1">Document Template</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                >
                  <option value="Barangay Indigency Certificate">Barangay Indigency Certificate</option>
                  <option value="Clinical Abstract & Referral">Clinical Abstract &amp; Referral</option>
                  <option value="Certificate of Low Income">Certificate of Low Income</option>
                  <option value="DSWD Case Study Report">DSWD Case Study Report</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#10241A] mb-1">Synthetic Applicant Name</label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#10241A] mb-1">Issuing Authority / Barangay</label>
                <input
                  type="text"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                />
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeOfficialSeal}
                    onChange={(e) => setIncludeOfficialSeal(e.target.checked)}
                    className="rounded text-[#0B6B3A] focus:ring-[#0B6B3A]"
                  />
                  <span>Render Synthetic Official Seal (for YOLO Detection)</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#0B6B3A] text-white font-semibold rounded-lg hover:bg-[#064826] transition"
              >
                Render Synthetic Document
              </button>
            </form>
          </div>

          {/* Document Preview Canvas */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#D5E2D9] pb-3 mb-4">
                <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-[#5A7466]">
                  Render Preview Canvas
                </h3>
                {generatedDoc && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#E6F1EA] text-[#0B6B3A] font-medium">
                    {generatedDoc.syntheticRef}
                  </span>
                )}
              </div>

              {generatedDoc ? (
                <div className="p-8 border border-dashed border-[#D5E2D9] rounded-lg bg-[#FAFBF8] space-y-6 text-[#10241A] max-w-lg mx-auto">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] tracking-widest uppercase text-[#5A7466]">Republic of the Philippines</p>
                    <p className="text-xs font-bold uppercase">{generatedDoc.jurisdiction}</p>
                    <h4 className="text-base font-heading font-bold text-[#0B6B3A] pt-2">
                      {generatedDoc.title}
                    </h4>
                  </div>

                  <p className="text-xs leading-relaxed">
                    This is to certify that <strong>{generatedDoc.applicant}</strong>, Filipino, of legal age, is a bona fide resident of this community. Based on clinical assessment records and social worker intake, the aforementioned individual is classified under the indigent bracket and is eligible for subsidized ophthalmological surgical care under the OFPHIL Foundation assistance program.
                  </p>

                  <div className="flex items-end justify-between pt-8 text-xs">
                    <div className="space-y-1">
                      {generatedDoc.hasSeal && (
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#0B6B3A] flex items-center justify-center text-[9px] font-bold text-[#0B6B3A] rotate-[-12deg]">
                          [SEAL]
                        </div>
                      )}
                      <p className="text-[10px] text-[#5A7466]">Date: {generatedDoc.dateIssued}</p>
                    </div>

                    <div className="text-center">
                      <div className="font-serif italic text-sm text-[#064826] underline decoration-wavy">
                        Hon. Mariano Santos
                      </div>
                      <p className="text-[10px] font-semibold text-[#5A7466]">Barangay Captain / Officer-in-Charge</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-[#5A7466] text-xs">
                  <FileText size={36} className="mb-2 opacity-40 text-[#0B6B3A]" />
                  <span>Configure parameters and click "Render Synthetic Document"</span>
                </div>
              )}
            </div>

            {generatedDoc && (
              <div className="mt-4 pt-4 border-t border-[#D5E2D9] flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => alert('Document registered in experimental storage')}
                  className="px-4 py-2 bg-[#0B6B3A] text-white rounded-lg font-semibold hover:bg-[#064826]"
                >
                  Send to OCR Pipeline
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
