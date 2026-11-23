'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLoadingScreen } from '@/context/LoadingScreenContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getApiUrl } from '@/lib/api';
import { MSWNotificationItem } from '@/components/AppShell';

const CATEGORY_LABELS: Record<string, { label: string; icon: string; badgeClass: string }> = {
  PATIENT_ASSIGNED: {
    label: 'Patient Assigned',
    icon: 'fa-user-plus',
    badgeClass: 'bg-[#E8F5EC] text-[#0B6B3A] border-[#BBF7D0]',
  },
  APPLICATION_PENDING_ASSESSMENT: {
    label: 'Pending Assessment',
    icon: 'fa-clipboard-user',
    badgeClass: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  },
  ASSESSMENT_DRAFT_SAVED: {
    label: 'Assessment Draft',
    icon: 'fa-file-pen',
    badgeClass: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
  },
  ASSESSMENT_SUBMITTED: {
    label: 'Assessment Submitted',
    icon: 'fa-clipboard-check',
    badgeClass: 'bg-[#E8F5EC] text-[#0B6B3A] border-[#BBF7D0]',
  },
  ADMIN_DECISION_UPDATED: {
    label: 'Admin Decision Update',
    icon: 'fa-gavel',
    badgeClass: 'bg-[#F3E8FF] text-[#6D28D9] border-[#E9D5FF]',
  },
  CHARITY_APPROVED: {
    label: 'Charity Approved',
    icon: 'fa-circle-check',
    badgeClass: 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]',
  },
  CHARITY_DENIED_OR_PROMISSORY: {
    label: 'Disapproved / Promissory',
    icon: 'fa-file-signature',
    badgeClass: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  },
  REFERRAL_UPDATED: {
    label: 'Financial Referral',
    icon: 'fa-file-invoice-dollar',
    badgeClass: 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]',
  },
  DOCUMENT_UPLOADED: {
    label: 'Supporting Document',
    icon: 'fa-file-shield',
    badgeClass: 'bg-[#F3E8FF] text-[#7C3AED] border-[#E9D5FF]',
  },
  PATIENT_INQUIRY: {
    label: 'Patient Inquiry',
    icon: 'fa-envelope-open-text',
    badgeClass: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
  },
  PATIENT_RECORD_UPDATED: {
    label: 'Patient Dossier Update',
    icon: 'fa-folder-open',
    badgeClass: 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]',
  },
};

