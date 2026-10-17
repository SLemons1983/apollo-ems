'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type FleetVehicle = {
  id: string;
  vehicleName: string;
  unitNumber: string;
  year: number | null;
  make: string;
  model: string;
  vin: string;
  currentMileage: number;
  status: 'IN_SERVICE' | 'OUT_OF_SERVICE' | 'MAINTENANCE_SCHEDULED' | 'RESERVE' | 'CUSTOM';
  statusReason: string;
  outOfServiceDate: string;
  expectedReturnDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type FleetServiceTemplate = {
  id: string;
  serviceName: string;
  description: string;
  intervalType: 'MILEAGE' | 'DATE';
  intervalValue: number;
  createdAt: string;
};

type FleetServiceRecord = {
  id: string;
  vehicleId: string;
  serviceTemplateId: string;
  serviceName: string;
  description: string;
  completedDate: string;
  completedMileage: number | null;
  performedBy: string;
  notes: string;
  createdAt: string;
};

type FleetInspection = {
  id: string;
  vehicle: string;
  employeeName: string;
  inspectionDate: string;
  mileage: number;
  vehicleCondition: string;
  mechanicalChecks: string;
  oxygenLevels: string;
  alsSupplies: string;
  blsSupplies: string;
  otherSupplies: string;
  deficiencies: string;
  createdAt: string;
};

