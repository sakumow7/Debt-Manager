import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, Check, AlertCircle, FileText } from 'lucide-react';
import type { Debt, DebtType } from '../../types';
import { DEBT_TYPE_LABELS, DEBT_COLORS } from '../../types';
import { generateId } from '../../lib/utils';

interface Props {
  onImport: (debts: Debt[]) => void;
  onClose: () => void;
}

type ColumnKey = 'name' | 'balance' | 'interestRate' | 'minimumPayment' | 'type' | 'dueDate' | 'creditor' | 'notes' | 'ignore';

const COLUMN_OPTIONS: { value: ColumnKey; label: string }[] = [
  { value: 'name',           label: 'Debt Name' },
  { value: 'creditor',       label: 'Creditor / Lender' },
  { value: 'balance',        label: 'Current Balance ($)' },
  { value: 'interestRate',   label: 'Interest Rate (APR %)' },
  { value: 'minimumPayment', label: 'Minimum Payment ($)' },
  { value: 'type',           label: 'Debt Type' },
  { value: 'dueDate',        label: 'Due Date (day of month)' },
  { value: 'notes',          label: 'Notes' },
  { value: 'ignore',         label: '— Ignore this column —' },
];

const TYPE_MAP: Record<string, DebtType> = {
  'credit card': 'credit_card', 'credit': 'credit_card', 'cc': 'credit_card',
  'student': 'student_loan', 'student loan': 'student_loan',
  'mortgage': 'mortgage', 'home': 'mortgage',
  'auto': 'auto', 'car': 'auto', 'vehicle': 'auto',
  'personal': 'personal',
  'medical': 'medical', 'hospital': 'medical',
  'other': 'other',
};

function guessColumn(header: string): ColumnKey {
  const h = header.toLowerCase().trim();
  if (/name|debt|account|description/.test(h)) return 'name';
  if (/creditor|lender|bank|institution/.test(h)) return 'creditor';
  if (/balance|amount|outstanding|owed/.test(h)) return 'balance';
  if (/apr|rate|interest/.test(h)) return 'interestRate';
  if (/min|minimum|payment/.test(h)) return 'minimumPayment';
  if (/type|category/.test(h)) return 'type';
  if (/due|day/.test(h)) return 'dueDate';
  if (/note|comment|remark/.test(h)) return 'notes';
  return 'ignore';
}

function parseNumber(val: string): number {
  return parseFloat(val.replace(/[$,%\s]/g, '')) || 0;
}

function parseType(val: string): DebtType {
  return TYPE_MAP[val.toLowerCase().trim()] ?? 'other';
}

export default function CSVImportModal({ onImport, onClose }: Props) {
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnKey[]>([]);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data.length < 2) { setError('File must have a header row and at least one data row.'); return; }
        const [head, ...data] = result.data;
        setHeaders(head);
        setRows(data.slice(0, 5)); // preview first 5
        setMapping(head.map(guessColumn));
      },
      error: () => setError('Could not parse CSV. Make sure it is a valid .csv file.'),
    });
    e.target.value = '';
  }

  function doImport() {
    Papa.parse<string[]>(fileName ? undefined as any : undefined, {});
    // Re-parse full file
    if (!fileRef.current?.files?.[0]) return;
    Papa.parse<string[]>(fileRef.current.files[0], {
      skipEmptyLines: true,
      complete: (result) => {
        const [, ...data] = result.data;
        const nameIdx   = mapping.indexOf('name');
        const balIdx    = mapping.indexOf('balance');
        const aprIdx    = mapping.indexOf('interestRate');
        const minIdx    = mapping.indexOf('minimumPayment');
        const typeIdx   = mapping.indexOf('type');
        const dueIdx    = mapping.indexOf('dueDate');
        const credIdx   = mapping.indexOf('creditor');
        const noteIdx   = mapping.indexOf('notes');

        if (nameIdx === -1 || balIdx === -1) { setError('You must map at least "Debt Name" and "Current Balance".'); return; }

        const now = new Date().toISOString();
        const debts: Debt[] = data
          .filter(row => row[nameIdx]?.trim())
          .map(row => {
            const type = typeIdx >= 0 ? parseType(row[typeIdx]) : 'other';
            const balance = parseNumber(row[balIdx]);
            return {
              id: generateId(),
              name: row[nameIdx].trim(),
              creditor: credIdx >= 0 ? row[credIdx]?.trim() ?? '' : '',
              type,
              balance,
              originalBalance: balance,
              interestRate: aprIdx >= 0 ? parseNumber(row[aprIdx]) : 0,
              minimumPayment: minIdx >= 0 ? parseNumber(row[minIdx]) : 0,
              dueDate: dueIdx >= 0 ? Math.min(31, Math.max(1, parseInt(row[dueIdx]) || 15)) : 15,
              notes: noteIdx >= 0 ? row[noteIdx]?.trim() : undefined,
              color: DEBT_COLORS[type],
              createdAt: now,
              updatedAt: now,
              payments: [],
            };
          });

        onImport(debts);
      },
    });
  }

  const hasRequiredMapping = mapping.includes('name') && mapping.includes('balance');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-emerald-400" />
            <h2 className="text-white font-semibold text-lg">Import Debts from CSV</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* File picker */}
          <label className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-700 hover:border-emerald-500/50 rounded-xl p-8 cursor-pointer transition-colors">
            <Upload size={28} className="text-gray-500" />
            <div className="text-center">
              <p className="text-gray-300 font-medium">{fileName || 'Click to select a CSV file'}</p>
              <p className="text-gray-500 text-sm mt-1">Columns: Name, Balance, APR, Min Payment, Type, Due Date</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </label>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Column mapping */}
          {headers.length > 0 && (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm font-medium">Map your columns</p>
              <div className="space-y-2">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-40 truncate shrink-0">{h}</span>
                    <span className="text-gray-600">→</span>
                    <select
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                      value={mapping[i]}
                      onChange={e => setMapping(m => m.map((v, j) => j === i ? e.target.value as ColumnKey : v))}
                    >
                      {COLUMN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="mt-4">
                <p className="text-gray-400 text-xs mb-2">Preview (first {rows.length} rows)</p>
                <div className="overflow-x-auto rounded-xl border border-gray-800">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800">
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-left text-gray-400 font-medium">
                            {h}
                            {mapping[i] !== 'ignore' && <span className="block text-emerald-500/70">{COLUMN_OPTIONS.find(o => o.value === mapping[i])?.label}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, ri) => (
                        <tr key={ri} className="border-t border-gray-800">
                          {row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-gray-300">{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-6 border-t border-gray-800">
          <p className="text-gray-500 text-xs">Required: Debt Name + Current Balance</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors">Cancel</button>
            <button
              onClick={doImport}
              disabled={!hasRequiredMapping}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Check size={15} /> Import Debts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
