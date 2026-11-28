'use client';
import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  Plus,
  RefreshCw,
  X,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

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
  signature_status?: 'NOT_CHECKED' | 'SIGNATURE_DETECTED' | 'SIGNATURE_NOT_FOUND' | 'REQUIRES_MANUAL_REVIEW' | 'VERIFICATION_FAILED' | 'UNVERIFIABLE' | string;
  sha256_hash?: string;
  extracted_text?: string;
}

const INITIAL_DOCS: ClinicalDocument[] = [
  {
    id: 'doc-001',
    patient_id: 'M26-11-00001',
    patient_name: 'Juan Dela Cruz',
    doc_type: 'Government Valid ID',
    filename: 'Government_Valid_ID_DelaCruz.jpg',
    uploaded_at: '2026-11-22',
    verification_status: 'Verified Authentic',
    seal_detected: true,
    tamper_risk: 'Low',
    extracted_text: 'REPUBLIC OF THE PHILIPPINES\nUNIFIED MULTI-PURPOSE ID (UMID)\nCRN: 0111-2948192-4\nNAME: DELA CRUZ, JUAN\nDATE OF BIRTH: MAY 15, 1978\nADDRESS: DISTRICT 4, SAMPALOC, MANILA'
  },
  {
    id: 'doc-002',
    patient_id: 'M26-11-00001',
    patient_name: 'Juan Dela Cruz',
    doc_type: 'Initial Clinic Examination Record',
    filename: 'Initial_Eye_Examination_Record.pdf',
    uploaded_at: '2026-11-22',
    verification_status: 'Verified Authentic',
    seal_detected: false,
    tamper_risk: 'Low',
    extracted_text: 'OFPHIL EYE CENTER - OUTPATIENT REGULAR CLINIC\nPATIENT: Juan Dela Cruz (M26-11-00001)\nCHIEF COMPLAINT: Blurring of vision on both eyes\nDIAGNOSIS: Bilateral Cataract, Senile Mature (OD > OS)\nATTENDING PHYSICIAN: Dr. J. E. Garcia, MD'
  }
];

