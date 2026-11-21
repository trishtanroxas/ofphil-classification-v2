'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { Binary, Play } from 'lucide-react';

export default function EmbeddingsPage() {
  const [text, setText] = useState('Patient is an elderly single vendor with bilateral cataracts and no steady household provider.');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<any>(null);

  const handleEmbed = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/embeddings', {
        method: 'POST',
        body: JSON.stringify({ text_content: text }),
      });
      setRes(data);
    } catch (err: any) {
      alert(`Embedding Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#10241A]">
            5. Semantic Embeddings (Sentence-BERT)
          </h1>
          <p className="text-xs text-[#5A7466]">
            Dense mathematical representations of applicant social history and medical justifications for downstream tabular integration.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm space-y-4">
          <label className="block text-xs font-semibold text-[#10241A]">
            Applicant Social Narrative / Clinical Summary
          </label>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-3 text-xs border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
          />

          <button
            onClick={handleEmbed}
            disabled={loading}
            className="px-5 py-2.5 bg-[#0B6B3A] text-white text-xs font-semibold rounded-lg hover:bg-[#064826] transition flex items-center gap-2"
          >
            <Binary size={15} /> {loading ? 'Embedding...' : 'Generate 384-D Sentence-BERT Vector'}
          </button>

          {res && (
            <div className="mt-4 p-4 bg-[#FAFBF8] border border-[#D5E2D9] rounded-lg space-y-3 text-xs">
              <div className="flex justify-between font-semibold text-[#10241A]">
                <span>Model: {res.model}</span>
                <span>Embedding Dim: {res.dimension}</span>
              </div>
              <div>
                <p className="text-[11px] text-[#5A7466] mb-1">Vector Coordinates (Normalized Sample):</p>
                <div className="bg-white p-3 rounded border border-[#D5E2D9] font-mono text-[11px] text-[#0B6B3A] overflow-x-auto">
                  [{res.vector_sample.map((n: number) => n.toFixed(4)).join(', ')}, ...]
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
