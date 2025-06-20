import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { RoleGuard } from "@/components/RoleGuard";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from "recharts";
import {
  Download,
  Calendar as CalendarIcon,
  TrendingUp,
  Package,
  Users,
  Clock,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  FileText,
  Filter
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

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
  deliveryTrends: Array<{ date: string; delivered: number; created: number; failed: number }>;
  kurirPerformance: Array<{ 
    id: number; 
    name: string; 
    packagesDelivered: number; 
    attendanceRate: number; 
    averageDeliveryTime: number;
    status: string;
  }>;
  attendanceStats: Array<{ date: string; present: number; absent: number; pending: number }>;
  geofenceUsage: Array<{ name: string; checkIns: number; zone: string }>;
  revenue: Array<{ date: string; amount: number; packages: number }>;
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  secondary: '#6b7280',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#14b8a6'
};

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [reportType, setReportType] = useState<string>("overview");
  const [exportFormat, setExportFormat] = useState<string>("pdf");

  // Fetch report data
  const { data: reportData, isLoading, error } = useQuery<ReportData>({
    queryKey: ["/api/reports", { 
      from: format(dateRange.from, "yyyy-MM-dd"), 
      to: format(dateRange.to, "yyyy-MM-dd"),
      type: reportType 
    }],
    enabled: !!user,
  });

  const handleDateRangeChange = (range: string) => {
    const now = new Date();
    switch (range) {
      case "7days":
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case "30days":
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case "thisMonth":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "thisYear":
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
    }
  };

  const handleExportReport = async () => {
    try {
      const response = await fetch(`/api/reports/export?format=${exportFormat}&from=${format(dateRange.from, "yyyy-MM-dd")}&to=${format(dateRange.to, "yyyy-MM-dd")}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `delivery-report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <RoleGuard roles={["superadmin", "admin"]}>
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard roles={["superadmin", "admin"]}>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to Load Reports</h3>
                <p className="text-muted-foreground">Unable to fetch report data. Please check your connection and try again.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard roles={["superadmin", "admin"]}>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Management Reports</h1>
              <p className="text-muted-foreground">
                Comprehensive analytics and insights for delivery operations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExportReport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Date Range:</span>
              </div>
              
              <div className="flex gap-2">
                {[
                  { label: "Last 7 Days", value: "7days" },
                  { label: "Last 30 Days", value: "30days" },
                  { label: "This Month", value: "thisMonth" },
                  { label: "This Year", value: "thisYear" }
                ].map((range) => (
                  <Button
                    key={range.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDateRangeChange(range.value)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Custom Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <div className="text-sm text-muted-foreground">
                {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {reportData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Packages</p>
                    <p className="text-2xl font-bold">{reportData.summary.totalPackages}</p>
                    <p className="text-xs text-muted-foreground">
                      {reportData.summary.totalDelivered} delivered
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">{reportData.summary.successRate}%</p>
                    <p className="text-xs text-muted-foreground">
                      Delivery success rate
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Kurir</p>
                    <p className="text-2xl font-bold">{reportData.summary.totalKurir}</p>
                    <p className="text-xs text-muted-foreground">
                      {reportData.summary.activeDeliveries} active deliveries
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">Rp {reportData.summary.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Avg delivery: {reportData.summary.averageDeliveryTime}h
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Report Tabs */}
        <Tabs value={reportType} onValueChange={setReportType} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="kurir">Kurir Performance</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Package Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Package Status Distribution</CardTitle>
                  <CardDescription>Current status of all packages</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData?.packagesByStatus || []}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData?.packagesByStatus?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Delivery Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Trends</CardTitle>
                  <CardDescription>Daily package creation and delivery</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={reportData?.deliveryTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="created" stroke={COLORS.primary} />
                      <Line type="monotone" dataKey="delivered" stroke={COLORS.success} />
                      <Line type="monotone" dataKey="failed" stroke={COLORS.error} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Package Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Package Priority Distribution</CardTitle>
                  <CardDescription>Breakdown by priority levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData?.packagesByPriority || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill={COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue by Day */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Revenue</CardTitle>
                  <CardDescription>Revenue and package count per day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={reportData?.revenue || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="amount" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Kurir Performance Tab */}
          <TabsContent value="kurir" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kurir Performance Summary</CardTitle>
                <CardDescription>Individual kurir statistics and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Kurir</th>
                        <th className="text-left py-3 px-4">Packages Delivered</th>
                        <th className="text-left py-3 px-4">Attendance Rate</th>
                        <th className="text-left py-3 px-4">Avg Delivery Time</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData?.kurirPerformance?.map((kurir) => (
                        <tr key={kurir.id} className="border-b">
                          <td className="py-3 px-4 font-medium">{kurir.name}</td>
                          <td className="py-3 px-4">{kurir.packagesDelivered}</td>
                          <td className="py-3 px-4">{kurir.attendanceRate}%</td>
                          <td className="py-3 px-4">{kurir.averageDeliveryTime}h</td>
                          <td className="py-3 px-4">
                            <Badge variant={kurir.status === "active" ? "default" : "secondary"}>
                              {kurir.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attendance Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Attendance</CardTitle>
                  <CardDescription>Daily attendance statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={reportData?.attendanceStats || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="present" stackId="1" stroke={COLORS.success} fill={COLORS.success} />
                      <Area type="monotone" dataKey="absent" stackId="1" stroke={COLORS.error} fill={COLORS.error} />
                      <Area type="monotone" dataKey="pending" stackId="1" stroke={COLORS.warning} fill={COLORS.warning} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Geofence Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Geofence Zone Usage</CardTitle>
                  <CardDescription>Check-ins by geofence zones</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData?.geofenceUsage || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="checkIns" fill={COLORS.teal} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>Daily revenue over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={reportData?.revenue || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`Rp ${Number(value).toLocaleString()}`, 'Revenue']} />
                      <Line type="monotone" dataKey="amount" stroke={COLORS.success} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                  <CardDescription>Key financial metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="font-semibold">Rp {reportData?.summary?.totalRevenue?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average per Package</span>
                    <span className="font-semibold">
                      Rp {reportData?.summary?.totalPackages ? 
                        Math.round(reportData.summary.totalRevenue / reportData.summary.totalPackages).toLocaleString() : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-semibold">{reportData?.summary?.successRate || 0}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}