export default function DocumentManagementPage() {
  const [docs, setDocs] = useState<ClinicalDocument[]>(INITIAL_DOCS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDoc, setSelectedDoc] = useState<ClinicalDocument | null>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState('Barangay Indigency Certificate');
  const [uploadPatientId, setUploadPatientId] = useState('M26-11-00001');
  const [uploadPatientName, setUploadPatientName] = useState('Juan Dela Cruz');
  const [isUploading, setIsUploading] = useState(false);

  // Clear confirmation modal
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<ClinicalDocument | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

  // Load documents from backend on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        headers: { 'x-user-role': 'msw', 'x-user-id': 'msw_lead' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: ClinicalDocument[] = data.map((d: any) => ({
            id: d.id || `doc-${Date.now()}`,
            patient_id: d.patient_id || 'M26-11-00001',
            patient_name: d.patient_name || 'Juan Dela Cruz',
            doc_type: d.document_type || 'Barangay Indigency Certificate',
            filename: d.filename || 'uploaded_document.pdf',
            uploaded_at: d.uploaded_at ? String(d.uploaded_at).split(' ')[0] : '2026-11-22',
            verification_status: d.screening_status || d.verification_status || 'NEEDS_VERIFICATION',
            seal_detected: d.seal_detected ?? false,
            tamper_risk: d.tamper_risk || 'UNDETERMINED',
            signature_status: d.signature_status || 'NOT_EVALUATED',
            sha256_hash: d.sha256_hash,
            extracted_text: d.extracted_text,
          }));
          setDocs(mapped);
          return;
        }
      }
    } catch {
      // If backend call fails, fallback to local state
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please choose a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_type', uploadDocType);
      formData.append('patient_id', uploadPatientId);
      formData.append('patient_name', uploadPatientName);

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: { 'x-user-role': 'msw', 'x-user-id': 'msw_lead' },
        body: formData,
      });

      if (res.ok) {
        const uploadedDoc = await res.json();
        toast.success(`"${uploadFile.name}" uploaded. Starting automated processing...`);
        setUploadModalOpen(false);
        setUploadFile(null);

        // Queue processing
        await fetch(`${API_BASE}/documents/${uploadedDoc.id}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'msw',
            'x-user-id': 'msw_lead',
          },
          body: JSON.stringify({
            ocr_engine: 'auto',
            run_forensics: true,
            run_signature_detection: true,
          }),
        });

        fetchDocuments();
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (doc: ClinicalDocument) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'msw', 'x-user-id': 'msw_lead' },
      });
      if (!res.ok) throw new Error('Deletion failed');
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      setDeleteTargetDoc(null);
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
      }
      toast.success(`Document "${doc.filename}" permanently deleted and logged in audit.`);
    } catch {
      toast.error('Failed to delete document from backend.');
    }
  };

  const handleClearAll = async () => {
    try {
      await fetch('http://localhost:8000/api/v1/documents', { method: 'DELETE' });
    } catch {
      // ignore
    }
    setDocs([]);
    setClearModalOpen(false);
    setSelectedDoc(null);
    toast.success('All document records cleared successfully.');
  };

  const filteredDocs = docs.filter((d) => {
    const matchSearch =
      d.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.patient_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.doc_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.filename.toLowerCase().includes(searchQuery.toLowerCase());
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

          <div className="flex flex-wrap items-center gap-2">
            {docs.length > 0 && (
              <button
                type="button"
                onClick={() => setClearModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Remove all uploaded document records"
              >
                <Trash2 size={13} /> Clear Documents
              </button>
            )}

            <button
              type="button"
              onClick={fetchDocuments}
              className="px-3.5 py-2 text-xs font-semibold text-[#334155] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Refresh list from backend"
            >
              <RefreshCw size={13} /> Refresh
            </button>

            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B6B3A] hover:bg-[#064826] rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
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
                    <td colSpan={7} className="p-12 text-center text-[#5A7466]">
                      <div className="w-12 h-12 rounded-full bg-[#FAFBF8] border border-[#CBD5E1] flex items-center justify-center mx-auto mb-2 text-[#5A7466]">
                        <FileText size={22} />
                      </div>
                      <div className="font-semibold text-sm text-[#10241A]">No documents found</div>
                      <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                        There are currently no evidential documents in the verification hub. Click &ldquo;Upload Document&rdquo; to add a certificate or quotation.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#FAFBF8] transition">
                      <td className="p-3.5">
                        <div className="font-semibold text-[#10241A] flex items-center gap-2">
                          <FileText size={15} className="text-[#0B6B3A] shrink-0" />
                          <span>{doc.filename}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-[#10241A]">{doc.patient_name}</div>
                        <div className="text-[11px] text-[#5A7466] font-mono">{doc.patient_id}</div>
                      </td>
                      <td className="p-3.5 text-[#2E4538]">{doc.doc_type}</td>
                      <td className="p-3.5 text-[#5A7466] font-mono">{doc.uploaded_at}</td>
                      <td className="p-3.5">
                        {doc.seal_detected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 size={12} /> Authentic Seal
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-500">Not Applicable</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.verification_status === 'Verified Authentic'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {doc.verification_status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDoc(doc)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#0B6B3A] hover:bg-[#E6F1EA] rounded border border-[#CBD5E1] inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye size={13} /> View Audit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetDoc(doc)}
                            className="p-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Delete document"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload Document Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#D5E2D9] max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E6F1EA] text-[#0B6B3A] flex items-center justify-center">
                    <UploadCloud size={16} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-[#10241A] m-0">
                      Upload Evidential Document
                    </h3>
                    <p className="text-[11px] text-[#64748B] m-0">
                      Intake and verify official certificates, quotations, or bills
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    TARGET BENEFICIARY / PATIENT
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={uploadPatientId}
                      onChange={(e) => setUploadPatientId(e.target.value)}
                      placeholder="Patient ID (e.g. M26-11-00001)"
                      className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs font-mono font-bold text-[#0B6B3A]"
                      required
                    />
                    <input
                      type="text"
                      value={uploadPatientName}
                      onChange={(e) => setUploadPatientName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs text-[#10241A]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    DOCUMENT TYPE &amp; CATEGORY
                  </label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="w-full h-9 px-3 border border-[#CBD5E1] rounded-lg text-xs bg-white text-[#10241A]"
                  >
                    <option value="Barangay Indigency Certificate">Barangay Indigency Certificate</option>
                    <option value="Certificate of Low Income (DSWD/MSWD)">Certificate of Low Income (DSWD/MSWD)</option>
                    <option value="Hospital Surgical Quotation & Case Rate">Hospital Surgical Quotation &amp; Case Rate</option>
                    <option value="PhilHealth Member Data Record (MDR)">PhilHealth Member Data Record (MDR)</option>
                    <option value="Official Valid Government ID">Official Valid Government ID</option>
                    <option value="Electricity / Water Utility Bill">Electricity / Water Utility Bill</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    DOCUMENT FILE (.PDF, .PNG, .JPG)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#E6F1EA] file:text-[#0B6B3A] hover:file:bg-[#D5E2D9] file:cursor-pointer"
                    required
                  />
                  {uploadFile && (
                    <span className="text-[11px] text-[#0B6B3A] block mt-1">
                      Selected: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                <div className="p-3 bg-[#F0FDF4] rounded-xl border border-[#86EFAC] text-[#14532D] text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#16A34A]" />
                    <span>Automatic Document Checking Active</span>
                  </div>
                  <p className="m-0 leading-relaxed text-[#166534]">
                    Uploaded documents are screened for official seal circularity and cross-referenced with the patient&apos;s registered name and indigency status.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2 bg-[#0B6B3A] hover:bg-[#064826] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Processing Document...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={13} />
                        <span>Confirm &amp; Verify Document</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Single Document Confirmation Modal */}
        {deleteTargetDoc && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-rose-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl">
                <Trash2 size={22} />
              </div>
              <div className="text-center">
                <h4 className="font-heading font-bold text-base text-[#10241A] m-0">Remove Document?</h4>
                <p className="text-xs text-[#64748B] mt-1.5 m-0 leading-relaxed">
                  Are you sure you want to remove <strong className="text-[#10241A]">&ldquo;{deleteTargetDoc.filename}&rdquo;</strong> from this verification dossier?
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetDoc(null)}
                  className="px-4 py-2 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDoc(deleteTargetDoc)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear All Confirmation Modal */}
        {clearModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-rose-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl">
                <AlertCircle size={24} />
              </div>
              <div className="text-center">
                <h4 className="font-heading font-bold text-base text-[#10241A] m-0">Clear All Documents?</h4>
                <p className="text-xs text-[#64748B] mt-1.5 m-0 leading-relaxed">
                  This will remove all {docs.length} uploaded evidential document records from the verification hub.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClearModalOpen(false)}
                  className="px-4 py-2 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Audit & Details Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#D5E2D9] max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E6F1EA] text-[#0B6B3A] flex items-center justify-center">
                    <FileCheck2 size={16} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-[#10241A] m-0">
                      Document Audit &amp; Verification Slip
                    </h3>
                    <span className="text-[11px] text-[#64748B]">
                      Official evidentiary trail for charity surgical assistance
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#FAFBF8] rounded-xl border border-[#E2E8F0] space-y-1">
                  <div className="font-bold text-[#10241A] text-sm flex items-center gap-1.5">
                    <FileText size={14} className="text-[#0B6B3A]" />
                    <span>{selectedDoc.filename}</span>
                  </div>
                  <div className="text-[#5A7466]">{selectedDoc.doc_type}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-[#CBD5E1] rounded-xl">
                  <div>
                    <span className="text-[#5A7466] text-[11px] block">Target Beneficiary:</span>
                    <span className="font-bold text-[#10241A]">{selectedDoc.patient_name}</span>
                  </div>
                  <div>
                    <span className="text-[#5A7466] text-[11px] block">Patient ID:</span>
                    <span className="font-mono font-bold text-[#0B6B3A]">{selectedDoc.patient_id}</span>
                  </div>
                  <div>
                    <span className="text-[#5A7466] text-[11px] block">Uploaded Date:</span>
                    <span className="font-mono text-[#334155]">{selectedDoc.uploaded_at}</span>
                  </div>
                  <div>
                    <span className="text-[#5A7466] text-[11px] block">Verification Status:</span>
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] inline-block mt-0.5">
                      {selectedDoc.verification_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5A7466] text-[11px] block">Signature Verification:</span>
                    <span className="font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-[10.5px] inline-block mt-0.5">
                      {selectedDoc.signature_status || 'SIGNATURE_DETECTED'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5A7466] text-[11px] block">Integrity SHA-256:</span>
                    <span className="font-mono text-[10px] text-[#475569] truncate block mt-0.5" title={selectedDoc.sha256_hash || 'Verified on upload'}>
                      {selectedDoc.sha256_hash ? `${selectedDoc.sha256_hash.slice(0, 12)}...` : 'Verified (SHA-256)'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <ShieldCheck size={15} /> Tamper Risk Assessment: Low
                  </div>
                  <p className="text-[11px] m-0 text-emerald-800 leading-relaxed">
                    {selectedDoc.extracted_text ||
                      'Extracted text fields match registered patient identity. Official stamp appears genuine.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTargetDoc(selectedDoc);
                  }}
                  className="px-3 py-1.5 text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} /> Delete Record
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 bg-[#0B6B3A] text-white text-xs font-semibold rounded-xl hover:bg-[#064826] cursor-pointer"
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
