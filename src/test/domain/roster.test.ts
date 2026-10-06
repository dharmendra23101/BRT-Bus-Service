/**
 * The roster and the assignments that authorise publishing.
 *
 * No vehicle in this file is claimed to exist. The operator has not supplied
 * a fleet list, so every id here is a fixture chosen to look like nothing in
 * particular - the point is the rules, not the contents.
 */

import { describe, expect, it } from "vitest";
import {
  assignedVehicle,
  assignmentFault,
  activeAssignments,
  conflictingAssignment,
  isAssignmentActive,
  isVehicleId,
  MAX_ASSIGNMENT_MS,
  unassignedVehicles,
  type Vehicle,
  type VehicleAssignment,
} from "@/domain/fleet/roster";

const NOON = Date.UTC(2026, 8, 1, 12, 0, 0);
const HOUR = 60 * 60 * 1000;

const assignment = (over: Partial<VehicleAssignment> = {}): VehicleAssignment => ({
  driverUid: "driver-1",
  vehicleId: "fixture-a",
  validFrom: NOON,
  validTo: NOON + 8 * HOUR,
  ...over,
});

describe("what counts as a vehicle id", () => {
  /*
    Permissive about form, strict about shape. We do not know what the
    operator calls their buses, so whatever they already use should work.
  */
  it.each(["7", "BRT-07", "depot_2 bus 4", "A1"])("accepts %s", (id) => {
    expect(isVehicleId(id)).toBe(true);
  });

  /*
    Realtime Database keys may not contain these. A key that does is rejected
    at write time with an error nobody downstream can interpret, so it is
    refused here where the message can say why.
  */
  it.each(["a.b", "a$b", "a#b", "a[b]", "a/b"])("refuses %s", (id) => {
    expect(isVehicleId(id)).toBe(false);
  });

  it("refuses an empty id", () => {
    expect(isVehicleId("")).toBe(false);
  });

  it("refuses one too long to be a key", () => {
    expect(isVehicleId("v".repeat(33))).toBe(false);
  });

  it("refuses something that is not a string at all", () => {
    expect(isVehicleId(7)).toBe(false);
    expect(isVehicleId(null)).toBe(false);
  });
});

describe("whether an assignment may be issued", () => {
  it("accepts an ordinary shift", () => {
    expect(assignmentFault(assignment())).toBeNull();
  });

  it("refuses one with no driver", () => {
    expect(assignmentFault(assignment({ driverUid: "" }))).toBe("NO_DRIVER");
  });

  it("refuses one with no usable vehicle", () => {
    expect(assignmentFault(assignment({ vehicleId: "a/b" }))).toBe("NO_VEHICLE");
  });

  it("refuses a window that ends before it starts", () => {
    expect(
      assignmentFault(assignment({ validTo: NOON - HOUR }))
    ).toBe("WINDOW_INVERTED");
  });

  it("refuses a window of no length at all", () => {
    expect(assignmentFault(assignment({ validTo: NOON }))).toBe(
      "WINDOW_INVERTED"
    );
  });

  /*
    The property that makes this worth having. A grant issued for a year is
    not a self-expiring grant, and every hour past a working day is time a
    lost device keeps publishing after anybody would have noticed.
  */
  it("refuses a window longer than a day", () => {
    expect(
      assignmentFault(assignment({ validTo: NOON + MAX_ASSIGNMENT_MS + 1 }))
    ).toBe("WINDOW_TOO_LONG");
  });

  it("accepts a window of exactly a day", () => {
    expect(
      assignmentFault(assignment({ validTo: NOON + MAX_ASSIGNMENT_MS }))
    ).toBeNull();
  });
});

describe("when an assignment authorises anything", () => {
  it("does not before it starts", () => {
    expect(isAssignmentActive(assignment(), NOON - 1)).toBe(false);
  });

  it("does at the instant it starts", () => {
    expect(isAssignmentActive(assignment(), NOON)).toBe(true);
  });

  it("does during the shift", () => {
    expect(isAssignmentActive(assignment(), NOON + 4 * HOUR)).toBe(true);
  });

  /*
    Half-open. Two consecutive shifts that meet exactly must not both be live
    for the millisecond they share, or the handover briefly authorises two
    drivers as one bus.
  */
  it("does not at the instant it ends", () => {
    expect(isAssignmentActive(assignment(), NOON + 8 * HOUR)).toBe(false);
  });

  it("expires on its own with nobody revoking it", () => {
    expect(isAssignmentActive(assignment(), NOON + 9 * HOUR)).toBe(false);
  });

  /* An invalid assignment authorises nothing, whatever its window says. */
  it("never authorises when the assignment itself is invalid", () => {
    const forever = assignment({ validTo: NOON + 10 * MAX_ASSIGNMENT_MS });

    expect(isAssignmentActive(forever, NOON + HOUR)).toBe(false);
  });
});

