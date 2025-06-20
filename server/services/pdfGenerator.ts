import htmlPdf from 'html-pdf-node';
import { format } from 'date-fns';

interface ReportData {
  summary: {
    totalPackages: number;
    totalDelivered: number;
    totalUsers: number;
    totalKurir: number;
    activeDeliveries: number;
    averageDeliveryTime: number;
    successRate: number;
    totalRevenue: number;
  };
  packagesByStatus: Array<{ name: string; value: number; color: string }>;
  packagesByPriority: Array<{ name: string; value: number; color: string }>;
  kurirPerformance: Array<{ 
    id: number; 
    name: string; 
    packagesDelivered: number; 
    attendanceRate: number; 
    averageDeliveryTime: number;
    status: string;
  }>;
  deliveryTrends: Array<{ date: string; delivered: number; created: number; failed: number }>;
  attendanceStats: Array<{ date: string; present: number; absent: number; pending: number }>;
  geofenceUsage: Array<{ name: string; checkIns: number; zone: string }>;
  revenue: Array<{ date: string; amount: number; packages: number }>;
}

export class PDFGenerator {
  static generateReportHTML(data: ReportData, startDate: string, endDate: string): string {
    const currentDate = format(new Date(), 'dd/MM/yyyy HH:mm');
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Delivery Management Report</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                background: white;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #3b82f6;
                padding-bottom: 20px;
            }
            
            .header h1 {
                font-size: 24px;
                color: #1f2937;
                margin-bottom: 10px;
            }
            
            .header .subtitle {
                font-size: 14px;
                color: #6b7280;
                margin-bottom: 5px;
            }
            
