import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const CERTIFICATION_BUCKET = 'employee-certifications';

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

type RemoveCertificationRequest = {
  employeeId?: unknown;
  certificationField?: unknown;
  documentPath?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error(
        'Missing SUPABASE_SERVICE_ROLE_KEY environment variable.',
      );
    }

    const body = (await request.json()) as RemoveCertificationRequest;
    const employeeId = String(body.employeeId ?? '').trim();
    const certificationField = String(
      body.certificationField ?? '',
    ).trim();
    const documentPath = String(body.documentPath ?? '').trim();

    if (!employeeId || !certificationField || !documentPath) {
      return NextResponse.json(
        { error: 'Missing required certification removal fields.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_CERTIFICATION_FIELDS.has(certificationField)) {
      return NextResponse.json(
        { error: 'Invalid certification field.' },
        { status: 400 },
      );
    }

    const expectedPathPrefix =
      `${employeeId}/${certificationField}-`;

    if (
      !documentPath.startsWith(expectedPathPrefix) ||
      documentPath.includes('..') ||
      documentPath.startsWith('/')
    ) {
      return NextResponse.json(
        { error: 'Invalid certification document path.' },
        { status: 400 },
      );
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

    const existingCertifications =
      employee.certifications &&
      typeof employee.certifications === 'object'
        ? { ...employee.certifications }
        : {};

    const documentKey = `${certificationField}Document`;

    const currentDocument = existingCertifications[
      documentKey as keyof typeof existingCertifications
    ];

    const currentDocumentPath =
      currentDocument &&
      typeof currentDocument === 'object' &&
      'path' in currentDocument
        ? String(currentDocument.path ?? '')
        : '';

    if (!currentDocumentPath) {
      return NextResponse.json(
        { error: 'No certification document is currently on file.' },
        { status: 404 },
      );
    }

    if (currentDocumentPath !== documentPath) {
      return NextResponse.json(
        { error: 'Certification document does not match the employee record.' },
        { status: 409 },
      );
    }

    delete existingCertifications[
      documentKey as keyof typeof existingCertifications
    ];

    const { error: updateError } = await supabase
      .from('employees')
      .update({ certifications: existingCertifications })
      .eq('id', employeeId);

    if (updateError) {
      throw updateError;
    }

    const { error: storageError } = await supabase.storage
      .from(CERTIFICATION_BUCKET)
      .remove([documentPath]);

    if (storageError) {
      console.error(
        'Certification metadata was removed, but storage cleanup failed:',
        storageError,
      );
    }

    return NextResponse.json({
      ok: true,
      storageCleanupComplete: !storageError,
    });
  } catch (error) {
    console.error('Employee certification removal error:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to remove employee certification document.';

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
