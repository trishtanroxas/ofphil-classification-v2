'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { Search, Play } from 'lucide-react';

export default function ExplainabilityPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleExplain = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/explainability', {
        method: 'POST',
        body: JSON.stringify({ applicant_id: 'APP-SYN-001' }),
      });
      setResult(data);
    } catch (err: any) {
      alert(`SHAP Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#10241A]">
            10. SHAP Explainability (Shapley Additive Explanations)
          </h1>
          <p className="text-xs text-[#5A7466]">
            Interpret CatBoost decisions via game-theoretic Shapley values to ensure transparency for medical social workers and clinical auditors.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-heading font-semibold text-[#10241A]">
              Model Interpretability Inspector
            </h2>
            <button
              onClick={handleExplain}
              disabled={loading}
              className="px-4 py-2 bg-[#0B6B3A] text-white text-xs font-semibold rounded-lg hover:bg-[#064826] transition flex items-center gap-2"
            >
              <Search size={14} /> {loading ? 'Computing SHAP...' : 'Generate SHAP Waterfall Plot Data'}
            </button>
          </div>

          {result ? (
            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-[#FAFBF8] border border-[#D5E2D9] rounded-lg">
                <span className="font-semibold text-[#10241A]">Base Value (Expected Model Output):</span>{' '}
                <span className="font-mono text-[#0B6B3A]">{result.base_value}</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#10241A] mb-2">Individual Feature SHAP Contributions:</h4>
                <div className="space-y-2">
                  {Object.entries(result.shap_values || {}).map(([feat, val]: any) => (
                    <div key={feat} className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9] flex justify-between items-center">
                      <span className="font-mono text-[#10241A]">{feat}</span>
                      <span className={`font-bold font-mono ${val >= 0 ? 'text-[#0B6B3A]' : 'text-rose-700'}`}>
                        {val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-[#5A7466]">
              Click "Generate SHAP Waterfall Plot Data" to compute local feature attributions.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
