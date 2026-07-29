import React, { useState } from 'react';
import { SystemSettings, BottleSize, PresetOption } from '../types';
import { Save, CircleDollarSign, FlaskConical, Package, Plus, Trash2, ListFilter, Droplet, CheckCircle2, AlertCircle } from 'lucide-react';

interface SettingsProps {
  settings: SystemSettings;
  onSave: (newSettings: SystemSettings) => Promise<boolean>;
  onResetSystem: () => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave, onResetSystem }) => {
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const handleSave = async () => {
    const success = await onSave(localSettings);
    if (success) {
      setSaved(true);
      setSaveError(false);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError(true);
      setSaved(false);
      setTimeout(() => setSaveError(false), 4000);
    }
  };

  const handleSizeChange = (size: BottleSize, field: 'constant' | 'oilVol', value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      sizes: {
        ...prev.sizes,
        [size]: {
          ...prev.sizes[size],
          [field]: Number(value)
        }
      }
    }));
  };

  const handleAddPreset = (type: 'bottle' | 'oil') => {
    const key = type === 'bottle' ? 'bottlePresets' : 'oilPresets';
    setLocalSettings(prev => ({
      ...prev,
      [key]: [...prev[key], { id: `${type}-${Date.now()}`, label: 'New Option', price: 0 }]
    }));
  };

  const handleUpdatePreset = (type: 'bottle' | 'oil', id: string, field: 'label' | 'price', value: string | number) => {
    const key = type === 'bottle' ? 'bottlePresets' : 'oilPresets';
    setLocalSettings(prev => ({
      ...prev,
      [key]: prev[key].map((p: PresetOption) => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const handleRemovePreset = (type: 'bottle' | 'oil', id: string) => {
    const key = type === 'bottle' ? 'bottlePresets' : 'oilPresets';
    setLocalSettings(prev => ({
      ...prev,
      [key]: prev[key].filter((p: PresetOption) => p.id !== id)
    }));
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pb-8 pr-1 md:pr-2 relative">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sticky top-0 bg-slate-50 dark:bg-slate-950 z-20 py-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Global Configuration</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Fine-tune the mathematical parameters that scale the entire platform</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleSave}
            className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all shadow-md w-full sm:w-auto ${
              saved
              ? 'bg-emerald-500 text-white shadow-emerald-500/20'
              : saveError
              ? 'bg-red-500 text-white shadow-red-500/20'
              : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95 shadow-amber-600/20'
            }`}
          >
            {saved ? <CheckCircle2 className="w-5 h-5" /> : saveError ? <AlertCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            <span>{saved ? 'Saved to Cloud!' : saveError ? 'Save Failed — Retry' : 'Apply Master Settings'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-4 font-semibold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          Settings saved to Supabase successfully!
        </div>
      )}
      {saveError && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-red-600 text-white px-5 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-4 font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          Failed to save. Check your connection or Supabase schema.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Margins Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors flex flex-col">
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500 rounded-lg">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Financial Margins & Packaging</h3>
          </div>

          <div className="space-y-5 flex-1">
            {/* Base Packaging Constant was moved to Global Production Costs */}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Profit Target</label>
                <div className="relative">
                  <input 
                    type="number" step="1"
                    value={localSettings.profitMargin * 100}
                    onChange={e => setLocalSettings({...localSettings, profitMargin: Number(e.target.value) / 100})}
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Reinvestment Fund</label>
                <div className="relative">
                  <input 
                    type="number" step="1"
                    value={localSettings.reinvestmentMargin * 100}
                    onChange={e => setLocalSettings({...localSettings, reinvestmentMargin: Number(e.target.value) / 100})}
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Volume Matrix Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors flex flex-col">
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-500 rounded-lg">
              <FlaskConical className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Volume Matrix Constraints</h3>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar max-h-[300px] pr-2">
            {(['30ml', '50ml', '100ml'] as BottleSize[]).map((size) => (
              <div key={size} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors mb-3">
                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" /> {size} Standard Profile
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Alcohol/Fixative (EGP)</label>
                    <input 
                      type="number" step="0.5"
                      value={localSettings.sizes[size].constant}
                      onChange={e => handleSizeChange(size, 'constant', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Required Oil (ml)</label>
                    <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed">
                      {{ '30ml': 8, '50ml': 15, '100ml': 30 }[size]} ml (Fixed)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Global Production Costs Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors flex flex-col">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-lg">
                    <CircleDollarSign className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Global Production Costs</h3>
            </div>

            <div className="space-y-5 flex-1">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Packaging & Bag (EGP)</label>
                    <input 
                        type="number" step="0.5"
                        value={localSettings.packagingConstant}
                        onChange={e => setLocalSettings({...localSettings, packagingConstant: Number(e.target.value)})}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Sticker & Labels (EGP)</label>
                        <input 
                            type="number" step="0.5"
                            value={localSettings.stickerCost}
                            onChange={e => setLocalSettings({...localSettings, stickerCost: Number(e.target.value)})}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                        />
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Misc/Overhead (EGP)</label>
                        <input 
                            type="number" step="0.5"
                            value={localSettings.miscCost}
                            onChange={e => setLocalSettings({...localSettings, miscCost: Number(e.target.value)})}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Target Cost Percentage</label>
                    <div className="relative">
                        <input 
                            type="number" step="1"
                            value={localSettings.targetCostPercentage * 100}
                            onChange={e => setLocalSettings({...localSettings, targetCostPercentage: Number(e.target.value) / 100})}
                            className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <span className="text-slate-400 font-bold">%</span>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 font-medium italic">Example: 60% means Production Cost is 60% of Suggested Price.</p>
                </div>
            </div>
        </div>

        {/* Wipe Logic Place-in */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 p-6 transition-colors flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Total Cloud Storage Wipe</span>
              <span className="text-xs mt-1 text-slate-500 opacity-90 block">Erases all Supabase order telemetry</span>
            </div>
            <button
              onClick={onResetSystem}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2 transition-colors font-semibold shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Format System</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bottle Presets Manager */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-lg">
                <ListFilter className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Moderator Bottle Presets</h3>
            </div>
            <button 
              onClick={() => handleAddPreset('bottle')}
              className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-2 rounded-lg transition-colors"
              title="Add New Preset"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {localSettings.bottlePresets.map((preset, index) => (
              <div key={preset.id} className="flex space-x-2 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl group border border-slate-100 dark:border-slate-800">
                <div className="flex-shrink-0 w-6 text-center text-xs font-bold text-slate-400">{index + 1}</div>
                <input 
                  type="text" 
                  value={preset.label}
                  onChange={e => handleUpdatePreset('bottle', preset.id, 'label', e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  placeholder="Premium Glass"
                />
                <div className="relative w-28 flex-shrink-0">
                  <input 
                    type="number" 
                    value={preset.price}
                    onChange={e => handleUpdatePreset('bottle', preset.id, 'price', Number(e.target.value))}
                    className="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    placeholder="EGP"
                  />
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <span className="text-xs text-slate-400 font-bold">EGP</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemovePreset('bottle', preset.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex-shrink-0"
                  disabled={localSettings.bottlePresets.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Oil Presets Manager */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-lg">
                <Droplet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Moderator Oil Presets</h3>
            </div>
            <button 
              onClick={() => handleAddPreset('oil')}
              className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-2 rounded-lg transition-colors"
              title="Add New Preset"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {localSettings.oilPresets.map((preset, index) => (
              <div key={preset.id} className="flex space-x-2 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl group border border-slate-100 dark:border-slate-800">
                <div className="flex-shrink-0 w-6 text-center text-xs font-bold text-slate-400">{index + 1}</div>
                <input 
                  type="text" 
                  value={preset.label}
                  onChange={e => handleUpdatePreset('oil', preset.id, 'label', e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  placeholder="High Quality"
                />
                <div className="relative w-28 flex-shrink-0">
                  <input 
                    type="number" 
                    value={preset.price}
                    onChange={e => handleUpdatePreset('oil', preset.id, 'price', Number(e.target.value))}
                    className="w-full pl-3 pr-11 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    placeholder="EGP"
                  />
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 font-bold leading-tight">EGP<br/>/ml</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemovePreset('oil', preset.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex-shrink-0"
                  disabled={localSettings.oilPresets.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
