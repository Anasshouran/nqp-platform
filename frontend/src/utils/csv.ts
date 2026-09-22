export const exportToCsv = (
  filename: string,
  headers: string[],
  rows: unknown[][]
) => {
  const escape = (value: unknown) => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${lines}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