function FleetServicesTile() {
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [fleetServiceTemplates, setFleetServiceTemplates] = useState<FleetServiceTemplate[]>([]);
  const [fleetServiceRecords, setFleetServiceRecords] = useState<FleetServiceRecord[]>([]);
  const [allFleetServiceRecords, setAllFleetServiceRecords] = useState<FleetServiceRecord[]>([]);
  const [fleetInspections, setFleetInspections] = useState<FleetInspection[]>([]);
  const [showCreateFleetVehicleForm, setShowCreateFleetVehicleForm] = useState(false);
  const [showFleetServiceTemplates, setShowFleetServiceTemplates] = useState(false);
  const [newFleetVehicleName, setNewFleetVehicleName] = useState('');
  const [newFleetUnitNumber, setNewFleetUnitNumber] = useState('');
  const [newFleetYear, setNewFleetYear] = useState('');
  const [newFleetMake, setNewFleetMake] = useState('');
  const [newFleetModel, setNewFleetModel] = useState('');
  const [newFleetVin, setNewFleetVin] = useState('');
  const [newFleetMileage, setNewFleetMileage] = useState('');
  const [newFleetStatus, setNewFleetStatus] = useState<FleetVehicle['status']>('IN_SERVICE');
  const [newFleetStatusReason, setNewFleetStatusReason] = useState('');
  const [newFleetServiceName, setNewFleetServiceName] = useState('');
  const [newFleetServiceDescription, setNewFleetServiceDescription] = useState('');
  const [newFleetServiceIntervalType, setNewFleetServiceIntervalType] = useState<FleetServiceTemplate['intervalType']>('MILEAGE');
  const [newFleetServiceIntervalValue, setNewFleetServiceIntervalValue] = useState('');
  const [showAddFleetServiceRecord, setShowAddFleetServiceRecord] = useState(false);
  const [showVehicleInformation, setShowVehicleInformation] = useState(false);
  const [showInspectionHistory, setShowInspectionHistory] = useState(false);
  const [showMaintenanceRecords, setShowMaintenanceRecords] = useState(false);
  const [showFleetPrintReport, setShowFleetPrintReport] = useState(false);
  const [fleetReportVehicleFilter, setFleetReportVehicleFilter] = useState('');
  const [fleetReportStartDate, setFleetReportStartDate] = useState('');
  const [fleetReportEndDate, setFleetReportEndDate] = useState('');
  const [fleetReportEmployeeFilter, setFleetReportEmployeeFilter] = useState('');
  const [fleetReportDeficienciesOnly, setFleetReportDeficienciesOnly] = useState(false);
  const [newFleetServiceRecordTemplateId, setNewFleetServiceRecordTemplateId] = useState('');
  const [newFleetServiceRecordName, setNewFleetServiceRecordName] = useState('');
  const [newFleetServiceRecordDate, setNewFleetServiceRecordDate] = useState('');
  const [newFleetServiceRecordMileage, setNewFleetServiceRecordMileage] = useState('');
  const [newFleetServiceRecordPerformedBy, setNewFleetServiceRecordPerformedBy] = useState('');
  const [newFleetServiceRecordNotes, setNewFleetServiceRecordNotes] = useState('');
  const [selectedFleetVehicle, setSelectedFleetVehicle] = useState<FleetVehicle | null>(null);
  const [isEditingFleetVehicle, setIsEditingFleetVehicle] = useState(false);
  const [fleetStatus, setFleetStatus] = useState('');
  const [fleetVehiclesLoaded, setFleetVehiclesLoaded] = useState(false);

  function getFleetVehicleStatusLabel(status: FleetVehicle['status']) {
    switch (status) {
      case 'OUT_OF_SERVICE':
        return 'Out of Service';
      case 'MAINTENANCE_SCHEDULED':
        return 'Maintenance Scheduled';
      case 'RESERVE':
        return 'Reserve Unit';
      case 'CUSTOM':
        return 'Custom Status';
      case 'IN_SERVICE':
      default:
        return 'In Service';
    }
  }

  function getFleetVehicleStatusClass(status: FleetVehicle['status']) {
    switch (status) {
      case 'OUT_OF_SERVICE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MAINTENANCE_SCHEDULED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RESERVE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CUSTOM':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'IN_SERVICE':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  }

  async function loadFleetVehicles() {
    const { data, error } = await supabase
      .from('fleet_vehicles')
      .select('*')
      .order('vehicle_name', { ascending: true });

    setFleetVehiclesLoaded(true);

    if (error) {
      console.error('Failed to load fleet vehicles:', error);
      setFleetStatus('Unable to load fleet vehicles.');
      return;
    }

    setFleetVehicles(
      (data ?? []).map((row: any) => ({
        id: row.id,
        vehicleName: row.vehicle_name,
        unitNumber: row.unit_number ?? '',
        year: row.year ?? null,
        make: row.make ?? '',
        model: row.model ?? '',
        vin: row.vin ?? '',
        currentMileage: row.current_mileage ?? 0,
        status: row.status ?? 'IN_SERVICE',
        statusReason: row.status_reason ?? '',
        outOfServiceDate: row.out_of_service_date ?? '',
        expectedReturnDate: row.expected_return_date ?? '',
        notes: row.notes ?? '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    );
  }

  // Vehicle rows ask for their inspections several times per render; cache the
  // result per vehicle until the inspection list changes.
  const getFleetInspectionsForVehicle = useMemo(() => {
    const cache = new Map<string, FleetInspection[]>();

    return (vehicle: FleetVehicle) => {
      const unitNumber = vehicle.unitNumber.trim().toLowerCase();
      const vehicleName = vehicle.vehicleName.trim().toLowerCase();
      const cacheKey = `${unitNumber}\u0000${vehicleName}`;
      const cached = cache.get(cacheKey);

      if (cached) {
        return cached;
      }

      const inspections = fleetInspections.filter((inspection) => {
        const inspectionVehicle = inspection.vehicle.trim().toLowerCase();

        return (
          inspectionVehicle === unitNumber ||
          inspectionVehicle === vehicleName ||
          (!!unitNumber && inspectionVehicle.includes(unitNumber))
        );
      });

      cache.set(cacheKey, inspections);
      return inspections;
    };
  }, [fleetInspections]);

  function getLatestFleetInspectionForVehicle(vehicle: FleetVehicle) {
    return getFleetInspectionsForVehicle(vehicle)[0] ?? null;
  }

  async function loadFleetInspections() {
    const { data, error } = await supabase
      .from('fleet_inspections')
      .select('*')
      .order('inspection_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load fleet inspections:', error);
      setFleetStatus('Unable to load fleet inspections.');
      return;
    }

    setFleetInspections(
      (data ?? []).map((row: any) => ({
        id: row.id,
        vehicle: row.vehicle ?? '',
        employeeName: row.employee_name ?? '',
        inspectionDate: row.inspection_date ?? '',
        mileage: row.mileage ?? 0,
        vehicleCondition: row.vehicle_condition ?? '',
        mechanicalChecks: row.mechanical_checks ?? '',
        oxygenLevels: row.oxygen_levels ?? '',
        alsSupplies: row.als_supplies ?? '',
        blsSupplies: row.bls_supplies ?? '',
        otherSupplies: row.other_supplies ?? '',
        deficiencies: row.deficiencies ?? '',
        createdAt: row.created_at,
      })),
    );
  }

  async function loadFleetServiceTemplates() {
    const { data, error } = await supabase
      .from('fleet_service_templates')
      .select('*')
      .order('service_name', { ascending: true });

    if (error) {
      console.error('Failed to load fleet service templates:', error);
      setFleetStatus('Unable to load fleet service templates.');
      return;
    }

    setFleetServiceTemplates(
      (data ?? []).map((row: any) => ({
        id: row.id,
        serviceName: row.service_name,
        description: row.description ?? '',
        intervalType: row.interval_type ?? 'MILEAGE',
        intervalValue: row.interval_value ?? 0,
        createdAt: row.created_at,
      })),
    );
  }

  async function handleCreateFleetServiceTemplate() {
    const serviceName = newFleetServiceName.trim();
    const intervalValue = Number(newFleetServiceIntervalValue);

    if (!serviceName) {
      setFleetStatus('Enter a service name.');
      return;
    }

    if (!Number.isInteger(intervalValue) || intervalValue <= 0) {
      setFleetStatus('Enter a valid service interval.');
      return;
    }

    setFleetStatus('Creating service template...');

    const { error } = await supabase.from('fleet_service_templates').insert({
      service_name: serviceName,
      description: newFleetServiceDescription.trim() || null,
      interval_type: newFleetServiceIntervalType,
      interval_value: intervalValue,
    });

    if (error) {
      console.error('Failed to create fleet service template:', error);
      setFleetStatus('Unable to create service template.');
      return;
    }

    setNewFleetServiceName('');
    setNewFleetServiceDescription('');
    setNewFleetServiceIntervalType('MILEAGE');
    setNewFleetServiceIntervalValue('');
    setFleetStatus('Service template created.');
    await loadFleetServiceTemplates();
  }

  async function handleDeleteFleetServiceTemplate(template: FleetServiceTemplate) {
    const confirmed = window.confirm(`Delete service template "${template.serviceName}"?`);

    if (!confirmed) {
      return;
    }

    setFleetStatus('Deleting service template...');

    const { error } = await supabase.from('fleet_service_templates').delete().eq('id', template.id);

    if (error) {
      console.error('Failed to delete fleet service template:', error);
      setFleetStatus('Unable to delete service template.');
      return;
    }

    setFleetStatus('Service template deleted.');
    await loadFleetServiceTemplates();
  }

  function getFleetServiceIntervalLabel(template: FleetServiceTemplate) {
    if (template.intervalType === 'DATE') {
      return `Every ${template.intervalValue} month${template.intervalValue === 1 ? '' : 's'}`;
    }

    return `Every ${template.intervalValue.toLocaleString()} miles`;
  }

  function mapFleetServiceRecord(row: any): FleetServiceRecord {
    return {
      id: row.id,
      vehicleId: row.vehicle_id,
      serviceTemplateId: row.service_template_id ?? '',
      serviceName: row.service_name,
      description: row.description ?? '',
      completedDate: row.completed_date,
      completedMileage: row.completed_mileage ?? null,
      performedBy: row.performed_by ?? '',
      notes: row.notes ?? '',
      createdAt: row.created_at,
    };
  }

  async function loadFleetServiceRecords(vehicleId: string) {
    const { data, error } = await supabase
      .from('fleet_service_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('completed_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load fleet service records:', error);
      setFleetStatus('Unable to load service records.');
      return;
    }

    setFleetServiceRecords((data ?? []).map(mapFleetServiceRecord));
  }

  async function loadAllFleetServiceRecords() {
    const { data, error } = await supabase
      .from('fleet_service_records')
      .select('*')
      .order('completed_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load all fleet service records:', error);
      return;
    }

    setAllFleetServiceRecords((data ?? []).map(mapFleetServiceRecord));
  }

  function getFleetVehicleLabelById(vehicleId: string) {
    const vehicle = fleetVehicles.find((item) => item.id === vehicleId);
    return vehicle?.unitNumber || vehicle?.vehicleName || vehicleId;
  }

  function fleetVehicleMatchesFilter(vehicle: string) {
    if (!fleetReportVehicleFilter) {
      return true;
    }

    return vehicle.trim().toLowerCase().includes(fleetReportVehicleFilter.trim().toLowerCase());
  }

  function fleetDateIsInRange(dateValue: string) {
    if (fleetReportStartDate && dateValue < fleetReportStartDate) {
      return false;
    }

    if (fleetReportEndDate && dateValue > fleetReportEndDate) {
      return false;
    }

    return true;
  }

  const filteredFleetInspections = fleetInspections.filter((inspection) => {
    const employeeMatches =
      !fleetReportEmployeeFilter ||
      inspection.employeeName.toLowerCase().includes(fleetReportEmployeeFilter.trim().toLowerCase());

    const deficiencyMatches =
      !fleetReportDeficienciesOnly ||
      !!inspection.deficiencies.trim();

    return (
      fleetVehicleMatchesFilter(inspection.vehicle) &&
      fleetDateIsInRange(inspection.inspectionDate) &&
      employeeMatches &&
      deficiencyMatches
    );
  });

  const filteredFleetServiceRecords = allFleetServiceRecords.filter((record) => {
    const vehicleLabel = getFleetVehicleLabelById(record.vehicleId);
    const employeeMatches =
      !fleetReportEmployeeFilter ||
      record.performedBy.toLowerCase().includes(fleetReportEmployeeFilter.trim().toLowerCase());

    return (
      fleetVehicleMatchesFilter(vehicleLabel) &&
      fleetDateIsInRange(record.completedDate) &&
      employeeMatches
    );
  });

  async function handleCreateFleetServiceRecord() {
    if (!selectedFleetVehicle) {
      setFleetStatus('Select a vehicle first.');
      return;
    }

    const selectedTemplate = fleetServiceTemplates.find((template) => template.id === newFleetServiceRecordTemplateId);
    const serviceName = selectedTemplate?.serviceName ?? newFleetServiceRecordName.trim();
    const description = selectedTemplate?.description ?? '';
    const completedMileage = newFleetServiceRecordMileage.trim() ? Number(newFleetServiceRecordMileage) : null;

    if (!serviceName) {
      setFleetStatus('Enter a service name or select a service template.');
      return;
    }

    if (!newFleetServiceRecordDate) {
      setFleetStatus('Enter the completed date.');
      return;
    }

    if (completedMileage !== null && (!Number.isInteger(completedMileage) || completedMileage < 0)) {
      setFleetStatus('Enter a valid completed mileage.');
      return;
    }

    setFleetStatus('Adding service record...');

    const { error } = await supabase.from('fleet_service_records').insert({
      vehicle_id: selectedFleetVehicle.id,
      service_template_id: selectedTemplate?.id ?? null,
      service_name: serviceName,
      description: description || null,
      completed_date: newFleetServiceRecordDate,
      completed_mileage: completedMileage,
      performed_by: newFleetServiceRecordPerformedBy.trim() || null,
      notes: newFleetServiceRecordNotes.trim() || null,
    });

    if (error) {
      console.error('Failed to create fleet service record:', error);
      setFleetStatus('Unable to add service record.');
      return;
    }

    if (completedMileage !== null && completedMileage > selectedFleetVehicle.currentMileage) {
      const { error: mileageError } = await supabase
        .from('fleet_vehicles')
        .update({ current_mileage: completedMileage })
        .eq('id', selectedFleetVehicle.id);

      if (mileageError) {
        console.error('Failed to update vehicle mileage from service record:', mileageError);
      } else {
        setSelectedFleetVehicle({
          ...selectedFleetVehicle,
          currentMileage: completedMileage,
        });
      }
    }

    setNewFleetServiceRecordTemplateId('');
    setNewFleetServiceRecordName('');
    setNewFleetServiceRecordDate('');
    setNewFleetServiceRecordMileage('');
    setNewFleetServiceRecordPerformedBy('');
    setNewFleetServiceRecordNotes('');
    setShowAddFleetServiceRecord(false);
    setFleetStatus('Service record added.');
    await loadFleetServiceRecords(selectedFleetVehicle.id);
    await loadAllFleetServiceRecords();
    await loadFleetVehicles();
  }

  async function handleCreateFleetVehicle() {
    const vehicleName = newFleetVehicleName.trim();
    const unitNumber = newFleetUnitNumber.trim();
    const year = newFleetYear.trim() ? Number(newFleetYear) : null;
    const mileage = Number(newFleetMileage);

    if (!vehicleName) {
      setFleetStatus('Enter a vehicle name.');
      return;
    }

    if (newFleetYear.trim() && (!Number.isInteger(year) || Number(year) < 1900)) {
      setFleetStatus('Enter a valid vehicle year.');
      return;
    }

    if (!Number.isInteger(mileage) || mileage < 0) {
      setFleetStatus('Enter a valid mileage.');
      return;
    }

    setFleetStatus('Creating fleet vehicle...');

    const { error } = await supabase.from('fleet_vehicles').insert({
      vehicle_name: vehicleName,
      unit_number: unitNumber || null,
      year,
      make: newFleetMake.trim() || null,
      model: newFleetModel.trim() || null,
      vin: newFleetVin.trim() || null,
      current_mileage: mileage,
      status: newFleetStatus,
      status_reason: newFleetStatusReason.trim() || null,
    });

    if (error) {
      console.error('Failed to create fleet vehicle:', error);
      setFleetStatus('Unable to create fleet vehicle.');
      return;
    }

    setNewFleetVehicleName('');
    setNewFleetUnitNumber('');
    setNewFleetYear('');
    setNewFleetMake('');
    setNewFleetModel('');
    setNewFleetVin('');
    setNewFleetMileage('');
    setNewFleetStatus('IN_SERVICE');
    setNewFleetStatusReason('');
    setShowCreateFleetVehicleForm(false);
    setFleetStatus('Fleet vehicle created.');
    await loadFleetVehicles();
  }

  async function handleUpdateFleetVehicle() {
    if (!selectedFleetVehicle) {
      return;
    }

    setFleetStatus('Saving vehicle changes...');

    const { error } = await supabase
      .from('fleet_vehicles')
      .update({
        vehicle_name: selectedFleetVehicle.vehicleName,
        unit_number: selectedFleetVehicle.unitNumber || null,
        year: selectedFleetVehicle.year,
        make: selectedFleetVehicle.make || null,
        model: selectedFleetVehicle.model || null,
        vin: selectedFleetVehicle.vin || null,
        current_mileage: selectedFleetVehicle.currentMileage,
        status: selectedFleetVehicle.status,
        status_reason: selectedFleetVehicle.statusReason || null,
      })
      .eq('id', selectedFleetVehicle.id);

    if (error) {
      console.error('Failed to update fleet vehicle:', error);
      setFleetStatus('Unable to save vehicle changes.');
      return;
    }

    await loadFleetVehicles();

    setFleetStatus('Vehicle updated.');
    setIsEditingFleetVehicle(false);
  }

  async function handleUpdateFleetVehicleReadiness() {
    if (!selectedFleetVehicle) {
      return;
    }

    if (
      (selectedFleetVehicle.status === 'OUT_OF_SERVICE' || selectedFleetVehicle.status === 'CUSTOM') &&
      !selectedFleetVehicle.statusReason.trim()
    ) {
      setFleetStatus('A reason is required for Out of Service or Custom status.');
      return;
    }

    setFleetStatus('Updating vehicle readiness...');

    const { error } = await supabase
      .from('fleet_vehicles')
      .update({
        status: selectedFleetVehicle.status,
        status_reason: selectedFleetVehicle.statusReason.trim() || null,
      })
      .eq('id', selectedFleetVehicle.id);

    if (error) {
      console.error('Failed to update vehicle readiness:', error);
      setFleetStatus('Unable to update vehicle readiness.');
      return;
    }

    await loadFleetVehicles();
    setFleetStatus('Vehicle readiness updated.');
  }

  async function handleDeleteFleetVehicle(vehicle: FleetVehicle) {
    const confirmed = window.confirm(`Delete fleet vehicle "${vehicle.vehicleName}"?`);

    if (!confirmed) {
      return;
    }

    setFleetStatus('Deleting fleet vehicle...');

    const { error } = await supabase.from('fleet_vehicles').delete().eq('id', vehicle.id);

    if (error) {
      console.error('Failed to delete fleet vehicle:', error);
      setFleetStatus('Unable to delete fleet vehicle.');
      return;
    }

    setFleetStatus('Fleet vehicle deleted.');
    await loadFleetVehicles();
  }

  // Loads when the tile is first opened, and again each time it is reopened,
  // so fleet data is current without being fetched for supervisors who never
  // open this tile.
  useEffect(() => {
    // The loaders only set state after their requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFleetVehicles();
    loadFleetServiceTemplates();
    loadFleetInspections();
    loadAllFleetServiceRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Fleet Vehicles</div>
          <div className="mt-1 text-xs text-slate-500">
            Add vehicles and track in-service status, current mileage, and availability.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowFleetPrintReport(true)}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Print / Save PDF
          </button>

          <button
            type="button"
            onClick={() => setShowFleetServiceTemplates((value) => !value)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            {showFleetServiceTemplates ? 'Hide Service Templates' : 'Manage Service Templates'}
          </button>

          <button
            type="button"
            onClick={() => setShowCreateFleetVehicleForm((value) => !value)}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
          >
            {showCreateFleetVehicleForm ? 'Cancel' : 'Add Vehicle'}
          </button>
        </div>
      </div>

      {showFleetServiceTemplates && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">Service Templates</div>
              <div className="mt-1 text-xs text-slate-500">
                Build reusable mileage or date interval services such as A Service, B Service, Oil Change, or Annual Inspection.
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600">
              Service Name
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetServiceName}
                onChange={(event) => setNewFleetServiceName(event.target.value)}
                placeholder="A Service"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600 xl:col-span-2">
              Description
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetServiceDescription}
                onChange={(event) => setNewFleetServiceDescription(event.target.value)}
                placeholder="Oil, filters, fluids, safety inspection"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Interval Type
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetServiceIntervalType}
                onChange={(event) => setNewFleetServiceIntervalType(event.target.value as FleetServiceTemplate['intervalType'])}
              >
                <option value="MILEAGE">Mileage</option>
                <option value="DATE">Date</option>
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Interval Value
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetServiceIntervalValue}
                onChange={(event) => setNewFleetServiceIntervalValue(event.target.value)}
                placeholder={newFleetServiceIntervalType === 'DATE' ? '3 months' : '5000 miles'}
              />
            </label>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={handleCreateFleetServiceTemplate}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              Create Service Template
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {fleetServiceTemplates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                No service templates have been created yet.
              </div>
            ) : (
              fleetServiceTemplates.map((template) => (
                <div key={template.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{template.serviceName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {getFleetServiceIntervalLabel(template)}
                      {template.description ? ` • ${template.description}` : ''}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteFleetServiceTemplate(template)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showCreateFleetVehicleForm && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600">
              Vehicle Name
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetVehicleName}
                onChange={(event) => setNewFleetVehicleName(event.target.value)}
                placeholder="ALS 325"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Unit Number
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetUnitNumber}
                onChange={(event) => setNewFleetUnitNumber(event.target.value)}
                placeholder="325"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Year
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetYear}
                onChange={(event) => setNewFleetYear(event.target.value)}
                placeholder="2021"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Make
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetMake}
                onChange={(event) => setNewFleetMake(event.target.value)}
                placeholder="Ford"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Model
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetModel}
                onChange={(event) => setNewFleetModel(event.target.value)}
                placeholder="E-450"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              VIN
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetVin}
                onChange={(event) => setNewFleetVin(event.target.value)}
                placeholder="Vehicle VIN"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Current Mileage
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetMileage}
                onChange={(event) => setNewFleetMileage(event.target.value)}
                placeholder="184322"
              />
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Status
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={newFleetStatus}
                onChange={(event) => setNewFleetStatus(event.target.value as FleetVehicle['status'])}
              >
                <option value="IN_SERVICE">In Service</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
                <option value="MAINTENANCE_SCHEDULED">Maintenance Scheduled</option>
                <option value="RESERVE">Reserve Unit</option>
                <option value="CUSTOM">Custom Status</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block text-xs font-semibold text-slate-600">
            Status Reason / Notes
            <textarea
              className="mt-1 min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={newFleetStatusReason}
              onChange={(event) => setNewFleetStatusReason(event.target.value)}
              placeholder="Reason for out-of-service status, scheduled maintenance, or reserve designation."
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCreateFleetVehicle}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              Create Vehicle
            </button>

            {fleetStatus && <span className="text-sm font-semibold text-slate-700">{fleetStatus}</span>}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-bold text-slate-900">Fleet Filters</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-semibold text-slate-600">
            Vehicle
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={fleetReportVehicleFilter}
              onChange={(event) => setFleetReportVehicleFilter(event.target.value)}
            >
              <option value="">All Vehicles</option>
              {fleetVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.unitNumber || vehicle.vehicleName}>
                  {vehicle.unitNumber || vehicle.vehicleName}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Start Date
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={fleetReportStartDate}
              onChange={(event) => setFleetReportStartDate(event.target.value)}
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            End Date
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={fleetReportEndDate}
              onChange={(event) => setFleetReportEndDate(event.target.value)}
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Employee / Performed By
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={fleetReportEmployeeFilter}
              onChange={(event) => setFleetReportEmployeeFilter(event.target.value)}
              placeholder="Name"
            />
          </label>

          <label className="flex items-center gap-2 pt-6 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={fleetReportDeficienciesOnly}
              onChange={(event) => setFleetReportDeficienciesOnly(event.target.checked)}
            />
            Deficiencies only
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
            Inspection Rows: {filteredFleetInspections.length}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
            Service Records: {filteredFleetServiceRecords.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setFleetReportVehicleFilter('');
              setFleetReportStartDate('');
              setFleetReportEndDate('');
              setFleetReportEmployeeFilter('');
              setFleetReportDeficienciesOnly(false);
            }}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {!showCreateFleetVehicleForm && fleetStatus && (
        <div className="mt-3 text-sm font-semibold text-slate-700">{fleetStatus}</div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {fleetVehicles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            {fleetVehiclesLoaded ? 'No fleet vehicles have been added yet.' : 'Loading fleet vehicles…'}
          </div>
        ) : (
          fleetVehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => {
                setSelectedFleetVehicle(vehicle);
                setIsEditingFleetVehicle(false);
                setShowAddFleetServiceRecord(false);
                setShowVehicleInformation(false);
                setShowInspectionHistory(false);
                setShowMaintenanceRecords(false);
                void loadFleetServiceRecords(vehicle.id);
              }}
              className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                vehicle.status === 'OUT_OF_SERVICE'
                  ? 'border-red-300 ring-2 ring-red-100'
                  : vehicle.status === 'MAINTENANCE_SCHEDULED'
                    ? 'border-yellow-300 ring-2 ring-yellow-100'
                    : vehicle.status === 'RESERVE'
                      ? 'border-blue-300 ring-2 ring-blue-100'
                      : 'border-slate-900 ring-2 ring-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {vehicle.unitNumber || vehicle.vehicleName}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {vehicle.vehicleName}
                  </div>
                </div>

                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getFleetVehicleStatusClass(vehicle.status)}`}>
                  {getFleetVehicleStatusLabel(vehicle.status)}
                </span>
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Mileage</span>
                  <span className="font-semibold text-slate-900">
                    {(getLatestFleetInspectionForVehicle(vehicle)?.mileage ?? vehicle.currentMileage).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Last Inspection</span>
                  <span className="font-semibold text-slate-900">
                    {getLatestFleetInspectionForVehicle(vehicle)?.inspectionDate || 'No inspection yet'}
                  </span>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Service Status</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-800">
                    {fleetServiceRecords.find((record) => record.vehicleId === vehicle.id)?.serviceName
                      ? `Last Service: ${fleetServiceRecords.find((record) => record.vehicleId === vehicle.id)?.serviceName}`
                      : 'No services due'}
                  </div>
                </div>

                {vehicle.statusReason && vehicle.status !== 'IN_SERVICE' && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    {vehicle.statusReason}
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>

    {showFleetPrintReport && (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
        <div className="apollo-print-report mt-6 max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }

              .apollo-print-report,
              .apollo-print-report * {
                visibility: visible;
              }

              .apollo-print-report {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: none !important;
                max-height: none !important;
                overflow: visible !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                padding: 16px !important;
              }

              .apollo-no-print {
                display: none !important;
              }

              .apollo-print-report .overflow-x-auto {
                overflow: visible !important;
              }

              .apollo-print-report table {
                width: 100% !important;
                min-width: 0 !important;
                table-layout: fixed !important;
                page-break-inside: auto;
                font-size: 10px !important;
              }

              .apollo-print-report th,
              .apollo-print-report td {
                white-space: normal !important;
                word-break: break-word !important;
                padding: 6px !important;
              }

              .apollo-print-report tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
            }
          `}</style>

          <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <div className="text-lg font-bold text-slate-900">Fleet Mileage Audit Report</div>
              <div className="text-sm text-slate-500">
                Vehicle inspections, mileage submissions, deficiencies, and maintenance records.
              </div>
            </div>

            <div className="apollo-no-print flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => window.print()}
              >
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setShowFleetPrintReport(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Vehicle</div>
              <div className="mt-1 text-sm font-bold text-slate-900">{fleetReportVehicleFilter || 'All Vehicles'}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Date Range</div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                {fleetReportStartDate || 'Any'} → {fleetReportEndDate || 'Any'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Inspection Rows</div>
              <div className="mt-1 text-sm font-bold text-slate-900">{filteredFleetInspections.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Service Records</div>
              <div className="mt-1 text-sm font-bold text-slate-900">{filteredFleetServiceRecords.length}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-bold text-slate-900">Daily Vehicle Inspection Mileage Audit</div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2 font-bold">Vehicle</th>
                    <th className="px-3 py-2 font-bold">Date</th>
                    <th className="px-3 py-2 font-bold">Mileage</th>
                    <th className="px-3 py-2 font-bold">Employee</th>
                    <th className="px-3 py-2 font-bold">Deficiencies</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFleetInspections.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                        No inspection records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredFleetInspections.map((inspection) => (
                      <tr key={inspection.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-bold text-slate-900">{inspection.vehicle}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{inspection.inspectionDate}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{inspection.mileage.toLocaleString()}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{inspection.employeeName || '—'}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{inspection.deficiencies || 'None reported'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-bold text-slate-900">Maintenance Records</div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2 font-bold">Vehicle</th>
                    <th className="px-3 py-2 font-bold">Date</th>
                    <th className="px-3 py-2 font-bold">Service</th>
                    <th className="px-3 py-2 font-bold">Mileage</th>
                    <th className="px-3 py-2 font-bold">Performed By</th>
                    <th className="px-3 py-2 font-bold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFleetServiceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                        No maintenance records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredFleetServiceRecords.map((record) => (
                      <tr key={record.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-bold text-slate-900">{getFleetVehicleLabelById(record.vehicleId)}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{record.completedDate}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{record.serviceName}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{record.completedMileage !== null ? record.completedMileage.toLocaleString() : '—'}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{record.performedBy || '—'}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{record.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}

    {selectedFleetVehicle && (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
        <div className="mt-6 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xl font-bold text-slate-900">{selectedFleetVehicle.vehicleName}</div>
              <div className="mt-1 text-sm text-slate-500">
                Unit {selectedFleetVehicle.unitNumber || '—'} • {getFleetVehicleStatusLabel(selectedFleetVehicle.status)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFleetVehicle(null)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          {isEditingFleetVehicle && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="mb-3 text-sm font-bold text-blue-900">
                Edit Vehicle
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedFleetVehicle.vehicleName}
                  onChange={(event) =>
                    setSelectedFleetVehicle({
                      ...selectedFleetVehicle,
                      vehicleName: event.target.value,
                    })
                  }
                  placeholder="Vehicle Name"
                />

                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedFleetVehicle.unitNumber}
                  onChange={(event) =>
                    setSelectedFleetVehicle({
                      ...selectedFleetVehicle,
                      unitNumber: event.target.value,
                    })
                  }
                  placeholder="Unit Number"
                />

                <input
                  type="number"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedFleetVehicle.year ?? ''}
                  onChange={(event) =>
                    setSelectedFleetVehicle({
                      ...selectedFleetVehicle,
                      year: Number(event.target.value) || null,
                    })
                  }
                  placeholder="Year"
                />

                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedFleetVehicle.make}
                  onChange={(event) =>
                    setSelectedFleetVehicle({
                      ...selectedFleetVehicle,
                      make: event.target.value,
                    })
                  }
                  placeholder="Make"
                />

                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedFleetVehicle.model}
                  onChange={(event) =>
                    setSelectedFleetVehicle({
                      ...selectedFleetVehicle,
                      model: event.target.value,
                    })
                  }
                  placeholder="Model"
                />

                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedFleetVehicle.vin}
                  onChange={(event) =>
                    setSelectedFleetVehicle({
                      ...selectedFleetVehicle,
                      vin: event.target.value,
                    })
                  }
                  placeholder="VIN"
                />

                <input
                  type="number"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedFleetVehicle.currentMileage}
                  onChange={(event) =>
                    setSelectedFleetVehicle({
                      ...selectedFleetVehicle,
                      currentMileage: Number(event.target.value) || 0,
                    })
                  }
                  placeholder="Mileage"
                />

                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedFleetVehicle.status}
                  onChange={(event) =>
                    setSelectedFleetVehicle({
                      ...selectedFleetVehicle,
                      status: event.target.value as FleetVehicle['status'],
                    })
                  }
                >
                  <option value="IN_SERVICE">In Service</option>
                  <option value="OUT_OF_SERVICE">Out of Service</option>
                  <option value="MAINTENANCE_SCHEDULED">Maintenance Scheduled</option>
                  <option value="RESERVE">Reserve Unit</option>
                </select>
              </div>

              <textarea
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={selectedFleetVehicle.statusReason}
                onChange={(event) =>
                  setSelectedFleetVehicle({
                    ...selectedFleetVehicle,
                    statusReason: event.target.value,
                  })
                }
                placeholder="Status reason"
              />

              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleUpdateFleetVehicle}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => setShowVehicleInformation((value) => !value)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="text-sm font-bold text-slate-900">
                  {showVehicleInformation ? '▼ Hide Vehicle Information' : '▶ Show Vehicle Information'}
                </div>
              </button>

              {showVehicleInformation && (
              <>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Unit Number</span>
                  <span className="font-semibold text-slate-900">{selectedFleetVehicle.unitNumber || '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Year / Make / Model</span>
                  <span className="font-semibold text-slate-900">
                    {[selectedFleetVehicle.year, selectedFleetVehicle.make, selectedFleetVehicle.model].filter(Boolean).join(' ') || '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">VIN</span>
                  <span className="font-semibold text-slate-900">{selectedFleetVehicle.vin || '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Mileage</span>
                  <span className="font-semibold text-slate-900">{selectedFleetVehicle.currentMileage.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingFleetVehicle((value) => !value)}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  {isEditingFleetVehicle ? 'Cancel Edit' : 'Edit Vehicle'}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleDeleteFleetVehicle(selectedFleetVehicle);
                    setSelectedFleetVehicle(null);
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                >
                  Delete Vehicle
                </button>
              </div>
              </>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-bold text-slate-900">Readiness</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getFleetVehicleStatusClass(selectedFleetVehicle.status)}`}>
                  {getFleetVehicleStatusLabel(selectedFleetVehicle.status)}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  No services due
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="text-xs font-semibold text-slate-600">
                  Vehicle Status
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={selectedFleetVehicle.status}
                    onChange={(event) =>
                      setSelectedFleetVehicle({
                        ...selectedFleetVehicle,
                        status: event.target.value as FleetVehicle['status'],
                      })
                    }
                  >
                    <option value="IN_SERVICE">In Service</option>
                    <option value="OUT_OF_SERVICE">Out of Service</option>
                    <option value="RESERVE">Reserve Unit</option>
                    <option value="CUSTOM">Custom Status</option>
                  </select>
                </label>

                {(selectedFleetVehicle.status === 'OUT_OF_SERVICE' || selectedFleetVehicle.status === 'CUSTOM' || selectedFleetVehicle.statusReason) && (
                  <label className="text-xs font-semibold text-slate-600">
                    Status Reason
                    <textarea
                      className="mt-1 min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={selectedFleetVehicle.statusReason}
                      onChange={(event) =>
                        setSelectedFleetVehicle({
                          ...selectedFleetVehicle,
                          statusReason: event.target.value,
                        })
                      }
                      placeholder="Required for Out of Service or Custom status."
                    />
                  </label>
                )}

                <button
                  type="button"
                  onClick={handleUpdateFleetVehicleReadiness}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                >
                  Save Readiness Status
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <button
              type="button"
              onClick={() => setShowInspectionHistory((value) => !value)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="text-sm font-bold text-slate-900">
                {showInspectionHistory ? '▼ Hide Daily Vehicle Inspection History' : '▶ Show Daily Vehicle Inspection History'}
              </div>
            </button>

            {showInspectionHistory && (
            <>
            <div className="mt-1 text-xs text-slate-500">
              Newest inspection submissions are listed first.
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2 font-bold">Date</th>
                    <th className="px-3 py-2 font-bold">Mileage</th>
                    <th className="px-3 py-2 font-bold">Noted Issues</th>
                    <th className="px-3 py-2 font-bold">Submitting Employee</th>
                    <th className="px-3 py-2 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getFleetInspectionsForVehicle(selectedFleetVehicle).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                        No daily vehicle inspections have been submitted for this vehicle yet.
                      </td>
                    </tr>
                  ) : (
                    getFleetInspectionsForVehicle(selectedFleetVehicle).map((inspection) => (
                      <tr key={inspection.id} className="border-b border-slate-100">
                        <td className="border-y-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{inspection.inspectionDate}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{inspection.mileage.toLocaleString()}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{inspection.deficiencies || 'None reported'}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{inspection.employeeName || '—'}</td>
                        <td className="border-y-2 border-slate-700 px-3 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowMaintenanceRecords(true);
                              setShowAddFleetServiceRecord(true);
                              setNewFleetServiceRecordDate(inspection.inspectionDate);
                              setNewFleetServiceRecordMileage(String(inspection.mileage));
                              setNewFleetServiceRecordNotes(inspection.deficiencies || '');

                              setTimeout(() => {
                                document
                                  .querySelector('[data-fleet-service-form]')
                                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 100);
                            }}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                          >
                            Add Service
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <button
              type="button"
              onClick={() => setShowMaintenanceRecords((value) => !value)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="text-sm font-bold text-slate-900">
                {showMaintenanceRecords ? '▼ Hide Maintenance Records' : '▶ Show Maintenance Records'}
              </div>
            </button>

            {showMaintenanceRecords && (
            <>
            <div className="mt-1 text-xs text-slate-500">
              Log completed services for this vehicle.
            </div>

            <button
                type="button"
                onClick={() => setShowAddFleetServiceRecord((value) => !value)}
                className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
              >
                {showAddFleetServiceRecord ? 'Cancel' : 'Add Service Record'}
              </button>

            {showAddFleetServiceRecord && (
              <div
                data-fleet-service-form
                className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Service Template
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={newFleetServiceRecordTemplateId}
                      onChange={(event) => {
                        const templateId = event.target.value;
                        const template = fleetServiceTemplates.find((item) => item.id === templateId);
                        setNewFleetServiceRecordTemplateId(templateId);
                        setNewFleetServiceRecordName(template?.serviceName ?? '');
                      }}
                    >
                      <option value="">Custom Service</option>
                      {fleetServiceTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.serviceName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Service Name
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={newFleetServiceRecordName}
                      onChange={(event) => setNewFleetServiceRecordName(event.target.value)}
                      placeholder="Oil Change"
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Completed Date
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={newFleetServiceRecordDate}
                      onChange={(event) => setNewFleetServiceRecordDate(event.target.value)}
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600">
                    Completed Mileage
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={newFleetServiceRecordMileage}
                      onChange={(event) => setNewFleetServiceRecordMileage(event.target.value)}
                      placeholder={String(selectedFleetVehicle.currentMileage)}
                    />
                  </label>

                  <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                    Performed By
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={newFleetServiceRecordPerformedBy}
                      onChange={(event) => setNewFleetServiceRecordPerformedBy(event.target.value)}
                      placeholder="Vendor, mechanic, or supervisor"
                    />
                  </label>
                </div>

                <label className="mt-3 block text-xs font-semibold text-slate-600">
                  Notes
                  <textarea
                    className="mt-1 min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={newFleetServiceRecordNotes}
                    onChange={(event) => setNewFleetServiceRecordNotes(event.target.value)}
                    placeholder="Describe completed work, findings, parts replaced, or follow-up needed."
                  />
                </label>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleCreateFleetServiceRecord}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                  >
                    Save Service Record
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {fleetServiceRecords.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  No service records have been added for this vehicle.
                </div>
              ) : (
                fleetServiceRecords.map((record) => (
                  <div key={record.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{record.serviceName}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Completed {record.completedDate}
                          {record.completedMileage !== null ? ` at ${record.completedMileage.toLocaleString()} miles` : ''}
                          {record.performedBy ? ` • ${record.performedBy}` : ''}
                        </div>
                      </div>
                    </div>

                    {record.notes && (
                      <div className="mt-2 text-xs text-slate-600">{record.notes}</div>
                    )}
                  </div>
                ))
              )}
            </div>
            </>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-bold text-slate-900">Vehicle Actions</div>
            <div className="mt-3 text-xs text-slate-500">
              Fleet reporting and export actions will appear here.
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

export default memo(FleetServicesTile);
