// Product-wide age display rule (Handoff §4 / annotation on O-Children list):
//   < 1 month        → "Xd old"        (e.g. 12d old)
//   1–23 months      → "Xmo old"       (e.g. 12mo old)
//   ≥ 2 years        → "Xy Ymo old"    (e.g. 2y 4mo old; omit Ymo when Y = 0)
// Calendar difference between birth date and today, in the device's local time.

export function formatAge(birthDateIso: string, now: Date = new Date()): string {
  const birth = new Date(birthDateIso);

  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  months = Math.max(0, months);

  if (months < 1) {
    const days = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86_400_000));
    return `${days}d old`;
  }
  if (months < 24) return `${months}mo old`;

  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years}y old` : `${years}y ${rem}mo old`;
}
