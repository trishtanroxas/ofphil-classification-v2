'use client';
import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import PatientAppShell from '@/components/PatientAppShell';
import { fetchApi } from '@/lib/api';

export default function PatientEncounterDetailPage({
  params,
}: {
  params: Promise<{ encounter_id: string }>;
}) {
  const { encounter_id } = use(params);
  const [encounter, setEncounter] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDetails() {
      const pid = 'M26-11-00001';
      let found: any = null;

      try {
        const savedEncs = JSON.parse(localStorage.getItem(`ofphil_encounters_${pid}`) || '[]');
        if (Array.isArray(savedEncs)) {
          found = savedEncs.find(
            (e: any) => (e.assessment_id || e.id) === encounter_id
          );
        }
      } catch {}

      try {
        const res = await fetchApi(`/patients/${pid}`);
        if (!found && Array.isArray(res?.encounters)) {
          found = res.encounters.find(
            (e: any) => (e.assessment_id || e.id) === encounter_id
          );
        }
        const apiDocs = Array.isArray(res?.documents) ? res.documents : [];
        let localDocs: any[] = [];
        try {
          localDocs = JSON.parse(localStorage.getItem(`ofphil_documents_${pid}`) || '[]');
        } catch {}
        let inquiryDocs: any[] = [];
        try {
          const inqs = JSON.parse(localStorage.getItem(`ofphil_inquiries_${pid}`) || '[]');
          if (Array.isArray(inqs)) {
            inqs.forEach((inq: any) => {
              if (Array.isArray(inq.attachments)) {
                inq.attachments.forEach((att: any) => {
                  inquiryDocs.push({
                    id: `${inq.id}-${att.name}`,
                    name: att.name,
                    category: inq.subject || 'Submitted Inquiry Attachment',
                    uploaded_at: inq.createdAt || inq.date || 'Submitted',
                    url: att.dataUrl || att.url || '',
                  });
                });
              }
            });
          }
        } catch {}
        setDocuments([...(Array.isArray(localDocs) ? localDocs : []), ...apiDocs, ...inquiryDocs]);
      } catch {}

      setEncounter(found);
      setIsLoading(false);
    }

    loadDetails();
  }, [encounter_id]);

  return (
    <PatientAppShell
      activeTab="dashboard"
      pageTitle="Clinical Encounter & Case Details"
      pageSubtitle={`Encounter Record ${encounter_id} — Ophthalmological Foundation of the Philippines`}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/portal"
            className="px-4 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-[#10241A] font-bold text-xs inline-flex items-center gap-2 no-underline transition shadow-2xs"
          >
            <i className="fa-solid fa-arrow-left text-xs text-[#0B6B3A]" />
            <span>Back to Patient Dashboard</span>
          </Link>
          <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
            {encounter_id}
          </span>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#EEF2EF] p-8 text-center text-xs text-[#5A7466]">
            Loading clinical encounter details...
          </div>
        ) : !encounter ? (
          <div className="bg-white rounded-2xl border border-[#EEF2EF] p-10 text-center space-y-3">
            <i className="fa-solid fa-file-circle-xmark text-3xl text-[#94A3B8] block" />
            <h3 className="font-['Outfit'] text-base font-bold text-[#10241A] m-0">
              Clinical Encounter Not Found
            </h3>
            <p className="text-xs text-[#5A7466] m-0">
              This encounter record may have been removed or is not yet synced.
            </p>
          </div>
        ) : (
          <>
            {/* Clinical Diagnosis & Procedure Summary */}
            <div className="bg-white rounded-2xl border border-[#D5E2D9] shadow-xs p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#EEF2EF]">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
                      {encounter.encounter_date || encounter.checkup_date || 'Logged'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800">
                      {encounter.laterality || 'OU'}
                    </span>
                    {(encounter.diagnosis_severity || encounter.severity_grade) && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800">
                        {encounter.diagnosis_severity || encounter.severity_grade}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700">
                      {encounter.classification || 'REGULAR'}
                    </span>
                  </div>
                  <h2 className="font-['Outfit'] text-xl font-bold text-[#10241A] m-0">
                    {encounter.diagnosis || 'Ophthalmology Assessment'}
                  </h2>
                  <p className="text-xs text-[#5A7466] m-0">
                    <strong>Recommended Procedure:</strong> {encounter.procedure || 'N/A'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[10.5px] font-bold uppercase text-[#64748B]">Total Medical Quotation</div>
                  <div className="font-['Outfit'] text-2xl font-extrabold text-[#0B6B3A]">
                    &#8369;{Number(encounter.total_amount ?? encounter.total_quotation ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF] space-y-1">
                  <div className="text-[10.5px] font-bold uppercase text-[#64748B]">Attending Eye Surgeon</div>
                  <div className="font-bold text-[#10241A]">
                    {encounter.attending_doctor || encounter.attending_surgeon || 'OFPHIL Medical Team'}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF] space-y-1">
                  <div className="text-[10.5px] font-bold uppercase text-[#64748B]">Consultant Specialist</div>
                  <div className="font-bold text-[#10241A]">
                    {encounter.consultant || 'OFPHIL Ophthalmology Consultant'}
                  </div>
                </div>
                <div className="md:col-span-2 p-4 rounded-xl bg-[#FAFBF8] border border-[#EEF2EF] space-y-1">
                  <div className="text-[10.5px] font-bold uppercase text-[#64748B]">
                    Clinical Description &amp; Examination Notes
                  </div>
                  <p className="text-[#10241A] m-0 leading-relaxed">
                    {encounter.clinical_description || encounter.notes || 'No additional examination notes recorded.'}
                  </p>
                </div>
              </div>
            </div>

          </>
        )}
      </div>
    </PatientAppShell>
  );
}
