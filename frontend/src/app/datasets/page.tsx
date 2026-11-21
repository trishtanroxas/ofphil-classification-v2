'use client';
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { Database, Plus, Search, Filter, AlertCircle } from 'lucide-react';

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [count, setCount] = useState(100);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, []);

  async function loadDatasets() {
    try {
      const data = await fetchApi('/datasets');
      setDatasets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetchApi('/datasets', {
        method: 'POST',
        body: JSON.stringify({
          name: name.endsWith('.csv') ? name : `${name}.csv`,
          record_count: Number(count),
          category: 'synthetic_tabular',
          notes: 'Generated via web interface'
        }),
      });
      setName('');
      setShowModal(false);
      loadDatasets();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-heading font-bold text-[#10241A]">
              1. Synthetic Dataset Management
            </h1>
            <p className="text-xs text-[#5A7466]">
              Manage generated synthetic patient records without exposing real clinical OFPHIL patient records.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B6B3A] text-white text-xs font-semibold hover:bg-[#064826] transition shadow-sm"
          >
            <Plus size={16} /> Generate Synthetic Batch
          </button>
        </div>

        {/* Info Note */}
        <div className="p-4 rounded-xl border border-[#D5E2D9] bg-white text-xs text-[#2E4538] flex items-center gap-3">
          <AlertCircle size={18} className="text-[#0B6B3A] shrink-0" />
          <span>
            <strong>Data Privacy Compliance:</strong> All datasets created in this module are purely fictional and synthetic for model experimentation. No real OFPHIL patient information is loaded or processed.
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#D5E2D9] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFBF8] border-b border-[#D5E2D9] text-[#5A7466] font-semibold">
                  <th className="py-3 px-4">Dataset ID</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Record Count</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5E2D9]">
                {datasets.map((ds) => (
                  <tr key={ds.id} className="hover:bg-[#FAFBF8]">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#5A7466]">{ds.id}</td>
                    <td className="py-3 px-4 font-medium text-[#10241A]">{ds.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#E6F1EA] text-[#0B6B3A] font-medium text-[11px]">
                        {ds.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#10241A]">
                      {ds.record_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-[#5A7466]">{ds.created_at}</td>
                    <td className="py-3 px-4 text-emerald-700 font-medium capitalize">{ds.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-[#D5E2D9] shadow-xl">
              <h3 className="text-base font-heading font-bold text-[#10241A]">
                Create Synthetic Tabular Batch
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1">
                    Dataset Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="synthetic_patients_batch_02.csv"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#10241A] mb-1">
                    Record Count
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-[#D5E2D9] rounded-lg text-xs font-semibold text-[#5A7466] hover:bg-[#FAFBF8]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0B6B3A] text-white rounded-lg text-xs font-semibold hover:bg-[#064826]"
                  >
                    Generate Batch
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
