import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  AttendanceRecord, 
  AttendanceStats, 
  KurirAttendanceSummary,
  CheckInRequest, 
  CheckOutRequest, 
  AttendanceApprovalRequest,
  AttendanceFilters 
} from "@/types/attendance";
import { format } from "date-fns";

export const useAttendance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get attendance records with filters
  const useAttendanceRecords = (filters: AttendanceFilters) => {
    return useQuery<AttendanceRecord[]>({
      queryKey: [
        "/api/attendance/records", 
        {
          startDate: format(filters.startDate, "yyyy-MM-dd"),
          endDate: format(filters.endDate, "yyyy-MM-dd"),
          status: filters.status,
          kurirId: filters.kurirId,
          searchTerm: filters.searchTerm
        }
      ],
      queryFn: async () => {
        const params = new URLSearchParams({
          startDate: format(filters.startDate, "yyyy-MM-dd"),
          endDate: format(filters.endDate, "yyyy-MM-dd"),
        });
        
        if (filters.status !== "all") params.append("status", filters.status);
        if (filters.kurirId !== "all") params.append("kurirId", filters.kurirId.toString());
        if (filters.searchTerm) params.append("search", filters.searchTerm);

        const response = await fetch(`/api/attendance/records?${params}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        });
        
        if (!response.ok) throw new Error("Failed to fetch attendance records");
        return response.json();
      },
      staleTime: 0,
    });
  };

  // Get attendance statistics
  const useAttendanceStats = (startDate: Date, endDate: Date) => {
    return useQuery<AttendanceStats>({
      queryKey: [
        "/api/attendance/stats",
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      ],
      queryFn: async () => {
        const response = await fetch(
          `/api/attendance/stats?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );
        
        if (!response.ok) throw new Error("Failed to fetch attendance stats");
        return response.json();
      },
    });
  };

  // Get kurir attendance summary
  const useKurirAttendanceSummary = (startDate: Date, endDate: Date) => {
    return useQuery<KurirAttendanceSummary[]>({
      queryKey: [
        "/api/attendance/kurir-summary",
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      ],
      queryFn: async () => {
        const response = await fetch(
          `/api/attendance/kurir-summary?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );
        
        if (!response.ok) throw new Error("Failed to fetch kurir summary");
        return response.json();
      },
    });
  };

  // Get today's attendance for current user
  const useTodayAttendance = () => {
    return useQuery<AttendanceRecord | null>({
      queryKey: ["/api/attendance/today"],
      queryFn: async () => {
        const response = await fetch("/api/attendance/today", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        });
        
        if (!response.ok) throw new Error("Failed to fetch today's attendance");
        return response.json();
      },
    });
  };

  // Get attendance history for current user
  const useAttendanceHistory = (limit: number = 30) => {
    return useQuery<AttendanceRecord[]>({
      queryKey: ["/api/attendance/history", limit],
      queryFn: async () => {
        const response = await fetch(`/api/attendance/history?limit=${limit}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        });
        
        if (!response.ok) throw new Error("Failed to fetch attendance history");
        return response.json();
      },
    });
  };

  // Check-in mutation
  const useCheckIn = () => {
    return useMutation<AttendanceRecord, Error, CheckInRequest>({
      mutationFn: async (data: CheckInRequest) => {
        const response = await apiRequest("POST", "/api/attendance/checkin", data);
        return response.json();
      },
      onSuccess: () => {
        toast({
          title: "Check-in successful",
          description: "You have been checked in successfully",
        });
        
        // Invalidate attendance queries
        queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      },
      onError: (error) => {
        toast({
          title: "Check-in failed",
          description: error.message || "Failed to check in",
          variant: "destructive",
        });
      },
    });
  };

  // Check-out mutation
  const useCheckOut = () => {
    return useMutation<AttendanceRecord, Error, CheckOutRequest>({
      mutationFn: async (data: CheckOutRequest) => {
        const response = await apiRequest("POST", "/api/attendance/checkout", data);
        return response.json();
      },
      onSuccess: () => {
        toast({
          title: "Check-out successful",
          description: "You have been checked out successfully",
        });
        
        // Invalidate attendance queries
        queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      },
      onError: (error) => {
        toast({
          title: "Check-out failed",
          description: error.message || "Failed to check out",
          variant: "destructive",
        });
      },
    });
  };

  // Approve/reject attendance mutation
  const useApproveAttendance = () => {
    return useMutation<AttendanceRecord, Error, AttendanceApprovalRequest>({
      mutationFn: async (data: AttendanceApprovalRequest) => {
        const response = await apiRequest("PUT", `/api/attendance/${data.id}/approve`, {
          status: data.status,
          notes: data.notes,
        });
        return response.json();
      },
      onSuccess: (_, variables) => {
        toast({
          title: "Attendance updated",
          description: `Attendance has been ${variables.status}`,
        });
        
        // Invalidate all attendance-related queries
        queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      },
      onError: (error) => {
        toast({
          title: "Failed to update attendance",
          description: error.message || "An error occurred",
          variant: "destructive",
        });
      },
    });
  };

  return {
    useAttendanceRecords,
    useAttendanceStats,
    useKurirAttendanceSummary,
    useTodayAttendance,
    useAttendanceHistory,
    useCheckIn,
    useCheckOut,
    useApproveAttendance,
  };
};