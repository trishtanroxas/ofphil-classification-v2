'use client';
import React, { useState } from 'react';

export interface PerQuestionAssessmentData {
  question_key: string;
  question_text: string;
  patient_answer: string;
  response_completeness?: number | null;
  information_consistency?: number | null;
  assessment_status: string;
  explanation: string;
  msw_verification_status?: string;
}

export interface DiscrepancyItemData {
  field_a: string;
  field_b: string;
  comparison_topic: string;
  finding: string;
  discrepancy_type: 'CONTRADICTION' | 'AMBIGUOUS' | 'MISSING_DATA' | 'CONSISTENT' | string;
  explanation: string;
  possible_reasons: string[];
  msw_review_option: string;
  msw_action_status: string;
}

export interface ClarificationItemData {
  question_key?: string;
  original_answer: string;
  clarification_question: string;
  patient_clarification?: string | null;
  resolution_status: string;
  resolution_percentage?: number | null;
  explanation: string;
}

export interface InterviewAssessmentSummaryData {
  patient_id?: string;
  overall_consistency_score?: number | null;
  status?: string;
  interpretation_label?: string;
  provisional_interpretation?: string;
  information_consistency?: number | null;
  response_completeness?: number | null;
  cross_field_consistency?: number | null;
  clarification_resolution?: number | null;
  dimension_weights?: {
    information_consistency: number;
    response_completeness: number;
    cross_field_consistency: number;
    clarification_resolution: number;
  };
  per_question_assessments?: PerQuestionAssessmentData[];
  cross_field_discrepancies?: DiscrepancyItemData[];
  clarification_history?: ClarificationItemData[];
  unresolved_questions?: string[];
  missing_information?: string[];
  execution_mode?: string;
  model_representation?: string;
  score_label?: string;
  msw_verification_status?: string;
  disclaimer?: string;
}

interface Props {
  assessment: InterviewAssessmentSummaryData | null;
  isLoading?: boolean;
  onRefreshAssessment?: () => void;
  isReadOnly?: boolean;
}

