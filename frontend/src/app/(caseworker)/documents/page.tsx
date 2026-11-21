'use client';
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Trash2,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface ClinicalDocument {
  id: string;
  patient_id: string;
  patient_name: string;
  doc_type: string;
  filename: string;
  uploaded_at: string;
  verification_status: 'Verified Authentic' | 'Pending Review' | 'Flagged Discrepancy';
  seal_detected: boolean;
  tamper_risk: 'Low' | 'Medium' | 'High';
}

const INITIAL_DOCS: ClinicalDocument[] = [
  {
    id: '1',
    patient_id: 'OFP-2026-0042',
    patient_name: 'Juan Dela Cruz',
    doc_type: 'Barangay Indigency Certificate',
    filename: 'Brgy_Indigency_Cert_DelaCruz.pdf',
    uploaded_at: '2026-11-18',
    verification_status: 'Verified Authentic',
    seal_detected: true,
    tamper_risk: 'Low'
  },
  {
    id: '2',
    patient_id: 'OFP-2026-0043',
    patient_name: 'Elena Ramos',
    doc_type: 'Certificate of Low Income (DSWD/MSWD)',
    filename: 'MSWD_Income_Cert_Ramos.pdf',
    uploaded_at: '2026-11-19',
    verification_status: 'Verified Authentic',
    seal_detected: true,
    tamper_risk: 'Low'
  },
  {
    id: '3',
    patient_id: 'OFP-2026-0044',
    patient_name: 'Rodrigo Bautista',
    doc_type: 'Hospital Surgical Quotation & Case Rate',
    filename: 'StMartin_Surgery_Quotation_Bautista.pdf',
    uploaded_at: '2026-11-20',
    verification_status: 'Pending Review',
    seal_detected: true,
    tamper_risk: 'Low'
  },
  {
    id: '4',
    patient_id: 'OFP-2026-0045',
    patient_name: 'Corazon Mendoza',
    doc_type: 'PhilHealth Member Data Record (MDR)',
    filename: 'PhilHealth_MDR_Mendoza.pdf',
    uploaded_at: '2026-11-20',
    verification_status: 'Verified Authentic',
    seal_detected: false,
    tamper_risk: 'Low'
  }
];

export default function DocumentManagementPage() {
  const [docs, setDocs] = useState<ClinicalDocument[]>(INITIAL_DOCS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDoc, setSelectedDoc] = useState<ClinicalDocument | null>(null);

  const filteredDocs = docs.filter((d) => {
    const matchSearch =
      d.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.patient_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.doc_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || d.verification_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-xl border border-[#D5E2D9] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-heading font-bold text-[#10241A]">
                Evidential Document Verification Hub
              </h1>
              <span className="text-xs bg-[#E6F1EA] text-[#0B6B3A] px-2 py-0.5 rounded-full font-semibold">
                {filteredDocs.length} Total Documents
              </span>
            </div>
            <p className="text-xs text-[#5A7466] mt-1">
              Automated document intake, official seal verification, and caseworker audit trail for indigent assistance claims.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Document upload modal opened')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B6B3A] hover:bg-[#064826] rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <UploadCloud size={14} /> Upload Document
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-[#D5E2D9] shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A7466]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, ID, or document type..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-1 focus:ring-[#0B6B3A]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] bg-white focus:outline-none focus:ring-1 focus:ring-[#0B6B3A] w-full sm:w-auto"
          >
            <option value="ALL">All Verification Statuses</option>
            <option value="Verified Authentic">Verified Authentic</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Flagged Discrepancy">Flagged Discrepancy</option>
          </select>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-xl border border-[#D5E2D9] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAFBF8] border-b border-[#D5E2D9] text-[#5A7466] uppercase text-[11px] font-semibold tracking-wider">
                  <th className="p-3.5">Document File</th>
                  <th className="p-3.5">Beneficiary / Patient</th>
                  <th className="p-3.5">Type &amp; Category</th>
                  <th className="p-3.5">Uploaded Date</th>
                  <th className="p-3.5">Seal Verification</th>
                  <th className="p-3.5">Audit Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#5A7466]">
                      No document records matched the search filters.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#FAFBF8] transition">
                      <td className="p-3.5">
                        <div className="font-semibold text-[#10241A] flex items-center gap-2">
                          <FileText size={15} className="text-[#0B6B3A]" />
                          <span>{doc.filename}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-[#10241A]">{doc.patient_name}</div>
                        <div className="text-[11px] text-[#5A7466]">{doc.patient_id}</div>
                      </td>
                      <td className="p-3.5 text-[#2E4538]">{doc.doc_type}</td>
                      <td className="p-3.5 text-[#5A7466] font-mono">{doc.uploaded_at}</td>
                      <td className="p-3.5">
                        {doc.seal_detected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 size={12} /> Authentic Seal
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-500">Not Applicable</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.verification_status === 'Verified Authentic'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {doc.verification_status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#0B6B3A] hover:bg-[#E6F1EA] rounded border border-[#CBD5E1] inline-flex items-center gap-1 transition"
                        >
                          <Eye size={13} /> View Audit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Document Audit Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-[#D5E2D9] max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                <h3 className="font-heading font-bold text-base text-[#10241A]">
                  Document Audit &amp; Verification Slip
                </h3>
                <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#FAFBF8] rounded-lg border border-[#E2E8F0] space-y-1">
                  <div className="font-bold text-[#10241A]">{selectedDoc.filename}</div>
                  <div className="text-[#5A7466]">{selectedDoc.doc_type}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#5A7466] block">Beneficiary:</span>
                    <span className="font-semibold text-[#10241A]">{selectedDoc.patient_name}</span>
                  </div>
                  <div>
                    <span className="text-[#5A7466] block">Patient ID:</span>
                    <span className="font-mono font-semibold text-[#0B6B3A]">{selectedDoc.patient_id}</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck size={15} /> Tamper Risk Assessment: Low
                  </div>
                  <p className="text-[11px]">
                    Extracted text fields match registered patient identity. Official stamp circular geometry validated with high confidence.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 bg-[#0B6B3A] text-white text-xs font-semibold rounded-lg"
                >
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
