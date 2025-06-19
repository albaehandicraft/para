import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Clock,
  CheckCircle,
  Package,
  QrCode,
  Truck,
  AlertCircle,
  LogIn,
  LogOut,
  Navigation,
} from "lucide-react";

export default function KurirDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { latitude, longitude, error: geoError, getCurrentPosition } = useGeolocation();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Get today's attendance
  const { data: todayAttendance } = useQuery({
    queryKey: ["/api/attendance/today", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `/api/attendance?startDate=${today}&endDate=${today}`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const data = await response.json();
      return data.find((record: any) => record.kurirId === user?.id);
    },
    enabled: !!user?.id,
  });

  // Get assigned packages
  const { data: assignedPackages, isLoading: packagesLoading } = useQuery({
    queryKey: ["/api/packages/kurir", user?.id],
    enabled: !!user?.id,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (location: { lat: number; lng: number }) => {
      const response = await apiRequest("POST", "/api/attendance/checkin", location);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Checked in successfully",
        description: "Your attendance has been recorded",
      });
      setIsCheckedIn(true);
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async (location: { lat: number; lng: number }) => {
      const response = await apiRequest("POST", "/api/attendance/checkout", location);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Checked out successfully",
        description: "Have a great day!",
      });
      setIsCheckedIn(false);
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
    },
    onError: (error: any) => {
      toast({
        title: "Check-out failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update check-in status based on attendance data
  useEffect(() => {
    if (todayAttendance) {
      setIsCheckedIn(!!todayAttendance.checkInTime && !todayAttendance.checkOutTime);
    }
  }, [todayAttendance]);

  const handleCheckIn = async () => {
    try {
      const position = await getCurrentPosition();
      checkInMutation.mutate(position);
    } catch (error) {
      toast({
        title: "Location required",
        description: "Please enable location access to check in",
        variant: "destructive",
      });
    }
  };

  const handleCheckOut = async () => {
    try {
      const position = await getCurrentPosition();
      checkOutMutation.mutate(position);
    } catch (error) {
      toast({
        title: "Location required",
        description: "Please enable location access to check out",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      assigned: "bg-blue-100 text-blue-800",
      picked_up: "bg-yellow-100 text-yellow-800",
      in_transit: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.assigned}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const activePackages = assignedPackages?.filter((pkg: any) => 
    ["assigned", "picked_up", "in_transit"].includes(pkg.status)
  ) || [];

  const completedToday = assignedPackages?.filter((pkg: any) => 
    pkg.status === "delivered" && 
    new Date(pkg.deliveredAt).toDateString() === new Date().toDateString()
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kurir Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.fullName}</p>
        </div>
        <div className="flex items-center space-x-3">
          {!isCheckedIn ? (
            <Button 
              onClick={handleCheckIn}
              disabled={checkInMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {checkInMutation.isPending ? "Checking in..." : "Check In"}
            </Button>
          ) : (
            <Button 
              onClick={handleCheckOut}
              disabled={checkOutMutation.isPending}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {checkOutMutation.isPending ? "Checking out..." : "Check Out"}
            </Button>
          )}
        </div>
      </div>

      {/* Status Alerts */}
      {geoError && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Location access is required for attendance tracking. {geoError}
          </AlertDescription>
        </Alert>
      )}

      {!isCheckedIn && (
        <Alert>
          <Clock className="w-4 h-4" />
          <AlertDescription>
            Don't forget to check in to start your workday and track your attendance.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Deliveries</p>
                <p className="text-2xl font-bold text-blue-600">{activePackages.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">{completedToday.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-lg font-bold text-gray-900">
                  {isCheckedIn ? "On Duty" : "Off Duty"}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isCheckedIn ? "bg-green-100" : "bg-gray-100"
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  isCheckedIn ? "bg-green-500" : "bg-gray-400"
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Location</p>
                <p className="text-sm text-gray-900">
                  {latitude && longitude ? "Available" : "Unavailable"}
                </p>
              </div>
              <MapPin className={`w-8 h-8 ${
                latitude && longitude ? "text-green-600" : "text-gray-400"
              }`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Barcode Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="w-5 h-5" />
              <span>Barcode Scanner</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showScanner ? (
              <div className="space-y-4">
                <BarcodeScanner
                  scanType="delivery"
                  onScanSuccess={(result) => {
                    setShowScanner(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/packages/kurir"] });
                  }}
                />
                <Button 
                  variant="outline" 
                  onClick={() => setShowScanner(false)}
                  className="w-full"
                >
                  Close Scanner
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <QrCode className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Scan Package Barcode</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Scan barcodes to update delivery status
                  </p>
                </div>
                <Button onClick={() => setShowScanner(true)} className="w-full">
                  Open Scanner
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Packages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Truck className="w-5 h-5" />
              <span>My Packages</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {packagesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {activePackages.map((pkg: any) => (
                  <div key={pkg.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{pkg.packageId}</span>
                      {getStatusBadge(pkg.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">{pkg.recipientName}</p>
                      <p className="text-xs text-gray-500 truncate">{pkg.recipientAddress}</p>
                      <p className="text-xs text-gray-500">{pkg.recipientPhone}</p>
                    </div>
                  </div>
                ))}
                
                {activePackages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No active packages assigned</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Attendance Info */}
      {todayAttendance && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Check In Time</p>
                <p className="text-lg font-semibold text-gray-900">
                  {todayAttendance.checkInTime 
                    ? new Date(todayAttendance.checkInTime).toLocaleTimeString()
                    : "Not checked in"
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Check Out Time</p>
                <p className="text-lg font-semibold text-gray-900">
                  {todayAttendance.checkOutTime 
                    ? new Date(todayAttendance.checkOutTime).toLocaleTimeString()
                    : "Not checked out"
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <div className="mt-1">
                  {getStatusBadge(todayAttendance.status)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
