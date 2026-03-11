import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface ColumnDef {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number';
  defaultValue?: string | number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  columns: ColumnDef[];
  onImport: (rows: Record<string, any>[]) => void;
  sampleData: Record<string, any>[];
  templateFileName: string;
}

export default function BulkImportDialog({ open, onClose, title, columns, onImport, sampleData, templateFileName }: Props) {
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = columns.map(c => c.label);
    const sample = sampleData.map(row => columns.map(c => row[c.key] ?? c.defaultValue ?? ''));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    // Set column widths
    ws['!cols'] = columns.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${templateFileName}.xlsx`);
    toast.success('Template downloaded!');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

        if (jsonData.length < 2) {
          setErrors(['File is empty or has no data rows.']);
          return;
        }

        const headerRow = (jsonData[0] as string[]).map(h => String(h).trim().toLowerCase());
        const colMap: Record<string, number> = {};
        columns.forEach(col => {
          const idx = headerRow.findIndex(h =>
            h === col.label.toLowerCase() || h === col.key.toLowerCase()
          );
          if (idx !== -1) colMap[col.key] = idx;
        });

        // Check required columns
        const missingCols = columns.filter(c => c.required && colMap[c.key] === undefined).map(c => c.label);
        if (missingCols.length > 0) {
          setErrors([`Missing required columns: ${missingCols.join(', ')}`]);
          return;
        }

        const rows: Record<string, any>[] = [];
        const rowErrors: string[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0 || row.every(cell => cell === undefined || cell === '')) continue;

          const obj: Record<string, any> = {};
          let rowValid = true;

          columns.forEach(col => {
            const idx = colMap[col.key];
            let val = idx !== undefined ? row[idx] : col.defaultValue;

            if (col.required && (val === undefined || val === null || String(val).trim() === '')) {
              rowErrors.push(`Row ${i + 1}: "${col.label}" is required`);
              rowValid = false;
              return;
            }

            if (col.type === 'number') {
              val = Number(val) || (col.defaultValue ?? 0);
            } else {
              val = String(val ?? col.defaultValue ?? '').trim();
            }
            obj[col.key] = val;
          });

          if (rowValid) rows.push(obj);
        }

        if (rows.length === 0) {
          setErrors(['No valid rows found. Check that required fields are filled.']);
          return;
        }

        setParsedRows(rows);
        setErrors(rowErrors.slice(0, 5));
        setStep('preview');
      } catch {
        setErrors(['Could not parse file. Please use the Excel template.']);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImport = () => {
    onImport(parsedRows);
    toast.success(`${parsedRows.length} records imported successfully!`);
    handleClose();
  };

  const handleClose = () => {
    setParsedRows([]);
    setErrors([]);
    setStep('upload');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-2xl p-6 animate-fade-in max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-foreground text-lg">{title}</h3>
          <Button variant="ghost" size="sm" onClick={handleClose}><X className="w-4 h-4" /></Button>
        </div>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Excel (.xlsx) ya CSV file upload karein</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              <Button onClick={() => fileRef.current?.click()} className="mb-3">
                <Upload className="w-4 h-4 mr-2" /> File Choose Karein
              </Button>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
              <Download className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">Pehle template download karein, usme data bharein, phir upload karein.</span>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="ml-auto shrink-0">
                Template Download
              </Button>
            </div>

            {errors.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm space-y-1">
                <div className="flex items-center gap-1 font-medium"><AlertCircle className="w-4 h-4" /> Errors:</div>
                {errors.map((e, i) => <p key={i}>• {e}</p>)}
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">{parsedRows.length} records ready to import</span>
            </div>

            {errors.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm space-y-1">
                <div className="flex items-center gap-1 font-medium"><AlertCircle className="w-4 h-4" /> Skipped rows:</div>
                {errors.map((e, i) => <p key={i}>• {e}</p>)}
              </div>
            )}

            <div className="overflow-auto flex-1 border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="py-2 px-2 text-left text-muted-foreground">#</th>
                    {columns.map(c => (
                      <th key={c.key} className="py-2 px-2 text-left text-muted-foreground">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/20">
                      <td className="py-1.5 px-2 text-muted-foreground">{i + 1}</td>
                      {columns.map(c => (
                        <td key={c.key} className="py-1.5 px-2 text-foreground">{row[c.key]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-2">...aur {parsedRows.length - 20} rows</p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setStep('upload'); setParsedRows([]); setErrors([]); }}>Back</Button>
              <Button onClick={handleImport}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> {parsedRows.length} Records Import Karein
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
