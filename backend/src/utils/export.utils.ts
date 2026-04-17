import * as XLSX from 'xlsx';

export type ExportRow = Record<string, string | number | boolean | Date | null | undefined>;

/**
 * Genera un buffer Excel (.xlsx) a partir de un array de objetos
 */
export function generateExcel(data: ExportRow[], sheetName = 'Datos'): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Ajustar ancho de columnas automáticamente
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] ?? '').length)) + 2,
  }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Genera un string CSV con BOM para compatibilidad con Excel
 */
export function generateCsv(data: ExportRow[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);

  const escapeCell = (val: ExportRow[string]): string => {
    if (val === null || val === undefined) return '';
    const str = val instanceof Date ? val.toLocaleString('es-ES') : String(val);
    // Escapar comillas dobles y envolver en comillas si contiene comas o saltos de línea
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map(row => headers.map(h => escapeCell(row[h])).join(','));
  return [headers.join(','), ...rows].join('\n');
}
