export function doctorPhoto(photo: string | undefined, index: number): string {
  const trimmed = photo?.trim();
  if (trimmed) return trimmed;
  return `/images/doctor-placeholder-${(index % 4) + 1}.svg`;
}
