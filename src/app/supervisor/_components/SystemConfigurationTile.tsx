'use client';

import React, { memo, useState } from 'react';
import type { AuditLogEntry, GeofenceConfig, ImportantLink, SystemConfig } from './shared';

// Blank or non-numeric geofence input is ignored rather than saved as 0/NaN.
function parseGeofenceNumber(value: string): number | null {
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
}

// Text input that keeps its own draft and saves on blur or Enter, so a save
// (and an audit entry) happens once per edit instead of once per keystroke.
function DraftInput({
  value,
  onCommit,
  type = 'text',
  ...inputProps
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'> & {
  value: string | number;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }

  function commit() {
    if (draft !== String(value)) {
      onCommit(draft);
    }
  }

  return (
    <input
      {...inputProps}
      type={type}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function SystemConfigurationTile({
  systemConfig,
  auditLog,
  saveSystemConfig,
}: {
  systemConfig: SystemConfig;
  auditLog: AuditLogEntry[];
  saveSystemConfig: (nextConfig: SystemConfig, action?: string, details?: string) => Promise<void>;
}) {
  const [showEula, setShowEula] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  function updateCompanyName(value: string) {
    saveSystemConfig(
      { ...systemConfig, companyName: value },
      'COMPANY_NAME_UPDATED',
      `Company name changed to "${value}"`,
    );
  }

  function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      saveSystemConfig(
        { ...systemConfig, logoDataUrl: String(reader.result ?? '') },
        'COMPANY_LOGO_UPDATED',
        `Company logo uploaded: ${file.name}`,
      );
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    if (!window.confirm('Remove the current company logo from Apollo?')) return;
    saveSystemConfig({ ...systemConfig, logoDataUrl: '' }, 'COMPANY_LOGO_REMOVED', 'Company logo removed');
  }

  function addImportantLink() {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
      window.alert('Enter both a label and URL before adding a link.');
      return;
    }

    saveSystemConfig(
      {
        ...systemConfig,
        importantLinks: [
          ...systemConfig.importantLinks,
          { id: `link-${Date.now()}`, label: newLinkLabel.trim(), url: newLinkUrl.trim() },
        ],
      },
      'IMPORTANT_LINK_ADDED',
      `Added important link: ${newLinkLabel.trim()}`,
    );

    setNewLinkLabel('');
    setNewLinkUrl('');
  }

  function updateImportantLink(id: string, partial: Partial<ImportantLink>) {
    const existing = systemConfig.importantLinks.find((link) => link.id === id);
    saveSystemConfig(
      {
        ...systemConfig,
        importantLinks: systemConfig.importantLinks.map((link) => (link.id === id ? { ...link, ...partial } : link)),
      },
      'IMPORTANT_LINK_UPDATED',
      `Updated important link: ${existing?.label ?? id}`,
    );
  }

  function removeImportantLink(id: string) {
    const existing = systemConfig.importantLinks.find((link) => link.id === id);
    if (!window.confirm(`Delete important link "${existing?.label ?? 'selected link'}"? This removes it from the Employee Dashboard.`)) return;

    saveSystemConfig(
      { ...systemConfig, importantLinks: systemConfig.importantLinks.filter((link) => link.id !== id) },
      'IMPORTANT_LINK_DELETED',
      `Deleted important link: ${existing?.label ?? id}`,
    );
  }

  function updateGeofence(id: string, partial: Partial<GeofenceConfig>) {
    const existing = systemConfig.geofences.find((geofence) => geofence.id === id);
    saveSystemConfig(
      {
        ...systemConfig,
        geofences: systemConfig.geofences.map((geofence) => (geofence.id === id ? { ...geofence, ...partial } : geofence)),
      },
      'GEOFENCE_UPDATED',
      `Updated geofence: ${existing?.shiftLabel ?? id}`,
    );
  }

  function addGeofence() {
    saveSystemConfig(
      {
        ...systemConfig,
        geofences: [
          ...systemConfig.geofences,
          { id: `geofence-${Date.now()}`, shiftLabel: 'New Location', locationLabel: 'New Location', latitude: 0, longitude: 0, radiusFeet: 500 },
        ],
      },
      'GEOFENCE_ADDED',
      'Added new geofence',
    );
  }

  function removeGeofence(id: string) {
    const existing = systemConfig.geofences.find((geofence) => geofence.id === id);
    if (!window.confirm(`Delete geofence "${existing?.shiftLabel ?? 'selected geofence'}"? Employees assigned to that shift may no longer have an approved clock-in location.`)) return;

    saveSystemConfig(
      { ...systemConfig, geofences: systemConfig.geofences.filter((geofence) => geofence.id !== id) },
      'GEOFENCE_DELETED',
      `Deleted geofence: ${existing?.shiftLabel ?? id}`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-bold text-slate-900">Roles & Permissions Reference</div>
        <div className="mt-1 text-xs text-slate-600">
          Employee accounts use the dashboard only. Supervisor, Admin, and GM accounts share the same Supervisor Tools permissions.
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-bold text-slate-900">Employee</div>
            <div className="mt-2 text-sm text-slate-600">
              Dashboard only: announcements, personal timecard, schedule, messages, incident report, handbook, and links.
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-bold text-slate-900">Supervisor / Admin / GM</div>
            <div className="mt-2 text-sm text-slate-600">
              Can approve timecards, post announcements, edit system configuration, manage schedule rules, and use Supervisor Tools.
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm font-bold text-amber-800">Approval Rule</div>
            <div className="mt-2 text-sm text-amber-800">
              Supervisors cannot approve their own timecard. It must be reviewed by another supervisor or GM.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-bold text-slate-900">Company Branding</div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_240px]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Company Name</label>
            <DraftInput
              type="text"
              value={systemConfig.companyName}
              onCommit={updateCompanyName}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />

            <label className="mt-4 mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Upload Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            />

            <button
              type="button"
              onClick={clearLogo}
              disabled={!systemConfig.logoDataUrl}
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              Remove Logo
            </button>

            <div className="mt-2 text-xs text-slate-500">
              Production logo files should move to Supabase Storage.
            </div>
          </div>

          <div className="flex min-h-[170px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
            {systemConfig.logoDataUrl ? (
              <img src={systemConfig.logoDataUrl} alt="Company logo preview" className="max-h-36 max-w-full object-contain" />
            ) : (
              <div className="text-center text-sm font-bold text-slate-400">No Logo Uploaded</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-bold text-slate-900">Important Links</div>
        <div className="mt-1 text-xs text-slate-600">These links display in the Employee Dashboard Important Links tile.</div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.5fr_auto]">
          <input
            type="text"
            value={newLinkLabel}
            onChange={(event) => setNewLinkLabel(event.target.value)}
            placeholder="Link label"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
          <input
            type="url"
            value={newLinkUrl}
            onChange={(event) => setNewLinkUrl(event.target.value)}
            placeholder="https://..."
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
          <button type="button" onClick={addImportantLink} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
            Add Link
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {systemConfig.importantLinks.map((link) => (
            <div key={link.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-[1fr_1.5fr_auto]">
              <DraftInput
                type="text"
                value={link.label}
                onCommit={(value) => updateImportantLink(link.id, { label: value })}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              />
              <DraftInput
                type="url"
                value={link.url}
                onCommit={(value) => updateImportantLink(link.id, { url: value })}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              />
              <button type="button" onClick={() => removeImportantLink(link.id)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">Geofencing</div>
            <div className="mt-1 text-xs text-slate-600">
              Approved clock-in locations. GPS failure, outside radius, and manual overrides should still clock the employee but require supervisor review.
            </div>
          </div>
          <button type="button" onClick={addGeofence} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
            Add Geofence
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="hidden gap-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:grid xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
            <div>Shift</div>
            <div>Location Name</div>
            <div>Latitude</div>
            <div>Longitude</div>
            <div>Radius (ft)</div>
            <div></div>
          </div>

          {systemConfig.geofences.map((geofence) => (
            <div key={geofence.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
              <DraftInput type="text" value={geofence.shiftLabel} onCommit={(value) => updateGeofence(geofence.id, { shiftLabel: value })} placeholder="Shift" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500" />
              <DraftInput type="text" value={geofence.locationLabel} onCommit={(value) => updateGeofence(geofence.id, { locationLabel: value })} placeholder="Location" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500" />
              <DraftInput type="number" value={geofence.latitude} onCommit={(value) => { const parsed = parseGeofenceNumber(value); if (parsed !== null) updateGeofence(geofence.id, { latitude: parsed }); }} placeholder="Latitude" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500" />
              <DraftInput type="number" value={geofence.longitude} onCommit={(value) => { const parsed = parseGeofenceNumber(value); if (parsed !== null) updateGeofence(geofence.id, { longitude: parsed }); }} placeholder="Longitude" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500" />
              <DraftInput type="number" value={geofence.radiusFeet} onCommit={(value) => { const parsed = parseGeofenceNumber(value); if (parsed !== null) updateGeofence(geofence.id, { radiusFeet: parsed }); }} placeholder="Radius ft" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500" />
              <button type="button" onClick={() => removeGeofence(geofence.id)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <button
          type="button"
          onClick={() => setShowEula((current) => !current)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <div className="text-sm font-bold text-slate-900">Legal</div>
            <div className="mt-1 text-xs text-slate-600">
              ApolloEMS End User Agreement, ownership notice, and intellectual property protections.
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {showEula ? 'Hide' : 'Show'}
          </span>
        </button>

        {showEula && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-bold text-slate-900">ApolloEMS End User Agreement</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Version 1.0 • Last Updated June 7, 2026
            </div>
            <div className="mt-3 max-h-[420px] space-y-4 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <div>
                <div className="font-bold text-slate-900">1. Acceptance of Agreement</div>
                <p className="mt-1">By accessing or using ApolloEMS, you acknowledge that you have read, understood, and agree to be bound by this End User Agreement. If you do not agree, you must discontinue use immediately.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">2. Ownership of ApolloEMS</div>
                <p className="mt-1">ApolloEMS, including its software, source code, databases, designs, user interfaces, workflows, branding, documentation, intellectual property, and related materials, is the sole and exclusive property of Steven Lemons. Steven Lemons is the sole creator, designer, developer, engineer, and owner of ApolloEMS.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">3. Beta Software Status</div>
                <p className="mt-1">ApolloEMS may contain features that are under active development and testing. Users acknowledge that functionality may change, be modified, be discontinued, or contain errors while the platform remains under active development. Use during beta testing is voluntary and at the user's own risk.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">4. No Ownership or Financial Interest</div>
                <p className="mt-1">Use of ApolloEMS, participation in testing, feedback, operational use, implementation assistance, feature requests, recommendations, bug reports, or other contributions does not create ownership rights, equity rights, partnership rights, joint venture rights, revenue sharing rights, royalty rights, licensing rights, rights to future sale proceeds, or rights to future compensation.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">5. Feedback and Suggestions</div>
                <p className="mt-1">Any suggestions, recommendations, comments, feature requests, bug reports, or other feedback regarding ApolloEMS may be used by the owner without restriction or compensation.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">6. Right to Modify, License, or Sell ApolloEMS</div>
                <p className="mt-1">The owner reserves the unrestricted right to modify ApolloEMS, add or remove features, change pricing, change licensing models, rebrand the platform, transfer ownership, assign ownership, license the software, merge ApolloEMS with another product, or sell ApolloEMS in whole or in part at any time.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">7. Right to Suspend or Terminate Access</div>
                <p className="mt-1">The owner reserves the right to suspend, restrict, or terminate access to ApolloEMS at any time, with or without notice, and for any reason. Upon termination, users must immediately discontinue use.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">8. Data Ownership</div>
                <p className="mt-1">Users and organizations retain ownership of the operational data they enter into ApolloEMS. By using ApolloEMS, users grant the owner the right to store, process, transmit, back up, and manage such data as necessary to provide the software and related services.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">9. No Warranty</div>
                <p className="mt-1">ApolloEMS is provided &quot;AS IS&quot; and &quot;AS AVAILABLE.&quot; The owner makes no warranties, express or implied, regarding availability, reliability, accuracy, performance, fitness for a particular purpose, merchantability, or uninterrupted operation.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">10. Limitation of Liability</div>
                <p className="mt-1">To the maximum extent permitted by law, the owner shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages arising from the use of ApolloEMS. Users are responsible for verifying platform information and maintaining appropriate operational procedures.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">11. Governing Law</div>
                <p className="mt-1">This Agreement shall be governed by and interpreted under the laws of the State of California, without regard to conflict-of-law principles.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">12. Changes to This Agreement</div>
                <p className="mt-1">The owner may modify this Agreement at any time. Updated versions may be published within ApolloEMS or through other reasonable means of notice. Continued use after publication of updated terms constitutes acceptance of those changes.</p>
              </div>

              <div>
                <div className="font-bold text-slate-900">13. Entire Agreement</div>
                <p className="mt-1">This End User Agreement constitutes the entire agreement regarding use of ApolloEMS and supersedes any prior verbal or written understandings concerning platform use.</p>
              </div>

              <div className="border-t border-slate-200 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                ApolloEMS • Copyright © 2026 Steven Lemons • All Rights Reserved
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-bold text-slate-900">System Activity Log</div>

        <div className="mt-1 text-xs text-slate-600">
          Tracks system configuration changes now. Later this will also include schedule changes, certification edits, timecard approvals/returns, and rule overrides.
        </div>

        <div className="mt-4 max-h-[360px] space-y-3 overflow-auto">
          {auditLog.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
              No activity has been logged yet.
            </div>
          ) : (
            auditLog.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{entry.action}</div>
                    <div className="mt-1 text-sm text-slate-600">{entry.details}</div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {entry.actor} • {new Date(entry.timestamp).toLocaleString('en-US', {
                      month: 'numeric',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(SystemConfigurationTile);
