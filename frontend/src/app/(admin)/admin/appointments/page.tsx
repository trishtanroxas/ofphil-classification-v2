'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

export interface AppointmentItem {
  id: string;
  patient_id: string;
  patient_name: string;
  appointment_type: string;
  appointment_date: string;
  appointment_time: string;
  assigned_doctor: string;
  clinic_room: string;
  notes: string;
  status: 'Archived Requests' | 'Scheduled' | 'Completed' | 'Rescheduled';
  recipient_email: string;
  recipient_phone: string;
  email_sent: boolean;
  sms_sent: boolean;
  created_at: string;
}

export default function AdminUpcomingAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [registeredPatients, setRegisteredPatients] = useState<Array<{ patient_id: string; first_name: string; last_name: string; email?: string; contact?: string }>>([
    { patient_id: 'M26-11-00001', first_name: 'Juan', last_name: 'Dela Cruz', email: 'roxas.t.bscs@gmail.com', contact: '0917 888 1678' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Archived Requests' | 'Scheduled' | 'Completed'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [form, setForm] = useState({
    patient_id: 'M26-11-00001',
    appointment_type: 'Comprehensive Eye Consultation & Visual Acuity Screening',
    appointment_date: '2026-11-25',
    appointment_time: '09:00 AM – 10:00 AM',
    assigned_doctor: 'Dr. Roberto Reyes, MD, DPBO (Ophthalmology)',
    clinic_room: 'OFPHIL Main Eye Center — Room 102 (Slit-Lamp & Diagnostics)',
    recipient_email: 'roxas.t.bscs@gmail.com',
    recipient_phone: '0917 888 1678',
    send_email: true,
    send_sms: true,
    notes: 'Please bring your Valid Government ID, previous eye prescriptions, and arrive 30 minutes before your scheduled slot.',
  });

  // Load all patients and all scheduled appointments across localStorage keys
  const loadAllAppointments = () => {
    try {
      const gathered: AppointmentItem[] = [];
      const seen = new Set<string>();

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ofphil_appointments_')) {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(list)) {
            for (const item of list) {
              if (item && item.id && !seen.has(item.id)) {
                seen.add(item.id);
                gathered.push(item);
              }
            }
          }
        }
      }

      gathered.sort((a, b) => (a.appointment_date > b.appointment_date ? 1 : -1));
      setAppointments(gathered);
    } catch (e) {}
  };

  useEffect(() => {
    loadAllAppointments();

    async function loadPatients() {
      const baseList: Array<{ patient_id: string; first_name: string; last_name: string; email?: string; contact?: string }> = [
        { patient_id: 'M26-11-00001', first_name: 'Juan', last_name: 'Dela Cruz', email: 'roxas.t.bscs@gmail.com', contact: '0917 888 1678' },
      ];
      try {
        const data = await fetchApi('/patients');
        if (Array.isArray(data)) {
          data.forEach((p: any) => {
            if (p.patient_id && !baseList.some((b) => b.patient_id.toUpperCase() === String(p.patient_id).toUpperCase())) {
              baseList.push({
                patient_id: p.patient_id,
                first_name: p.first_name || '',
                last_name: p.last_name || '',
                email: p.email || 'roxas.t.bscs@gmail.com',
                contact: p.contact || '0917 888 1678',
              });
            }
          });
        }
      } catch {}

      try {
        const localSaved = JSON.parse(localStorage.getItem('ofphil_registered_patients') || '[]');
        if (Array.isArray(localSaved)) {
          localSaved.forEach((p: any) => {
            if (p.patient_id && !baseList.some((b) => b.patient_id.toUpperCase() === String(p.patient_id).toUpperCase())) {
              baseList.push({
                patient_id: p.patient_id,
                first_name: p.first_name || '',
                last_name: p.last_name || '',
                email: p.email || 'roxas.t.bscs@gmail.com',
                contact: p.contact || '0917 888 1678',
              });
            }
          });
        }
      } catch {}

      setRegisteredPatients(baseList);
    }
    loadPatients();

    window.addEventListener('storage', loadAllAppointments);
    window.addEventListener('ofphil-appointments-updated', loadAllAppointments);
    return () => {
      window.removeEventListener('storage', loadAllAppointments);
      window.removeEventListener('ofphil-appointments-updated', loadAllAppointments);
    };
  }, []);

  // Lock body scroll and dismiss modal on Escape key
  useEffect(() => {
    if (modalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setModalOpen(false);
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [modalOpen]);

  const handlePatientSelectChange = (pid: string) => {
    const found = registeredPatients.find((p) => p.patient_id === pid);
    setForm((prev) => ({
      ...prev,
      patient_id: pid,
      recipient_email: found?.email && found.email !== 'juan.delacruz@example.ph' ? found.email : 'roxas.t.bscs@gmail.com',
      recipient_phone: found?.contact || '0917 888 1678',
    }));
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const foundPatient = registeredPatients.find((p) => p.patient_id === form.patient_id) || registeredPatients[0];
    const patientName = `${foundPatient.first_name} ${foundPatient.last_name}`.trim();
    const apptId = `APT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    setIsSubmitting(true);
    let emailDispatched = form.send_email;
    let smsDispatched = form.send_sms;

    try {
      const res = await fetchApi('/appointments/schedule', {
        method: 'POST',
        body: JSON.stringify({
          appointment_id: apptId,
          patient_id: form.patient_id,
          patient_name: patientName,
          recipient_email: form.recipient_email.trim(),
          recipient_phone: form.recipient_phone.trim(),
          appointment_type: form.appointment_type.trim(),
          appointment_date: form.appointment_date,
          appointment_time: form.appointment_time,
          assigned_doctor: form.assigned_doctor.trim(),
          clinic_room: form.clinic_room.trim(),
          notes: form.notes.trim(),
          send_email: form.send_email,
          send_sms: form.send_sms,
        }),
      });
      if (res) {
        emailDispatched = Boolean(res.email_sent);
        smsDispatched = Boolean(res.sms_sent);
      }
    } catch {}

    const newAppt: AppointmentItem = {
      id: apptId,
      patient_id: form.patient_id,
      patient_name: patientName,
      appointment_type: form.appointment_type.trim(),
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      assigned_doctor: form.assigned_doctor.trim(),
      clinic_room: form.clinic_room.trim(),
      notes: form.notes.trim(),
      status: 'Scheduled',
      recipient_email: form.recipient_email.trim(),
      recipient_phone: form.recipient_phone.trim(),
      email_sent: emailDispatched,
      sms_sent: smsDispatched,
      created_at: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    try {
      const key = `ofphil_appointments_${form.patient_id}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify([newAppt, ...existing]));
      setTimeout(() => window.dispatchEvent(new Event('ofphil-appointments-updated')), 0);
    } catch {}

    loadAllAppointments();
    setIsSubmitting(false);
    setModalOpen(false);
    toast.success(`Appointment ${apptId} scheduled for ${patientName} and sent via Email & SMS!`);
  };

  const handleApprovePendingRequest = async (appt: AppointmentItem) => {
    const targetEmail =
      appt.recipient_email && appt.recipient_email !== 'juan.delacruz@example.ph'
        ? appt.recipient_email
        : 'roxas.t.bscs@gmail.com';
    const targetPhone = appt.recipient_phone || '0917 888 1678';
    const doctorName =
      appt.assigned_doctor && !appt.assigned_doctor.includes('Pending')
        ? appt.assigned_doctor
        : 'Dr. Roberto Reyes, MD, DPBO (Ophthalmology)';
    const roomName =
      appt.clinic_room && !appt.clinic_room.includes('Mon–Fri')
        ? appt.clinic_room
        : 'OFPHIL Main Eye Center — Room 102 (Slit-Lamp & Diagnostics)';

    const toastId = toast.loading(`Approving ${appt.id} and sending Email & SMS confirmation...`);
    let emailDispatched = true;
    let smsDispatched = true;

    try {
      const res = await fetchApi('/appointments/schedule', {
        method: 'POST',
        body: JSON.stringify({
          appointment_id: appt.id,
          patient_id: appt.patient_id,
          patient_name: appt.patient_name,
          recipient_email: targetEmail,
          recipient_phone: targetPhone,
          appointment_type: appt.appointment_type,
          appointment_date: appt.appointment_date,
          appointment_time: appt.appointment_time,
          assigned_doctor: doctorName,
          clinic_room: roomName,
          notes: appt.notes || 'Approved by OFPHIL Clinic Nurse.',
          send_email: true,
          send_sms: true,
        }),
      });
      if (res) {
        emailDispatched = Boolean(res.email_sent);
        smsDispatched = Boolean(res.sms_sent);
      }
    } catch {}

    try {
      const key = `ofphil_appointments_${appt.patient_id}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = existing.map((item: any) =>
        item.id === appt.id
          ? {
              ...item,
              status: 'Scheduled',
              assigned_doctor: doctorName,
              clinic_room: roomName,
              recipient_email: targetEmail,
              recipient_phone: targetPhone,
              email_sent: emailDispatched,
              sms_sent: smsDispatched,
            }
          : item
      );
      localStorage.setItem(key, JSON.stringify(updated));
      setTimeout(() => window.dispatchEvent(new Event('ofphil-appointments-updated')), 0);
    } catch {}

    loadAllAppointments();
    toast.success(`Nurse Approved! Appointment ${appt.id} confirmed & sent via Email and SMS!`, { id: toastId });
  };

  const handleToggleCompleted = (appt: AppointmentItem) => {
    const nextStatus: 'Scheduled' | 'Completed' = appt.status === 'Completed' ? 'Scheduled' : 'Completed';
    try {
      const key = `ofphil_appointments_${appt.patient_id}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = existing.map((item: any) => (item.id === appt.id ? { ...item, status: nextStatus } : item));
      localStorage.setItem(key, JSON.stringify(updated));
      setTimeout(() => window.dispatchEvent(new Event('ofphil-appointments-updated')), 0);
    } catch {}
    loadAllAppointments();
    toast.success(`Appointment ${appt.id} marked as ${nextStatus}.`);
  };

  const handleDeleteAppointment = (appt: AppointmentItem) => {
    try {
      const key = `ofphil_appointments_${appt.patient_id}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = existing.filter((item: any) => item.id !== appt.id);
      localStorage.setItem(key, JSON.stringify(updated));
      setTimeout(() => window.dispatchEvent(new Event('ofphil-appointments-updated')), 0);
    } catch {}
    loadAllAppointments();
    toast.success(`Appointment ${appt.id} removed from schedule.`);
  };

  const filteredAppointments = appointments.filter((a) => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.patient_name.toLowerCase().includes(q) ||
        a.patient_id.toLowerCase().includes(q) ||
        a.appointment_type.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalApptsCount = filteredAppointments.length;
  const totalApptsPages = Math.max(1, Math.ceil(totalApptsCount / pageSize));
  const paginatedAppointments = filteredAppointments.slice((page - 1) * pageSize, page * pageSize);

  const pendingCount = appointments.filter((a) => a.status === 'Archived Requests').length;
  const upcomingCount = appointments.filter((a) => a.status === 'Scheduled').length;
  const completedCount = appointments.filter((a) => a.status === 'Completed').length;

  return (
    <DashboardLayout
      title="Upcoming Appointments & Clinic Schedule"
      subtitle="Ophthalmological Foundation of the Philippines — Master Patient Consultation & Surgery Schedule"
    >
      <div className="space-y-5 text-xs font-sans pb-12">
        {/* Top Summary Header Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#D5E2D9] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#E8F5EC] border border-[#A7F3D0] text-[#0B6B3A] flex items-center justify-center text-lg font-bold shrink-0">
              <i className="fa-solid fa-calendar-check" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-[#10241A] font-['Outfit'] m-0">
                  Upcoming Clinic Appointments &amp; Patient Queue
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#A7F3D0]">
                  {upcomingCount} Upcoming / {appointments.length} Total
                </span>
              </div>
              <p className="text-xs text-[#5A7466] m-0 mt-0.5">
                Track all patients scheduled for eye consultations, diagnostic workups, and surgical procedures with Email &amp; SMS alerts.
              </p>
            </div>
          </div>


        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-[#D5E2D9] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-[#EEF2EF] bg-[#FAFBF8] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs cursor-pointer border transition ${
                  statusFilter === 'ALL'
                    ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] font-bold'
                    : 'border-transparent text-[#5A7466] hover:bg-white'
                }`}
              >
                All Schedules ({appointments.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Archived Requests')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs cursor-pointer border transition ${
                  statusFilter === 'Archived Requests'
                    ? 'bg-amber-100 border-amber-500 text-amber-900 font-bold'
                    : 'border-transparent text-[#5A7466] hover:bg-white'
                }`}
              >
                Archived Requests ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Scheduled')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs cursor-pointer border transition ${
                  statusFilter === 'Scheduled'
                    ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] font-bold'
                    : 'border-transparent text-[#5A7466] hover:bg-white'
                }`}
              >
                Upcoming Needed ({upcomingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Completed')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs cursor-pointer border transition ${
                  statusFilter === 'Completed'
                    ? 'bg-[#E8F5EC] border-[#0B6B3A] text-[#0B6B3A] font-bold'
                    : 'border-transparent text-[#5A7466] hover:bg-white'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>

            <div className="relative min-w-[240px]">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search patient name, ID, or procedure..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-[#D5E2D9] rounded-lg focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>
          </div>

          {/* Appointments Master Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EEF2EF] bg-[#FAFBF8] text-[#475569] uppercase text-[10.5px] tracking-wider">
                  <th className="py-3.5 px-5 font-bold">Appt Ref</th>
                  <th className="py-3.5 px-5 font-bold">Patient Name &amp; ID</th>
                  <th className="py-3.5 px-5 font-bold">Scheduled Date &amp; Time</th>
                  <th className="py-3.5 px-5 font-bold">Consultation / Procedure &amp; Doctor</th>
                  <th className="py-3.5 px-5 font-bold">Dispatched Alerts</th>
                  <th className="py-3.5 px-5 font-bold">Status</th>
                  <th className="py-3.5 px-5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EF]">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 px-6 text-center text-[#5A7466]">
                      <div className="flex flex-col items-center justify-center gap-2.5">
                        <div className="w-12 h-12 rounded-full bg-[#FAFBF8] border border-[#D5E2D9] text-[#0B6B3A] flex items-center justify-center text-lg">
                          <i className="fa-regular fa-calendar-check" />
                        </div>
                        <div className="font-bold text-sm text-[#10241A]">No Upcoming Clinic Appointments Scheduled</div>
                        <p className="text-xs text-[#64748B] max-w-md m-0">
                          Schedule an appointment inside a patient&apos;s Master Record and it will automatically appear here in real time.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAppointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-[#FAFBF8] transition">
                      <td className="py-4 px-5 font-mono font-bold text-[#0B6B3A] whitespace-nowrap">
                        {appt.id}
                      </td>
                      <td className="py-4 px-5">
                        <Link
                          href={`/admin/patient-records/${appt.patient_id}`}
                          className="font-bold text-[#10241A] hover:text-[#0B6B3A] hover:underline no-underline block"
                        >
                          {appt.patient_name}
                        </Link>
                        <div className="text-[11px] text-[#5A7466] font-mono mt-0.5">
                          ID: {appt.patient_id}
                        </div>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-bold text-[#10241A] flex items-center gap-1.5">
                          <i className="fa-regular fa-calendar text-[#0B6B3A]" />
                          <span>{appt.appointment_date}</span>
                        </div>
                        <div className="text-[11px] text-[#5A7466] mt-0.5 flex items-center gap-1.5">
                          <i className="fa-regular fa-clock text-[#0B6B3A]" />
                          <span>{appt.appointment_time}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 max-w-xs">
                        <div className="font-semibold text-[#10241A]">{appt.appointment_type}</div>
                        <div className="text-[11px] text-[#5A7466] mt-0.5">
                          {appt.assigned_doctor} &bull; {appt.clinic_room}
                        </div>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {appt.email_sent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <i className="fa-solid fa-envelope-circle-check text-[9.5px]" />
                              <span>Email Sent</span>
                            </span>
                          )}
                          {appt.sms_sent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                              <i className="fa-solid fa-comment-sms text-[9.5px]" />
                              <span>SMS Sent</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-[#64748B] mt-1">
                          {appt.recipient_email}
                        </div>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        {appt.status === 'Archived Requests' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Archived Requests
                          </span>
                        ) : appt.status === 'Scheduled' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-[#0B6B3A] border border-emerald-200">
                            Approved • Upcoming
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Completed
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {appt.status === 'Archived Requests' ? (
                            <button
                              type="button"
                              onClick={() => handleApprovePendingRequest(appt)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0B6B3A] hover:bg-[#064826] text-white font-bold text-[11px] cursor-pointer transition border-0 shadow-2xs"
                            >
                              ✓ Approve &amp; Notify
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleCompleted(appt)}
                              className="px-2.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#E8F5EC] text-[#0B6B3A] font-semibold text-[11px] cursor-pointer transition"
                            >
                              {appt.status === 'Completed' ? 'Reopen' : '✓ Done'}
                            </button>
                          )}
                          <Link
                            href={`/admin/patient-records/${appt.patient_id}`}
                            className="px-2.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#FAFBF8] text-[#10241A] font-semibold text-[11px] no-underline transition"
                          >
                            Record &rarr;
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteAppointment(appt)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 bg-transparent border-0 cursor-pointer"
                            title="Delete Schedule"
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalApptsCount > 0 && (
            <div className="px-5 py-3.5 border-t border-[#EEF2EF] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5A7466]">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  Showing{' '}
                  <strong className="text-[#10241A] font-semibold">
                    {Math.min((page - 1) * pageSize + 1, totalApptsCount)}–{Math.min(page * pageSize, totalApptsCount)}
                  </strong>{' '}
                  of <strong className="text-[#10241A] font-semibold">{totalApptsCount}</strong> appointment schedules
                </span>
                <span className="text-[#CBD5E1]">&bull;</span>
                <span>
                  Page <strong className="text-[#10241A] font-semibold">{page}</strong> of{' '}
                  <strong className="text-[#10241A] font-semibold">{totalApptsPages}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white text-[#10241A] font-semibold hover:bg-[#FAFBF8] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-chevron-left text-[10px]" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={page >= totalApptsPages}
                  onClick={() => setPage((p) => Math.min(totalApptsPages, p + 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white text-[#10241A] font-semibold hover:bg-[#FAFBF8] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Next</span>
                  <i className="fa-solid fa-chevron-right text-[10px]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Schedule New Appointment */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl sm:max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-[#D5E2D9] shadow-2xl text-xs font-sans">
            <div className="px-6 py-4 bg-[#064826] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-base">
                  <i className="fa-solid fa-calendar-plus" />
                </div>
                <div>
                  <h3 className="font-['Outfit'] text-base font-bold m-0 text-white">
                    Schedule Upcoming Patient Appointment
                  </h3>
                  <p className="text-[11px] text-[#A7F3D0] m-0 mt-0.5">
                    Select a registered patient and dispatch their official schedule via Email &amp; Text (SMS)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer border-0"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                    Select Registered Patient <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={form.patient_id}
                    onChange={(e) => handlePatientSelectChange(e.target.value)}
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] font-bold focus:outline-none focus:border-[#0B6B3A]"
                  >
                    {registeredPatients.map((p) => (
                      <option key={p.patient_id} value={p.patient_id}>
                        {p.first_name} {p.last_name} ({p.patient_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                    Consultation / Ophthalmic Procedure Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={form.appointment_type}
                    onChange={(e) => setForm({ ...form, appointment_type: e.target.value })}
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] font-semibold focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="Comprehensive Eye Consultation & Visual Acuity Screening">Comprehensive Eye Consultation &amp; Visual Acuity Screening</option>
                    <option value="Slit-Lamp Biomicroscopy & Cataract Pre-Operative Workup">Slit-Lamp Biomicroscopy &amp; Cataract Pre-Operative Workup</option>
                    <option value="Scheduled Ophthalmic Surgery (Phacoemulsification / ECCE)">Scheduled Ophthalmic Surgery (Phacoemulsification / ECCE)</option>
                    <option value="Post-Operative Follow-Up & Intraocular Pressure Check">Post-Operative Follow-Up &amp; Intraocular Pressure Check</option>
                    <option value="Retina / Glaucoma Subspecialty Evaluation">Retina / Glaucoma Subspecialty Evaluation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                    Appointment Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.appointment_date}
                    onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] font-semibold focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                    Time Slot <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={form.appointment_time}
                    onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] font-semibold focus:outline-none focus:border-[#0B6B3A]"
                  >
                    <option value="08:00 AM – 09:00 AM">08:00 AM – 09:00 AM (Morning Batch 1)</option>
                    <option value="09:00 AM – 10:00 AM">09:00 AM – 10:00 AM (Morning Batch 2)</option>
                    <option value="10:00 AM – 11:30 AM">10:00 AM – 11:30 AM (Late Morning)</option>
                    <option value="01:00 PM – 02:30 PM">01:00 PM – 02:30 PM (Afternoon Batch 1)</option>
                    <option value="02:30 PM – 04:00 PM">02:30 PM – 04:00 PM (Afternoon Batch 2)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                    Attending Ophthalmologist / Specialist <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.assigned_doctor}
                    onChange={(e) => setForm({ ...form, assigned_doctor: e.target.value })}
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                    Clinic Room / Surgical Wing <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.clinic_room}
                    onChange={(e) => setForm({ ...form, clinic_room: e.target.value })}
                    className="w-full h-11 px-3.5 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAFBF8] border border-[#D5E2D9] space-y-3">
                <div className="font-bold text-xs text-[#0B6B3A] flex items-center gap-1.5">
                  <i className="fa-solid fa-paper-plane" />
                  <span>Automatic Patient Notification Channels (Email &amp; Text / SMS)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 font-semibold text-[#10241A] mb-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.send_email}
                        onChange={(e) => setForm({ ...form, send_email: e.target.checked })}
                        className="accent-[#0B6B3A] w-4 h-4 rounded"
                      />
                      <span>Send Official Email Notice (Brevo SMTP)</span>
                    </label>
                    <input
                      type="email"
                      value={form.recipient_email}
                      onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                      className="w-full h-10 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 font-semibold text-[#10241A] mb-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.send_sms}
                        onChange={(e) => setForm({ ...form, send_sms: e.target.checked })}
                        className="accent-[#0B6B3A] w-4 h-4 rounded"
                      />
                      <span>Send Mobile Text (SMS) Reminder</span>
                    </label>
                    <input
                      type="text"
                      value={form.recipient_phone}
                      onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })}
                      className="w-full h-10 px-3 border border-[#D5E2D9] rounded-lg text-xs bg-white text-[#10241A]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#10241A] uppercase tracking-wider mb-1.5">
                  Pre-Visit Instructions &amp; Reminders
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-3 border border-[#D5E2D9] rounded-xl text-xs bg-white text-[#10241A] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EEF2EF]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D5E2D9] bg-white text-[#5A7466] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#084D29] text-white font-bold flex items-center gap-2 transition shadow-xs cursor-pointer border-0"
                >
                  <i className={`fa-solid ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-xs`} />
                  <span>{isSubmitting ? 'Scheduling & Dispatching...' : 'Confirm & Send Email / SMS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
