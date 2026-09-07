/**
 * One label/value line inside a `<dl>` detail card.
 *
 * Used by the batch record, the public verify page, the checkout receipt and
 * the stage receipts, so they stay visually identical.
 */
export default function DetailRow({
  label,
  value,
  /** Drop the row entirely when there is no value, rather than showing a dash. */
  hideWhenEmpty = false,
}: {
  label: string;
  value?: string | number | null;
  hideWhenEmpty?: boolean;
}) {
  const empty = value === undefined || value === null || value === "";
  if (empty && hideWhenEmpty) return null;

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium text-brand-dark">
        {empty ? "—" : value}
      </dd>
    </div>
  );
}
