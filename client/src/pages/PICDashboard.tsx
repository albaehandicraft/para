import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Users,
  TrendingUp,
  Eye,
  MapPin,
  User,
} from "lucide-react";

export default function PICDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Get pending attendance
  const { data: pendingAttendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["/api/attendance/pending"],
    queryFn: async () => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      
      const response = await fetch(
        `/api/attendance?startDate=${startDate}&endDate=${endDate}`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const data = await response.json();
      return data.filter((record: any) => record.status === "pending");
    },
  });

  // Get packages for approval
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ["/api/packages"],
  });

  // Get dashboard metrics
  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const approveAttendanceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/attendance/${id}/approve`, { status });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Attendance updated",
        description: `Attendance ${variables.status} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/pending"] });
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
      created: "bg-gray-100 text-gray-800",
      assigned: "bg-blue-100 text-blue-800",
      picked_up: "bg-yellow-100 text-yellow-800",
      in_transit: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.pending}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const deliveredPackages = packages?.filter((pkg: any) => pkg.status === "delivered") || [];
  const pendingPackages = packages?.filter((pkg: any) => 
    ["assigned", "picked_up", "in_transit"].includes(pkg.status)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PIC Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage attendance and approve delivery confirmations</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Attendance</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingAttendance?.length || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="text-gray-600">Requires approval</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {deliveredPackages.filter((pkg: any) => 
                    new Date(pkg.deliveredAt).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">+12%</span>
              <span className="text-gray-600 ml-1">vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Deliveries</p>
                <p className="text-2xl font-bold text-blue-600">
                  {pendingPackages.length}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="text-gray-600">In progress</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online Kurir</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.kurirOnline || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-gray-600" />
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="text-gray-600">Currently working</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Approval</TabsTrigger>
          <TabsTrigger value="deliveries">Delivery Confirmation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Attendance */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Attendance Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {pendingAttendance?.slice(0, 5).map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Kurir ID: {record.kurirId}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(record.checkInTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveAttendance(record.id, "approved")}
                            disabled={approveAttendanceMutation.isPending}
                          >
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveAttendance(record.id, "rejected")}
                            disabled={approveAttendanceMutation.isPending}
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {!pendingAttendance?.length && (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No pending attendance approvals</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Deliveries */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                {packagesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {deliveredPackages.slice(0, 5).map((pkg: any) => (
                      <div key={pkg.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{pkg.packageId}</p>
                          <p className="text-xs text-gray-500">{pkg.recipientName}</p>
                          <p className="text-xs text-gray-400">
                            {pkg.deliveredAt && new Date(pkg.deliveredAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(pkg.status)}
                          <Button size="sm" variant="ghost">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {!deliveredPackages.length && (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No recent deliveries</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Kurir</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Check In</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Location</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAttendance?.map((record: any) => (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Kurir ID: {record.kurirId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {record.checkInTime && new Date(record.checkInTime).toLocaleTimeString()}
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {!pendingAttendance?.length && (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-1">No pending attendance</p>
                    <p className="text-sm">All attendance records have been processed</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Confirmations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Package ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Recipient</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Delivered At</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveredPackages.slice(0, 10).map((pkg: any) => (
                      <tr key={pkg.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {pkg.packageId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-gray-900">{pkg.recipientName}</div>
                          <div className="text-sm text-gray-500">{pkg.recipientPhone}</div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(pkg.status)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {pkg.deliveredAt && new Date(pkg.deliveredAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {!deliveredPackages.length && (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-1">No delivered packages</p>
                    <p className="text-sm">Delivered packages will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
