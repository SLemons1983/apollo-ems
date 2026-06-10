import { NextRequest, NextResponse } from 'next/server';
import { sendApolloEmail } from '@/lib/email';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const employeeName = String(formData.get('employeeName') ?? '').trim();
    const phoneNumber = String(formData.get('phoneNumber') ?? '').trim();
    const companyEmail = String(formData.get('companyEmail') ?? '').trim();
    const inspectionDate = String(formData.get('inspectionDate') ?? '').trim();
    const vehicle = String(formData.get('vehicle') ?? '').trim();
    const mileage = String(formData.get('mileage') ?? '').trim();
    const vehicleCondition = String(formData.get('vehicleCondition') ?? '').trim();
    const mechanicalChecks = String(formData.get('mechanicalChecks') ?? '').trim();
    const oxygenLevels = String(formData.get('oxygenLevels') ?? '').trim();
    const alsSupplies = String(formData.get('alsSupplies') ?? '').trim();
    const blsSupplies = String(formData.get('blsSupplies') ?? '').trim();
    const otherSupplies = String(formData.get('otherSupplies') ?? '').trim();
    const deficiencies = String(formData.get('deficiencies') ?? '').trim();

    if (!employeeName || !phoneNumber || !companyEmail || !inspectionDate || !vehicle || !mileage) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const photoFields = ['frontPhoto', 'driverPhoto', 'rearPhoto', 'passengerPhoto'];
    const attachments = [];

    for (const field of photoFields) {
      const file = formData.get(field);

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'All four vehicle photos are required.' }, { status: 400 });
      }

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json({ error: 'Only JPG, JPEG, and PNG photos are allowed.' }, { status: 400 });
      }

      if (file.size > MAX_PHOTO_SIZE_BYTES) {
        return NextResponse.json({ error: 'Each photo must be 10 MB or smaller.' }, { status: 400 });
      }

      attachments.push({
        filename: `${field}-${file.name}`,
        content: Buffer.from(await file.arrayBuffer()),
      });
    }

    await sendApolloEmail({
      to: 'supervisor@sscems.org, armando.gutierrez@sscems.org',
      subject: `Daily Unit Inspection: ${vehicle} - ${inspectionDate}`,
      text:
`A daily unit inspection has been submitted through ApolloEMS.

Employee Name: ${employeeName}
Phone Number: ${phoneNumber}
Company Email: ${companyEmail}
Inspection Date: ${inspectionDate}
Vehicle: ${vehicle}
Mileage: ${mileage}

Vehicle Clean / Operating Condition: ${vehicleCondition}
Mechanical Checks: ${mechanicalChecks}
Oxygen Levels: ${oxygenLevels}
ALS Supplies: ${alsSupplies}
BLS Supplies: ${blsSupplies}
Other Supplies: ${otherSupplies}

Deficiencies / Notes:
${deficiencies || 'None reported.'}

Photos:
Front, driver side, rear, and passenger side photos are attached.

Supervisor Instructions:
1. Review the checklist for completeness.
2. Review all attached vehicle photos.
3. Follow up on any deficiencies or out-of-service concerns.
4. Retain this email according to company policy.`,
      attachments,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unit inspection submission error:', error);
    return NextResponse.json({ error: 'Failed to submit unit inspection.' }, { status: 500 });
  }
}
