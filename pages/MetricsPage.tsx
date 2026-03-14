
import React from 'react';
import { RepairOrder, Part, AppConfig } from '../types';
import SectionHeader from '../components/SectionHeader';
import { metricsService } from '../services/metricsService';

interface MetricsPageProps {
  repairOrders: RepairOrder[];
  inventory: Part[];
  config: AppConfig;
}

const MetricCard = ({ title, value, subValue }: { title: string, value: string, subValue?: string }) => (
  <div className="glass p-6 rounded-2xl border-white/5">
    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
    <p className="text-3xl font-black text-white mt-2">{value}</p>
    {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
  </div>
);

const MetricsPage: React.FC<MetricsPageProps> = ({ repairOrders, inventory, config }) => {

  // P&L Metrics
  const { totalRevenue, totalCost, grossProfit, profitMargin } = metricsService.calculateFinancialHealth(repairOrders, inventory, config);

  // AR Aging
  const arAging = metricsService.calculateARAging(repairOrders);
  
  // Sales by Package
  const packageSales = metricsService.calculatePackageSales(repairOrders);


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end border-b border-white/5 pb-4">
        <div>
          <h2 className="text-3xl font-black neon-seafoam uppercase tracking-tighter">Metrics & Reporting Hub</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Data-Driven Business Intelligence</p>
        </div>
      </div>

      <section>
        <SectionHeader title="Financial Health (Based on Completed ROs)" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <MetricCard title="Total Revenue" value={`$${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`} />
          <MetricCard title="Total COGS" value={`$${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}`} subValue="Parts & Est. Labor Cost" />
          <MetricCard title="Gross Profit" value={`$${grossProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} />
          <MetricCard title="Profit Margin" value={`${profitMargin.toFixed(1)}%`} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass p-6 rounded-2xl border-white/5">
           <SectionHeader title="Accounts Receivable Aging" />
           <div className="space-y-4">
            {Object.entries(arAging).map(([range, amount]) => (
                <div key={range} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg">
                    <span className="font-bold text-slate-300">{range} Days</span>
                    <span className={`font-mono text-lg font-bold ${amount > 0 ? 'text-white' : 'text-slate-500'}`}>${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
            ))}
           </div>
        </section>
        
        <section className="glass p-6 rounded-2xl border-white/5">
            <SectionHeader title="Sales By Package" />
            <div className="space-y-4">
            {Object.entries(packageSales).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg">
                    <span className="font-bold text-slate-300">{name}</span>
                    <span className={`font-mono text-lg font-bold text-neon-steel`}>{count} ROs</span>
                </div>
            ))}
            {Object.keys(packageSales).length === 0 && <p className="text-slate-600 italic text-center py-4">No package sales data available.</p>}
           </div>
        </section>
      </div>
    </div>
  );
};

export default MetricsPage;