            .header .date-range {
                font-size: 12px;
                color: #9ca3af;
            }
            
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .summary-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                background: #f9fafb;
            }
            
            .summary-card .label {
                font-size: 11px;
                color: #6b7280;
                text-transform: uppercase;
                margin-bottom: 5px;
            }
            
            .summary-card .value {
                font-size: 20px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 3px;
            }
            
            .summary-card .subtext {
                font-size: 10px;
                color: #9ca3af;
            }
            
            .section {
                margin-bottom: 30px;
                page-break-inside: avoid;
            }
            
            .section-title {
                font-size: 16px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 15px;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 5px;
            }
            
            .table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }
            
            .table th,
            .table td {
                border: 1px solid #e5e7eb;
                padding: 8px;
                text-align: left;
            }
            
            .table th {
                background-color: #f3f4f6;
                font-weight: bold;
                font-size: 11px;
                text-transform: uppercase;
                color: #374151;
            }
            
            .table td {
                font-size: 11px;
            }
            
            .status-badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .status-active {
                background-color: #d1fae5;
                color: #065f46;
            }
            
            .status-inactive {
                background-color: #fee2e2;
                color: #991b1b;
            }
            
            .chart-placeholder {
                background-color: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                color: #6b7280;
                margin-bottom: 15px;
            }
            
            .two-column {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                font-size: 10px;
                color: #9ca3af;
            }
            
            @media print {
                .page-break {
                    page-break-before: always;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Delivery Management Report</h1>
            <div class="subtitle">Comprehensive Analytics Dashboard</div>
            <div class="date-range">Report Period: ${startDate} to ${endDate}</div>
            <div class="date-range">Generated on: ${currentDate}</div>
        </div>

        <!-- Summary Section -->
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">Total Packages</div>
                <div class="value">${data.summary.totalPackages}</div>
                <div class="subtext">${data.summary.totalDelivered} delivered</div>
            </div>
            <div class="summary-card">
                <div class="label">Success Rate</div>
                <div class="value">${data.summary.successRate}%</div>
                <div class="subtext">Delivery success</div>
            </div>
            <div class="summary-card">
                <div class="label">Active Kurir</div>
                <div class="value">${data.summary.totalKurir}</div>
                <div class="subtext">${data.summary.activeDeliveries} active deliveries</div>
            </div>
            <div class="summary-card">
                <div class="label">Total Revenue</div>
                <div class="value">Rp ${data.summary.totalRevenue.toLocaleString()}</div>
                <div class="subtext">Avg delivery: ${data.summary.averageDeliveryTime}h</div>
            </div>
        </div>

        <!-- Package Status Section -->
        <div class="section">
            <div class="section-title">Package Status Distribution</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.packagesByStatus.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.value}</td>
                            <td>${((item.value / data.summary.totalPackages) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Package Priority Section -->
        <div class="section">
            <div class="section-title">Package Priority Distribution</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Priority</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.packagesByPriority.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.value}</td>
                            <td>${((item.value / data.summary.totalPackages) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="page-break"></div>

        <!-- Kurir Performance Section -->
        <div class="section">
            <div class="section-title">Kurir Performance Summary</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Kurir Name</th>
                        <th>Packages Delivered</th>
                        <th>Attendance Rate</th>
                        <th>Avg Delivery Time</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.kurirPerformance.map(kurir => `
                        <tr>
                            <td>${kurir.name}</td>
                            <td>${kurir.packagesDelivered}</td>
                            <td>${kurir.attendanceRate}%</td>
                            <td>${kurir.averageDeliveryTime}h</td>
                            <td>
                                <span class="status-badge ${kurir.status === 'active' ? 'status-active' : 'status-inactive'}">
                                    ${kurir.status}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Delivery Trends Section -->
        <div class="section">
            <div class="section-title">Daily Delivery Trends</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Created</th>
                        <th>Delivered</th>
                        <th>Failed</th>
                        <th>Success Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.deliveryTrends.slice(0, 10).map(trend => `
                        <tr>
                            <td>${trend.date}</td>
                            <td>${trend.created}</td>
                            <td>${trend.delivered}</td>
                            <td>${trend.failed}</td>
                            <td>${trend.created > 0 ? ((trend.delivered / trend.created) * 100).toFixed(1) : 0}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Geofence Usage Section -->
        <div class="section">
            <div class="section-title">Geofence Zone Usage</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Zone Name</th>
                        <th>Check-ins</th>
                        <th>Usage Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.geofenceUsage.map(zone => `
                        <tr>
                            <td>${zone.name}</td>
                            <td>${zone.checkIns}</td>
                            <td>Active</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Revenue Analysis Section -->
        <div class="section">
            <div class="section-title">Revenue Analysis</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Revenue (Rp)</th>
                        <th>Packages</th>
                        <th>Avg per Package</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.revenue.slice(0, 10).map(rev => `
                        <tr>
                            <td>${rev.date}</td>
                            <td>${rev.amount.toLocaleString()}</td>
                            <td>${rev.packages}</td>
                            <td>${rev.packages > 0 ? Math.round(rev.amount / rev.packages).toLocaleString() : 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <div>Pengiriman System - Delivery Management Platform</div>
            <div>This report contains confidential business information</div>
        </div>
    </body>
    </html>
    `;
  }

  static async generatePDF(data: ReportData, startDate: string, endDate: string): Promise<Buffer> {
    const html = this.generateReportHTML(data, startDate, endDate);
    
    const options = {
      format: 'A4',
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; width: 100%; text-align: center; color: #666; margin-top: 10px;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    };

    try {
      const file = { content: html };
      const pdfBuffer = await htmlPdf.generatePdf(file, options);
      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  static generateCSV(data: ReportData): string {
    const csvData = [
      // Summary section
      'DELIVERY MANAGEMENT REPORT - SUMMARY',
      '',
      'Metric,Value',
      `Total Packages,${data.summary.totalPackages}`,
      `Total Delivered,${data.summary.totalDelivered}`,
      `Total Users,${data.summary.totalUsers}`,
      `Total Kurir,${data.summary.totalKurir}`,
      `Active Deliveries,${data.summary.activeDeliveries}`,
      `Average Delivery Time,${data.summary.averageDeliveryTime}h`,
      `Success Rate,${data.summary.successRate}%`,
      `Total Revenue,Rp ${data.summary.totalRevenue.toLocaleString()}`,
      '',
      
      // Package status section
      'PACKAGE STATUS DISTRIBUTION',
      '',
      'Status,Count,Percentage',
      ...data.packagesByStatus.map(item => 
        `${item.name},${item.value},${((item.value / data.summary.totalPackages) * 100).toFixed(1)}%`
      ),
      '',
      
      // Kurir performance section
      'KURIR PERFORMANCE',
      '',
      'Kurir Name,Packages Delivered,Attendance Rate,Avg Delivery Time,Status',
      ...data.kurirPerformance.map(kurir => 
        `${kurir.name},${kurir.packagesDelivered},${kurir.attendanceRate}%,${kurir.averageDeliveryTime}h,${kurir.status}`
      ),
      '',
      
      // Revenue section
      'REVENUE ANALYSIS',
      '',
      'Date,Revenue (Rp),Packages,Avg per Package',
      ...data.revenue.slice(0, 30).map(rev => 
        `${rev.date},${rev.amount},${rev.packages},${rev.packages > 0 ? Math.round(rev.amount / rev.packages) : 0}`
      )
    ];

    return csvData.join('\n');
  }
}