import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import Modal from '../components/ui/Modal';
import type { Asset, AssetType, Debt } from '../types';
import { ASSET_TYPE_LABELS, ASSET_COLORS } from '../types';
import { formatCurrency } from '../lib/calculations';
import { generateId } from '../lib/utils';
import type { ToastType } from '../hooks/useToast';

const ASSET_TYPES: AssetType[] = ['checking', 'savings', 'investment', 'property', 'vehicle', 'other'];

const emptyForm = { name: '', type: 'savings' as AssetType, value: '', note: '' };

interface Props {
  assets: Asset[];
  setAssets: (a: Asset[] | ((prev: Asset[]) => Asset[])) => void;
  debts: Debt[];
  addToast: (msg: string, type?: ToastType) => void;
}

export default function NetWorth({ assets, setAssets, debts, addToast }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = debts.reduce((s, d) => s + d.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  const isPositive = netWorth >= 0;

  function openAdd() {
    setForm(emptyForm);
    setEditAsset(null);
    setShowAdd(true);
  }

  function openEdit(asset: Asset) {
    setForm({ name: asset.name, type: asset.type, value: String(asset.value), note: asset.note || '' });
    setEditAsset(asset);
    setShowAdd(true);
  }

  function handleSubmit() {
    const value = parseFloat(form.value);
    if (!form.name || isNaN(value) || value < 0) return;
    const now = new Date().toISOString();
    if (editAsset) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === editAsset.id ? { ...a, name: form.name, type: form.type, value, note: form.note || undefined, updatedAt: now } : a
        )
      );
      addToast(`${form.name} updated`, 'success');
    } else {
      setAssets((prev) => [
        ...prev,
        { id: generateId(), name: form.name, type: form.type, value, note: form.note || undefined, createdAt: now, updatedAt: now },
      ]);
      addToast(`${form.name} added`, 'success');
    }
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    const asset = assets.find((a) => a.id === id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setDeleteConfirm(null);
    if (asset) addToast(`${asset.name} removed`, 'info');
  }

  // Bar chart data: assets vs liabilities
  const barData = [
    { name: 'Assets', value: totalAssets, fill: '#10b981' },
    { name: 'Liabilities', value: totalLiabilities, fill: '#ef4444' },
    { name: 'Net Worth', value: Math.abs(netWorth), fill: isPositive ? '#3b82f6' : '#f59e0b' },
  ];

  // Pie chart: asset breakdown by type
  const assetByType = ASSET_TYPES.map((type) => ({
    name: ASSET_TYPE_LABELS[type],
    value: assets.filter((a) => a.type === type).reduce((s, a) => s + a.value, 0),
    fill: ASSET_COLORS[type],
  })).filter((d) => d.value > 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Net Worth</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track your assets and total financial picture</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors text-sm"
        >
          <Plus size={16} /> Add Asset
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-emerald-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <p className="text-gray-400 text-xs">Total Assets</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalAssets)}</p>
          <p className="text-gray-600 text-xs mt-1">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-red-400" />
            <p className="text-gray-400 text-xs">Total Liabilities</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalLiabilities)}</p>
          <p className="text-gray-600 text-xs mt-1">{debts.length} debt{debts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className={`bg-gray-900 border ${isPositive ? 'border-blue-500/20' : 'border-amber-500/20'} rounded-2xl p-5`}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className={isPositive ? 'text-blue-400' : 'text-amber-400'} />
            <p className="text-gray-400 text-xs">Net Worth</p>
          </div>
          <p className={`text-2xl font-bold ${isPositive ? 'text-blue-400' : 'text-amber-400'}`}>
            {isPositive ? '' : '-'}{formatCurrency(Math.abs(netWorth))}
          </p>
          <p className="text-gray-600 text-xs mt-1">{isPositive ? 'Positive net worth' : 'Focus on debt payoff'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overview Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Financial Overview</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(v: number) => [formatCurrency(v)]}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Allocation */}
        {assetByType.length > 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Asset Allocation</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={assetByType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  isAnimationActive
                >
                  {assetByType.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v: number) => [formatCurrency(v)]}
                />
                <Legend formatter={(v) => <span className="text-gray-400 text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center">
            <Wallet size={32} className="text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">Add assets to see allocation</p>
          </div>
        )}
      </div>

      {/* Assets List */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">My Assets</h2>
          <button onClick={openAdd} className="text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors">
            <Plus size={13} /> Add
          </button>
        </div>

        {assets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No assets added yet.</p>
            <p className="text-gray-600 text-xs mt-1">Add checking accounts, savings, investments, property, and more.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...assets].sort((a, b) => b.value - a.value).map((asset) => (
              <div key={asset.id} className="flex items-center gap-4 py-3 border-b border-gray-800 last:border-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${ASSET_COLORS[asset.type]}20` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: ASSET_COLORS[asset.type] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-sm font-medium truncate">{asset.name}</p>
                  <p className="text-gray-500 text-xs">{ASSET_TYPE_LABELS[asset.type]}{asset.note ? ` · ${asset.note}` : ''}</p>
                </div>
                <p className="text-emerald-400 font-semibold text-sm shrink-0">{formatCurrency(asset.value)}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(asset)} className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeleteConfirm(asset.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Liabilities Section */}
      {debts.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Liabilities (Debts)</h2>
          <div className="space-y-2">
            {[...debts].sort((a, b) => b.balance - a.balance).map((debt) => (
              <div key={debt.id} className="flex items-center gap-4 py-3 border-b border-gray-800 last:border-0">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: debt.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-sm font-medium truncate">{debt.name}</p>
                  <p className="text-gray-500 text-xs">{debt.creditor} · {debt.interestRate}% APR</p>
                </div>
                <p className="text-red-400 font-semibold text-sm shrink-0">-{formatCurrency(debt.balance)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <Modal title={editAsset ? 'Edit Asset' : 'Add Asset'} onClose={() => setShowAdd(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Asset Name *</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="e.g. Chase Checking"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Type *</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as AssetType })}
              >
                {ASSET_TYPES.map((t) => <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Current Value ($) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="0.00"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Note (optional)</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="e.g. Vanguard index fund"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.value || isNaN(parseFloat(form.value))}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {editAsset ? 'Save Changes' : 'Add Asset'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (() => {
        const asset = assets.find((a) => a.id === deleteConfirm);
        if (!asset) return null;
        return (
          <Modal title="Remove Asset" onClose={() => setDeleteConfirm(null)} size="sm">
            <p className="text-gray-400 text-sm mb-5">Remove <strong className="text-white">{asset.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Remove</button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
