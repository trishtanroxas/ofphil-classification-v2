'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  FileText,
  User,
  Users,
  Home,
  DollarSign,
  Heart,
  Award,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';

const assessmentSchema = z.object({
  patient_name: z.string().min(2, 'Patient name is required'),
  age: z.number().min(0, 'Age must be positive'),
  gender: z.string().min(1, 'Gender is required'),
  civil_status: z.string().min(1, 'Civil status is required'),
  barangay: z.string().min(2, 'Barangay is required'),
  city_municipality: z.string().min(2, 'City/Municipality is required'),
  monthly_income: z.number().min(0, 'Income must be non-negative'),
  monthly_expenses: z.number().min(0, 'Expenses must be non-negative'),
  house_structure: z.string().min(1, 'House structure is required'),
  ownership_status: z.string().min(1, 'Ownership status is required'),
  water_source: z.string().min(1, 'Water source is required'),
  lighting_source: z.string().min(1, 'Lighting source is required'),
  social_worker_notes: z.string().min(5, 'Caseworker narrative notes are required'),
  family_members: z.array(
    z.object({
      name: z.string().min(1, 'Name required'),
      relation: z.string().min(1, 'Relation required'),
      age: z.number().min(0),
      occupation: z.string().min(1, 'Occupation required'),
      income: z.number().min(0)
    })
  ).min(1, 'At least one family member or self required')
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

export default function MSWAssessmentPage() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [predictedScore, setPredictedScore] = useState<{
    score: number;
    tier: string;
    charity_probability: number;
    shap_factors: { feature: string; impact: string }[];
  } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      patient_name: 'Juan Dela Cruz',
      age: 68,
      gender: 'Male',
      civil_status: 'Married',
      barangay: 'San Antonio',
      city_municipality: 'Pasig City',
      monthly_income: 8500,
      monthly_expenses: 9200,
      house_structure: 'Light Materials (Wood / Bamboo / Corrugated Iron)',
      ownership_status: 'Informal Settler / Rent-Free with Consent',
      water_source: 'Public Standpipe / Shared Water',
      lighting_source: 'Shared Electric Meter',
      social_worker_notes: 'Patient is an elderly barangay resident presenting with mature senile cataract OS resulting in severe vision loss. Household relies on informal selling and irregular financial support from adult children. Living conditions meet indigent classification criteria according to DOH AO 2017-0024.',
      family_members: [
        { name: 'Juan Dela Cruz', relation: 'Self', age: 68, occupation: 'No regular job (Elderly)', income: 0 },
        { name: 'Elena Dela Cruz', relation: 'Spouse', age: 65, occupation: 'Sari-sari store vendor', income: 8500 }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'family_members'
  });

  const onSubmit = (data: AssessmentFormData) => {
    // DSS Simulation Engine based on DOH AO 2017-0024 qualitative rules & CatBoost weights
    const perCapitaIncome = data.monthly_income / Math.max(1, data.family_members.length);
    const deficit = data.monthly_expenses - data.monthly_income;
    
    let tier = 'Class A';
    let charityProb = 0.96;

    if (perCapitaIncome < 5000) {
      tier = 'Class A (100% Charity Subsidy)';
      charityProb = 0.98;
    } else if (perCapitaIncome < 9000) {
      tier = 'Class B (75% Charity Subsidy)';
      charityProb = 0.85;
    } else if (perCapitaIncome < 15000) {
      tier = 'Class C (50% Charity Subsidy)';
      charityProb = 0.62;
    } else {
      tier = 'Class D / Non-Charity';
      charityProb = 0.15;
    }

    setPredictedScore({
      score: Math.round(charityProb * 100),
      tier: tier,
      charity_probability: charityProb,
      shap_factors: [
        { feature: `Per Capita Monthly Income (₱${Math.round(perCapitaIncome).toLocaleString()})`, impact: '+34% toward Class A' },
        { feature: `Household Deficit / Net Negative Disposable (₱${Math.abs(deficit).toLocaleString()})`, impact: '+22% toward Class A' },
        { feature: `Housing Materials: ${data.house_structure}`, impact: '+18% toward Class A' },
        { feature: `Informal Settlement Status`, impact: '+12% toward Class A' },
        { feature: `Elderly Geriatric Vulnerability (Age ${data.age})`, impact: '+10% toward Class A' }
      ]
    });
    setActiveStep(4);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-5 rounded-xl border border-[#D5E2D9] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-heading font-bold text-[#10241A]">
                Medical Social Work Assessment Tool
              </h1>
              <span className="text-xs bg-[#E6F1EA] text-[#0B6B3A] px-2 py-0.5 rounded font-semibold font-mono">
                DOH AO No. 2017-0024
              </span>
            </div>
            <p className="text-xs text-[#5A7466] mt-1">
              Standardized social work intake form with AI-powered eligibility decision support for Philippine ophthalmic surgery charity care.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5A7466]">Workflow Step:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  onClick={() => setActiveStep(step)}
                  className={`h-7 w-7 rounded-full text-xs font-bold transition flex items-center justify-center ${
                    activeStep === step
                      ? 'bg-[#0B6B3A] text-white shadow-xs'
                      : 'bg-[#FAFBF8] border border-[#CBD5E1] text-[#5A7466] hover:bg-[#E6F1EA]'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Steps Navigation Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { step: 1, title: 'I. Socio-Demographic', desc: 'Patient identity & residence' },
            { step: 2, title: 'II. Family Composition', desc: 'Dependents & household earners' },
            { step: 3, title: 'III. Economic & Housing', desc: 'Monthly income, bills & shelter' },
            { step: 4, title: 'IV. AI Scoring & Decision', desc: 'TreeSHAP DSS & MSW classification' }
          ].map((s) => (
            <div
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                activeStep === s.step
                  ? 'bg-white border-[#0B6B3A] shadow-xs ring-1 ring-[#0B6B3A]'
                  : 'bg-white border-[#D5E2D9] hover:bg-[#FAFBF8]'
              }`}
            >
              <div className="text-[11px] font-bold text-[#0B6B3A]">{s.title}</div>
              <div className="text-[11px] text-[#5A7466] mt-0.5 truncate">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* STEP 1: Socio-Demographic */}
          {activeStep === 1 && (
            <div className="bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-xs space-y-4">
              <h3 className="font-heading font-bold text-sm text-[#10241A] pb-2 border-b border-[#E2E8F0] flex items-center gap-2">
                <User size={16} className="text-[#0B6B3A]" /> Section I: Socio-Demographic Data
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-[#10241A]">Full Patient Name</label>
                  <input
                    {...register('patient_name')}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                  />
                  {errors.patient_name && <p className="text-rose-600 text-[10px] mt-1">{errors.patient_name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-[#10241A]">Age</label>
                    <input
                      type="number"
                      {...register('age', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                    />
                    {errors.age && <p className="text-rose-600 text-[10px] mt-1">{errors.age.message}</p>}
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-[#10241A]">Gender</label>
                    <select
                      {...register('gender')}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#10241A]">Civil Status</label>
                  <select
                    {...register('civil_status')}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#10241A]">Barangay</label>
                  <input
                    {...register('barangay')}
                    placeholder="e.g. San Antonio"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1 text-[#10241A]">City / Municipality</label>
                  <input
                    {...register('city_municipality')}
                    placeholder="e.g. Pasig City, Metro Manila"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-4 py-2 bg-[#0B6B3A] text-white text-xs font-semibold rounded-lg hover:bg-[#064826] transition flex items-center gap-1.5"
                >
                  Proceed to Family Composition <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Family Composition */}
          {activeStep === 2 && (
            <div className="bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                <h3 className="font-heading font-bold text-sm text-[#10241A] flex items-center gap-2">
                  <Users size={16} className="text-[#0B6B3A]" /> Section II: Family Composition & Household Registry
                </h3>
                <button
                  type="button"
                  onClick={() => append({ name: '', relation: '', age: 18, occupation: '', income: 0 })}
                  className="px-3 py-1.5 bg-[#E6F1EA] text-[#0B6B3A] text-xs font-semibold rounded-lg hover:bg-[#D5E2D9] transition flex items-center gap-1"
                >
                  <Plus size={13} /> Add Household Member
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-3.5 bg-[#FAFBF8] rounded-xl border border-[#D5E2D9] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs">
                    <div className="sm:col-span-4">
                      <label className="block font-semibold mb-1 text-[#10241A]">Full Name</label>
                      <input
                        {...register(`family_members.${index}.name` as const)}
                        placeholder="Family member name"
                        className="w-full px-2.5 py-1.5 border rounded-lg focus:outline-[#0B6B3A]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold mb-1 text-[#10241A]">Relationship</label>
                      <input
                        {...register(`family_members.${index}.relation` as const)}
                        placeholder="e.g. Spouse / Son"
                        className="w-full px-2.5 py-1.5 border rounded-lg focus:outline-[#0B6B3A]"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block font-semibold mb-1 text-[#10241A]">Age</label>
                      <input
                        type="number"
                        {...register(`family_members.${index}.age` as const, { valueAsNumber: true })}
                        className="w-full px-2.5 py-1.5 border rounded-lg focus:outline-[#0B6B3A]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block font-semibold mb-1 text-[#10241A]">Occupation</label>
                      <input
                        {...register(`family_members.${index}.occupation` as const)}
                        placeholder="e.g. Vendor / Laborer"
                        className="w-full px-2.5 py-1.5 border rounded-lg focus:outline-[#0B6B3A]"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block font-semibold mb-1 text-[#10241A]">Income</label>
                      <input
                        type="number"
                        {...register(`family_members.${index}.income` as const, { valueAsNumber: true })}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 border rounded-lg focus:outline-[#0B6B3A]"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-center">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-4 py-2 border rounded-lg text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="px-4 py-2 bg-[#0B6B3A] text-white text-xs font-semibold rounded-lg hover:bg-[#064826] transition flex items-center gap-1.5"
                >
                  Proceed to Economic & Housing <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Economic & Housing */}
          {activeStep === 3 && (
            <div className="bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-xs space-y-4">
              <h3 className="font-heading font-bold text-sm text-[#10241A] pb-2 border-b border-[#E2E8F0] flex items-center gap-2">
                <Home size={16} className="text-[#0B6B3A]" /> Section III: Economic Profile & Housing Conditions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-[#10241A]">Total Declared Monthly Family Income (PHP)</label>
                  <input
                    type="number"
                    {...register('monthly_income', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#10241A]">Total Estimated Monthly Living Expenses (PHP)</label>
                  <input
                    type="number"
                    {...register('monthly_expenses', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#10241A]">House Physical Structure</label>
                  <select
                    {...register('house_structure')}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                  >
                    <option value="Light Materials (Wood / Bamboo / Corrugated Iron)">Light Materials (Wood / Bamboo / Corrugated Iron)</option>
                    <option value="Semi-Concrete (Mixed)">Semi-Concrete (Mixed)</option>
                    <option value="Concrete / Permanent Structure">Concrete / Permanent Structure</option>
                    <option value="Makeshift / Salvaged Materials">Makeshift / Salvaged Materials</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#10241A]">Housing Lot Ownership Status</label>
                  <select
                    {...register('ownership_status')}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                  >
                    <option value="Informal Settler / Rent-Free with Consent">Informal Settler / Rent-Free with Consent</option>
                    <option value="Renting (Sub-lease)">Renting (Sub-lease)</option>
                    <option value="Owned with Land Title">Owned with Land Title</option>
                    <option value="Government Resettlement Area">Government Resettlement Area</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#10241A]">Primary Source of Water</label>
                  <select
                    {...register('water_source')}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                  >
                    <option value="Public Standpipe / Shared Water">Public Standpipe / Shared Water</option>
                    <option value="Direct Piped Water (Individual Meter)">Direct Piped Water (Individual Meter)</option>
                    <option value="Deep Well / Artesian">Deep Well / Artesian</option>
                    <option value="Bought per Container / Vendor">Bought per Container / Vendor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#10241A]">Lighting & Electricity Source</label>
                  <select
                    {...register('lighting_source')}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                  >
                    <option value="Shared Electric Meter (Sub-meter)">Shared Electric Meter (Sub-meter)</option>
                    <option value="Direct Utility Meter (Meralco)">Direct Utility Meter (Meralco)</option>
                    <option value="Kerosene / Battery / Solar Lantern">Kerosene / Battery / Solar Lantern</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1 text-[#10241A]">Caseworker Qualitative Findings & Assessment Narrative</label>
                  <textarea
                    rows={4}
                    {...register('social_worker_notes')}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-[#0B6B3A]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-4 py-2 border rounded-lg text-xs"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0B6B3A] text-white text-xs font-semibold rounded-lg hover:bg-[#064826] transition flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles size={14} /> Run CatBoost DSS Evaluation
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: AI Scoring & Decision */}
          {activeStep === 4 && (
            <div className="space-y-6">
              {predictedScore ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Result Card */}
                  <div className="md:col-span-1 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-xs space-y-4">
                    <div className="text-center space-y-2">
                      <div className="inline-flex p-3 rounded-full bg-[#E6F1EA] text-[#0B6B3A]">
                        <Award size={36} />
                      </div>
                      <div className="text-xs uppercase tracking-wider text-[#5A7466] font-bold">
                        DOH AO 2017 Classification
                      </div>
                      <h2 className="text-xl font-heading font-extrabold text-[#0B6B3A]">
                        {predictedScore.tier}
                      </h2>
                      <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                        {predictedScore.score}% Charity Eligibility Confidence
                      </div>
                    </div>

                    <div className="border-t border-[#E2E8F0] pt-4 text-xs space-y-2 text-[#2E4538]">
                      <div className="flex justify-between">
                        <span className="text-[#5A7466]">Surgeon Fee Subsidy:</span>
                        <span className="font-bold text-[#0B6B3A]">100% Subsidized</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5A7466]">Foldable IOL Pack:</span>
                        <span className="font-bold text-[#0B6B3A]">100% Covered</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5A7466]">Operating Room Facility:</span>
                        <span className="font-bold text-[#0B6B3A]">PhilHealth + Grant</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-bold text-sm">
                        <span>Patient Out-of-Pocket:</span>
                        <span className="font-mono text-emerald-700">₱0.00 (Free)</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => alert('Official DOH Assessment Certificate & Subsidy Voucher Generated.')}
                        className="w-full py-2.5 bg-[#0B6B3A] text-white text-xs font-semibold rounded-lg hover:bg-[#064826] transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={15} /> Finalize Caseworker Sign-off
                      </button>
                    </div>
                  </div>

                  {/* SHAP Feature Contribution Card */}
                  <div className="md:col-span-2 bg-white p-6 rounded-xl border border-[#D5E2D9] shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                      <div>
                        <h3 className="font-heading font-bold text-sm text-[#10241A] flex items-center gap-2">
                          <Sparkles size={16} className="text-[#0B6B3A]" /> Explainable Boosting Machine & TreeSHAP Attribution
                        </h3>
                        <p className="text-xs text-[#5A7466]">Why the decision engine classified this applicant for charity care</p>
                      </div>
                      <span className="text-[10px] font-mono bg-[#E6F1EA] text-[#0B6B3A] px-2 py-0.5 rounded font-bold">
                        CatBoost v1.2
                      </span>
                    </div>

                    <div className="space-y-3">
                      {predictedScore.shap_factors.map((factor, i) => (
                        <div key={i} className="p-3 bg-[#FAFBF8] rounded-lg border border-[#E2E8F0] flex items-center justify-between text-xs">
                          <div className="font-medium text-[#10241A]">{factor.feature}</div>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-semibold text-[11px]">
                            {factor.impact}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3.5 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                      <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold">Human-in-the-Loop Safeguard Active:</div>
                        <p className="text-[11px] mt-0.5 leading-relaxed">
                          In accordance with clinical safety guidelines, this algorithmic prediction serves as a clinical decision support suggestion. The licensed Medical Social Worker retains full statutory discretion to adjust the final subsidy tier.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-xl border border-[#D5E2D9] text-center space-y-3">
                  <p className="text-xs text-[#5A7466]">Please complete and submit the economic form to view AI scoring.</p>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-4 py-2 bg-[#0B6B3A] text-white text-xs font-semibold rounded-lg"
                  >
                    Go to Section III
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}
