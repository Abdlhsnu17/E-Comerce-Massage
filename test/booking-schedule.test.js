const test = require("node:test");
const assert = require("node:assert/strict");

const { intervalsOverlap, availableTimes, availableTimesForTherapists, assignAvailableTherapist, normalizeSettings } = require("../server/services/bookingSchedule");

test("detects overlap using service duration and buffer", () => {
  assert.equal(intervalsOverlap("09:30", 30, "09:00", 60, 15), true);
  assert.equal(intervalsOverlap("10:00", 30, "09:00", 60, 15), true);
  assert.equal(intervalsOverlap("10:15", 30, "09:00", 60, 15), false);
});

test("builds slots within operating hours and removes overlapping sessions", () => {
  const settings = normalizeSettings({
    openTime: "09:00",
    closeTime: "12:00",
    slotIntervalMinutes: 30,
    bufferMinutes: 15,
    advanceDays: 30,
    operatingDays: [2]
  });
  const slots = availableTimes({
    date: "2026-10-20",
    durationMinutes: 60,
    settings,
    bookings: [{ time: "10:00", durationMinutes: 60 }],
    now: new Date(2026, 9, 19, 8, 0)
  });
  assert.deepEqual(slots, []);
});

test("does not offer slots on non-operating days", () => {
  const slots = availableTimes({
    date: "2026-10-25",
    durationMinutes: 30,
    settings: { openTime: "09:00", closeTime: "12:00", slotIntervalMinutes: 30, bufferMinutes: 0, advanceDays: 30, operatingDays: [1, 2, 3, 4, 5, 6] },
    now: new Date(2026, 9, 20, 8, 0)
  });
  assert.deepEqual(slots, []);
});

test("assigns another therapist when the first therapist has an overlap", () => {
  const settings = normalizeSettings({ openTime: "09:00", closeTime: "12:00", slotIntervalMinutes: 30, bufferMinutes: 0, advanceDays: 30, operatingDays: [2] });
  const therapists = [{ id: 1 }, { id: 2 }];
  const bookings = [{ therapistId: 1, time: "09:00", durationMinutes: 60 }];
  assert.deepEqual(availableTimesForTherapists({ date: "2026-10-20", durationMinutes: 60, settings, therapists, bookings, now: new Date(2026, 9, 19) }), ["09:00", "09:30", "10:00", "10:30", "11:00"]);
  assert.equal(assignAvailableTherapist({ time: "09:00", durationMinutes: 60, settings, therapists, bookings }).id, 2);
});
