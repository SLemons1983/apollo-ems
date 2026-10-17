'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addDays } from '@/lib/payPeriods';
import { formatShortDate, getChangedRecords, makeDateInputValue } from './shared';

type CompanyAnnouncement = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  expiresAt: string;
  postedBy: string;
};

type AnnouncementsTileProps = {
  addAuditEntry: (action: string, details: string) => Promise<void> | void;
};

type CompanyAnnouncementRow = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  expires_at: string;
  posted_by: string;
};

function mapAnnouncementRow(row: CompanyAnnouncementRow): CompanyAnnouncement {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    postedBy: row.posted_by,
  };
}

function AnnouncementsTile({ addAuditEntry }: AnnouncementsTileProps) {
  const [announcements, setAnnouncements] = useState<CompanyAnnouncement[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState(() => makeDateInputValue(addDays(new Date(), 7)));

  // Loads when the tile is first opened, and again each time it is reopened,
  // so the list is current without being fetched for supervisors who never
  // open this tile.
  useEffect(() => {
    let isActive = true;

    supabase
      .from('company_announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!isActive) return;

        if (error) {
          console.error('Failed to load announcements:', error);
          setLoadFailed(true);
        } else {
          setAnnouncements((data ?? []).map(mapAnnouncementRow));
          setLoadFailed(false);
        }

        setHasLoaded(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const activeAnnouncements = useMemo(() => {
    const now = new Date();

    return announcements
      .filter((announcement) => new Date(announcement.expiresAt) >= now)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements]);

  const expiredAnnouncements = useMemo(() => {
    const now = new Date();

    return announcements
      .filter((announcement) => new Date(announcement.expiresAt) < now)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements]);

  function saveAnnouncements(nextAnnouncements: CompanyAnnouncement[]) {
    const changedAnnouncements = getChangedRecords(announcements, nextAnnouncements);
    setAnnouncements(nextAnnouncements);

    if (changedAnnouncements.length === 0) {
      return;
    }

    const rows = changedAnnouncements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      created_at: announcement.createdAt,
      expires_at: announcement.expiresAt,
      posted_by: announcement.postedBy,
      updated_at: new Date().toISOString(),
    }));

    supabase
      .from('company_announcements')
      .upsert(rows, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save announcements:', error);
          window.alert(`Announcement save failed: ${error.message}`);
        }
      });
  }

  function createAnnouncement() {
    if (!title.trim() || !message.trim() || !expiresAt) {
      return;
    }

    const expiresDate = new Date(`${expiresAt}T23:59:59`);

    const announcement: CompanyAnnouncement = {
      id: `announcement-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
      expiresAt: expiresDate.toISOString(),
      postedBy: 'Supervisor',
    };

    saveAnnouncements([announcement, ...announcements]);
    setTitle('');
    setMessage('');
    setExpiresAt(makeDateInputValue(addDays(new Date(), 7)));
  }

  function deleteAnnouncement(announcementId: string) {
    const existing = announcements.find((announcement) => announcement.id === announcementId);

    if (!window.confirm(`Delete announcement "${existing?.title ?? 'selected announcement'}"?`)) {
      return;
    }

    setAnnouncements((current) => current.filter((announcement) => announcement.id !== announcementId));

    supabase
      .from('company_announcements')
      .delete()
      .eq('id', announcementId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete announcement:', error);
          window.alert(`Announcement delete failed: ${error.message}`);
          return;
        }

        void addAuditEntry(
          'ANNOUNCEMENT_DELETED',
          `Deleted announcement: ${existing?.title ?? announcementId}`,
        );
      });
  }

  const loadingNotice = !hasLoaded ? 'Loading announcements…' : null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Announcement Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: Mandatory training reminder"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Display Until
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Message
            </label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder="Write the announcement employees should see..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={createAnnouncement}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Post Announcement
          </button>
        </div>
      </div>

      {loadFailed && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Apollo could not load announcements. Close and reopen this tile to try again.
        </div>
      )}

      <div>
        <div className="mb-2 text-sm font-semibold text-slate-900">Active Announcements</div>

        {loadingNotice ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            {loadingNotice}
          </div>
        ) : activeAnnouncements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            No active announcements.
          </div>
        ) : (
          <div className="space-y-3">
            {activeAnnouncements.map((announcement) => (
              <div key={announcement.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{announcement.title}</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{announcement.message}</div>
                    <div className="mt-3 text-xs text-slate-500">
                      Posted {formatShortDate(new Date(announcement.createdAt))} • Expires {formatShortDate(new Date(announcement.expiresAt))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteAnnouncement(announcement.id)}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-slate-900">Expired Announcements</div>

        {loadingNotice ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            {loadingNotice}
          </div>
        ) : expiredAnnouncements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            No expired announcements.
          </div>
        ) : (
          <div className="space-y-3">
            {expiredAnnouncements.slice(0, 5).map((announcement) => (
              <div key={announcement.id} className="rounded-xl border border-slate-200 bg-white p-4 opacity-75">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{announcement.title}</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{announcement.message}</div>
                    <div className="mt-3 text-xs text-slate-500">
                      Expired {formatShortDate(new Date(announcement.expiresAt))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteAnnouncement(announcement.id)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Memoized so the page re-rendering (polls, typing elsewhere) does not
// re-render this tile while its props are unchanged.
export default memo(AnnouncementsTile);