describe("the vehicle a driver may publish as", () => {
  it("is the assigned one during the shift", () => {
    expect(assignedVehicle(assignment(), NOON + HOUR)).toBe("fixture-a");
  });

  it("is nothing once the shift has ended", () => {
    expect(assignedVehicle(assignment(), NOON + 9 * HOUR)).toBeNull();
  });

  /*
    The state the app is in today and will be in until the operator supplies a
    roster: a driver with no assignment at all. It has to answer cleanly
    rather than throw, because it is the ordinary case, not an error.
  */
  it("is nothing when there is no assignment", () => {
    expect(assignedVehicle(null, NOON)).toBeNull();
    expect(assignedVehicle(undefined, NOON)).toBeNull();
  });
});

describe("two drivers in one bus", () => {
  /*
    The check a database rule cannot make. Assignments are keyed by driver, so
    the engine sees one sibling at a time and can never answer "is anybody
    else already in this vehicle?".

    It would not error anywhere either. It renders as one bus jumping between
    two positions, and reads as a broken map rather than a rostering mistake.
  */
  it("is refused when the windows overlap", () => {
    const existing = [assignment()];
    const candidate = assignment({
      driverUid: "driver-2",
      validFrom: NOON + 4 * HOUR,
      validTo: NOON + 12 * HOUR,
    });

    expect(conflictingAssignment(existing, candidate)?.driverUid).toBe(
      "driver-1"
    );
  });

  it("is allowed when one shift ends as the other begins", () => {
    const existing = [assignment()];
    const candidate = assignment({
      driverUid: "driver-2",
      validFrom: NOON + 8 * HOUR,
      validTo: NOON + 16 * HOUR,
    });

    expect(conflictingAssignment(existing, candidate)).toBeNull();
  });

  it("is allowed for a different vehicle at the same time", () => {
    const existing = [assignment()];
    const candidate = assignment({
      driverUid: "driver-2",
      vehicleId: "fixture-b",
    });

    expect(conflictingAssignment(existing, candidate)).toBeNull();
  });

  /* Re-issuing a driver's own assignment is a correction, not a conflict. */
  it("does not count a driver against themselves", () => {
    const existing = [assignment()];
    const candidate = assignment({ validTo: NOON + 10 * HOUR });

    expect(conflictingAssignment(existing, candidate)).toBeNull();
  });

  it("finds nothing in an empty roster", () => {
    expect(conflictingAssignment([], assignment())).toBeNull();
  });
});

describe("who is on shift", () => {
  const roster: VehicleAssignment[] = [
    assignment(),
    assignment({ driverUid: "driver-2", vehicleId: "fixture-b" }),
    assignment({
      driverUid: "driver-3",
      vehicleId: "fixture-c",
      validFrom: NOON + 12 * HOUR,
      validTo: NOON + 20 * HOUR,
    }),
  ];

  it("counts only the shifts that have started and not ended", () => {
    expect(activeAssignments(roster, NOON + HOUR).map((a) => a.vehicleId)).toEqual(
      ["fixture-a", "fixture-b"]
    );
  });

  it("is empty outside every shift", () => {
    expect(activeAssignments(roster, NOON - HOUR)).toEqual([]);
  });
});

describe("vehicles with nobody in them", () => {
  const fleet: Vehicle[] = [
    { vehicleId: "fixture-a" },
    { vehicleId: "fixture-b" },
    { vehicleId: "fixture-c" },
  ];

  it("names the ones no active assignment covers", () => {
    const covered = [assignment()];

    expect(
      unassignedVehicles(fleet, covered, NOON + HOUR).map((v) => v.vehicleId)
    ).toEqual(["fixture-b", "fixture-c"]);
  });

  it("counts a vehicle whose shift has ended as unmanned again", () => {
    const covered = [assignment()];

    expect(unassignedVehicles(fleet, covered, NOON + 9 * HOUR)).toHaveLength(3);
  });

  /*
    The state this ships in. An empty roster yields an empty answer, which is
    honest - not a fleet of zero unmanned buses, and not an error.
  */
  it("answers nothing when there is no roster", () => {
    expect(unassignedVehicles([], [], NOON)).toEqual([]);
  });
});
