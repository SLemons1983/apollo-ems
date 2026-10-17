'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  type ApolloMessage,
  type AuditLogEntry,
  type EmployeeOption,
  type IncidentReport,
  CURRENT_SUPERVISOR_ID,
  formatShortDate,
} from './shared';

function IncidentReportsTile({
  incidentReports,
  setIncidentReports,
  auditLog,
  addAuditEntry,
  employees,
  currentEmployeeName,
  addApolloMessage,
  onOpenCountChange,
}: {
  incidentReports: IncidentReport[];
  setIncidentReports: React.Dispatch<React.SetStateAction<IncidentReport[]>>;
  auditLog: AuditLogEntry[];
  addAuditEntry: (action: string, details: string) => Promise<void>;
  employees: EmployeeOption[];
  currentEmployeeName: string | undefined;
  addApolloMessage: (message: ApolloMessage) => void;
  onOpenCountChange: (count: number) => void;
}) {
  const [selectedIncidentReportId, setSelectedIncidentReportId] = useState<string | null>(null);
  const [incidentReportStatusDraft, setIncidentReportStatusDraft] = useState('NEW');
  const [incidentReportAssignedSupervisorDraft, setIncidentReportAssignedSupervisorDraft] = useState('');
  const [incidentReportNotesDraft, setIncidentReportNotesDraft] = useState('');
  const [incidentReportFollowUpDraft, setIncidentReportFollowUpDraft] = useState('');

  const [incidentReportSearch, setIncidentReportSearch] = useState('');
  const [incidentReportStatusFilter, setIncidentReportStatusFilter] = useState('ALL');
  const [incidentReportCategoryFilter, setIncidentReportCategoryFilter] = useState('ALL');
  const [incidentReportSupervisorFilter, setIncidentReportSupervisorFilter] = useState('ALL');
  const [incidentReportSaveStatus, setIncidentReportSaveStatus] = useState('');
  const [showClosedIncidentReports, setShowClosedIncidentReports] = useState(false);

  const incidentReportCategories = useMemo(() => {
    return Array.from(new Set(
      incidentReports
        .filter((report) => report.category !== 'Check Request')
        .map((report) => report.category)
        .filter(Boolean),
    )).sort();
  }, [incidentReports]);

  const incidentReportSupervisors = useMemo(() => {
    return Array.from(new Set(incidentReports.map((report) => report.assigned_supervisor || 'Unassigned'))).sort();
  }, [incidentReports]);

  const filteredIncidentReports = useMemo(() => {
    const search = incidentReportSearch.trim().toLowerCase();

    return incidentReports.filter((report) => {
      if (report.category === 'Check Request') return false;
      const assignedSupervisor = report.assigned_supervisor || 'Unassigned';
      const searchText = [
        report.incident_number,
        report.employee_name,
        report.category,
        assignedSupervisor,
        report.status,
      ].join(' ').toLowerCase();

      return (
        (!search || searchText.includes(search)) &&
        (incidentReportStatusFilter === 'ALL' || report.status === incidentReportStatusFilter) &&
        (incidentReportCategoryFilter === 'ALL' || report.category === incidentReportCategoryFilter) &&
        (incidentReportSupervisorFilter === 'ALL' || assignedSupervisor === incidentReportSupervisorFilter)
      );
    });
  }, [
    incidentReportCategoryFilter,
    incidentReportSearch,
    incidentReportStatusFilter,
    incidentReportSupervisorFilter,
    incidentReports,
  ]);

  const openIncidentReports = useMemo(() => {
    return filteredIncidentReports.filter((report) => report.status !== 'CLOSED');
  }, [filteredIncidentReports]);

  const closedIncidentReports = useMemo(() => {
    return filteredIncidentReports.filter((report) => report.status === 'CLOSED');
  }, [filteredIncidentReports]);

  const selectedIncidentAuditEntries = useMemo(() => {
    const selectedReport = incidentReports.find((report) => report.id === selectedIncidentReportId);

    if (!selectedReport) {
      return [];
    }

    return auditLog.filter((entry) => entry.details.includes(selectedReport.incident_number));
  }, [auditLog, incidentReports, selectedIncidentReportId]);

  // The page header shows how many open reports match these filters.
  useEffect(() => {
    onOpenCountChange(openIncidentReports.length);
  }, [onOpenCountChange, openIncidentReports.length]);

  async function saveIncidentReportWorkflow(report: IncidentReport) {
    setIncidentReportSaveStatus('Saving incident report...');

    try {
      const response = await fetch('/api/incident-reports/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          status: incidentReportStatusDraft,
          assignedSupervisor: incidentReportAssignedSupervisorDraft,
          supervisorNotes: incidentReportNotesDraft,
          closedBy: currentEmployeeName ?? 'Supervisor',
        }),
      });

      if (!response.ok) {
        throw new Error('Incident report update failed.');
      }

      const data = await response.json();
      const updatedReport = data.incidentReport as IncidentReport;
      const actorName = currentEmployeeName ?? 'Supervisor';
      const previousAssignedSupervisor = report.assigned_supervisor || 'Unassigned';
      const nextAssignedSupervisor = updatedReport.assigned_supervisor || 'Unassigned';

      if (report.status === 'CLOSED' && updatedReport.status === 'IN_REVIEW') {
        await addAuditEntry(
          'INCIDENT_REOPENED',
          `${updatedReport.incident_number}: Closed report reopened by ${actorName}`,
        );
      } else if (report.status !== updatedReport.status) {
        await addAuditEntry(
          'INCIDENT_STATUS_CHANGED',
          `${updatedReport.incident_number}: ${report.status} → ${updatedReport.status} by ${actorName}`,
        );
      }

      if (previousAssignedSupervisor !== nextAssignedSupervisor) {
        await addAuditEntry(
          'INCIDENT_REASSIGNED',
          `${updatedReport.incident_number}: ${previousAssignedSupervisor} → ${nextAssignedSupervisor} by ${actorName}`,
        );
      }

      if (
        report.status !== 'PENDING_EMPLOYEE_RESPONSE' &&
        updatedReport.status === 'PENDING_EMPLOYEE_RESPONSE'
      ) {
        const employee = employees.find(
          (item) => item.email.trim().toLowerCase() === (updatedReport.employee_email ?? '').trim().toLowerCase(),
        );

        if (employee) {
          const createdAt = new Date().toISOString();
          const followUpMessage: ApolloMessage = {
            id: `incident-follow-up-${updatedReport.id}-${Date.now()}`,
            conversationId: `incident-report-${updatedReport.id}`,
            senderId: CURRENT_SUPERVISOR_ID,
            senderName: actorName,
            senderRole: 'SUPERVISOR',
            recipients: [{
              employeeId: employee.id,
              deliveredAt: createdAt,
              readAt: null,
            }],
            audienceLabel: updatedReport.employee_name,
            title: `Incident Report Follow-Up: ${updatedReport.incident_number}`,
            body: incidentReportFollowUpDraft.trim() || `Additional information is needed for Incident Report ${updatedReport.incident_number}. Please reply to this ApolloEMS message with the requested clarification or follow-up documentation.`,
            createdAt,
            relatedType: 'INCIDENT_REPORT',
            relatedId: updatedReport.id,
            priority: 'IMPORTANT',
          };

          addApolloMessage(followUpMessage);
        }

        await addAuditEntry(
          'INCIDENT_EMPLOYEE_RESPONSE_REQUESTED',
          `${updatedReport.incident_number}: Employee response requested by ${actorName}`,
        );
      }

      setIncidentReports((current) =>
        current.map((item) => (item.id === updatedReport.id ? updatedReport : item)),
      );
      setIncidentReportSaveStatus('Incident report saved.');
    } catch (error) {
      console.error('Failed to save incident report:', error);
      setIncidentReportSaveStatus('Unable to save incident report.');
    }
  }

  async function openIncidentAttachment(report: IncidentReport, download = false) {
    if (!report.attachment_path) {
      window.alert('No attachment is available for this incident report.');
      return;
    }

    try {
      const response = await fetch('/api/incident-reports/attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentPath: report.attachment_path }),
      });

      if (!response.ok) {
        throw new Error('Unable to open attachment.');
      }

      const data = await response.json();
      const signedUrl = data.signedUrl as string;

      if (download) {
        const link = document.createElement('a');
        link.href = signedUrl;
        link.download = report.attachment_name || 'incident-report-attachment';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to open incident attachment:', error);
      window.alert('Unable to open attachment.');
    }
  }

  function printIncidentReport(report: IncidentReport) {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      window.alert('Unable to open print window. Please allow pop-ups for ApolloEMS.');
      return;
    }

    const submittedAt = new Date(report.created_at).toLocaleString('en-US');

    printWindow.document.write(`
      <html>
        <head>
          <title>${report.incident_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            .sub { color: #475569; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 24px; }
            .label { font-weight: 700; }
            .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; white-space: pre-wrap; }
            .footer { margin-top: 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <h1>ApolloEMS Incident Report</h1>
          <div class="sub">${report.incident_number} • Submitted ${submittedAt}</div>

          <div class="grid">
            <div><span class="label">Employee:</span> ${report.employee_name}</div>
            <div><span class="label">Status:</span> ${report.status}</div>
            <div><span class="label">Phone:</span> ${report.employee_phone || '—'}</div>
            <div><span class="label">Email:</span> ${report.employee_email || '—'}</div>
            <div><span class="label">Category:</span> ${report.category}</div>
            <div><span class="label">Assigned To:</span> ${report.assigned_supervisor || 'Unassigned'}</div>
            <div><span class="label">Supervisor Notified:</span> ${report.supervisor_notified || '—'}</div>
            <div><span class="label">Supervisor Listed:</span> ${report.supervisor_name || '—'}</div>
            <div><span class="label">Attachment:</span> ${report.attachment_name || 'None'}</div>
            <div><span class="label">Attachment Type:</span> ${report.attachment_type || '—'}</div>
          </div>

          <h2>Narrative</h2>
          <div class="box">${report.narrative}</div>

          <div class="footer">ApolloEMS Incident Report • Generated ${new Date().toLocaleString('en-US')}</div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowClosedIncidentReports((current) => !current)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {showClosedIncidentReports
              ? 'Hide Closed Reports'
              : `Show Closed Reports (${closedIncidentReports.length})`}
          </button>
        </div>
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600">
            Search
            <input
              type="text"
              value={incidentReportSearch}
              onChange={(event) => setIncidentReportSearch(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Incident #, employee, category..."
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Status
            <select
              value={incidentReportStatusFilter}
              onChange={(event) => setIncidentReportStatusFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="PENDING_EMPLOYEE_RESPONSE">Pending Employee Response</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Category
            <select
              value={incidentReportCategoryFilter}
              onChange={(event) => setIncidentReportCategoryFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">All Categories</option>
              {incidentReportCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Assigned To
            <select
              value={incidentReportSupervisorFilter}
              onChange={(event) => setIncidentReportSupervisorFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">All Supervisors</option>
              {incidentReportSupervisors.map((supervisor) => (
                <option key={supervisor} value={supervisor}>{supervisor}</option>
              ))}
            </select>
          </label>
        </div>

        {openIncidentReports.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No open incident reports.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="border-y-2 border-slate-700 px-3 py-3">Incident #</th>
                  <th className="border-y-2 border-slate-700 px-3 py-3">Date</th>
                  <th className="border-y-2 border-slate-700 px-3 py-3">Employee</th>
                  <th className="border-y-2 border-slate-700 px-3 py-3">Category</th>
                  <th className="border-y-2 border-slate-700 px-3 py-3">Assigned To</th>
                  <th className="border-y-2 border-slate-700 px-3 py-3">Status</th>
                  <th className="border-y-2 border-slate-700 px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {openIncidentReports.map((report) => (
                  <React.Fragment key={report.id}>
                    <tr className="border-t border-slate-200">
                      <td className="rounded-l-xl border-y-2 border-l-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{report.incident_number}</td>
                      <td className="px-3 py-2 text-slate-600">{formatShortDate(new Date(report.created_at))}</td>
                      <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.employee_name}</td>
                      <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.category}</td>
                      <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.assigned_supervisor || 'Unassigned'}</td>
                      <td className="px-3 py-2 font-semibold text-blue-700">{report.status}</td>
                      <td className="border-y-2 border-slate-700 px-3 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIncidentReportId(report.id);
                            setIncidentReportStatusDraft(report.status);
                            setIncidentReportAssignedSupervisorDraft(report.assigned_supervisor ?? '');
                            setIncidentReportNotesDraft(report.supervisor_notes ?? '');
                            setIncidentReportFollowUpDraft('');
                            setIncidentReportSaveStatus('');
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showClosedIncidentReports && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">
              Closed Incident Reports
            </div>

            {closedIncidentReports.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">No closed incident reports.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="border-y-2 border-slate-700 px-3 py-3">Incident #</th>
                    <th className="border-y-2 border-slate-700 px-3 py-3">Date</th>
                    <th className="border-y-2 border-slate-700 px-3 py-3">Employee</th>
                    <th className="border-y-2 border-slate-700 px-3 py-3">Category</th>
                    <th className="border-y-2 border-slate-700 px-3 py-3">Assigned To</th>
                    <th className="border-y-2 border-slate-700 px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {closedIncidentReports.map((report) => (
                    <tr key={report.id} className="border-t border-slate-200">
                      <td className="border-y-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{report.incident_number}</td>
                      <td className="px-3 py-2 text-slate-600">{formatShortDate(new Date(report.created_at))}</td>
                      <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.employee_name}</td>
                      <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.category}</td>
                      <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{report.assigned_supervisor || 'Unassigned'}</td>
                      <td className="border-y-2 border-slate-700 px-3 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIncidentReportId(report.id);
                            setIncidentReportStatusDraft(report.status);
                            setIncidentReportAssignedSupervisorDraft(report.assigned_supervisor ?? '');
                            setIncidentReportNotesDraft(report.supervisor_notes ?? '');
                            setIncidentReportFollowUpDraft('');
                            setIncidentReportSaveStatus('');
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {incidentReports.find((report) => report.id === selectedIncidentReportId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Incident Report</div>
                <div className="mt-1 text-xl font-bold text-slate-900">{incidentReports.find((report) => report.id === selectedIncidentReportId)!.incident_number}</div>
                <div className="mt-1 text-sm text-slate-500">
                  Submitted {new Date(incidentReports.find((report) => report.id === selectedIncidentReportId)!.created_at).toLocaleString('en-US')}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => printIncidentReport(incidentReports.find((report) => report.id === selectedIncidentReportId)!)}
                  className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIncidentReportId(null)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div><span className="font-semibold">Employee:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.employee_name}</div>
                <div><span className="font-semibold">Status:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.status}</div>
                <div><span className="font-semibold">Phone:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.employee_phone || '—'}</div>
                <div><span className="font-semibold">Email:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.employee_email || '—'}</div>
                <div><span className="font-semibold">Category:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.category}</div>
                <div><span className="font-semibold">Assigned To:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.assigned_supervisor || 'Unassigned'}</div>
                <div><span className="font-semibold">Supervisor Notified:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.supervisor_notified || '—'}</div>
                <div><span className="font-semibold">Supervisor Listed:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.supervisor_name || '—'}</div>
                <div><span className="font-semibold">Attachment:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.attachment_name || 'None'}</div>
                <div><span className="font-semibold">Attachment Type:</span> {incidentReports.find((report) => report.id === selectedIncidentReportId)!.attachment_type || '—'}</div>
              </div>

              {incidentReports.find((report) => report.id === selectedIncidentReportId)!.attachment_path && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openIncidentAttachment(incidentReports.find((report) => report.id === selectedIncidentReportId)!)}
                    className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    View Attachment
                  </button>
                  <button
                    type="button"
                    onClick={() => openIncidentAttachment(incidentReports.find((report) => report.id === selectedIncidentReportId)!, true)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Download Attachment
                  </button>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-slate-900">Narrative</div>
                <div className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {incidentReports.find((report) => report.id === selectedIncidentReportId)!.narrative}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Incident History</div>

                <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                  {selectedIncidentAuditEntries.length === 0 ? (
                    <div className="text-sm text-slate-500">No incident history recorded yet.</div>
                  ) : (
                    selectedIncidentAuditEntries.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="text-xs text-slate-500">
                          {new Date(entry.timestamp).toLocaleString('en-US')}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{entry.actor}</div>
                        <div className="text-sm text-slate-700">{entry.action}</div>
                        <div className="mt-1 text-sm text-slate-600">{entry.details}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Supervisor Workflow</div>

                <div className="mt-3 grid gap-3 md:grid-cols-[220px_220px_1fr]">
                  <label className="text-xs font-semibold text-slate-600">
                    Status
                    <select
                      value={incidentReportStatusDraft}
                      onChange={(event) => setIncidentReportStatusDraft(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="NEW">New</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="PENDING_EMPLOYEE_RESPONSE">Pending Employee Response</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Reassign Incident Report
                    <select
                      value={incidentReportAssignedSupervisorDraft}
                      onChange={(event) => setIncidentReportAssignedSupervisorDraft(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {employees
                        .filter((employee) => employee.status?.toLowerCase() !== 'removed' && employee.role === 'Supervisor')
                        .map((employee) => (
                          <option key={employee.id} value={employee.name}>
                            {employee.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Employee Follow-Up Request
                    <textarea
                      value={incidentReportFollowUpDraft}
                      onChange={(event) => setIncidentReportFollowUpDraft(event.target.value)}
                      className="mt-1 min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Tell the employee exactly what additional information is needed."
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Supervisor Notes
                    <textarea
                      value={incidentReportNotesDraft}
                      onChange={(event) => setIncidentReportNotesDraft(event.target.value)}
                      className="mt-1 min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Add supervisor notes, follow-up, or disposition details."
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveIncidentReportWorkflow(incidentReports.find((report) => report.id === selectedIncidentReportId)!)}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Save Changes
                  </button>

                  {incidentReportSaveStatus && (
                    <span className="text-sm font-semibold text-slate-700">{incidentReportSaveStatus}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(IncidentReportsTile);