export function InterviewAssessmentDashboard({
  assessment,
  isLoading = false,
  onRefreshAssessment,
  isReadOnly = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'per_question' | 'cross_field' | 'clarifications'>('overview');
  const [mswReviews, setMswReviews] = useState<Record<string, string>>({});

  const handleMswAction = (key: string, action: string) => {
    setMswReviews((prev) => ({ ...prev, [key]: action }));
  };

  const getScoreBadge = (score?: number | null) => {
    if (score === null || score === undefined) {
      return {
        text: 'INSUFFICIENT_DATA',
        cls: 'bg-slate-100 text-slate-700 border-slate-300',
        barCls: 'bg-slate-400',
      };
    }
    if (score >= 85) {
      return {
        text: 'Generally Consistent',
        cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        barCls: 'bg-emerald-600',
      };
    }
    if (score >= 70) {
      return {
        text: 'Minor Inconsistencies',
        cls: 'bg-blue-50 text-blue-800 border-blue-300',
        barCls: 'bg-blue-600',
      };
    }
    if (score >= 50) {
      return {
        text: 'Requires Clarification',
        cls: 'bg-amber-50 text-amber-800 border-amber-300',
        barCls: 'bg-amber-600',
      };
    }
    return {
      text: 'Significant Unresolved Inconsistencies',
      cls: 'bg-rose-50 text-rose-800 border-rose-300',
      barCls: 'bg-rose-600',
    };
  };

  const overall = assessment?.overall_consistency_score;
  const badgeInfo = getScoreBadge(overall);

  return (
    <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs overflow-hidden transition">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#F0FDF4] via-[#FAFBF8] to-[#F0FDF4] border-b border-[#E2E8F0]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B6B3A] text-white flex items-center justify-center text-lg font-bold shadow-xs">
              <i className="fa-solid fa-chart-pie" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Outfit'] font-bold text-base text-[#10241A] m-0">
                  LLM-Assisted Interview Assessment
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#E2E8F0] text-[#334155]">
                  {assessment?.execution_mode || 'PROTOTYPE_SIMULATED'}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  Qwen3-4B-Instruct-2507
                </span>
              </div>
              <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                Provisional percentage scoring across 4 approved clinical dimensions. Supporting assessment tool for MSW review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshAssessment && (
              <button
                type="button"
                onClick={onRefreshAssessment}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-semibold text-[#334155] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <i className={`fa-solid fa-arrows-rotate text-[11px] ${isLoading ? 'fa-spin text-[#0B6B3A]' : ''}`} />
                <span>{isLoading ? 'Reassessing...' : 'Re-evaluate Interview'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Prototype Regulatory Alert / Safe Guard Notice */}
        <div className="mt-3.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
          <i className="fa-solid fa-shield-halved text-amber-700 text-sm mt-0.5" />
          <div className="leading-relaxed">
            <strong>Prototype Assessment Framework (Pending Empirical Validation):</strong> The Interview Consistency Score is an objective, explainable response rubric to aid caseworkers in identifying gaps or ambiguity. It does <em>not</em> represent patient truthfulness, eligibility probability, or model confidence, and <strong>never automatically rejects patients</strong>.
          </div>
        </div>
      </div>

      {/* Main Score Cards Ribbon */}
      <div className="p-4 sm:p-5 border-b border-[#E2E8F0] bg-[#FAFBF8]">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {/* Overall Composite Score */}
          <div className="p-4 rounded-xl bg-white border-2 border-[#0B6B3A]/40 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                OVERALL SCORE (100%)
              </span>
              <span className="font-['Outfit'] font-bold text-xs text-[#0B6B3A] block mt-0.5">
                Interview Consistency Score
              </span>
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="font-['Outfit'] font-extrabold text-3xl text-[#10241A]">
                {overall !== null && overall !== undefined ? `${overall.toFixed(1)}%` : '—'}
              </span>
              <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${badgeInfo.cls}`}>
                {overall !== null && overall !== undefined ? badgeInfo.text : 'INSUFFICIENT DATA'}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${badgeInfo.barCls} transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(0, overall ?? 0))}%` }}
              />
            </div>
          </div>

          {/* Dimension 1: Information Consistency */}
          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Weight: 35%</span>
                <span className="text-[10px] font-semibold text-[#0B6B3A]">Dimension 1</span>
              </div>
              <h5 className="font-bold text-xs text-[#10241A] mt-1 mb-0">Information Consistency</h5>
            </div>
            <div className="my-1.5 flex items-baseline justify-between">
              <span className="font-['Outfit'] font-bold text-2xl text-[#10241A]">
                {assessment?.information_consistency !== null && assessment?.information_consistency !== undefined
                  ? `${assessment.information_consistency.toFixed(1)}%`
                  : '—'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Internal Coherence</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, assessment?.information_consistency ?? 0))}%` }}
              />
            </div>
          </div>

          {/* Dimension 2: Response Completeness */}
          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Weight: 25%</span>
                <span className="text-[10px] font-semibold text-[#0B6B3A]">Dimension 2</span>
              </div>
              <h5 className="font-bold text-xs text-[#10241A] mt-1 mb-0">Response Completeness</h5>
            </div>
            <div className="my-1.5 flex items-baseline justify-between">
              <span className="font-['Outfit'] font-bold text-2xl text-[#10241A]">
                {assessment?.response_completeness !== null && assessment?.response_completeness !== undefined
                  ? `${assessment.response_completeness.toFixed(1)}%`
                  : '—'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Content Depth</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, assessment?.response_completeness ?? 0))}%` }}
              />
            </div>
          </div>

          {/* Dimension 3: Cross-Field Consistency */}
          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Weight: 25%</span>
                <span className="text-[10px] font-semibold text-[#0B6B3A]">Dimension 3</span>
              </div>
              <h5 className="font-bold text-xs text-[#10241A] mt-1 mb-0">Cross-Field Consistency</h5>
            </div>
            <div className="my-1.5 flex items-baseline justify-between">
              <span className="font-['Outfit'] font-bold text-2xl text-[#10241A]">
                {assessment?.cross_field_consistency !== null && assessment?.cross_field_consistency !== undefined
                  ? `${assessment.cross_field_consistency.toFixed(1)}%`
                  : '—'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Cross-Answer Fit</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, assessment?.cross_field_consistency ?? 0))}%` }}
              />
            </div>
          </div>

          {/* Dimension 4: Clarification Resolution */}
          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#64748B]">Weight: 15%</span>
                <span className="text-[10px] font-semibold text-[#0B6B3A]">Dimension 4</span>
              </div>
              <h5 className="font-bold text-xs text-[#10241A] mt-1 mb-0">Clarification Resolution</h5>
            </div>
            <div className="my-1.5 flex items-baseline justify-between">
              <span className="font-['Outfit'] font-bold text-2xl text-[#10241A]">
                {assessment?.clarification_resolution !== null && assessment?.clarification_resolution !== undefined
                  ? `${assessment.clarification_resolution.toFixed(1)}%`
                  : '—'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Ambiguity Resolved</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, assessment?.clarification_resolution ?? 0))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="px-5 pt-3 border-b border-[#E2E8F0] flex flex-wrap gap-2 text-xs font-semibold bg-white">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-[#0B6B3A] text-[#0B6B3A] font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#10241A]'
          }`}
        >
          <i className="fa-solid fa-list-check" />
          <span>Dimension Breakdown &amp; Thresholds</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('per_question')}
          className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'per_question'
              ? 'border-[#0B6B3A] text-[#0B6B3A] font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#10241A]'
          }`}
        >
          <i className="fa-solid fa-circle-question" />
          <span>Per-Question Assessment ({assessment?.per_question_assessments?.length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cross_field')}
          className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'cross_field'
              ? 'border-[#0B6B3A] text-[#0B6B3A] font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#10241A]'
          }`}
        >
          <i className="fa-solid fa-code-compare" />
          <span>Cross-Field Discrepancies ({assessment?.cross_field_discrepancies?.length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clarifications')}
          className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'clarifications'
              ? 'border-[#0B6B3A] text-[#0B6B3A] font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#10241A]'
          }`}
        >
          <i className="fa-solid fa-arrows-split-up-and-left" />
          <span>Clarification History ({assessment?.clarification_history?.length ?? 0})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-5">
        {/* TAB 1: OVERVIEW & PROVISIONAL INTERPRETATION */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formula & Weight Details */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8] space-y-2.5 text-xs">
                <span className="font-bold text-[#0B6B3A] flex items-center gap-1.5 uppercase tracking-wide">
                  <i className="fa-solid fa-calculator" />
                  <span>Approved Scoring Formula</span>
                </span>
                <p className="text-[#334155] leading-relaxed m-0 font-mono text-[11px] bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                  Overall Score = (Information Consistency &times; 0.35) + (Response Completeness &times; 0.25) +
                  (Cross-Field Consistency &times; 0.25) + (Clarification Resolution &times; 0.15)
                </p>
                <div className="text-[11px] text-[#64748B]">
                  <strong>Dimension Explanations:</strong>
                  <ul className="list-disc pl-4 space-y-1 mt-1">
                    <li><strong>Information Consistency (35%):</strong> Evaluates whether internal facts within patient answers are non-contradictory.</li>
                    <li><strong>Response Completeness (25%):</strong> Measures whether responses provide sufficient descriptive information to inform casework.</li>
                    <li><strong>Cross-Field Consistency (25%):</strong> Compares answers across questions (e.g., dwelling vs. headcount, income vs. employment).</li>
                    <li><strong>Clarification Resolution (15%):</strong> Assesses whether follow-up questions successfully resolved ambiguities.</li>
                  </ul>
                </div>
              </div>

              {/* Provisional Interpretation Table */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#FAFBF8] space-y-2.5 text-xs">
                <span className="font-bold text-[#10241A] flex items-center gap-1.5 uppercase tracking-wide">
                  <i className="fa-solid fa-scale-balanced text-[#0B6B3A]" />
                  <span>Provisional Interpretation Thresholds</span>
                </span>
                <table className="w-full text-left border-collapse text-[11.5px]">
                  <thead>
                    <tr className="border-b border-[#CBD5E1] text-[#64748B]">
                      <th className="py-1 px-2">Score Range</th>
                      <th className="py-1 px-2">Interpretation</th>
                      <th className="py-1 px-2">Recommended MSW Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    <tr className={overall && overall >= 85 ? 'bg-emerald-50 font-bold' : ''}>
                      <td className="py-1.5 px-2">85 – 100%</td>
                      <td className="py-1.5 px-2 text-emerald-800">Generally Consistent</td>
                      <td className="py-1.5 px-2 text-slate-600">Standard verification; proceed to review.</td>
                    </tr>
                    <tr className={overall && overall >= 70 && overall < 85 ? 'bg-blue-50 font-bold' : ''}>
                      <td className="py-1.5 px-2">70 – 84%</td>
                      <td className="py-1.5 px-2 text-blue-800">Minor Inconsistencies</td>
                      <td className="py-1.5 px-2 text-slate-600">Review flagged differences with documents.</td>
                    </tr>
                    <tr className={overall && overall >= 50 && overall < 70 ? 'bg-amber-50 font-bold' : ''}>
                      <td className="py-1.5 px-2">50 – 69%</td>
                      <td className="py-1.5 px-2 text-amber-800">Requires Clarification</td>
                      <td className="py-1.5 px-2 text-slate-600">Ask clarifying questions during interview.</td>
                    </tr>
                    <tr className={overall && overall < 50 ? 'bg-rose-50 font-bold' : ''}>
                      <td className="py-1.5 px-2">0 – 49%</td>
                      <td className="py-1.5 px-2 text-rose-800">Significant Unresolved</td>
                      <td className="py-1.5 px-2 text-slate-600">In-depth MSW case investigation required.</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[10px] text-[#64748B] italic m-0">
                  Note: A lower score does NOT signify patient dishonesty or disqualification. Patients may have approximate recall or different interpretations of family terms.
                </p>
              </div>
            </div>

            {/* Unresolved Questions & Missing Information Strip */}
            {((assessment?.unresolved_questions?.length ?? 0) > 0 || (assessment?.missing_information?.length ?? 0) > 0) && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-triangle-exclamation" />
                  <span>Items Pending MSW Verification or Clarification</span>
                </div>
                {assessment?.unresolved_questions && assessment.unresolved_questions.length > 0 && (
                  <div>
                    <span className="font-semibold text-amber-800">Unresolved Inquiries:</span>
                    <ul className="list-disc pl-5 space-y-0.5 text-amber-950 mt-0.5">
                      {assessment.unresolved_questions.map((uq, i) => (
                        <li key={`uq-${i}`}>{uq}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {assessment?.missing_information && assessment.missing_information.length > 0 && (
                  <div>
                    <span className="font-semibold text-amber-800">Missing Information Detected:</span>
                    <ul className="list-disc pl-5 space-y-0.5 text-amber-950 mt-0.5">
                      {assessment.missing_information.map((mi, i) => (
                        <li key={`mi-${i}`}>{mi}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PER-QUESTION ASSESSMENT */}
        {activeTab === 'per_question' && (
          <div className="space-y-3">
            <p className="text-xs text-[#64748B] m-0">
              Individual percentage assessment for each interview inquiry. Clearly separates patient-provided answers from MSW observations. Dimensions that cannot be assessed are marked <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded">NOT_EVALUATED</code>.
            </p>

            <div className="border border-[#E2E8F0] rounded-xl overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10.5px] uppercase text-[#475569]">
                    <th className="py-2.5 px-3 w-1/4">Question &amp; Domain</th>
                    <th className="py-2.5 px-3 w-1/4">Patient's Answer</th>
                    <th className="py-2.5 px-3 w-1/6">Completeness</th>
                    <th className="py-2.5 px-3 w-1/6">Consistency</th>
                    <th className="py-2.5 px-3 w-1/6">Explanation &amp; MSW Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EF]">
                  {(assessment?.per_question_assessments || []).map((q, idx) => (
                    <tr key={`pq-${q.question_key || idx}`} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 align-top">
                        <strong className="text-[#10241A] block">{q.question_text}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">{q.question_key}</span>
                      </td>
                      <td className="py-3 px-3 align-top text-[#334155] whitespace-pre-wrap leading-relaxed">
                        {q.patient_answer ? (
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            &ldquo;{q.patient_answer}&rdquo;
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No answer recorded</span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top">
                        {q.response_completeness !== null && q.response_completeness !== undefined ? (
                          <span className="font-bold text-[#0B6B3A] font-mono text-sm">
                            {q.response_completeness.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            NOT_EVALUATED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top">
                        {q.information_consistency !== null && q.information_consistency !== undefined ? (
                          <div>
                            <span className="font-bold text-[#10241A] font-mono text-sm block">
                              {q.information_consistency.toFixed(0)}%
                            </span>
                            <span
                              className={`text-[9.5px] uppercase font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${
                                q.assessment_status === 'CONSISTENT'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : q.assessment_status === 'INCONSISTENT'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {q.assessment_status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            NOT_EVALUATED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top space-y-1.5">
                        <p className="text-[11px] text-[#475569] leading-snug m-0">{q.explanation}</p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[9.5px] font-semibold text-slate-500">MSW:</span>
                          <span
                            className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                              mswReviews[q.question_key] === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {mswReviews[q.question_key] || q.msw_verification_status || 'PENDING'}
                          </span>
                          {!isReadOnly && mswReviews[q.question_key] !== 'VERIFIED' && (
                            <button
                              type="button"
                              onClick={() => handleMswAction(q.question_key, 'VERIFIED')}
                              className="text-[9.5px] text-[#0B6B3A] underline font-bold hover:text-emerald-800 cursor-pointer"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CROSS-FIELD CONSISTENCY */}
        {activeTab === 'cross_field' && (
          <div className="space-y-3">
            <p className="text-xs text-[#64748B] m-0">
              Evaluates relational consistency across different interview questions and demographic fields. Discrepancies are flagged for MSW review and consider non-dishonest explanations (e.g., misunderstood questions, temporary circumstances).
            </p>

            <div className="space-y-3">
              {(assessment?.cross_field_discrepancies || []).map((disc, idx) => (
                <div
                  key={`disc-${idx}`}
                  className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          disc.discrepancy_type === 'CONSISTENT'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : disc.discrepancy_type === 'CONTRADICTION'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {disc.discrepancy_type}
                      </span>
                      <strong className="text-sm text-[#10241A] font-['Outfit']">
                        {disc.comparison_topic}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] text-[#64748B] font-mono">
                        {disc.field_a} &harr; {disc.field_b}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          mswReviews[`disc-${idx}`] === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {mswReviews[`disc-${idx}`] || disc.msw_action_status || 'PENDING_REVIEW'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#334155] leading-relaxed m-0">
                    <strong>Finding:</strong> {disc.finding}
                  </p>
                  <p className="text-xs text-[#475569] leading-relaxed m-0">
                    <strong>Casework Context:</strong> {disc.explanation}
                  </p>

                  {disc.possible_reasons && disc.possible_reasons.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-[#FAFBF8] border border-[#E2E8F0] text-xs">
                      <span className="font-semibold text-[#0B6B3A] block mb-1">
                        Plausible Explanations (Non-Adversarial Casework Considerations):
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-[#5A7466] text-[11px] m-0">
                        {disc.possible_reasons.map((r, ri) => (
                          <li key={`pr-${ri}`}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!isReadOnly && mswReviews[`disc-${idx}`] !== 'VERIFIED' && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F1F5F9]">
                      <button
                        type="button"
                        onClick={() => handleMswAction(`disc-${idx}`, 'VERIFIED')}
                        className="px-2.5 py-1 rounded bg-[#0B6B3A] text-white text-[11px] font-bold hover:bg-[#064826] cursor-pointer"
                      >
                        Accept &amp; Mark Verified
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMswAction(`disc-${idx}`, 'REQUIRES_CLARIFICATION')}
                        className="px-2.5 py-1 rounded bg-white border border-[#CBD5E1] text-[#334155] text-[11px] font-semibold hover:bg-slate-50 cursor-pointer"
                      >
                        Flag for Intake Follow-up
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CLARIFICATION RESOLUTION */}
        {activeTab === 'clarifications' && (
          <div className="space-y-3">
            <p className="text-xs text-[#64748B] m-0">
              Demonstrates the clarification workflow. High scores are awarded only when supplementary answers substantive address the ambiguity, not merely because a question was asked. If no clarification was required, a baseline 95.0% score is explicitly documented.
            </p>

            <div className="space-y-3">
              {(assessment?.clarification_history || []).map((c, idx) => (
                <div
                  key={`cl-${idx}`}
                  className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          c.resolution_status === 'RESOLVED' || c.resolution_status === 'NO_CLARIFICATION_NEEDED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {c.resolution_status.replace(/_/g, ' ')}
                      </span>
                      <span className="font-['Outfit'] font-bold text-xs text-[#10241A]">
                        Clarification Resolution Score: {c.resolution_percentage ?? '—'}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                        Original Patient Answer:
                      </span>
                      <p className="text-[#334155] m-0">&ldquo;{c.original_answer}&rdquo;</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200">
                      <span className="text-[10px] font-bold uppercase text-blue-700 block mb-0.5">
                        Clarification Question Asked:
                      </span>
                      <p className="text-blue-950 font-medium m-0">{c.clarification_question}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block mb-0.5">
                      Patient Clarification Provided:
                    </span>
                    <p className="text-[#10241A] font-semibold m-0">
                      {c.patient_clarification ? `“${c.patient_clarification}”` : '(Pending patient response)'}
                    </p>
                  </div>

                  <p className="text-[11px] text-[#475569] leading-relaxed m-0 italic">
                    <strong>Scoring Rule Evaluation:</strong> {c.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
