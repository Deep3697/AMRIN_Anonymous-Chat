export function getDeadlineBorderColor(deadline) {
  if (!deadline) return "transparent";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(deadline); d.setHours(0, 0, 0, 0);
  if (d < today) return "red";
  if (d.getTime() === today.getTime()) return "orange";
  return "green";
}