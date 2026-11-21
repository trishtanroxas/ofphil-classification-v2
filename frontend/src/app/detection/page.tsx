'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { Stamp, ShieldCheck, Play } from 'lucide-react';

export default function DetectionPage() {
  const [docId, setDocId] = useState('doc-syn-101');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleDetect = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/detection', {
        method: 'POST',
        body: JSON.stringify({
          document_id: docId,
          model_type: 'YOLOv8-OFPHIL-Stamps',
          confidence_threshold: 0.45,
        }),
      });
      setResult(data);
    } catch (err: any) {
      alert(`Detection Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#10241A]">
            7. Stamp &amp; Signature Detection (YOLO)
          </h1>
          <p className="text-xs text-[#5A7466]">
            YOLOv8 object localization model trained to verify official barangay rubber stamps, dry seals, and authorized signatures.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm space-y-4">
            <h2 className="text-sm font-heading font-semibold text-[#10241A]">
              Detection Configuration
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

              <div>
                <label className="block font-semibold text-[#10241A] mb-1">Architecture</label>
                <div className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] font-mono">
                  YOLOv8-Small Custom Checkpoint (PyTorch)
                </div>
              </div>

              <button
                onClick={handleDetect}
                disabled={loading}
                className="w-full py-2.5 bg-[#0B6B3A] text-white font-semibold rounded-lg hover:bg-[#064826] transition flex items-center justify-center gap-2"
              >
                <Stamp size={15} /> {loading ? 'Running YOLO...' : 'Run Seal & Signature Localization'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#D5E2D9] pb-3 mb-4">
                <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-[#5A7466]">
                  Detected Bounding Regions
                </h3>
                {result && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium capitalize">
                    {result.verification_status.replace('_', ' ')}
                  </span>
                )}
              </div>

              {result ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-lg bg-[#FAFBF8] border border-[#D5E2D9]">
                      <div className="text-[10px] text-[#5A7466] uppercase">Stamps Found</div>
                      <div className="text-xl font-bold text-[#10241A]">{result.stamps_detected}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#FAFBF8] border border-[#D5E2D9]">
                      <div className="text-[10px] text-[#5A7466] uppercase">Signatures Found</div>
                      <div className="text-xl font-bold text-[#10241A]">{result.signatures_detected}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {result.bounding_boxes.map((b: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-[#10241A] font-mono">{b.label}</span>
                          <span className="text-[10px] text-[#5A7466] block">
                            Box coordinates: [{b.box.join(', ')}]
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-[#0B6B3A]">
                          {(b.confidence * 100).toFixed(1)}% conf
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-[#5A7466]">
                  Execute YOLO inference to localize document stamps.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
