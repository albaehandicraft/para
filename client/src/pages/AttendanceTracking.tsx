import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { RoleGuard } from "@/components/RoleGuard";
import {
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Download,
  User,
} from "lucide-react";
import { format } from "date-fns";

export default function AttendanceTracking() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: attendance, isLoading } = useQuery({
    queryKey: ["/api/attendance", { 
      startDate: format(selectedDate, "yyyy-MM-dd"), 
      endDate: format(selectedDate, "yyyy-MM-dd") 
    }],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance?startDate=${format(selectedDate, "yyyy-MM-dd")}&endDate=${format(selectedDate, "yyyy-MM-dd")}`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch attendance");
      return response.json();
    },
  });

  const approveAttendanceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/attendance/${id}/approve`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Attendance updated",
        description: "Attendance status has been updated successfully",
      });
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

  const handleApproveAttendance = (id: number, status: string) => {
    approveAttendanceMutation.mutate({ id, status });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      present: "bg-green-100 text-green-800",
      absent: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
    };

    const statusIcons = {
      present: <CheckCircle className="w-3 h-3 mr-1" />,
      absent: <XCircle className="w-3 h-3 mr-1" />,
      pending: <Clock className="w-3 h-3 mr-1" />,
      approved: <CheckCircle className="w-3 h-3 mr-1" />,
      rejected: <XCircle className="w-3 h-3 mr-1" />,
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.pending}>
        {statusIcons[status as keyof typeof statusIcons]}
        {status.toUpperCase()}
      </Badge>
    );
  };

  const filteredAttendance = attendance?.filter((item: any) => {
    const matchesSearch = item.kurir?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Tracking</h1>
          <p className="text-gray-600 mt-1">Monitor and manage kurir daily attendance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-48">
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search kurir..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records - {format(selectedDate, "PPP")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Kurir</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Check In</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Check Out</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance?.map((record: any) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {record.kurir?.fullName || "Unknown"}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {record.kurirId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {record.checkInTime ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {format(new Date(record.checkInTime), "HH:mm")}
                          </div>
                          <div className="text-gray-500">
                            {format(new Date(record.checkInTime), "MMM d")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not checked in</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {record.checkOutTime ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {format(new Date(record.checkOutTime), "HH:mm")}
                          </div>
                          <div className="text-gray-500">
                            {format(new Date(record.checkOutTime), "MMM d")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not checked out</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {record.checkInLat && record.checkInLng ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span>
                            {parseFloat(record.checkInLat).toFixed(4)}, {parseFloat(record.checkInLng).toFixed(4)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No location</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="py-3 px-4">
                      <RoleGuard roles={["pic"]}>
                        {record.status === "pending" && (
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveAttendance(record.id, "approved")}
                              disabled={approveAttendanceMutation.isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveAttendance(record.id, "rejected")}
                              disabled={approveAttendanceMutation.isPending}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </RoleGuard>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {!filteredAttendance?.length && (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-1">No attendance records found</p>
                <p className="text-sm">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your filters" 
                    : "No kurir have checked in for this date"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredAttendance?.filter((r: any) => r.status === "present" || r.status === "approved").length || 0}
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
                  {filteredAttendance?.filter((r: any) => r.status === "pending").length || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredAttendance?.filter((r: any) => r.status === "absent" || r.status === "rejected").length || 0}
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
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredAttendance?.length || 0}
                </p>
              </div>
              <User className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
