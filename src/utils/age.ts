export function ageFromBirthday(birthday: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthday.getFullYear();
  const beforeBirthday =
    now.getMonth() < birthday.getMonth() ||
    (now.getMonth() === birthday.getMonth() && now.getDate() < birthday.getDate());
  if (beforeBirthday) age--;
  return age;
}

export const BIRTHDAY = new Date('2008-09-03');
