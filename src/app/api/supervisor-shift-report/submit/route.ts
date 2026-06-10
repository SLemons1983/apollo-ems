import { NextRequest, NextResponse } from 'next/server';
import { sendApolloEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const supervisorName = String(formData.get('supervisorName') ?? '').trim();
    const supervisorEmail = String(formData.get('supervisorEmail') ?? '').trim();
    const shiftDate = String(formData.get('shiftDate') ?? '').trim();
    const unscheduledAbsences = String(formData.get('unscheduledAbsences') ?? '').trim();
    const tardyEmployees = String(formData.get('tardyEmployees') ?? '').trim();
    const vehicleIssues = String(formData.get('vehicleIssues') ?? '').trim();
    const otherNotableIssues = String(formData.get('otherNotableIssues') ?? '').trim();
    const narrative = String(formData.get('narrative') ?? '').trim();

    if (
      !supervisorName ||
      !supervisorEmail ||
      !shiftDate ||
      !unscheduledAbsences ||
      !tardyEmployees ||
      !vehicleIssues ||
      !otherNotableIssues ||
      !narrative
    ) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const requiresDetail = [
      unscheduledAbsences,
      tardyEmployees,
      vehicleIssues,
      otherNotableIssues,
    ].includes('Yes');

    if (requiresDetail && narrative.length < 20) {
      return NextResponse.json(
        { error: 'Narrative must include details when any issue is marked Yes.' },
        { status: 400 },
      );
    }

    await sendApolloEmail({
      to: 'steve@sscems.org',
      subject: `Daily Supervisor Shift Report - ${shiftDate}`,
      text:
`A Daily Supervisor Shift Report has been submitted through ApolloEMS.

Supervisor Name: ${supervisorName}
Supervisor Email: ${supervisorEmail}
Date of Shift: ${shiftDate}

Unscheduled Absences: ${unscheduledAbsences}
Tardy Employees: ${tardyEmployees}
Company Vehicle Issues: ${vehicleIssues}
Other Notable Issues: ${otherNotableIssues}

Narrative:
${narrative}

Acknowledgement:
The submitting supervisor acknowledged that they personally completed this shift report and that the information provided is accurate to the best of their knowledge.`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Supervisor shift report submission error:', error);
    return NextResponse.json({ error: 'Failed to submit supervisor shift report.' }, { status: 500 });
  }
}
