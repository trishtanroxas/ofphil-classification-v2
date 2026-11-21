'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { GitBranch, Play, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ClassificationPage() {
  const [name, setName] = useState('Juan Dela Cruz');
  const [income, setIncome] = useState(8500);
  const [size, setSize] = useState(5);
  const [philhealth, setPhilhealth] = useState('Indigent');
  const [semanticScore, setSemanticScore] = useState(0.88);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await fetchApi('/classification', {
        method: 'POST',
        body: JSON.stringify({
          applicant_name: name,
          monthly_income: Number(income),
          household_size: Number(size),
          philhealth_category: philhealth,
          housing_type: 'Informal Settlement',
          semantic_score: Number(semanticScore),
          stamp_verified: true,
          signature_verified: true,
          tamper_risk: 'clean',
        }),
      });
      setResult(data);
    } catch (err: any) {
      alert(`Classification Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#10241A]">
            9. CatBoost Multimodal Classification
          </h1>
          <p className="text-xs text-[#5A7466]">
            Gradient boosted decision trees over categorical clinical demographics, continuous household economics, and multimodal OCR document scores.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm space-y-4">
            <h2 className="text-sm font-heading font-semibold text-[#10241A]">
              Applicant Multimodal Features
            </h2>

            <form onSubmit={handleClassify} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#10241A] mb-1">Applicant Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#10241A] mb-1">Monthly Income (PHP)</label>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#10241A] mb-1">Household Size</label>
                  <input
                    type="number"
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#10241A] mb-1">PhilHealth Category</label>
                  <select
                    value={philhealth}
                    onChange={(e) => setPhilhealth(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg"
                  >
                    <option value="Indigent">Indigent</option>
                    <option value="Direct Contributor">Direct Contributor</option>
                    <option value="Senior Citizen">Senior Citizen</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#10241A] mb-1">
                  Extracted Semantic Score (0.0 - 1.0)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={semanticScore}
                  onChange={(e) => setSemanticScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#D5E2D9] rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 bg-[#0B6B3A] text-white font-semibold rounded-lg hover:bg-[#064826] transition flex items-center justify-center gap-2"
              >
                <GitBranch size={15} /> {loading ? 'Classifying...' : 'Predict Eligibility via CatBoost'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-[#5A7466] border-b border-[#D5E2D9] pb-3 mb-4">
                CatBoost Prediction Outcome
              </h3>

              {result ? (
                <div className="space-y-4 text-xs">
                  <div className="p-5 rounded-xl bg-[#E6F1EA] border border-[#D5E2D9] text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B3A]">
                      Eligibility Decision
                    </span>
                    <div className="text-2xl font-heading font-bold text-[#064826] mt-1">
                      {result.eligibility_prediction}
                    </div>
                    <div className="text-xs text-[#2E4538] mt-1">
                      Category: <strong>{result.decision_category}</strong> (Probability: {(result.confidence_probability * 100).toFixed(1)}%)
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[#10241A] mb-2">Feature Importance Breakdown:</h4>
                    <div className="space-y-2">
                      {result.feature_importance_top.map((f: any) => (
                        <div key={f.feature} className="p-2.5 rounded bg-[#FAFBF8] border border-[#D5E2D9]">
                          <div className="flex justify-between font-mono text-[11px] mb-1">
                            <span className="text-[#10241A]">{f.feature}</span>
                            <span className="text-[#0B6B3A] font-bold">{(f.importance_weight * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#0B6B3A] h-full rounded-full"
                              style={{ width: `${f.importance_weight * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-[#5A7466]">
                  Enter synthetic applicant features to evaluate CatBoost eligibility.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
