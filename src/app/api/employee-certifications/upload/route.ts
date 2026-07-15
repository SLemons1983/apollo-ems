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

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MEDICAL_EXAMINER_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

type UploadRequest = {
  action?: unknown;
  employeeId?: unknown;
  certificationField?: unknown;
  certificationLabel?: unknown;
  filename?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
  path?: unknown;
};

function getSafeFileExtension(filename: string, mimeType: string) {
  const extension = filename.includes('.')
    ? filename.split('.').pop()?.toLowerCase()
    : '';

  if (
    extension === 'pdf' ||
    extension === 'jpg' ||
    extension === 'jpeg' ||
    extension === 'png'
  ) {
    return extension;
  }

  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';

  return 'file';
}

function getValidatedRequest(body: UploadRequest) {
  const action = String(body.action ?? '').trim();
  const employeeId = String(body.employeeId ?? '').trim();
  const certificationField = String(
    body.certificationField ?? '',
  ).trim();
  const certificationLabel = String(
    body.certificationLabel ?? '',
  ).trim();
  const filename = String(body.filename ?? '').trim();
  const contentType = String(body.contentType ?? '').trim();
  const sizeBytes = Number(body.sizeBytes ?? 0);
  const path = String(body.path ?? '').trim();

  if (
    !employeeId ||
    !certificationField ||
    !certificationLabel ||
    !filename ||
    !contentType ||
    !Number.isFinite(sizeBytes) ||
    sizeBytes <= 0
  ) {
    throw new Error('Missing required certification upload fields.');
  }

  if (!ALLOWED_CERTIFICATION_FIELDS.has(certificationField)) {
    throw new Error('Invalid certification field.');
  }

  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error(
      'Only PDF, JPG, JPEG, and PNG files are allowed.',
    );
  }

  const maxFileSizeBytes =
    certificationField === 'medicalExaminerCertificate'
      ? MEDICAL_EXAMINER_MAX_FILE_SIZE_BYTES
      : DEFAULT_MAX_FILE_SIZE_BYTES;
  const maxFileSizeMegabytes =
    certificationField === 'medicalExaminerCertificate' ? 20 : 10;

  if (sizeBytes > maxFileSizeBytes) {
    throw new Error(
      `Certification file must be ${maxFileSizeMegabytes} MB or smaller.`,
    );
  }

  return {
    action,
    employeeId,
    certificationField,
    certificationLabel,
    filename,
    contentType,
    sizeBytes,
    path,
  };
}

export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error(
        'Missing SUPABASE_SERVICE_ROLE_KEY environment variable.',
      );
    }

    const body = (await request.json()) as UploadRequest;
    const uploadRequest = getValidatedRequest(body);

    const supabase = createClient(SUPABASE_URL, serviceRoleKey);

    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id,certifications')
      .eq('id', uploadRequest.employeeId)
      .single();

    if (employeeError) {
      throw employeeError;
    }

    if (uploadRequest.action === 'prepare') {
      const extension = getSafeFileExtension(
        uploadRequest.filename,
        uploadRequest.contentType,
      );
      const storagePath =
        `${uploadRequest.employeeId}/` +
        `${uploadRequest.certificationField}-${Date.now()}.${extension}`;

      const { data, error } = await supabase.storage
        .from(CERTIFICATION_BUCKET)
        .createSignedUploadUrl(storagePath);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok: true,
        path: data.path,
        token: data.token,
      });
    }

    if (uploadRequest.action === 'complete') {
      const expectedPathPrefix =
        `${uploadRequest.employeeId}/` +
        `${uploadRequest.certificationField}-`;

      if (
        !uploadRequest.path ||
        !uploadRequest.path.startsWith(expectedPathPrefix) ||
        uploadRequest.path.includes('..') ||
        uploadRequest.path.startsWith('/')
      ) {
        return NextResponse.json(
          { error: 'Invalid certification document path.' },
          { status: 400 },
        );
      }

      const existingCertifications =
        employee.certifications &&
        typeof employee.certifications === 'object'
          ? employee.certifications
          : {};

      const documentKey =
        `${uploadRequest.certificationField}Document`;
      const uploadedAt = new Date().toISOString();

      const document = {
        path: uploadRequest.path,
        filename: uploadRequest.filename,
        contentType: uploadRequest.contentType,
        sizeBytes: uploadRequest.sizeBytes,
        uploadedAt,
        label: uploadRequest.certificationLabel,
      };

      const updatedCertifications = {
        ...existingCertifications,
        [documentKey]: document,
      };

      const { error: updateError } = await supabase
        .from('employees')
        .update({ certifications: updatedCertifications })
        .eq('id', uploadRequest.employeeId);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        ok: true,
        document,
      });
    }

    return NextResponse.json(
      { error: 'Invalid certification upload action.' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Employee certification upload error:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to process employee certification upload.';

    const isValidationError =
      message === 'Missing required certification upload fields.' ||
      message === 'Invalid certification field.' ||
      message === 'Only PDF, JPG, JPEG, and PNG files are allowed.' ||
      message === 'Certification file must be 10 MB or smaller.' ||
      message === 'Certification file must be 20 MB or smaller.';

    return NextResponse.json(
      { error: message },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
