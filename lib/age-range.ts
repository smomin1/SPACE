// Age 5-17 are specific school ages; 18 represents "Adult (18+)".
// Grade = Age − 5 (Kindergarten = 0, Grade 12 = 17).

export const AGE_MIN_BOUND = 5
export const AGE_MAX_BOUND = 18 // sentinel for Adult
export const ADULT_AGE = 18

export const AGE_OPTIONS: number[] = Array.from({ length: 14 }, (_, i) => i + 5) // [5..18]

export function ageLabel(age: number): string {
  return age >= ADULT_AGE ? 'Adult (18+)' : String(age)
}

export function gradeLabel(age: number): string {
  if (age >= ADULT_AGE) return 'Adult'
  const grade = age - 5
  return grade === 0 ? 'Kindergarten' : `Grade ${grade}`
}

export function ageRangeLabel(ageMin: number, ageMax: number): string {
  if (ageMin === ageMax) return ageLabel(ageMin)
  return `${ageLabel(ageMin)} -${ageLabel(ageMax)}`
}

export function gradeRangeLabel(ageMin: number, ageMax: number): string {
  if (ageMin === ageMax) return gradeLabel(ageMin)
  return `${gradeLabel(ageMin)} -${gradeLabel(ageMax)}`
}

export function hasAgeRangeConflict(
  ranges: { ageMin: number; ageMax: number }[],
): boolean {
  if (ranges.length < 2) return false
  const first = ranges[0]
  return ranges.some(r => r.ageMin !== first.ageMin || r.ageMax !== first.ageMax)
}
