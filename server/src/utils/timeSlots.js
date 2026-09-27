export function getCurrentSlotStart() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now;
}

export function getPreviousSlotStart() {
  return new Date(getCurrentSlotStart().getTime() - 60 * 60 * 1000);
}