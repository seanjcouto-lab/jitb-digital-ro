import { RepairOrder, Part } from '../types';

export function printRequisition(ro: RepairOrder, parts: Part[], shippingCost: string) {
    const parsedShipping = parseFloat(shippingCost) || 0;
    const partsSubtotal = parts.reduce((acc, p) => acc + (p.dealerPrice || 0), 0);
    const totalCost = partsSubtotal + parsedShipping;
    const partsRows = parts.map(p =>
        '<tr>' +
        '<td>' + p.partNumber + '</td>' +
        '<td>' + p.description + '</td>' +
        '<td style="text-align:center">1</td>' +
        '<td style="text-align:right">$' + (p.dealerPrice || 0).toFixed(2) + '</td>' +
        '<td style="text-align:right">$' + (p.msrp || 0).toFixed(2) + '</td>' +
        '</tr>'
    ).join('');

    const html = '<!DOCTYPE html><html><head>' +
        '<title>' + ro.customerName + ' - RO#' + ro.id + '</title>' +
        '<style>' +
        '@page { margin: 1.5cm; }' +
        '* { box-sizing: border-box; margin: 0; padding: 0; }' +
        'body { font-family: Arial, sans-serif; margin: 2cm; background: white; color: #0f172a; font-size: 12px; line-height: 1.5; }' +
        '.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 16px; }' +
        '.header h1 { font-size: 26px; font-weight: 900; margin-bottom: 2px; }' +
        '.header .sub { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }' +
        '.header .req { font-size: 14px; font-weight: 700; color: #64748b; font-family: monospace; }' +
        '.meta { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; font-size: 11px; }' +
        '.meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; margin-top: 10px; }' +
        '.meta-value { font-weight: 700; }' +
        '.meta-right { text-align: right; }' +
        'table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }' +
        'thead { background: #f1f5f9; }' +
        'th { padding: 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid #0f172a; }' +
        'td { padding: 8px; font-size: 11px; border-bottom: 1px solid #e2e8f0; }' +
        '.section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 12px; }' +
        '.totals { display: flex; justify-content: flex-end; }' +
        '.totals-inner { width: 50%; }' +
        '.totals-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px; }' +
        '.totals-final { display: flex; justify-content: space-between; padding: 10px 0 4px; border-top: 2px solid #0f172a; font-weight: 900; font-size: 15px; }' +
        '.sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px; padding-top: 24px; border-top: 1px dashed #cbd5e1; }' +
        '.sig-line { border-top: 1px solid #0f172a; padding-top: 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; }' +
        '</style></head><body>' +
        '<div class="header"><div><h1>STATELINE BOATWORKS</h1><div class="sub">Special Part Order Authorization</div></div>' +
        '<div style="text-align:right"><div class="req">REQUISITION #SO-' + Date.now().toString().slice(-6) + '</div><div style="font-size:9px;color:#64748b;margin-top:4px;">' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' — ' + new Date().toLocaleDateString() + '</div></div></div>' +
        '<div class="meta"><div>' +
        '<div class="meta-label">Customer</div><div class="meta-value">' + ro.customerName + '</div>' +
        '<div class="meta-label">Repair Order Ref</div><div class="meta-value" style="font-family:monospace">' + ro.id + '</div>' +
        '<div class="meta-label">Vessel Name</div><div class="meta-value">' + (ro.vesselName || 'N/A') + '</div>' +
        '</div><div class="meta-right">' +
        '<div class="meta-label">Date Processed</div><div class="meta-value">' + new Date().toLocaleDateString() + '</div>' +
        '<div class="meta-label">Technician / Bay</div><div class="meta-value">' + (ro.technicianName || 'ADMIN / PARTS DEPT') + '</div>' +
        '<div class="meta-label">Engine Serial</div><div class="meta-value" style="font-family:monospace">' + (ro.engineSerial || 'N/A') + '</div>' +
        '</div></div>' +
        '<div class="section-title">Special Order Parts Manifest</div>' +
        '<table><thead><tr>' +
        '<th>Part Number</th><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Dealer Cost</th><th style="text-align:right">Retail (MSRP)</th>' +
        '</tr></thead><tbody>' + partsRows + '</tbody></table>' +
        '<div class="totals"><div class="totals-inner">' +
        '<div class="totals-row"><span>Parts Subtotal:</span><span>$' + partsSubtotal.toFixed(2) + '</span></div>' +
        '<div class="totals-row"><span>Estimated Shipping:</span><span>$' + parsedShipping.toFixed(2) + '</span></div>' +
        '<div class="totals-final"><span>TOTAL EST. COST:</span><span>$' + totalCost.toFixed(2) + '</span></div>' +
        '</div></div>' +
        '<div class="sigs"><div class="sig-line">Authorized Parts Buyer</div><div class="sig-line">Service Manager Sign-off</div></div>' +
        '</body></html>';

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 300);
}