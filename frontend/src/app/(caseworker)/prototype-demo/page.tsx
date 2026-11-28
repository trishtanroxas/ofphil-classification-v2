'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

export default function PrototypeDemoPage() {
  const [activeTab, setActiveTab] = useState<'pipeline1' | 'pipeline2' | 'pipeline3' | 'consolidation' | 'report'>('pipeline1');
  const [loading, setLoading] = useState(false);

  // Pipeline 1 state
  const [docCategory, setDocCategory] = useState('certificate_of_indigency');
  const [classificationResult, setClassificationResult] = useState<any>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [screeningResult, setScreeningResult] = useState<any>(null);
  const [forensicResult, setForensicResult] = useState<any>(null);
  const [aggregationResult, setAggregationResult] = useState<any>(null);

  // Pipeline 2 state
  const [patientStatement, setPatientStatement] = useState('May apat po akong anak at ang kita ko lang ay 7,500 sa pagtitinda sa palengke.');
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [interviewTurnResult, setInterviewTurnResult] = useState<any>(null);
  const [consistencyResult, setConsistencyResult] = useState<any>(null);

  // Pipeline 3 state
  const [selectedModel, setSelectedModel] = useState('Soft Voting Ensemble');
  const [eligibilityResult, setEligibilityResult] = useState<any>(null);

  // Consolidation & Report state
  const [consolidationResult, setConsolidationResult] = useState<any>(null);
  const [mswRemarks, setMswRemarks] = useState('Patient meets Philippine indigent healthcare criteria. Verified Barangay Indigency and clinical prescription.');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [assessmentReport, setAssessmentReport] = useState<any>(null);

  const demoPatientId = 'M26-11-DEMO01';

  // --- Pipeline 1 Execution ---
  const runPipeline1 = async () => {
    setLoading(true);
    try {
      // 1. Classification
      const classRes = await fetchApi('/prototype/documents/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'msw' },
        body: JSON.stringify({
          document_id: 'DOC-PROTOTYPE-001',
          patient_id: demoPatientId,
          document_name: 'barangay_indigency_sample.pdf',
          simulate_category: docCategory,
        }),
      });
      setClassificationResult(classRes);

      // 2. OCR
      const ocrRes = await fetchApi('/prototype/documents/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'msw' },
        body: JSON.stringify({
          document_id: 'DOC-PROTOTYPE-001',
          document_category: docCategory,
        }),
      });
      setOcrResult(ocrRes);

      // 3. Signature & Stamp Screening
      const screenRes = await fetchApi('/prototype/documents/screening/signatures-stamps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'msw' },
        body: JSON.stringify({
          document_id: 'DOC-PROTOTYPE-001',
          has_signature_expected: true,
          has_stamp_expected: true,
        }),
      });
      setScreeningResult(screenRes);

      // 4. Forensics
      const foreRes = await fetchApi('/prototype/documents/forensics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'msw' },
        body: JSON.stringify({ document_id: 'DOC-PROTOTYPE-001' }),
      });
      setForensicResult(foreRes);

      // 5. Evidence Aggregation
      const aggRes = await fetchApi('/prototype/documents/evidence-aggregation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'msw' },
        body: JSON.stringify({
          document_id: 'DOC-PROTOTYPE-001',
          classification_result: classRes,
          ocr_result: ocrRes,
          signature_result: screenRes,
          stamp_result: screenRes,
          forensic_result: foreRes,
        }),
      });
      setAggregationResult(aggRes);
      toast.success('Pipeline 1 (Document Screening & Forensics) demonstrated successfully!');
    } catch (err: any) {
      toast.error('Pipeline 1 Demonstration failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Pipeline 2 Execution ---
  const runInterviewTurn = async () => {
    if (!patientStatement.trim()) return;
    setLoading(true);
    try {
      const turnRes = await fetchApi('/prototype/interview/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'msw' },
        body: JSON.stringify({
          patient_id: demoPatientId,
          conversation_history: conversationHistory,
          patient_statement: patientStatement,
        }),
      });
      setInterviewTurnResult(turnRes);
      setConversationHistory((prev) => [
        ...prev,
        { role: 'patient', content: patientStatement },
        { role: 'assistant', content: turnRes.ai_response_or_followup },
      ]);
      setPatientStatement('');

      // Auto-compute 4-dimension consistency
      const consRes = await fetchApi('/prototype/interview/consistency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'msw' },
        body: JSON.stringify({
          patient_id: demoPatientId,
          structured_responses: turnRes.extracted_entities,
        }),
      });
      setConsistencyResult(consRes);
      toast.success('Interview turn processed via Qwen3-4B representation!');
    } catch (err: any) {
      toast.error('Interview turn failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Pipeline 3 Execution ---
  const runEligibilityPrediction = async () => {
    setLoading(true);
    try {
      const features27 = {
        age: 54,
        household_size: 5,
        number_of_dependents: 3,
        monthly_family_income: 7500.0,
        monthly_household_obligations_expenses: 3000.0,
        monthly_utility_expenses: 1200.0,
        cost_of_treatment: 45000.0,
        sex: 'Female',
        marital_status: 'Married',
        employment_status: 'Informal / Vendor',
        residence_status: 'Informal Settler',
        educational_attainment: 'High School Undergraduate',
        housing_condition: 'Makeshift / Light Materials',
        sectoral_membership: 'Indigent',
        disability_status: 'Visual Impairment',
        diagnosis_severity: 'Severe',
        type_of_treatment_surgery: 'Phacoemulsification with IOL',
        laterality: 'Bilateral',
        patient_clinical_type: 'Indigent Outpatient',
        assistance_type: 'Medical Assistance / Subsidy',
        certificate_of_indigency: 'YES',
        proof_of_income_employment: 'NO',
        government_id: 'YES',
        utility_bill_document: 'YES',
        referral_letter: 'YES',
        philhealth_document: 'YES',
        medical_record_diagnosis_treatment_plan: 'YES',
      };

      const predRes = await fetchApi('/prototype/eligibility/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'msw' },
        body: JSON.stringify({
          patient_id: demoPatientId,
          selected_model: selectedModel,
          features_27: features27,
        }),
      });
      setEligibilityResult(predRes);
      toast.success('ML Eligibility prediction calculated across 4 approved models!');
    } catch (err: any) {
      toast.error('Eligibility prediction failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Centralized Consolidation Execution ---
  const runConsolidation = async () => {
    setLoading(true);
    try {
      const consRes = await fetchApi('/prototype/consolidation/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'msw' },
        body: JSON.stringify({
          patient_id: demoPatientId,
          patient_demographics: {
            first_name: 'Maria',
            last_name: 'Santos',
            age: 54,
            monthly_family_income: 7500.0,
            monthly_utility_expenses: 1200.0,
          },
          document_screenings: [
            { document_id: 'DOC-PROTOTYPE-001', predicted_category: docCategory, screening_verdict: aggregationResult?.screening_verdict || 'NO_SUSPICIOUS_INDICATORS' },
          ],
          interview_findings: consistencyResult || { overall_consistency_score: 0.912 },
          eligibility_prediction: eligibilityResult || { predicted_grant_tier: 'Tier 1 — Full Subsidy (100%)' },
        }),
      });
      setConsolidationResult(consRes);
      toast.success('Centralized Patient Data Consolidation completed (Zero Late Fusion)!');
    } catch (err: any) {
      toast.error('Consolidation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- MSW Verification & Report ---
  const runMswVerifyAndReport = async () => {
    setLoading(true);
    try {
      const vRes = await fetchApi('/prototype/msw/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'msw' },
        body: JSON.stringify({
          patient_id: demoPatientId,
          verification_status: 'VERIFIED',
          msw_remarks: mswRemarks,
          recommended_grant_tier: 'Tier 1 — Full Subsidy (100%)',
          recommended_subsidy_percentage: 100.0,
        }),
      });
      setVerificationResult(vRes);

      const rRes = await fetchApi('/prototype/reports/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'msw' },
        body: JSON.stringify({
          patient_id: demoPatientId,
          include_full_forensics: true,
          include_interview_transcript: true,
        }),
      });
      setAssessmentReport(rRes);
      toast.success('Explainable Assessment Report compiled!');
    } catch (err: any) {
      toast.error('Report generation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="OFPHIL System Architecture Prototype"
      subtitle="Interactive demonstration of the approved 3-pipeline architecture, centralized consolidation, and MSW verification."
    >
      <div className="space-y-6 text-xs font-sans pb-12">
        {/* Environment Isolation Warning Banner */}
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-emerald-950 flex items-start gap-3 shadow-xs">
          <i className="fa-solid fa-shield-halved text-emerald-700 text-lg mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-emerald-900 flex items-center gap-2">
              <span>Strict Model Experimentation Isolation Enforced</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-200 text-emerald-900 border border-emerald-300">
                PROTOTYPE_SIMULATED
              </span>
            </div>
            <p className="text-xs text-emerald-800 m-0 leading-relaxed">
              This prototype demonstrates approved architecture workflows, component interaction, and MSW decision interfaces.
              It is strictly isolated from research datasets (<code>data/raw/</code>, <code>data/processed/</code>) and ML training checkpoints.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#D5E2D9] pb-2">
          <button
            onClick={() => setActiveTab('pipeline1')}
            className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'pipeline1' ? 'bg-[#0B6B3A] text-white shadow-xs' : 'bg-white text-[#5A7466] hover:bg-slate-50 border border-[#D5E2D9]'
            }`}
          >
            <i className="fa-solid fa-file-shield" />
            <span>Pipeline 1: Document Screening</span>
          </button>
          <button
            onClick={() => setActiveTab('pipeline2')}
            className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'pipeline2' ? 'bg-[#0B6B3A] text-white shadow-xs' : 'bg-white text-[#5A7466] hover:bg-slate-50 border border-[#D5E2D9]'
            }`}
          >
            <i className="fa-solid fa-comments" />
            <span>Pipeline 2: LLM Interview (Qwen3-4B)</span>
          </button>
          <button
            onClick={() => setActiveTab('pipeline3')}
            className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'pipeline3' ? 'bg-[#0B6B3A] text-white shadow-xs' : 'bg-white text-[#5A7466] hover:bg-slate-50 border border-[#D5E2D9]'
            }`}
          >
            <i className="fa-solid fa-brain" />
            <span>Pipeline 3: ML Eligibility (27 Predictors)</span>
          </button>
          <button
            onClick={() => setActiveTab('consolidation')}
            className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'consolidation' ? 'bg-[#0B6B3A] text-white shadow-xs' : 'bg-white text-[#5A7466] hover:bg-slate-50 border border-[#D5E2D9]'
            }`}
          >
            <i className="fa-solid fa-layer-group" />
            <span>Centralized Consolidation (No Late Fusion)</span>
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'report' ? 'bg-[#0B6B3A] text-white shadow-xs' : 'bg-white text-[#5A7466] hover:bg-slate-50 border border-[#D5E2D9]'
            }`}
          >
            <i className="fa-solid fa-file-invoice" />
            <span>MSW Verification & Assessment Report</span>
          </button>
        </div>

        {/* TAB 1: PIPELINE 1 — DOCUMENT PROCESSING */}
        {activeTab === 'pipeline1' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#D5E2D9] rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                    <i className="fa-solid fa-file-lines text-[#0B6B3A]" />
                    <span>Pipeline 1: Document Processing & Authenticity Screening</span>
                  </h3>
                  <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                    ResNet-50 5-class categorization, PaddleOCR text extraction, signature/stamp screening, 5 forensic analyzers, and deterministic rule-based aggregation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="border border-[#D5E2D9] rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-50"
                  >
                    <option value="certificate_of_indigency">Certificate of Indigency</option>
                    <option value="government_id">Government ID</option>
                    <option value="electricity_bill">Electricity Bill</option>
                    <option value="water_bill">Water Bill</option>
                    <option value="medical_certificate">Medical Certificate</option>
                  </select>
                  <button
                    onClick={runPipeline1}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg bg-[#0B6B3A] text-white font-bold hover:bg-[#064826] transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Running Demonstration...' : 'Run Pipeline 1 Workflow'}
                  </button>
                </div>
              </div>

              {classificationResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {/* ResNet-50 Card */}
                  <div className="border border-[#D5E2D9] rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#10241A]">ResNet-50 Categorization</span>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        {classificationResult.execution_mode}
                      </span>
                    </div>
                    <div className="text-xs">
                      Category: <strong className="text-[#0B6B3A] uppercase">{classificationResult.predicted_category}</strong>
                    </div>
                    <div className="text-[11px] text-[#5A7466]">Confidence: {(classificationResult.confidence * 100).toFixed(1)}%</div>
                    <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                      {classificationResult.disclaimer}
                    </div>
                  </div>

                  {/* PaddleOCR Card */}
                  <div className="border border-[#D5E2D9] rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#10241A]">PaddleOCR Text Extraction</span>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        {ocrResult?.execution_mode}
                      </span>
                    </div>
                    <div className="text-xs text-[#10241A] truncate">
                      Extracted: <strong>{Object.keys(ocrResult?.extracted_fields || {}).length} fields</strong>
                    </div>
                    <div className="text-[11px] text-[#5A7466] line-clamp-2 italic">
                      "{ocrResult?.extracted_text_snippet}"
                    </div>
                  </div>

                  {/* Signature & Stamp Card */}
                  <div className="border border-[#D5E2D9] rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#10241A]">Signatures & Stamps (Zero YOLO)</span>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        {screeningResult?.execution_mode}
                      </span>
                    </div>
                    <div className="text-[11px]">
                      Signature Stroke: <strong className="text-emerald-700">{screeningResult?.signature_screening.status}</strong>
                    </div>
                    <div className="text-[11px]">
                      Circular Stamp: <strong className="text-emerald-700">{screeningResult?.stamp_screening.status}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Specimen Match: <em>{screeningResult?.signature_screening.reference_matching}</em>
                    </div>
                  </div>

                  {/* Forensics Card */}
                  <div className="border border-[#D5E2D9] rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#10241A]">5-Test Image Forensics</span>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        {forensicResult?.execution_mode}
                      </span>
                    </div>
                    <div className="text-[11px] grid grid-cols-2 gap-1 text-[#5A7466]">
                      <span>ELA: <strong className="text-emerald-700">{forensicResult?.ela_analysis.status}</strong></span>
                      <span>Noise: <strong className="text-emerald-700">{forensicResult?.noise_inconsistency.status}</strong></span>
                      <span>Chromatic: <strong className="text-emerald-700">{forensicResult?.chromatic_dispersion.status}</strong></span>
                      <span>ORB Clones: <strong className="text-emerald-700">0</strong></span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#0B6B3A]">
                      Overall Score: {(forensicResult?.overall_forensic_score * 100).toFixed(1)}%
                    </div>
                  </div>

                  {/* Deterministic Rule-Based Aggregation */}
                  <div className="border border-[#D5E2D9] rounded-lg p-3 bg-slate-50/50 space-y-1.5 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#10241A]">Evidence Aggregation Engine</span>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        {aggregationResult?.execution_mode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A8DAC0]">
                        {aggregationResult?.screening_verdict}
                      </span>
                      <span className="text-xs text-[#5A7466]">
                        Risk Level: <strong>{aggregationResult?.risk_level}</strong>
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A7466] m-0">
                      {aggregationResult?.summary_explanation}
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Engine: {aggregationResult?.aggregation_engine}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PIPELINE 2 — LLM INTERVIEW */}
        {activeTab === 'pipeline2' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#D5E2D9] rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                  <i className="fa-solid fa-comments text-[#0B6B3A]" />
                  <span>Pipeline 2: LLM-Assisted Patient Interview (Qwen3-4B-Instruct-2507)</span>
                </h3>
                <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                  Multi-turn conversational intake, structured information extraction, and the approved 4-dimension consistency evaluation.
                </p>
              </div>

              {/* Chat Simulation Window */}
              <div className="border border-[#D5E2D9] rounded-xl p-4 bg-slate-50 space-y-3 max-h-72 overflow-y-auto">
                <div className="text-center text-[11px] text-[#5A7466] py-1 border-b border-slate-200">
                  Intake Session Started for Patient ID: <strong>{demoPatientId}</strong>
                </div>
                {conversationHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-3.5 py-2 text-xs ${
                        msg.role === 'patient'
                          ? 'bg-[#0B6B3A] text-white rounded-tr-none'
                          : 'bg-white border border-[#D5E2D9] text-[#10241A] rounded-tl-none shadow-2xs'
                      }`}
                    >
                      <div className="text-[9.5px] opacity-75 font-semibold mb-0.5">
                        {msg.role === 'patient' ? 'Patient Response' : 'Qwen3-4B Intake Assistant'}
                      </div>
                      <div>{msg.content}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Statement Input Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={patientStatement}
                  onChange={(e) => setPatientStatement(e.target.value)}
                  placeholder="Enter patient statement in Filipino or English..."
                  className="flex-1 border border-[#D5E2D9] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#0B6B3A]"
                />
                <button
                  onClick={runInterviewTurn}
                  disabled={loading || !patientStatement.trim()}
                  className="px-4 py-2 bg-[#0B6B3A] text-white font-bold rounded-lg hover:bg-[#064826] transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Processing...' : 'Send Turn'}
                </button>
              </div>

              {/* 4-Dimension Consistency Evaluation Card */}
              {consistencyResult && (
                <div className="border border-[#D5E2D9] rounded-lg p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#10241A]">Approved 4-Dimension Consistency Assessment</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A8DAC0]">
                      Score: {(consistencyResult.overall_consistency_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-[#D5E2D9]">
                      <div className="text-[10px] text-[#5A7466] font-semibold">Information Consistency (35%)</div>
                      <div className="text-sm font-extrabold text-[#0B6B3A] mt-1">
                        {(consistencyResult.dimension_scores.information_consistency * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#D5E2D9]">
                      <div className="text-[10px] text-[#5A7466] font-semibold">Response Completeness (25%)</div>
                      <div className="text-sm font-extrabold text-[#0B6B3A] mt-1">
                        {(consistencyResult.dimension_scores.response_completeness * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#D5E2D9]">
                      <div className="text-[10px] text-[#5A7466] font-semibold">Cross-Field Consistency (25%)</div>
                      <div className="text-sm font-extrabold text-[#0B6B3A] mt-1">
                        {(consistencyResult.dimension_scores.cross_field_consistency * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#D5E2D9]">
                      <div className="text-[10px] text-[#5A7466] font-semibold">Clarification Resolution (15%)</div>
                      <div className="text-sm font-extrabold text-[#0B6B3A] mt-1">
                        {(consistencyResult.dimension_scores.clarification_resolution * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-[10.5px] text-[#5A7466] italic bg-white p-2.5 rounded border border-[#D5E2D9]">
                    {consistencyResult.disclaimer}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PIPELINE 3 — ML ELIGIBILITY */}
        {activeTab === 'pipeline3' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#D5E2D9] rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                    <i className="fa-solid fa-brain text-[#0B6B3A]" />
                    <span>Pipeline 3: ML Eligibility Classification (Approved 27 Predictors)</span>
                  </h3>
                  <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                    Logistic Regression, CatBoost, Explainable Boosting Machine (EBM), and Soft Voting Ensemble with top SHAP feature contributions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="border border-[#D5E2D9] rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-50"
                  >
                    <option value="Soft Voting Ensemble">Soft Voting Ensemble</option>
                    <option value="CatBoost">CatBoost</option>
                    <option value="Explainable Boosting Machine (EBM)">Explainable Boosting Machine (EBM)</option>
                    <option value="Logistic Regression">Logistic Regression</option>
                  </select>
                  <button
                    onClick={runEligibilityPrediction}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg bg-[#0B6B3A] text-white font-bold hover:bg-[#064826] transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Evaluating...' : 'Run ML Prediction'}
                  </button>
                </div>
              </div>

              {eligibilityResult && (
                <div className="space-y-4 pt-2">
                  {/* Prediction Banner */}
                  <div className="bg-[#E8F5EC] border border-[#A8DAC0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-[#5A7466] font-semibold">Active Model: {eligibilityResult.model_name}</div>
                      <div className="text-base font-extrabold text-[#0B6B3A]">{eligibilityResult.predicted_grant_tier}</div>
                      <div className="text-xs text-[#10241A] font-medium">
                        Recommended Subsidy: <strong>{eligibilityResult.recommended_subsidy_percentage}%</strong> (Confidence: {(eligibilityResult.confidence_score * 100).toFixed(1)}%)
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-white text-[#0B6B3A] px-2.5 py-1 rounded-md border border-[#A8DAC0] font-bold">
                      {eligibilityResult.execution_mode}
                    </span>
                  </div>

                  {/* 4-Model Comparison Grid */}
                  <div>
                    <h4 className="font-bold text-xs text-[#10241A] mb-2">Approved Model Inventory Comparison</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {Object.entries(eligibilityResult.model_comparison).map(([mName, mData]: any) => (
                        <div
                          key={mName}
                          className={`p-3 rounded-lg border ${
                            mName === selectedModel ? 'bg-[#FAFBF8] border-[#0B6B3A]' : 'bg-white border-[#D5E2D9]'
                          }`}
                        >
                          <div className="font-bold text-xs text-[#10241A] truncate">{mName}</div>
                          <div className="text-sm font-extrabold text-[#0B6B3A] mt-1">{(mData.probability * 100).toFixed(1)}%</div>
                          <div className="text-[10.5px] text-[#5A7466] mt-0.5 truncate">{mData.tier}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SHAP Feature Contributions */}
                  <div>
                    <h4 className="font-bold text-xs text-[#10241A] mb-2">Top Predictor Feature Contributions (Approved 27 Predictors)</h4>
                    <div className="border border-[#D5E2D9] rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[#5A7466] border-b border-[#D5E2D9]">
                          <tr>
                            <th className="py-2 px-3 font-semibold">Feature</th>
                            <th className="py-2 px-3 font-semibold">Patient Value</th>
                            <th className="py-2 px-3 font-semibold">Relative Importance</th>
                            <th className="py-2 px-3 font-semibold">Direction</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEF2EF]">
                          {eligibilityResult.top_feature_contributions.map((feat: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-[11px] font-semibold text-[#10241A]">{feat.feature}</td>
                              <td className="py-2 px-3 text-[#10241A]">{feat.value}</td>
                              <td className="py-2 px-3 text-[#0B6B3A] font-bold">{(feat.importance * 100).toFixed(0)}%</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {feat.direction}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CONSOLIDATION (ZERO LATE FUSION) */}
        {activeTab === 'consolidation' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#D5E2D9] rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                    <i className="fa-solid fa-layer-group text-[#0B6B3A]" />
                    <span>Centralized Patient Data Consolidation & Reconciliation</span>
                  </h3>
                  <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                    Harmonizes evidence across the 3 independent pipelines WITHOUT Multimodal Late Fusion.
                  </p>
                </div>
                <button
                  onClick={runConsolidation}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-[#0B6B3A] text-white font-bold hover:bg-[#064826] transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Reconciling...' : 'Consolidate & Reconcile Data'}
                </button>
              </div>

              {consolidationResult && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-[#D5E2D9] rounded-lg p-3 bg-slate-50 space-y-1">
                      <div className="text-xs font-bold text-[#10241A]">Pipeline 1: Document Evidence</div>
                      <div className="text-xs text-[#5A7466]">Total Screened: <strong>{consolidationResult.documents_summary.total_documents_screened}</strong></div>
                      <div className="text-xs text-[#0B6B3A] font-semibold">{consolidationResult.documents_summary.forensic_status}</div>
                    </div>
                    <div className="border border-[#D5E2D9] rounded-lg p-3 bg-slate-50 space-y-1">
                      <div className="text-xs font-bold text-[#10241A]">Pipeline 2: Interview Evidence</div>
                      <div className="text-xs text-[#5A7466]">Consistency Score: <strong>{(consolidationResult.interview_summary.overall_consistency_score * 100).toFixed(1)}%</strong></div>
                      <div className="text-xs text-[#0B6B3A] font-semibold">No critical contradictions</div>
                    </div>
                    <div className="border border-[#D5E2D9] rounded-lg p-3 bg-slate-50 space-y-1">
                      <div className="text-xs font-bold text-[#10241A]">Pipeline 3: ML Model Support</div>
                      <div className="text-xs text-[#5A7466]">Recommended Tier: <strong>{consolidationResult.eligibility_summary.predicted_grant_tier || 'Tier 1'}</strong></div>
                      <div className="text-xs text-[#0B6B3A] font-semibold">Decision Support Ready</div>
                    </div>
                  </div>

                  {/* Reconciliation Box */}
                  <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 text-blue-950 space-y-2">
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>Data Reconciliation Status: {consolidationResult.data_reconciliation.reconciliation_status}</span>
                      <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-mono font-bold">
                        {consolidationResult.overall_readiness_for_msw}
                      </span>
                    </div>
                    <p className="text-xs text-blue-900 m-0">
                      Cross-pipeline evidence is consolidated cleanly without joint mathematical meta-classification, preserving human-in-the-loop social worker authority.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MSW VERIFICATION & REPORT */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#D5E2D9] rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#10241A] m-0 flex items-center gap-2">
                  <i className="fa-solid fa-file-invoice text-[#0B6B3A]" />
                  <span>MSW Verification, Human Override & Explainable Assessment Report</span>
                </h3>
                <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                  Record caseworker clinical observations, grant tier confirmation, and compile the final assessment dossier.
                </p>
              </div>

              {/* MSW Input Section */}
              <div className="space-y-3 border border-[#D5E2D9] rounded-xl p-4 bg-slate-50">
                <label className="block text-xs font-bold text-[#10241A]">
                  Medical Social Worker Clinical Remarks & Verification Notes:
                </label>
                <textarea
                  value={mswRemarks}
                  onChange={(e) => setMswRemarks(e.target.value)}
                  rows={3}
                  className="w-full border border-[#D5E2D9] rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-[#0B6B3A]"
                />
                <div className="flex justify-end">
                  <button
                    onClick={runMswVerifyAndReport}
                    disabled={loading}
                    className="px-4 py-2 bg-[#0B6B3A] text-white font-bold rounded-lg hover:bg-[#064826] transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Compiling Dossier...' : 'Record MSW Verification & Generate Report'}
                  </button>
                </div>
              </div>

              {/* Generated Report Display */}
              {assessmentReport && (
                <div className="border border-[#0B6B3A] rounded-xl p-5 bg-[#FAFBF8] space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between border-b border-[#D5E2D9] pb-3 gap-2">
                    <div>
                      <div className="text-[10px] font-bold text-[#0B6B3A] uppercase tracking-wider">
                        {assessmentReport.regulatory_notice}
                      </div>
                      <h4 className="text-base font-extrabold text-[#10241A] m-0">
                        Official Clinical & Socioeconomic Assessment Report
                      </h4>
                      <div className="text-[11px] text-[#5A7466] font-mono">
                        Report ID: {assessmentReport.report_id}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A8DAC0]">
                      {assessmentReport.decision_authority}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-bold text-[#10241A] mb-1">Approved Recommendation:</div>
                      <div className="text-sm font-extrabold text-[#0B6B3A]">{assessmentReport.final_recommendation.grant_tier}</div>
                      <div className="text-xs text-[#5A7466]">{assessmentReport.final_recommendation.procedure_quotation_subsidy}</div>
                    </div>
                    <div>
                      <div className="font-bold text-[#10241A] mb-1">MSW Clinical Validation:</div>
                      <p className="text-xs text-[#5A7466] m-0 italic">
                        "{assessmentReport.msw_verification_state.msw_remarks}"
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 border-t border-[#D5E2D9] pt-2 flex items-center justify-between">
                    <span>Generated: {new Date(assessmentReport.generated_at).toLocaleString()}</span>
                    <span className="font-mono">{assessmentReport.execution_mode}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
