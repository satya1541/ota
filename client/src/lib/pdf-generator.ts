import jsPDF from 'jspdf';
import { DeviceLog, Device } from './api';
import { format } from 'date-fns';

export const generateLogsPDF = (logs: DeviceLog[], devices: Device[]) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkPageBreak = (neededSpace: number) => {
    if (yPosition + neededSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('System Logs Report', margin, yPosition);
  yPosition += 12;

  // Report Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const generatedDate = format(new Date(), 'PPP p');
  doc.text(`Generated: ${generatedDate}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Total Logs: ${logs.length}`, margin, yPosition);
  yPosition += 10;

  // Summary Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Summary', margin, yPosition);
  yPosition += 8;

  const statusCounts = {
    success: logs.filter(l => l.status === 'success').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pending: logs.filter(l => l.status === 'pending').length,
    info: logs.filter(l => l.status === 'info').length,
  };

  const actionCounts: Record<string, number> = {};
  logs.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  const summaryText = `Success: ${statusCounts.success} | Failed: ${statusCounts.failed} | Pending: ${statusCounts.pending} | Info: ${statusCounts.info}`;
  doc.text(summaryText, margin, yPosition);
  yPosition += 8;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Logs Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Activity Logs', margin, yPosition);
  yPosition += 8;

  // Log entries
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  logs.forEach((log, index) => {
    checkPageBreak(18);

    const device = devices.find(d => d.macAddress === log.macAddress || d.id === log.deviceId);
    const deviceName = device ? device.name : (log.macAddress || log.deviceId);
    const timestamp = format(new Date(log.createdAt), 'PPP p');

    // Entry header
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${index + 1}. ${deviceName}`, margin, yPosition);
    yPosition += 6;

    // Device details
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const macAddress = log.macAddress || log.deviceId;
    doc.text(`MAC/ID: ${macAddress}`, margin + 5, yPosition);
    yPosition += 5;

    // Timestamp
    doc.text(`Time: ${timestamp}`, margin + 5, yPosition);
    yPosition += 5;

    // Action and Status
    doc.setFont('helvetica', 'bold');
    const statusColor = log.status === 'success' ? [46, 160, 67] : 
                       log.status === 'failed' ? [211, 47, 47] :
                       log.status === 'pending' ? [251, 188, 4] : [33, 150, 243];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`${log.action.toUpperCase()} - ${log.status.toUpperCase()}`, margin + 5, yPosition);
    yPosition += 5;

    // Version info if available
    if (log.fromVersion && log.toVersion) {
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(`Version: ${log.fromVersion} → ${log.toVersion}`, margin + 5, yPosition);
      yPosition += 5;
    }

    // Message
    if (log.message) {
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      const messageLines = doc.splitTextToSize(log.message, contentWidth - 10);
      doc.text(messageLines, margin + 5, yPosition);
      yPosition += messageLines.length * 4 + 2;
    }

    // Separator
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Download
  const filename = `system-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`;
  doc.save(filename);
};
