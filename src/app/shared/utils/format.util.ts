// Formatea un monto (que el backend devuelve como string DECIMAL) en bolivianos.
export function formatBs(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return (
    'Bs ' +
    (Number.isFinite(n) ? n : 0).toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
