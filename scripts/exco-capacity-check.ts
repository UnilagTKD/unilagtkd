import assert from "node:assert/strict";
import { EXCO_POSITIONS, excoPositionLimit, excoPositionIsFull } from "../src/lib/exco";

assert.equal(excoPositionLimit("vice_president"), 2);
for (const position of EXCO_POSITIONS) {
  assert.equal(excoPositionIsFull(position, 0, null), false, "First appointment is allowed");
  assert.equal(excoPositionIsFull(position, 1, null), position !== "vice_president", "Second appointment is allowed");
  assert.equal(excoPositionIsFull(position, 2, null), true, "Third appointment is refused");
  assert.equal(excoPositionIsFull(position, 3, null), true, "Legacy over-capacity positions cannot grow");
  assert.equal(excoPositionIsFull(position, 2, position), false, "Keeping the same appointment is allowed");
  for (const previous of EXCO_POSITIONS.filter(value => value !== position)) {
    assert.equal(excoPositionIsFull(position, 2, previous), true, "Changing office cannot bypass capacity");
    assert.equal(excoPositionIsFull(position, 1, previous), position !== "vice_president", "Moving into the second place is allowed");
  }
}
console.log("Exco capacity checks passed for every position: first/second appointments, third-person rejection, moves, unchanged appointments, and legacy over-capacity.");
