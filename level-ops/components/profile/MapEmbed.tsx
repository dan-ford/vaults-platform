export function MapEmbed({
  lat,
  lng,
  placeId,
}: {
  lat?: number;
  lng?: number;
  placeId?: string;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const src = placeId
    ? `https://www.google.com/maps/embed/v1/place?q=place_id:${encodeURIComponent(placeId)}&key=${key}`
    : lat && lng
      ? `https://www.google.com/maps/embed/v1/view?center=${lat},${lng}&zoom=14&key=${key}`
      : '';

  if (!src) return null;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border">
      <iframe
        title="Map"
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={src}
      />
    </div>
  );
}
