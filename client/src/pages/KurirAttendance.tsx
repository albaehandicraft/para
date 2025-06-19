import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { RoleGuard } from "@/components/RoleGuard";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapPin, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface AttendanceRecord {
  id: number;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  notes: string | null;
  checkInLat: string | null;
  checkInLng: string | null;
  checkOutLat: string | null;
  checkOutLng: string | null;
}

export default function KurirAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { latitude, longitude, error: geoError, loading: geoLoading } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
  });

  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);

  // Get today's attendance
  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["/api/attendance/today"],
    enabled: !!user,
  });

  // Get attendance history
  const { data: attendanceHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/attendance/history"],
    enabled: !!user,
  });

  useEffect(() => {
    if (attendance) {
      setTodayAttendance(attendance);
    }
  }, [attendance]);

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!latitude || !longitude) {
        throw new Error("Location is required for check-in");
      }
      const response = await apiRequest("POST", "/api/attendance/checkin", {
        lat: latitude,
        lng: longitude,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setTodayAttendance(data);
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
      toast({
        title: "Check-in Successful",
        description: "You have successfully checked in for today.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!latitude || !longitude) {
        throw new Error("Location is required for check-out");
      }
      const response = await apiRequest("POST", "/api/attendance/checkout", {
        lat: latitude,
        lng: longitude,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setTodayAttendance(data);
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
      toast({
        title: "Check-out Successful",
        description: "You have successfully checked out for today.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Check-out Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Present</Badge>;
      case "pending":
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const canCheckIn = !todayAttendance?.checkInTime;
  const canCheckOut = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime;

  if (attendanceLoading) {
    return (
      <RoleGuard roles={["kurir"]}>
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard roles={["kurir"]}>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Attendance</h1>
          <p className="text-muted-foreground">Track your daily attendance with GPS verification</p>
        </div>

        {geoError && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Location access is required for attendance tracking. Please enable location services and refresh the page.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {/* Today's Attendance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Attendance
              </CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  {todayAttendance ? getStatusBadge(todayAttendance.status) : <Badge variant="outline">Not checked in</Badge>}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Check-in Time</p>
                    <p className="text-sm text-muted-foreground">
                      {todayAttendance?.checkInTime 
                        ? format(new Date(todayAttendance.checkInTime), "HH:mm:ss")
                        : "Not checked in"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Check-out Time</p>
                    <p className="text-sm text-muted-foreground">
                      {todayAttendance?.checkOutTime 
                        ? format(new Date(todayAttendance.checkOutTime), "HH:mm:ss")
                        : "Not checked out"
                      }
                    </p>
                  </div>
                </div>

                {latitude && longitude && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Current Location: {latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => checkInMutation.mutate()}
                    disabled={!canCheckIn || geoLoading || !latitude || !longitude || checkInMutation.isPending}
                    className="flex-1"
                  >
                    {checkInMutation.isPending ? "Checking in..." : "Check In"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => checkOutMutation.mutate()}
                    disabled={!canCheckOut || geoLoading || !latitude || !longitude || checkOutMutation.isPending}
                    className="flex-1"
                  >
                    {checkOutMutation.isPending ? "Checking out..." : "Check Out"}
                  </Button>
                </div>

                {geoLoading && (
                  <p className="text-sm text-muted-foreground text-center">
                    Getting your location...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendance History */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Your recent attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : attendanceHistory && attendanceHistory.length > 0 ? (
                <div className="space-y-4">
                  {attendanceHistory.map((record: AttendanceRecord) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          {format(new Date(record.date), "EEEE, MMM d, yyyy")}
                        </p>
                        {getStatusBadge(record.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Check-in: </span>
                          {record.checkInTime 
                            ? format(new Date(record.checkInTime), "HH:mm:ss")
                            : "Not checked in"
                          }
                        </div>
                        <div>
                          <span className="text-muted-foreground">Check-out: </span>
                          {record.checkOutTime 
                            ? format(new Date(record.checkOutTime), "HH:mm:ss")
                            : "Not checked out"
                          }
                        </div>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Notes: </span>
                          {record.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No attendance records found.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}