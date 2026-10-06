/**
 * The vehicle roster, and who is authorised to drive what, for how long.
 *
 * THE ROSTER IS EMPTY, AND THAT IS CORRECT. No vehicle exists in this
 * repository, because no vehicle exists that anyone has told us about: the
 * operator has not supplied a fleet list, and a plausible-looking one would be
 * a fabricated claim about real buses. This module is the shape their data
 * will land in and the rules it must satisfy. It ships with no contents.
 *
 * WHY THIS EXISTS AT ALL, given the allowlist already works.
 *
 * Today a driver publishes to `busLocations/{their uid}`. The node is
 * world-readable, and although names and emails were stripped from it long
 * ago, the KEY is still a stable identifier for a person - anyone watching the
 * public map can follow one driver across days. Keying by vehicle removes the
 * last personal identifier from public data. A bus is not a person.
 *
 * It also fixes an authorisation gap the allowlist cannot: being on the
 * allowlist says "this account may publish", never "this account may publish
 * as THIS bus". Without the binding, any allowlisted driver could publish as
 * any vehicle.
 *
 * WHY ASSIGNMENTS ARE KEYED BY DRIVER, NOT BY VEHICLE. One node per driver
 * makes "at most one active assignment per driver" structural instead of
 * checked, and it lets a driver read their own assignment without being able
 * to enumerate the fleet or see who else is on shift. The reverse question -
 * is this vehicle double-booked? - is answered here, when tooling writes an
 * assignment, because a database rule cannot see across siblings.
 */

/**
 * A vehicle the operator runs.
 *
 * `vehicleId` is whatever the operator already calls this bus - a fleet
 * number, a depot code. It is NOT derived from anything of ours, and it is
 * not a registration plate by default: a plate identifies a vehicle to the
 * public and belongs on a public map only if the operator says so.
 */
export interface Vehicle {
  vehicleId: string;
  /** The operator's own label, if they want one shown. */
  label?: string;
}

/**
 * Permission for one driver to publish as one vehicle, for a bounded window.
 *
 * The window is the authorisation. There is no "unassign" step to forget:
 * an assignment nobody renews stops working on its own, which is the property
 * that makes a lost or stolen device a bounded problem rather than an
 * indefinite one.
 */
export interface VehicleAssignment {
  driverUid: string;
  vehicleId: string;
  /** Inclusive start, epoch milliseconds. */
  validFrom: number;
  /** Exclusive end, epoch milliseconds. */
  validTo: number;
}

/**
 * The longest an assignment may run.
 *
 * A shift, not a season. The whole value of a self-expiring grant is lost if
 * it is issued for a year, and every hour beyond a working day is time a
 * compromised device keeps publishing after anyone would have noticed.
 */
export const MAX_ASSIGNMENT_MS = 24 * 60 * 60 * 1000;

export type AssignmentFault =
  | "NO_DRIVER"
  | "NO_VEHICLE"
  | "WINDOW_INVERTED"
  | "WINDOW_TOO_LONG";

/** Why an assignment cannot be issued, in words an operator can act on. */
export const ASSIGNMENT_FAULT_MESSAGES: Record<AssignmentFault, string> = {
  NO_DRIVER: "An assignment needs the driver it is for.",
  NO_VEHICLE: "An assignment needs the vehicle it is for.",
  WINDOW_INVERTED: "An assignment cannot end before it starts.",
  WINDOW_TOO_LONG: "An assignment may not run longer than 24 hours.",
};

/**
 * Whether an id is one this system will accept.
 *
 * Deliberately permissive about FORM and strict about SHAPE: we do not know
 * what the operator calls their buses, so anything they already use should
 * work, but it has to be safe as a database key. Realtime Database keys may
 * not contain `.`, `$`, `#`, `[`, `]`, `/` or control characters, and a key
 * that fails that is rejected at write time with an error nobody can read.
 */
export const isVehicleId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 32 &&
  /^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(value);

/** The reason an assignment is invalid, or null when it is fine. */
export const assignmentFault = (
  assignment: VehicleAssignment
): AssignmentFault | null => {
  if (!assignment.driverUid) return "NO_DRIVER";
  if (!isVehicleId(assignment.vehicleId)) return "NO_VEHICLE";
  if (assignment.validTo <= assignment.validFrom) return "WINDOW_INVERTED";

  if (assignment.validTo - assignment.validFrom > MAX_ASSIGNMENT_MS) {
    return "WINDOW_TOO_LONG";
  }

  return null;
};

/**
 * Whether an assignment authorises anything at this instant.
 *
 * Half-open, `[validFrom, validTo)`: two consecutive shifts that meet exactly
 * must not both be live for the millisecond they share.
 */
export const isAssignmentActive = (
  assignment: VehicleAssignment,
  at: number
): boolean =>
  assignmentFault(assignment) === null &&
  assignment.validFrom <= at &&
  at < assignment.validTo;

/** The vehicle a driver may publish as right now, or null. */
export const assignedVehicle = (
  assignment: VehicleAssignment | null | undefined,
  at: number
): string | null =>
  assignment && isAssignmentActive(assignment, at)
    ? assignment.vehicleId
    : null;

const overlaps = (a: VehicleAssignment, b: VehicleAssignment): boolean =>
  a.validFrom < b.validTo && b.validFrom < a.validTo;

/**
 * An existing assignment that would put two drivers in one bus at once.
 *
 * The check a database rule cannot make. Assignments are keyed by driver, so
 * the engine sees one sibling at a time and can never answer "is anybody else
 * already in this vehicle?" - which makes this the responsibility of whatever
 * writes them.
 *
 * Two drivers publishing as one vehicle would not error anywhere. It would
 * render as a single bus jumping between two positions, and it would be read
 * as a broken map rather than as a rostering mistake.
 */
export const conflictingAssignment = (
  existing: readonly VehicleAssignment[],
  candidate: VehicleAssignment
): VehicleAssignment | null =>
  existing.find(
    (entry) =>
      entry.driverUid !== candidate.driverUid &&
      entry.vehicleId === candidate.vehicleId &&
      overlaps(entry, candidate)
  ) ?? null;

/** Assignments that authorise something at this instant. */
export const activeAssignments = (
  assignments: readonly VehicleAssignment[],
  at: number
): VehicleAssignment[] =>
  assignments.filter((assignment) => isAssignmentActive(assignment, at));

/**
 * Vehicles with nobody assigned to them right now.
 *
 * The operator's question is "which buses are unmanned?", and it is only
 * answerable against a roster. With an empty roster this is empty - which is
 * the honest answer, not a broken one.
 */
export const unassignedVehicles = (
  fleet: readonly Vehicle[],
  assignments: readonly VehicleAssignment[],
  at: number
): Vehicle[] => {
  const taken = new Set(
    activeAssignments(assignments, at).map((entry) => entry.vehicleId)
  );

  return fleet.filter((vehicle) => !taken.has(vehicle.vehicleId));
};
