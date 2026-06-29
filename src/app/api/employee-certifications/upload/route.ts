import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const CERTIFICATION_BUCKET = 'employee-certifications';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const ALLOWED_CERTIFICATION_FIELDS = new Set([
  'driversLicense',
  'ambulanceDriversLicense',
  'ahaBlsCpr',
  'medicalExaminerCertificate',
  'annualTbScreen',
  'is100',
  'is200',
  'is700',
  'is800',
  'californiaParamedicLicense',
  'ccemsaParamedicLicense',
  'acls',
  'pals',
  'californiaEmtLicense',
  'ccemsaEmtLicense',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function getSafeFileExtension(filename: string, mimeType: string) {
  const extension = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : '';

  if (extension === 'pdf' || extension === 'jpg' || extension === 'jpeg' || extension === 'png') {
    return extension;
  }

  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';

  return 'file';
}

export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
    }

    const formData = await request.formData();

    const employeeId = String(formData.get('employeeId') ?? '').trim();
    const certificationField = String(formData.get('certificationField') ?? '').trim();
    const certificationLabel = String(formData.get('certificationLabel') ?? '').trim();
    const file = formData.get('certificationFile');

    if (!employeeId || !certificationField || !certificationLabel || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Missing required certification upload fields.' }, { status: 400 });
    }

    if (!ALLOWED_CERTIFICATION_FIELDS.has(certificationField)) {
      return NextResponse.json({ error: 'Invalid certification field.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPG, JPEG, and PNG files are allowed.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Certification file must be 10 MB or smaller.' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, serviceRoleKey);

    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id,certifications')
      .eq('id', employeeId)
      .single();

    if (employeeError) {
      throw employeeError;
    }

    const extension = getSafeFileExtension(file.name, file.type);
    const uploadedAt = new Date().toISOString();
    const storagePath = `${employeeId}/${certificationField}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(CERTIFICATION_BUCKET)
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const existingCertifications =
      employee.certifications && typeof employee.certifications === 'object'
        ? employee.certifications
        : {};

    const documentKey = `${certificationField}Document`;

    const updatedCertifications = {
      ...existingCertifications,
      [documentKey]: {
        path: storagePath,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        uploadedAt,
        label: certificationLabel,
      },
    };

    const { error: updateError } = await supabase
      .from('employees')
      .update({ certifications: updatedCertifications })
      .eq('id', employeeId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      ok: true,
      document: updatedCertifications[documentKey],
    });
  } catch (error) {
    console.error('Employee certification upload error:', error);
    return NextResponse.json({ error: 'Failed to upload employee certification.' }, { status: 500 });
  }
}
