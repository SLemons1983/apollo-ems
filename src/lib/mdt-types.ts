export type MdtStatus =
  | "Dispatched" | "En Route" | "Holding Back" | "At Scene"
  | "Depart Scene" | "At Destination" | "Pending Paperwork"
  | "Unit Available" | "En Route Post" | "In Area" | "At Post"
  | "Out of Service";

export type MdtCrewMember = { employeeId: string; displayName: string };
export type RideAlongType = "None" | "Paramedic Intern" | "EMT Student" | "Other Ride Along";

export type MdtUnitSession = {
  id: string;
  physicalVehicle: string;
  radioIdentifier: string;
  station: string;
  level: "SUP" | "ALS" | "BLS";
  crewMembers: MdtCrewMember[];
  rideAlongType: RideAlongType;
  rideAlongName?: string;
  status: MdtStatus;
  outOfServiceReason?: string;
  activeCallNumber?: string;
  emergencyActive: boolean;
  latitude?: number;
  longitude?: number;
  loggedOnAt: string;
  updatedAt: string;
};

export type IncomingCadCall = {
  eventType: string;
  radioIdentifier: string;
  callNumber: string;
  emsNumber: string;
  priority: string;
  zone?: string;
  nature: string;
  facility?: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  suite?: string;
  holdBackRequired: boolean;
  dispatchComments?: string;
  premiseNotes?: string;
  cautionNotes?: string;
  status: string;
  cadTimestamp: string;
};
