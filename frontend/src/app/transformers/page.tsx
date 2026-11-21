'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { Cpu, Play, Sparkles, CheckCircle2 } from 'lucide-react';

export default function TransformersPage() {
  const [model, setModel] = useState('microsoft/trocr-base-stage1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/transformers', {
        method: 'POST',
        body: JSON.stringify({
          document_id: 'doc-syn-102',
          model_name: model,
          task: 'handwritten_recognition',
        }),
      });
      setResult(data);
    } catch (err: any) {
      alert(`Transformer OCR Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#10241A]">
            4. Transformer-Based OCR (TrOCR &amp; Donut)
          </h1>
          <p className="text-xs text-[#5A7466]">
            Deep vision-encoder-decoder transformers for cursive clinical notes, physician prescriptions, and doctor sign-offs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm space-y-4">
            <h2 className="text-sm font-heading font-semibold text-[#10241A]">
              Transformer Model Settings
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#10241A] mb-1">
                  Model Checkpoint
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg"
                >
                  <option value="microsoft/trocr-base-stage1">TrOCR Base (Handwritten Fine-tuned)</option>
                  <option value="microsoft/trocr-large-handwritten">TrOCR Large (High Precision)</option>
                  <option value="naver-clova-ix/donut-base">Donut (Document Understanding Transformer)</option>
                </select>
              </div>

              <div className="p-3 bg-[#E6F1EA] rounded-lg border border-[#D5E2D9] text-[#064826]">
                <strong className="block mb-1">Compute Notice:</strong>
                Transformer inference executes in the dedicated backend Python compute environment. Vercel routes payloads asynchronously to avoid timeout limits.
              </div>

              <button
                type="button"
                onClick={handleRun}
                disabled={loading}
                className="w-full py-2.5 bg-[#0B6B3A] text-white font-semibold rounded-lg hover:bg-[#064826] transition flex items-center justify-center gap-2"
              >
                {loading ? 'Evaluating Transformer Sequence...' : <><Play size={15} /> Run TrOCR Evaluation</>}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#D5E2D9] pb-3 mb-4">
                <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-[#5A7466]">
                  Transformer Sequence Generation
                </h3>
                {result && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                    Latency: {result.processing_time_ms}ms
                  </span>
                )}
              </div>

              {result ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[#FAFBF8] border border-[#D5E2D9] rounded-lg font-mono text-xs leading-relaxed text-[#10241A]">
                    {result.extracted_text}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[#10241A] mb-2">Parsed Clinical Entities:</h4>
                    <div className="space-y-2 text-xs">
                      {Object.entries(result.fields_detected || {}).map(([key, val]: any) => (
                        <div key={key} className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] flex justify-between">
                          <span className="text-[#5A7466] font-mono capitalize">{key.replace('_', ' ')}</span>
                          <span className="font-semibold text-[#10241A]">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-[#5A7466] text-xs">
                  <Cpu size={36} className="mb-2 opacity-40 text-[#0B6B3A]" />
                  <span>Execute transformer inference on synthetic clinical records.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
