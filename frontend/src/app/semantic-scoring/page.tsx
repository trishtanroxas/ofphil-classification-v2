'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { Award, Play } from 'lucide-react';

export default function SemanticScoringPage() {
  const [narrative, setNarrative] = useState(
    'Applicant family resides in an informal settlement along the riverbank. Head of household works informal seasonal labor earning approx PHP 4,000 monthly with 5 school-age dependents. Patient suffers severe bilateral cataract impairing ability to work.'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScore = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/semantic-scoring', {
        method: 'POST',
        body: JSON.stringify({
          narrative_text: narrative,
          justification_target: 'indigency_justification',
        }),
      });
      setResult(data);
    } catch (err: any) {
      alert(`Scoring Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#10241A]">
            6. Semantic Assessment Scoring
          </h1>
          <p className="text-xs text-[#5A7466]">
            Quantify narrative consistency, social indigency indicators, and ophthalmological urgency into calibrated continuous features for CatBoost.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm space-y-4">
            <h2 className="text-sm font-heading font-semibold text-[#10241A]">
              Social Worker Narrative Input
            </h2>
            <textarea
              rows={6}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              className="w-full p-3 text-xs border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
            />
            <button
              onClick={handleScore}
              disabled={loading}
              className="w-full py-2.5 bg-[#0B6B3A] text-white text-xs font-semibold rounded-lg hover:bg-[#064826] transition flex items-center justify-center gap-2"
            >
              <Award size={15} /> {loading ? 'Scoring Assessment...' : 'Compute Semantic Indigency Index'}
            </button>
          </div>

          <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-[#5A7466] border-b border-[#D5E2D9] pb-3 mb-4">
                Semantic Evaluation Scores
              </h3>

              {result ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-[#E6F1EA] rounded-xl border border-[#D5E2D9] text-center">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B3A]">
                      Composite Indigency Score
                    </div>
                    <div className="text-3xl font-heading font-bold text-[#064826] mt-1">
                      {(result.composite_semantic_score * 100).toFixed(0)} / 100
                    </div>
                    <p className="text-[11px] text-[#2E4538] mt-1">{result.summary}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between p-2 rounded bg-[#FAFBF8] border border-[#D5E2D9]">
                      <span className="text-[#5A7466]">Relevance to Charity Criteria</span>
                      <strong className="text-[#10241A]">{(result.relevance_score * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-[#FAFBF8] border border-[#D5E2D9]">
                      <span className="text-[#5A7466]">Internal Narrative Consistency</span>
                      <strong className="text-[#10241A]">{(result.consistency_score * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-[#FAFBF8] border border-[#D5E2D9]">
                      <span className="text-[#5A7466]">Clinical Ophthalmic Urgency</span>
                      <strong className="text-[#10241A]">{(result.urgency_score * 100).toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-[#5A7466]">
                  Enter narrative and score the assessment.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
