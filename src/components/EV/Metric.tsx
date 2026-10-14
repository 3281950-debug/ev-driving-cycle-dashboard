export function Metric({ label, value, unit = '', accent = false, priority = false }: { label: string; value: string; unit?: string; accent?: boolean; priority?: boolean }) {
  return <div className={`ev-metric ${accent ? 'accent' : ''} ${priority ? 'primary-metric' : ''}`}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>;
}
