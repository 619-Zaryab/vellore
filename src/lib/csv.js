export function toCSV(rows, columns) {
    if (!rows.length)
        return '';
    const cols = columns ?? Object.keys(rows[0]);
    const esc = (v) => {
        let s = v == null ? '' : String(v);
        if (/^[=+\-@]/.test(s))
            s = `'${s}`; // neutralise spreadsheet formula injection
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}
export function downloadCSV(filename, rows, columns) {
    const blob = new Blob(['\ufeff' + toCSV(rows, columns)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}
export function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (q) {
            if (ch === '"' && text[i + 1] === '"') {
                cell += '"';
                i++;
            }
            else if (ch === '"')
                q = false;
            else
                cell += ch;
        }
        else if (ch === '"')
            q = true;
        else if (ch === ',') {
            row.push(cell);
            cell = '';
        }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n')
                i++;
            row.push(cell);
            cell = '';
            if (row.some((c) => c.trim() !== ''))
                rows.push(row);
            row = [];
        }
        else
            cell += ch;
    }
    row.push(cell);
    if (row.some((c) => c.trim() !== ''))
        rows.push(row);
    if (rows.length < 2)
        return [];
    const head = rows[0].map((h) => h.replace(/^\ufeff/, '').trim());
    return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}
