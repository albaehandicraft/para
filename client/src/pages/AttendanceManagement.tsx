import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { RoleGuard } from "@/components/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Download,
  User,
  Eye,
  Users,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { format, addDays, subDays, startOfMonth, endOfMonth } from "date-fns";

interface AttendanceRecord {
  id: number;
  kurirId: number;
  kurirName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: "present" | "absent" | "pending" | "approved" | "rejected";
  workingHours: number;
  notes: string | null;
  approvedByName?: string;
}

interface AttendanceStats {
  totalPresent: number;
  totalAbsent: number;
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  attendanceRate: number;
  averageWorkingHours: number;
  totalWorkingDays: number;
}

interface KurirSummary {
  kurirId: number;
  kurirName: string;
  attendanceRate: number;
  totalWorkingHours: number;
  lateCheckIns: number;
  earlyCheckOuts: number;
  presentDays: number;
  totalDays: number;
}

export default function AttendanceManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Date range state
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kurirFilter, setKurirFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  // Get all kurir users for filter
  const { data: kurirUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const users = await response.json();
      return users.filter((user: any) => user.role === "kurir");
    },
  });

  // Get attendance records with enhanced filtering
  const { data: attendanceRecords = [], isLoading: recordsLoading } = useQuery<AttendanceRecord[]>({
    queryKey: [
      "/api/attendance/records",
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd"),
      statusFilter,
      kurirFilter,
      searchTerm
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
      });
      
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (kurirFilter !== "all") params.append("kurirId", kurirFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/attendance/records?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      
      if (!response.ok) throw new Error("Failed to fetch attendance records");
      return response.json();
    },
    staleTime: 0,
  });

  // Get attendance statistics
  const { data: attendanceStats } = useQuery<AttendanceStats>({
    queryKey: [
      "/api/attendance/stats",
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd")
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance/stats?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  // Get kurir summary
  const { data: kurirSummary = [] } = useQuery<KurirSummary[]>({
    queryKey: [
      "/api/attendance/kurir-summary",
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd")
    ],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance/kurir-summary?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch kurir summary");
      return response.json();
    },
  });

  // Approve/reject attendance mutation
  const approveAttendanceMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const response = await apiRequest("PUT", `/api/attendance/${id}/approve`, { status, notes });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Attendance updated",
        description: `Attendance has been ${variables.status}`,
      });
      setIsApprovalModalOpen(false);
      setApprovalNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update attendance",
        variant: "destructive",
      });
    },
  });

  const handleViewRecord = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const handleApprovalClick = (record: AttendanceRecord, status: "approved" | "rejected") => {
    setSelectedRecord(record);
    setIsApprovalModalOpen(true);
  };

  const handleSubmitApproval = (status: "approved" | "rejected") => {
    if (!selectedRecord) return;
    
    approveAttendanceMutation.mutate({
      id: selectedRecord.id,
      status,
      notes: approvalNotes.trim() || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      approved: { color: "bg-blue-100 text-blue-800", icon: CheckCircle },
      pending: { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle },
      absent: { color: "bg-gray-100 text-gray-800", icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || AlertCircle;

    return (
      <Badge className={config?.color || "bg-gray-100 text-gray-800"}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(record => {
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesKurir = kurirFilter === "all" || record.kurirId.toString() === kurirFilter;
      const matchesSearch = !searchTerm || 
        record.kurirName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesKurir && matchesSearch;
    });
  }, [attendanceRecords, statusFilter, kurirFilter, searchTerm]);

  if (recordsLoading) {
    return (
      <RoleGuard roles={["pic", "admin", "superadmin"]}>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard roles={["pic", "admin", "superadmin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kurir Attendance Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage kurir attendance with comprehensive analytics</p>
        </div>

        {/* Date Range and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Kurir Filter */}
              <div className="space-y-2">
                <Label>Kurir</Label>
                <Select value={kurirFilter} onValueChange={setKurirFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All kurirs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Kurirs</SelectItem>
                    {kurirUsers.map((kurir) => (
                      <SelectItem key={kurir.id} value={kurir.id.toString()}>
                        {kurir.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search */}
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by kurir name or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="records">Attendance Records</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Present</p>
                      <p className="text-2xl font-bold text-green-600">
                        {attendanceStats?.totalPresent || 0}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {attendanceStats?.totalPending || 0}
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Absent</p>
                      <p className="text-2xl font-bold text-red-600">
                        {attendanceStats?.totalAbsent || 0}
                      </p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Rate</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {attendanceStats?.attendanceRate ? `${Math.round(attendanceStats.attendanceRate)}%` : "0%"}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Kurir Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Kurir Performance Summary</CardTitle>
                <CardDescription>Overview of individual kurir attendance performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Kurir</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Attendance Rate</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Working Hours</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Late Check-ins</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Present Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kurirSummary.map((kurir) => (
                        <tr key={kurir.kurirId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{kurir.kurirName}</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={
                              kurir.attendanceRate >= 90 ? "border-green-200 text-green-800" :
                              kurir.attendanceRate >= 80 ? "border-yellow-200 text-yellow-800" :
                              "border-red-200 text-red-800"
                            }>
                              {Math.round(kurir.attendanceRate)}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {kurir.totalWorkingHours}h
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {kurir.lateCheckIns}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {kurir.presentDays}/{kurir.totalDays}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Records Tab */}
          <TabsContent value="records" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>
                  Detailed attendance records with approval actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Kurir</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Check In</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Check Out</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Hours</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">
                              {format(new Date(record.date), "MMM dd, yyyy")}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{record.kurirName}</div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {record.checkInTime ? format(new Date(record.checkInTime), "HH:mm") : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {record.checkOutTime ? format(new Date(record.checkOutTime), "HH:mm") : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {record.workingHours ? `${record.workingHours}h` : "-"}
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewRecord(record)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              {record.status === "pending" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={() => handleApprovalClick(record, "approved")}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleApprovalClick(record, "rejected")}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Working Hours Analysis</CardTitle>
                  <CardDescription>Average working hours distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {attendanceStats?.averageWorkingHours ? `${Math.round(attendanceStats.averageWorkingHours * 100) / 100}h` : "0h"}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Average daily working hours</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance Trends</CardTitle>
                  <CardDescription>Overall attendance statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Working Days</span>
                      <span className="font-medium">{attendanceStats?.totalWorkingDays || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Present Days</span>
                      <span className="font-medium text-green-600">{attendanceStats?.totalPresent || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Absent Days</span>
                      <span className="font-medium text-red-600">{attendanceStats?.totalAbsent || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* View Record Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Attendance Record Details</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Kurir</Label>
                    <p className="text-sm font-medium">{selectedRecord.kurirName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Date</Label>
                    <p className="text-sm">{format(new Date(selectedRecord.date), "PPP")}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Check In</Label>
                    <p className="text-sm">
                      {selectedRecord.checkInTime ? format(new Date(selectedRecord.checkInTime), "PPp") : "Not checked in"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Check Out</Label>
                    <p className="text-sm">
                      {selectedRecord.checkOutTime ? format(new Date(selectedRecord.checkOutTime), "PPp") : "Not checked out"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Working Hours</Label>
                    <p className="text-sm">{selectedRecord.workingHours ? `${selectedRecord.workingHours} hours` : "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <div>{getStatusBadge(selectedRecord.status)}</div>
                  </div>
                </div>
                
                {selectedRecord.notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Notes</Label>
                    <p className="text-sm bg-gray-50 p-3 rounded">{selectedRecord.notes}</p>
                  </div>
                )}

                {selectedRecord.approvedByName && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Approved By</Label>
                    <p className="text-sm">{selectedRecord.approvedByName}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approval Modal */}
        <Dialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedRecord ? `${selectedRecord.status === "pending" ? "Review" : "Update"} Attendance` : "Review Attendance"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedRecord && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium">{selectedRecord.kurirName}</p>
                  <p className="text-sm text-gray-600">{format(new Date(selectedRecord.date), "PPP")}</p>
                </div>
              )}
              
              <div>
                <Label htmlFor="approvalNotes">Notes (Optional)</Label>
                <Textarea
                  id="approvalNotes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add notes about this approval decision..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsApprovalModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleSubmitApproval("rejected")}
                  disabled={approveAttendanceMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleSubmitApproval("approved")}
                  disabled={approveAttendanceMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}