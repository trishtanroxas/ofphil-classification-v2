'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export default function DocumentAnalysisPage() {
  const [docId, setDocId] = useState('doc-syn-101');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScreen = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/document-analysis', {
        method: 'POST',
        body: JSON.stringify({
          document_id: docId,
          run_tamper_screening: true,
          run_font_consistency_check: true,
        }),
      });
      setResult(data);
    } catch (err: any) {
      alert(`Screening Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#10241A]">
            8. Document Manipulation Screening
          </h1>
          <p className="text-xs text-[#5A7466]">
            Error Level Analysis (ELA) and copy-move forgery detection to flag spliced dates, altered names, or forged income declarations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm space-y-4">
            <h2 className="text-sm font-heading font-semibold text-[#10241A]">
              Screening Options
            </h2>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#10241A] mb-1">Target Document</label>
                <select
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg"
                >
                  <option value="doc-syn-101">synthetic_barangay_indigency_001.pdf</option>
                  <option value="doc-syn-102">synthetic_clinical_abstract_002.png</option>
                </select>
              </div>

              <button
                onClick={handleScreen}
                disabled={loading}
                className="w-full py-2.5 bg-[#0B6B3A] text-white font-semibold rounded-lg hover:bg-[#064826] transition flex items-center justify-center gap-2"
              >
                <ShieldAlert size={15} /> {loading ? 'Scanning Forensic Layers...' : 'Run Forensic Integrity Screening'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-[#5A7466] border-b border-[#D5E2D9] pb-3 mb-4">
                Forensic Screening Report
              </h3>

              {result ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-[#FAFBF8] border border-[#D5E2D9] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-[#5A7466]">Tamper Risk Assessment</div>
                      <div className="text-lg font-heading font-bold text-emerald-700">
                        {result.tamper_risk_level}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-[#5A7466]">Anomaly Score</div>
                      <div className="text-lg font-heading font-bold text-[#10241A]">
                        {(result.anomaly_score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-[#D5E2D9] rounded-lg">
                    <span className="font-semibold text-[#10241A] block mb-1">Metadata Integrity</span>
                    <span className="text-[#5A7466]">{result.metadata_integrity}</span>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-[#5A7466]">
                  Select synthetic document to inspect for compression artifacts or tampering.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
