'use client';
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { Activity, CheckCircle2 } from 'lucide-react';

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi('/experiments');
        setExperiments(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-[#10241A]">
            11. Experiment Results &amp; Model Evaluation
          </h1>
          <p className="text-xs text-[#5A7466]">
            Comparative cross-validation metrics, ablation experiments, and pipeline benchmarks across OCR, YOLO, and CatBoost models.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#D5E2D9] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFBF8] border-b border-[#D5E2D9] text-[#5A7466] font-semibold">
                  <th className="py-3 px-4">Experiment Run ID</th>
                  <th className="py-3 px-4">Model &amp; Pipeline</th>
                  <th className="py-3 px-4">Pipeline Stage</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">F1 Score</th>
                  <th className="py-3 px-4">ROC AUC</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5E2D9]">
                {experiments.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FAFBF8]">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#5A7466]">{exp.id}</td>
                    <td className="py-3 px-4 font-medium text-[#10241A]">{exp.experiment_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[11px]">
                        {exp.pipeline_stage}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0B6B3A]">
                      {exp.accuracy ? `${(exp.accuracy * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {exp.f1_score ? `${(exp.f1_score * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {exp.roc_auc ? (exp.roc_auc).toFixed(3) : '—'}
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-medium capitalize">
                      {exp.status}
                    </td>
                    <td className="py-3 px-4 text-[#5A7466]">{exp.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
