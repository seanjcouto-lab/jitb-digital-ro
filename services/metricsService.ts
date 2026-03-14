import { RepairOrder, Part, AppConfig, PaymentStatus } from '../types';

export const metricsService = {
  calculateFinancialHealth: (repairOrders: RepairOrder[], inventory: Part[], config: AppConfig) => {
    const completedROs = repairOrders.filter(ro => ro.status === 'COMPLETED');

    const totalRevenue = completedROs.reduce((sum, ro) => sum + (ro.invoiceTotal || 0), 0);
    const totalPartsCost = completedROs.flatMap(ro => ro.parts).reduce((sum, part) => sum + (inventory.find(p => p.partNumber === part.partNumber)?.cost || 0), 0);
    const totalLaborCost = completedROs.reduce((sum, ro) => {
        const totalMs = ro.workSessions.reduce((acc, session) => acc + ((session.endTime || 0) - session.startTime), 0);
        const totalHours = totalMs / (1000 * 60 * 60);
        // Assuming a shop cost of 50% of the billable rate
        return sum + (totalHours * (config.hourlyRate * 0.5));
    }, 0);
    const totalCost = totalPartsCost + totalLaborCost;
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin
    };
  },

  calculateARAging: (repairOrders: RepairOrder[]) => {
    const completedROs = repairOrders.filter(ro => ro.status === 'COMPLETED');
    const unpaidInvoices = completedROs.filter(ro => ro.paymentStatus !== PaymentStatus.PAID && ro.dateInvoiced);
    
    return {
      '0-30': unpaidInvoices.filter(ro => (Date.now() - ro.dateInvoiced!) / (1000*60*60*24) <= 30).reduce((sum, ro) => sum + (ro.invoiceTotal! - (ro.payments?.reduce((s, p) => s + p.amount, 0) || 0)), 0),
      '31-60': unpaidInvoices.filter(ro => { const days = (Date.now() - ro.dateInvoiced!) / (1000*60*60*24); return days > 30 && days <= 60; }).reduce((sum, ro) => sum + (ro.invoiceTotal! - (ro.payments?.reduce((s, p) => s + p.amount, 0) || 0)), 0),
      '61+': unpaidInvoices.filter(ro => (Date.now() - ro.dateInvoiced!) / (1000*60*60*24) > 60).reduce((sum, ro) => sum + (ro.invoiceTotal! - (ro.payments?.reduce((s, p) => s + p.amount, 0) || 0)), 0),
    };
  },

  calculatePackageSales: (repairOrders: RepairOrder[]) => {
    return repairOrders.reduce((acc, ro) => {
      ro.directives.forEach(d => {
        if (d.title.startsWith('PERFORM ')) {
          const pkgName = d.title.replace('PERFORM ', '');
          if (pkgName.includes('SERVICE') || pkgName.includes('PAINTING')) {
             acc[pkgName] = (acc[pkgName] || 0) + 1;
          }
        }
      });
      return acc;
    }, {} as Record<string, number>);
  }
};
