import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const CERTIFICATION_BUCKET = 'employee-certifications';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type CertificationDocument = {
  path: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  label: string;
};

type AdditionalCertification = {
  id: string;
  name: string;
  issuingAgency: string;
  certificationNumber: string;
  issueDate: string;
  expirationDate: string;
  notes: string;
  document?: CertificationDocument;
};

type AdditionalCertificationRequest = {
  action?: unknown;
  employeeId?: unknown;
  certificationId?: unknown;
  certificationLabel?: unknown;
  filename?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
  path?: unknown;
  documentPath?: unknown;
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

function isSafeIdentifier(value: string) {
  return (
    Boolean(value) &&
    !value.includes('..') &&
    !value.includes('/') &&
    !value.includes('\\')
  );
}

function getAdditionalCertifications(value: unknown): AdditionalCertification[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is AdditionalCertification =>
      Boolean(
        item &&
          typeof item === 'object' &&
          'id' in item &&
          String(item.id || '').trim(),
      ),
  );
}

export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error(
        'Missing SUPABASE_SERVICE_ROLE_KEY environment variable.',
      );
    }

    const body =
      (await request.json()) as AdditionalCertificationRequest;

    const action = String(body.action ?? '').trim();
    const employeeId = String(body.employeeId ?? '').trim();
    const certificationId = String(
      body.certificationId ?? '',
    ).trim();

    if (
      !action ||
      !isSafeIdentifier(employeeId) ||
      !isSafeIdentifier(certificationId)
    ) {
      return NextResponse.json(
        { error: 'Missing or invalid additional certification fields.' },
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

    const additionalCertifications = getAdditionalCertifications(
      existingCertifications.additionalCertifications,
    );

    const certificationIndex =
      additionalCertifications.findIndex(
        (certification) =>
          certification.id === certificationId,
      );

    if (certificationIndex < 0) {
      return NextResponse.json(
        { error: 'Additional certification was not found.' },
        { status: 404 },
      );
    }

    const currentCertification =
      additionalCertifications[certificationIndex];

    if (action === 'prepare') {
      const filename = String(body.filename ?? '').trim();
      const contentType = String(body.contentType ?? '').trim();
      const sizeBytes = Number(body.sizeBytes ?? 0);

      if (
        !filename ||
        !contentType ||
        !Number.isFinite(sizeBytes) ||
        sizeBytes <= 0
      ) {
        return NextResponse.json(
          { error: 'Missing required certification upload fields.' },
          { status: 400 },
        );
      }

      if (!ALLOWED_TYPES.has(contentType)) {
        return NextResponse.json(
          {
            error:
              'Only PDF, JPG, JPEG, and PNG files are allowed.',
          },
          { status: 400 },
        );
      }

      if (sizeBytes > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'Certification file must be 10 MB or smaller.' },
          { status: 400 },
        );
      }

      const extension = getSafeFileExtension(
        filename,
        contentType,
      );

      const storagePath =
        `${employeeId}/additional/` +
        `${certificationId}-${Date.now()}.${extension}`;

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

    if (action === 'complete') {
      const certificationLabel = String(
        body.certificationLabel ?? '',
      ).trim();
      const filename = String(body.filename ?? '').trim();
      const contentType = String(body.contentType ?? '').trim();
      const sizeBytes = Number(body.sizeBytes ?? 0);
      const path = String(body.path ?? '').trim();

      const expectedPathPrefix =
        `${employeeId}/additional/${certificationId}-`;

      if (
        !certificationLabel ||
        !filename ||
        !ALLOWED_TYPES.has(contentType) ||
        !Number.isFinite(sizeBytes) ||
        sizeBytes <= 0 ||
        sizeBytes > MAX_FILE_SIZE_BYTES ||
        !path.startsWith(expectedPathPrefix) ||
        path.includes('..') ||
        path.startsWith('/')
      ) {
        return NextResponse.json(
          { error: 'Invalid additional certification upload.' },
          { status: 400 },
        );
      }

      const previousDocument =
        currentCertification.document;

      const document: CertificationDocument = {
        path,
        filename,
        contentType,
        sizeBytes,
        uploadedAt: new Date().toISOString(),
        label: certificationLabel,
      };

      const updatedCertification = {
        ...currentCertification,
        document,
      };

      const updatedAdditionalCertifications = [
        ...additionalCertifications,
      ];

      updatedAdditionalCertifications[certificationIndex] =
        updatedCertification;

      const { error: updateError } = await supabase
        .from('employees')
        .update({
          certifications: {
            ...existingCertifications,
            additionalCertifications:
              updatedAdditionalCertifications,
          },
        })
        .eq('id', employeeId);

      if (updateError) {
        throw updateError;
      }

      if (
        previousDocument?.path &&
        previousDocument.path !== path
      ) {
        const { error: cleanupError } = await supabase.storage
          .from(CERTIFICATION_BUCKET)
          .remove([previousDocument.path]);

        if (cleanupError) {
          console.error(
            'Previous additional certification document cleanup failed:',
            cleanupError,
          );
        }
      }

      return NextResponse.json({
        ok: true,
        certification: updatedCertification,
      });
    }

    if (action === 'removeDocument') {
      const documentPath = String(
        body.documentPath ?? '',
      ).trim();

      if (
        !currentCertification.document?.path ||
        currentCertification.document.path !== documentPath
      ) {
        return NextResponse.json(
          {
            error:
              'Certification document does not match the employee record.',
          },
          { status: 409 },
        );
      }

      const {
        document: removedDocument,
        ...certificationWithoutDocument
      } = currentCertification;

      const updatedAdditionalCertifications = [
        ...additionalCertifications,
      ];

      updatedAdditionalCertifications[certificationIndex] =
        certificationWithoutDocument;

      const { error: updateError } = await supabase
        .from('employees')
        .update({
          certifications: {
            ...existingCertifications,
            additionalCertifications:
              updatedAdditionalCertifications,
          },
        })
        .eq('id', employeeId);

      if (updateError) {
        throw updateError;
      }

      const { error: storageError } = await supabase.storage
        .from(CERTIFICATION_BUCKET)
        .remove([removedDocument.path]);

      if (storageError) {
        console.error(
          'Additional certification document storage cleanup failed:',
          storageError,
        );
      }

      return NextResponse.json({
        ok: true,
        certification: certificationWithoutDocument,
        storageCleanupComplete: !storageError,
      });
    }

    if (action === 'removeCertification') {
      const updatedAdditionalCertifications =
        additionalCertifications.filter(
          (certification) =>
            certification.id !== certificationId,
        );

      const { error: updateError } = await supabase
        .from('employees')
        .update({
          certifications: {
            ...existingCertifications,
            additionalCertifications:
              updatedAdditionalCertifications,
          },
        })
        .eq('id', employeeId);

      if (updateError) {
        throw updateError;
      }

      let storageCleanupComplete = true;

      if (currentCertification.document?.path) {
        const { error: storageError } = await supabase.storage
          .from(CERTIFICATION_BUCKET)
          .remove([currentCertification.document.path]);

        if (storageError) {
          storageCleanupComplete = false;
          console.error(
            'Removed certification document cleanup failed:',
            storageError,
          );
        }
      }

      return NextResponse.json({
        ok: true,
        storageCleanupComplete,
      });
    }

    return NextResponse.json(
      { error: 'Invalid additional certification action.' },
      { status: 400 },
    );
  } catch (error) {
    console.error(
      'Additional employee certification error:',
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to process additional certification.';

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
