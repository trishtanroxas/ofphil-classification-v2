'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { ScanText, Play, CheckCircle2, FileCode, Clock } from 'lucide-react';

export default function OCRPage() {
  const [docId, setDocId] = useState('doc-syn-101');
  const [engine, setEngine] = useState('PaddleOCR');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRunOCR = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/ocr', {
        method: 'POST',
        body: JSON.stringify({
          document_id: docId,
          engine: engine,
          preprocess: true,
        }),
      });
      setResult(data);
    } catch (err: any) {
      alert(`OCR Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#10241A]">
            3. Standard OCR Processing (PaddleOCR Engine)
          </h1>
          <p className="text-xs text-[#5A7466]">
            Extract printed and structured text fields from synthetic indigency documents with text angle detection and bounding polygons.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm space-y-4">
            <h2 className="text-sm font-heading font-semibold text-[#10241A]">
              OCR Execution Parameters
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#10241A] mb-1">
                  Synthetic Target Document
                </label>
                <select
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg"
                >
                  <option value="doc-syn-101">synthetic_barangay_indigency_001.pdf</option>
                  <option value="doc-syn-102">synthetic_clinical_abstract_002.png</option>
                  <option value="doc-syn-103">synthetic_income_declaration_003.pdf</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#10241A] mb-1">
                  Engine &amp; Backbone
                </label>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg"
                >
                  <option value="PaddleOCR">PaddleOCR v2.6 (PP-OCRv4 Server)</option>
                  <option value="PaddleOCR-Mobile">PaddleOCR Mobile (Lightweight)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleRunOCR}
                disabled={loading}
                className="w-full py-2.5 bg-[#0B6B3A] text-white font-semibold rounded-lg hover:bg-[#064826] transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>Processing OCR...</>
                ) : (
                  <>
                    <Play size={15} /> Execute PaddleOCR Inference
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#D5E2D9] pb-3 mb-4">
                <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-[#5A7466]">
                  Extracted OCR Output &amp; Key-Value Schema
                </h3>
                {result && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                    Confidence: {(result.confidence_score * 100).toFixed(1)}% ({result.processing_time_ms}ms)
                  </span>
                )}
              </div>

              {result ? (
                <div className="space-y-4">
                  <div className="p-3 bg-[#FAFBF8] border border-[#D5E2D9] rounded-lg font-mono text-xs whitespace-pre-wrap leading-relaxed text-[#10241A]">
                    {result.extracted_text}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[#10241A] mb-2">Detected Structured Key-Values:</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(result.fields_detected || {}).map(([key, val]: any) => (
                        <div key={key} className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9]">
                          <div className="text-[10px] text-[#5A7466] uppercase font-mono">{key}</div>
                          <div className="font-semibold text-[#10241A]">{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-[#5A7466] text-xs">
                  <ScanText size={36} className="mb-2 opacity-40 text-[#0B6B3A]" />
                  <span>Select a document and run the OCR inference pipeline.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
