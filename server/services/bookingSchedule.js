const DEFAULT_SETTINGS = Object.freeze({
  openTime: "09:00",
  closeTime: "17:00",
  slotIntervalMinutes: 30,
  bufferMinutes: 15,
  advanceDays: 30,
  operatingDays: [1, 2, 3, 4, 5, 6]
});

function timeToMinutes(value) {
  const match = /^(\d{2}):(\d{2})/.exec(String(value || ""));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

function minutesToTime(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function intervalsOverlap(startA, durationA, startB, durationB, bufferMinutes = 0) {
  const a = timeToMinutes(startA);
  const b = timeToMinutes(startB);
  if (a === null || b === null) return false;
  return a < b + Number(durationB) + bufferMinutes && a + Number(durationA) + bufferMinutes > b;
}

function parseOperatingDays(value) {
  const days = String(value || "").split(",").map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
  return days.length ? [...new Set(days)] : DEFAULT_SETTINGS.operatingDays;
}

function normalizeSettings(row = {}) {
  return {
    openTime: String(row.openTime || DEFAULT_SETTINGS.openTime).slice(0, 5),
    closeTime: String(row.closeTime || DEFAULT_SETTINGS.closeTime).slice(0, 5),
    slotIntervalMinutes: Number(row.slotIntervalMinutes) || DEFAULT_SETTINGS.slotIntervalMinutes,
    bufferMinutes: Number(row.bufferMinutes) >= 0 ? Number(row.bufferMinutes) : DEFAULT_SETTINGS.bufferMinutes,
    advanceDays: Number(row.advanceDays) || DEFAULT_SETTINGS.advanceDays,
    operatingDays: Array.isArray(row.operatingDays) ? row.operatingDays : parseOperatingDays(row.operatingDays)
  };
}

async function getBookingSettings(connection) {
  const [rows] = await connection.query(
    `SELECT TIME_FORMAT(open_time, '%H:%i') AS openTime, TIME_FORMAT(close_time, '%H:%i') AS closeTime,
            slot_interval_minutes AS slotIntervalMinutes, buffer_minutes AS bufferMinutes,
            advance_days AS advanceDays, operating_days AS operatingDays
       FROM booking_settings WHERE id = 1`
  );
  return normalizeSettings(rows[0]);
}

function availableTimes({ date, durationMinutes, settings, bookings = [], now = new Date() }) {
  const normalized = normalizeSettings(settings);
  const [year, month, day] = String(date).split("-").map(Number);
  const requestedDay = new Date(year, month - 1, day);
  if (requestedDay.getFullYear() !== year || requestedDay.getMonth() !== month - 1 || requestedDay.getDate() !== day) return [];
  if (!normalized.operatingDays.includes(requestedDay.getDay())) return [];
  const lastDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + normalized.advanceDays, 23, 59, 59);
  if (requestedDay > lastDate) return [];
  const open = timeToMinutes(normalized.openTime);
  const close = timeToMinutes(normalized.closeTime);
  const duration = Math.max(1, Number(durationMinutes) || 60);
  const slots = [];
  for (let minute = open; minute + duration <= close; minute += normalized.slotIntervalMinutes) {
    const time = minutesToTime(minute);
    const startsAt = new Date(year, month - 1, day, Math.floor(minute / 60), minute % 60);
    if (startsAt <= now) continue;
    const occupied = bookings.some(booking => intervalsOverlap(time, duration, booking.time, Number(booking.durationMinutes) || 60, normalized.bufferMinutes));
    if (!occupied) slots.push(time);
  }
  return slots;
}

function therapistHasAvailability(therapistId, time, durationMinutes, bookings, bufferMinutes) {
  return !bookings.filter(booking => Number(booking.therapistId) === Number(therapistId))
    .some(booking => intervalsOverlap(time, durationMinutes, booking.time, Number(booking.durationMinutes) || 60, bufferMinutes));
}

function availableTimesForTherapists({ date, durationMinutes, settings, bookings = [], therapists = [], now = new Date() }) {
  const normalized = normalizeSettings(settings);
  if (!therapists.length) return [];
  return availableTimes({ date, durationMinutes, settings: normalized, bookings: [], now }).filter(time =>
    therapists.some(therapist => therapistHasAvailability(therapist.id, time, durationMinutes, bookings, normalized.bufferMinutes))
  );
}

function assignAvailableTherapist({ time, durationMinutes, settings, bookings = [], therapists = [] }) {
  const normalized = normalizeSettings(settings);
  return therapists.find(therapist => therapistHasAvailability(therapist.id, time, durationMinutes, bookings, normalized.bufferMinutes)) || null;
}

module.exports = { DEFAULT_SETTINGS, timeToMinutes, intervalsOverlap, normalizeSettings, getBookingSettings, availableTimes, therapistHasAvailability, availableTimesForTherapists, assignAvailableTherapist };