export default function MSWNotificationsPage() {
  const { role, user } = useAuth();
  const router = useRouter();
  const { startProgress } = useLoadingScreen();

  const mswUserId = (user as any)?.username || user?.id || 'msw_lead';

  const [notifications, setNotifications] = useState<MSWNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        read_filter: readFilter,
        type_filter: typeFilter,
      });
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(getApiUrl(`/inquiries/notifications/list?${params.toString()}`), {
        headers: {
          'x-user-role': 'msw',
          'x-user-id': String(mswUserId),
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(typeof data.unread_count === 'number' ? data.unread_count : 0);
      setTotalCount(typeof data.total_count === 'number' ? data.total_count : Array.isArray(data.items) ? data.items.length : 0);
      setTotalPages(typeof data.total_pages === 'number' ? Math.max(1, data.total_pages) : 1);
    } catch {
      // ignore network error
    } finally {
      setLoading(false);
    }
  }, [mswUserId, page, pageSize, readFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchNotifications();
    const onSync = () => fetchNotifications();
    window.addEventListener('ofphil-msw-notifications-updated', onSync);
    const interval = setInterval(fetchNotifications, 8000);
    return () => {
      window.removeEventListener('ofphil-msw-notifications-updated', onSync);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notifId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      const res = await fetch(getApiUrl(`/inquiries/notifications/${encodeURIComponent(notifId)}/read`), {
        method: 'POST',
        headers: {
          'x-user-role': 'msw',
          'x-user-id': String(mswUserId),
        },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notifId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        window.dispatchEvent(new Event('ofphil-msw-notifications-updated'));
      }
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const res = await fetch(getApiUrl('/inquiries/notifications/mark-all-read'), {
        method: 'POST',
        headers: {
          'x-user-role': 'msw',
          'x-user-id': String(mswUserId),
        },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }))
        );
        setUnreadCount(0);
        window.dispatchEvent(new Event('ofphil-msw-notifications-updated'));
      }
    } catch {} finally {
      setMarkingAll(false);
    }
  };

  const handleOpenNotification = async (item: MSWNotificationItem) => {
    if (!item.is_read) {
      await handleMarkAsRead(item.id);
    }
    startProgress();
    router.push(item.target_destination || '/patients');
  };

  const filteredItems = useMemo(() => {
    return notifications.filter((item) => {
      if (readFilter === 'UNREAD' && item.is_read) return false;
      if (readFilter === 'READ' && !item.is_read) return false;
      if (typeFilter !== 'ALL' && item.notification_type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${item.title} ${item.message} ${item.related_patient_id || ''} ${item.related_encounter_id || ''} ${item.related_assessment_id || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [notifications, readFilter, typeFilter, searchQuery]);

  if (role && role !== 'msw' && role !== 'admin') {
    return (
      <DashboardLayout
        title="MSW Notification Center"
        subtitle="Ophthalmological Foundation of the Philippines — Medical Social Work Notifications"
      >
        <div className="p-8 text-center">
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-[#D5E2D9] p-6 shadow-xs">
            <i className="fa-solid fa-lock text-2xl text-[#DC2626] mb-2" />
            <h2 className="text-base font-bold text-[#10241A]">MSW Authorization Required</h2>
            <p className="text-xs text-[#5A7466] mt-1">
              Only authorized Medical Social Workers can view the MSW Notification Center.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="MSW Notification Center"
      subtitle="Ophthalmological Foundation of the Philippines — Medical Social Work Casework & Charity Alerts"
    >
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#D5E2D9] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0B6B3A] text-white flex items-center justify-center shrink-0 shadow-xs">
            <i className="fa-solid fa-bell text-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-['Outfit'] font-bold text-[#10241A]">
                MSW Notification Center
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5EC] text-[#0B6B3A] border border-[#BBF7D0]">
                <i className="fa-solid fa-user-check text-[10px]" />
                {user?.name || 'Maria Santos, RSW'} ({mswUserId})
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#DC2626] text-white">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-xs text-[#5A7466] mt-1">
              Real-time alerts for assigned patient records, MSW assessments, charity assistance decisions, financial referrals, documents, and patient inquiries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchNotifications}
            className="px-3.5 py-2 rounded-xl border border-[#D5E2D9] bg-white hover:bg-[#F8FBF9] text-xs font-bold text-[#1E293B] transition cursor-pointer flex items-center gap-1.5"
          >
            <i className="fa-solid fa-rotate-right text-[#0B6B3A]" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            disabled={unreadCount === 0 || markingAll}
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#095830] disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs border-0"
          >
            <i className="fa-solid fa-check-double" />
            <span>{markingAll ? 'Updating...' : 'Mark All as Read'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-[#D5E2D9] p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#5A7466]">Total Notifications</div>
          <div className="text-2xl font-['Outfit'] font-extrabold text-[#10241A] mt-1">{notifications.length}</div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Assigned to {mswUserId}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#D5E2D9] p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">Unread Alerts</div>
          <div className="text-2xl font-['Outfit'] font-extrabold text-[#DC2626] mt-1">{unreadCount}</div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Awaiting MSW review</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#D5E2D9] p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B3A]">Assessments &amp; Charity</div>
          <div className="text-2xl font-['Outfit'] font-extrabold text-[#0B6B3A] mt-1">
            {
              notifications.filter((n) =>
                [
                  'APPLICATION_PENDING_ASSESSMENT',
                  'ASSESSMENT_DRAFT_SAVED',
                  'ASSESSMENT_SUBMITTED',
                  'CHARITY_APPROVED',
                  'CHARITY_DENIED_OR_PROMISSORY',
                  'ADMIN_DECISION_UPDATED',
                ].includes(n.notification_type)
              ).length
            }
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Eligibility &amp; grant updates</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#D5E2D9] p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#0284C7]">Referrals &amp; Inquiries</div>
          <div className="text-2xl font-['Outfit'] font-extrabold text-[#0284C7] mt-1">
            {
              notifications.filter((n) =>
                ['REFERRAL_UPDATED', 'PATIENT_INQUIRY', 'DOCUMENT_UPLOADED'].includes(n.notification_type)
              ).length
            }
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Clinical referrals &amp; documents</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-[#D5E2D9] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'UNREAD', 'READ'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setReadFilter(tab);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                readFilter === tab
                  ? 'bg-[#0B6B3A] text-white border-[#0B6B3A] shadow-2xs'
                  : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:bg-[#E8F5EC] hover:text-[#0B6B3A]'
              }`}
            >
              {tab === 'ALL'
                ? `All (${readFilter === 'ALL' ? totalCount : 'All'})`
                : tab === 'UNREAD'
                  ? `Unread (${unreadCount})`
                  : 'Read'}
            </button>
          ))}

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter notification category"
            className="ml-1 px-3 py-1.5 rounded-xl border border-[#D5E2D9] bg-white text-xs font-semibold text-[#1E293B] focus:outline-none focus:border-[#0B6B3A]"
          >
            <option value="ALL">All Event Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search patient ID, case no., or title..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D5E2D9] text-xs text-[#10241A] focus:outline-none focus:border-[#0B6B3A]"
          />
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-2xl border border-[#D5E2D9] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-[#5A7466]">
            <i className="fa-solid fa-spinner fa-spin text-lg text-[#0B6B3A] mb-2 block" />
            Loading MSW notifications...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F5EC] text-[#0B6B3A] flex items-center justify-center mx-auto mb-3">
              <i className="fa-regular fa-bell-slash text-xl" />
            </div>
            <h3 className="text-sm font-bold text-[#10241A]">No Matching Notifications</h3>
            <p className="text-xs text-[#5A7466] mt-1 max-w-md mx-auto">
              There are no MSW notifications matching your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#EEF2EF]">
            {filteredItems.map((item) => {
              const meta = CATEGORY_LABELS[item.notification_type] || {
                label: item.notification_type.replace(/_/g, ' '),
                icon: 'fa-bell',
                badgeClass: 'bg-[#E8F5EC] text-[#0B6B3A] border-[#BBF7D0]',
              };
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenNotification(item)}
                  className={`p-4 sm:p-5 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.is_read ? 'bg-white hover:bg-[#F8FAFC]' : 'bg-[#F0F9F3] hover:bg-[#E6F4EB]'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 ${meta.badgeClass}`}
                    >
                      <i className={`fa-solid ${meta.icon} text-sm`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        {item.related_patient_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1]">
                            <i className="fa-solid fa-id-card-clip text-[#0B6B3A]" />
                            {item.related_patient_id}
                          </span>
                        )}
                        {item.related_encounter_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]">
                            Enc/Ref: {item.related_encounter_id}
                          </span>
                        )}
                        {!item.is_read && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0B6B3A] text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            UNREAD
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-sm mt-1.5 ${
                          item.is_read ? 'font-bold text-[#1E293B]' : 'font-extrabold text-[#10241A]'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">{item.message}</p>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-[#64748B]">
                        <span>
                          <i className="fa-regular fa-clock mr-1" />
                          {new Date(item.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        {item.is_read && item.read_at && (
                          <span className="text-[#0B6B3A] font-medium">
                            <i className="fa-solid fa-check mr-1" />
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="px-3 py-1.5 rounded-xl border border-[#0B6B3A]/30 bg-white hover:bg-[#E8F5EC] text-[#0B6B3A] text-xs font-bold transition cursor-pointer"
                      >
                        Mark as Read
                      </button>
                    )}
                    <Link
                      href={item.target_destination || '/patients'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!item.is_read) {
                          handleMarkAsRead(item.id);
                        }
                        startProgress();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0B6B3A] hover:bg-[#095830] text-white text-xs font-bold transition no-underline inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>Open Dossier</span>
                      <i className="fa-solid fa-arrow-right text-[10px]" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Database-backed Pagination */}
        {!loading && totalCount > 0 && (
          <div className="px-4 py-3 border-t border-[#EEF2EF] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5A7466]">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Showing{' '}
                <strong className="text-[#10241A] font-semibold">
                  {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)}
                </strong>{' '}
                of <strong className="text-[#10241A] font-semibold">{totalCount}</strong> notifications
              </span>
              <span className="text-[#CBD5E1]">&bull;</span>
              <span>
                Page <strong className="text-[#10241A] font-semibold">{page}</strong> of{' '}
                <strong className="text-[#10241A] font-semibold">{totalPages}</strong>
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
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    </DashboardLayout>
  );
}
