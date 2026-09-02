import { NextRequest, NextResponse } from 'next/server';
import { requireSupervisorApi } from '@/lib/supervisorApi';

type EmployeeRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  status: string | null;
  certifications: Record<string, string> | null;
};

function employeeName(employee: EmployeeRecord) {
  return `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim() || 'Unnamed Employee';
}

function credential(employee: EmployeeRecord) {
  const certifications = employee.certifications ?? {};
  const paramedic = (certifications.californiaParamedicLicenseNumber ?? '').trim();
  const emt = (certifications.californiaEmtLicenseNumber ?? '').trim();
  if (paramedic && !emt) return { type: 'Paramedic', number: paramedic };
  if (emt && !paramedic) return { type: 'EMT', number: emt };
  if (paramedic && emt) {
    const role = (employee.role ?? '').toLowerCase();
    if (role.includes('paramedic')) return { type: 'Paramedic', number: paramedic };
    if (role.includes('emt')) return { type: 'EMT', number: emt };
  }
  return { type: 'Certification Not Set', number: '' };
}

function authError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'SUPERVISOR_API_UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (message === 'SUPERVISOR_API_FORBIDDEN') return NextResponse.json({ error: 'Supervisor authorization required.' }, { status: 403 });
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await requireSupervisorApi(request);
    const [employeesResult, classesResult, attendanceResult] = await Promise.all([
      db.from('employees').select('id,first_name,last_name,role,status,certifications'),
      db.from('ce_classes').select('*').order('created_at', { ascending: false }).order('class_date', { ascending: false }),
      db.from('ce_attendance').select('*').order('employee_name', { ascending: true }),
    ]);
    const error = employeesResult.error ?? classesResult.error ?? attendanceResult.error;
    if (error) throw error;
    return NextResponse.json({ employees: employeesResult.data ?? [], classes: classesResult.data ?? [], attendance: attendanceResult.data ?? [] });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error('CE records load error:', error);
    return NextResponse.json({ error: 'Unable to load CE records.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await requireSupervisorApi(request);
    const body = await request.json();
    const classDate = typeof body.classDate === 'string' ? body.classDate.trim() : '';
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    const ceHours = Number(body.ceHours);
    const instructorKey = body.instructorKey === 'heather' ? 'heather' : body.instructorKey === 'jose' ? 'jose' : '';
    const employeeIds = Array.isArray(body.employeeIds) ? [...new Set(body.employeeIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0))] : [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(classDate) || !topic || topic.length > 200 || !Number.isFinite(ceHours) || ceHours <= 0 || ceHours > 100 || !instructorKey || employeeIds.length === 0 || employeeIds.length > 500) {
      return NextResponse.json({ error: 'Invalid CE class information.' }, { status: 400 });
    }

    const { data: employees, error: employeesError } = await db
      .from('employees')
      .select('id,first_name,last_name,role,status,certifications')
      .in('id', employeeIds)
      .ilike('status', 'Active');
    if (employeesError) throw employeesError;
    if ((employees ?? []).length !== employeeIds.length) {
      return NextResponse.json({ error: 'One or more selected employees are unavailable.' }, { status: 400 });
    }

    const { data: ceClass, error: classError } = await db.from('ce_classes').insert({
      class_date: classDate,
      topic,
      ce_hours: ceHours,
      course_type: 'INSTRUCTOR_BASED',
      instructor_key: instructorKey,
    }).select('*').single();
    if (classError || !ceClass) throw classError ?? new Error('CE class was not created.');

    const rows = (employees as EmployeeRecord[]).map((employee) => {
      const currentCredential = credential(employee);
      return {
        class_id: ceClass.id,
        employee_id: employee.id,
        employee_name: employeeName(employee),
        credential_type: currentCredential.type,
        license_number: currentCredential.number,
      };
    });
    const { data: attendance, error: attendanceError } = await db.from('ce_attendance').insert(rows).select('*');
    if (attendanceError) {
      await db.from('ce_classes').delete().eq('id', ceClass.id);
      throw attendanceError;
    }
    return NextResponse.json({ ceClass, attendance: attendance ?? [] }, { status: 201 });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error('CE records save error:', error);
    return NextResponse.json({ error: 'Unable to save CE class.' }, { status: 500 });
  }
}
