import React, { useState, useEffect } from 'react';
import { Calculator, ArrowRight, Save, Receipt, Lock } from 'lucide-react';
import { Order, BottleSize, Role, SystemSettings } from '../types';

interface PricingCalculatorProps {
  onAddOrder?: (order: Order) => void;
  currentUserRole?: Role;
  settings: SystemSettings;
}

const PricingCalculator: React.FC<PricingCalculatorProps> = ({ onAddOrder, currentUserRole = 'Owner', settings }) => {
  const [size, setSize] = useState<BottleSize>('50ml');
  const [emptyBottlePrice, setEmptyBottlePrice] = useState<number | ''>('');
  const [oilPrice, setOilPrice] = useState<number | ''>('');

  const [calculation, setCalculation] = useState({
    totalCost: 0,
    profit: 0,
    reinvestment: 0,
    finalPrice: 0
  });

  const isOwner = currentUserRole === 'Owner';

  useEffect(() => {
    if (emptyBottlePrice !== '' && oilPrice !== '' && size) {
      const bottleCost = Number(emptyBottlePrice);
      const oilCostPerMl = Number(oilPrice);
      
      const { constant, oilVol } = settings.sizes[size];
      
      const totalCost = settings.packagingConstant + constant + bottleCost + (oilCostPerMl * oilVol);
      const profit = totalCost * settings.profitMargin;
      const reinvestment = totalCost * settings.reinvestmentMargin;
      const finalPrice = totalCost + profit + reinvestment;

      setCalculation({
        totalCost,
        profit,
        reinvestment,
        finalPrice
      });
    } else {
      setCalculation({ totalCost: 0, profit: 0, reinvestment: 0, finalPrice: 0 });
    }
  }, [size, emptyBottlePrice, oilPrice]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full pb-4">
      {/* Input Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 md:p-8 transition-colors h-full overflow-y-auto custom-scrollbar">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-xl">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pricing Calculator</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Calculate costs and final selling price</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Bottle Size</label>
            <div className="grid grid-cols-3 gap-3">
              {(['30ml', '50ml', '100ml'] as BottleSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`py-3 rounded-lg text-sm font-medium border-2 transition-all ${
                    size === s 
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' 
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-200 dark:hover:border-amber-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {isOwner ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Empty Bottle Price (EGP)</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={emptyBottlePrice}
                    onChange={(e) => setEmptyBottlePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 15"
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-medium">EGP</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Oil Price per 1ml (EGP)</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={oilPrice}
                    onChange={(e) => setOilPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 2.5"
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-medium">EGP</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Bottle Type Prefix</label>
                <select 
                  value={emptyBottlePrice}
                  onChange={(e) => setEmptyBottlePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                >
                  <option value="" disabled>Select Bottle Standard</option>
                  {settings.bottlePresets.map(p => (
                    <option key={p.id} value={p.price}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Essential Oil Quality Grade</label>
                <select 
                  value={oilPrice}
                  onChange={(e) => setOilPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                >
                  <option value="" disabled>Select Quality Standard</option>
                  {settings.oilPresets.map(p => (
                    <option key={p.id} value={p.price}>{p.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          
          {isOwner && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Formula Breakdown</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <li className="flex justify-between"><span>Packaging Constant:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{settings.packagingConstant} EGP</span></li>
                <li className="flex justify-between"><span>Size Constant ({size}):</span> <span className="font-medium text-slate-800 dark:text-slate-200">{settings.sizes[size].constant} EGP</span></li>
                <li className="flex justify-between"><span>Required Oil ({size}):</span> <span className="font-medium text-slate-800 dark:text-slate-200">{settings.sizes[size].oilVol} ml</span></li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Output Section */}
      <div className="bg-slate-900 rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden flex flex-col h-full overflow-y-auto custom-scrollbar">
          {/* Decorative background element */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          
          <h3 className="text-lg font-medium text-slate-300 mb-6">Pricing Summary</h3>
          
          <div className="space-y-6 flex-1 flex flex-col">
            {isOwner && (
              <>
                <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Total Cost</p>
                    <div className="text-3xl font-light">{calculation.totalCost.toFixed(2)}</div>
                  </div>
                  <div className="text-slate-500 font-medium">EGP</div>
                </div>

                <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-sm text-emerald-400 mb-1">Total Profit ({(settings.profitMargin * 100).toFixed(0)}%)</p>
                    <div className="text-3xl font-light text-emerald-400">+{calculation.profit.toFixed(2)}</div>
                  </div>
                  <div className="text-emerald-500/50 font-medium">EGP</div>
                </div>

                <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-sm text-blue-400 mb-1">Reinvestment Fund ({(settings.reinvestmentMargin * 100).toFixed(0)}%)</p>
                    <div className="text-3xl font-light text-blue-400">+{calculation.reinvestment.toFixed(2)}</div>
                  </div>
                  <div className="text-blue-500/50 font-medium">EGP</div>
                </div>
              </>
            )}

            {!isOwner && (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 mb-4 mt-6">
                <Lock className="w-12 h-12 mb-4" />
                <p className="text-sm px-8">Proprietary logic and cost margins are locked to Administrator access.</p>
              </div>
            )}

            <div className={`pt-8 ${isOwner ? 'mt-auto' : 'mt-auto border-t border-slate-800'}`}>
              <p className="text-sm text-amber-200 mb-2 font-medium uppercase tracking-wider">Recommended Selling Price</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-5xl font-bold text-amber-400">{calculation.finalPrice.toFixed(2)}</span>
                <span className="text-xl text-amber-400/70">EGP</span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default PricingCalculator;
