import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Eye, Edit, User, MapPin, Clock } from "lucide-react";

interface PackageData {
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  priority: string;
  assignedKurirId?: number;
  notes?: string;
  weight?: number;
  dimensions?: string;
  value?: number;
  senderName?: string;
  senderPhone?: string;
  pickupAddress?: string;
}

export default function PengirimanManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<PackageData>({
    recipientName: "",
    recipientPhone: "",
    recipientAddress: "",
    priority: "normal",
    notes: "",
    weight: 0,
    dimensions: "",
    value: 0,
    senderName: "",
    senderPhone: "",
    pickupAddress: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: packages = [], isLoading: packagesLoading } = useQuery<any[]>({
    queryKey: ["/api/packages"],
  });

  const { data: kurirs = [] } = useQuery({
    queryKey: ["/api/users", { role: "kurir" }],
    queryFn: async () => {
      const response = await fetch("/api/users?role=kurir", {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch kurirs");
      return response.json();
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: PackageData) => {
      const response = await apiRequest("POST", "/api/packages", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Package created",
        description: "New pengiriman has been created successfully",
      });
      setIsCreateModalOpen(false);
      setFormData({
        recipientName: "",
        recipientPhone: "",
        recipientAddress: "",
        priority: "normal",
      });
      // Force invalidate all package-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/packages"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/packages/available"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/packages/kurir"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"], refetchType: "all" });
      
      // Clear and refetch cache manually
      queryClient.removeQueries({ queryKey: ["/api/packages"] });
      queryClient.removeQueries({ queryKey: ["/api/packages/available"] });
      
      // Force refetch after a short delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/packages"] });
        queryClient.refetchQueries({ queryKey: ["/api/packages/available"] });
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create package",
        variant: "destructive",
      });
    },
  });

  const assignPackageMutation = useMutation({
    mutationFn: async ({ packageId, kurirId }: { packageId: number; kurirId: number }) => {
      const response = await apiRequest("PUT", `/api/packages/${packageId}/assign`, { kurirId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Package assigned",
        description: "Package has been assigned to kurir successfully",
      });
      // Force invalidate all package-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/packages"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/packages/kurir"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/packages/available"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"], refetchType: "all" });
      
      // Clear and refetch cache manually
      queryClient.removeQueries({ queryKey: ["/api/packages"] });
      queryClient.removeQueries({ queryKey: ["/api/packages/kurir"] });
      queryClient.removeQueries({ queryKey: ["/api/packages/available"] });
      
      // Force refetch after a short delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/packages"] });
        queryClient.refetchQueries({ queryKey: ["/api/packages/kurir"] });
        queryClient.refetchQueries({ queryKey: ["/api/packages/available"] });
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign package",
        variant: "destructive",
      });
    },
  });

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    createPackageMutation.mutate(formData);
  };

  const handleAssignPackage = (packageId: number, kurirId: number) => {
    assignPackageMutation.mutate({ packageId, kurirId });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      created: "bg-gray-100 text-gray-800",
      assigned: "bg-blue-100 text-blue-800",
      picked_up: "bg-yellow-100 text-yellow-800",
      in_transit: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.created}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      normal: "bg-gray-100 text-gray-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };

    return (
      <Badge variant="outline" className={priorityColors[priority as keyof typeof priorityColors]}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  if (packagesLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Pengiriman Management</h1>
          <p className="text-gray-600 mt-1">Manage all package deliveries and assignments</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create New Pengiriman
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Pengiriman</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePackage} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="kurir">Assign to Kurir (Optional)</Label>
                  <Select
                    value={formData.assignedKurirId?.toString() || ""}
                    onValueChange={(value) => 
                      setFormData({ 
                        ...formData, 
                        assignedKurirId: value ? parseInt(value) : undefined 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Kurir" />
                    </SelectTrigger>
                    <SelectContent>
                      {kurirs?.map((kurir: any) => (
                        <SelectItem key={kurir.id} value={kurir.id.toString()}>
                          {kurir.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sender Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Sender Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="senderName">Sender Name</Label>
                    <Input
                      id="senderName"
                      value={formData.senderName}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                      placeholder="Name of the sender"
                    />
                  </div>
                  <div>
                    <Label htmlFor="senderPhone">Sender Phone</Label>
                    <Input
                      id="senderPhone"
                      type="tel"
                      value={formData.senderPhone}
                      onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                      placeholder="Sender phone number"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="pickupAddress">Pickup Address</Label>
                  <Textarea
                    id="pickupAddress"
                    rows={2}
                    value={formData.pickupAddress}
                    onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                    placeholder="Address where package will be picked up"
                  />
                </div>
              </div>

              {/* Recipient Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Recipient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recipientName">Full Name *</Label>
                    <Input
                      id="recipientName"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                      required
                      placeholder="Recipient full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipientPhone">Phone Number *</Label>
                    <Input
                      id="recipientPhone"
                      type="tel"
                      value={formData.recipientPhone}
                      onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                      required
                      placeholder="Recipient phone number"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="recipientAddress">Delivery Address *</Label>
                  <Textarea
                    id="recipientAddress"
                    rows={3}
                    value={formData.recipientAddress}
                    onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                    required
                    placeholder="Complete delivery address with landmarks"
                  />
                </div>
              </div>

              {/* Package Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Package Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dimensions">Dimensions (cm)</Label>
                    <Input
                      id="dimensions"
                      value={formData.dimensions}
                      onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                      placeholder="L x W x H"
                    />
                  </div>
                  <div>
                    <Label htmlFor="value">Declared Value (IDR)</Label>
                    <Input
                      id="value"
                      type="number"
                      min="0"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Special Instructions</Label>
                  <Textarea
                    id="notes"
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special handling instructions or notes"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createPackageMutation.isPending}>
                  {createPackageMutation.isPending ? "Creating..." : "Create Pengiriman"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Pengiriman</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Package ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Recipient</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Kurir</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Priority</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg: any) => (
                  <tr key={pkg.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {pkg.packageId}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {pkg.recipientName}
                        </div>
                        <div className="text-sm text-gray-500">{pkg.recipientPhone}</div>
                        <div className="text-xs text-gray-400 truncate max-w-xs">
                          {pkg.recipientAddress}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {pkg.assignedKurirId ? (
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm">Assigned</span>
                        </div>
                      ) : (
                        <Select
                          onValueChange={(value) => handleAssignPackage(pkg.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {kurirs?.map((kurir: any) => (
                              <SelectItem key={kurir.id} value={kurir.id.toString()}>
                                {kurir.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getPriorityBadge(pkg.priority)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(pkg.status)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(pkg.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {!packages?.length && (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-1">No packages found</p>
                <p className="text-sm">Create your first pengiriman to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
