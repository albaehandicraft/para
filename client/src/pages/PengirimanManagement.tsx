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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Eye, Edit, User, MapPin, Clock, Search, Scan } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [formData, setFormData] = useState<PackageData>({
    recipientName: "",
    recipientPhone: "",
    recipientAddress: "",
    priority: "normal",
    notes: "",
    weight: 1,
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

  const { data: kurirUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const users = await response.json();
      return users.filter((user: any) => user.role === "kurir");
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
        notes: "",
        weight: 1,
        dimensions: "",
        value: 0,
        senderName: "",
        senderPhone: "",
        pickupAddress: "",
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
    
    // Validate required fields
    if (!formData.senderName?.trim()) {
      toast({ title: "Error", description: "Sender name is required", variant: "destructive" });
      return;
    }
    if (!formData.senderPhone?.trim()) {
      toast({ title: "Error", description: "Sender phone is required", variant: "destructive" });
      return;
    }
    if (!formData.pickupAddress?.trim()) {
      toast({ title: "Error", description: "Pickup address is required", variant: "destructive" });
      return;
    }
    if (!formData.recipientName.trim()) {
      toast({ title: "Error", description: "Recipient name is required", variant: "destructive" });
      return;
    }
    if (!formData.recipientPhone.trim()) {
      toast({ title: "Error", description: "Recipient phone is required", variant: "destructive" });
      return;
    }
    if (!formData.recipientAddress.trim()) {
      toast({ title: "Error", description: "Recipient address is required", variant: "destructive" });
      return;
    }
    if (!formData.weight || formData.weight <= 0) {
      toast({ title: "Error", description: "Package weight must be greater than 0", variant: "destructive" });
      return;
    }
    if (!formData.dimensions?.trim()) {
      toast({ title: "Error", description: "Package dimensions are required", variant: "destructive" });
      return;
    }
    if (!formData.value || formData.value <= 0) {
      toast({ title: "Error", description: "Package value must be greater than 0", variant: "destructive" });
      return;
    }
    
    createPackageMutation.mutate(formData);
  };

  const handleAssignPackage = (packageId: number, kurirId: number) => {
    assignPackageMutation.mutate({ packageId, kurirId });
  };

  const handleBarcodeSearch = (result: any) => {
    if (result?.text) {
      setSearchQuery(result.text);
      setIsScannerOpen(false);
      toast({
        title: "Barcode scanned",
        description: `Searching for: ${result.text}`,
      });
    }
  };

  // Filter packages based on search query and status
  const filteredPackages = (packages || []).filter((pkg: any) => {
    const matchesSearch = searchQuery === "" || 
      pkg.packageId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.recipientPhone?.includes(searchQuery) ||
      pkg.resi?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "created") return matchesSearch && pkg.status === "created";
    if (activeTab === "assigned") return matchesSearch && pkg.status === "assigned";
    if (activeTab === "in_transit") return matchesSearch && ["picked_up", "in_transit"].includes(pkg.status);
    if (activeTab === "completed") return matchesSearch && ["delivered", "failed"].includes(pkg.status);
    
    return matchesSearch;
  });

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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Pengiriman</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePackage} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sender Information */}
                <div className="col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Sender Information</h3>
                </div>
                <div>
                  <Label htmlFor="senderName">Sender Name</Label>
                  <Input
                    id="senderName"
                    value={formData.senderName}
                    onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                    placeholder="Full name of sender"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="senderPhone">Sender Phone</Label>
                  <Input
                    id="senderPhone"
                    value={formData.senderPhone}
                    onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                    placeholder="Sender phone number"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="pickupAddress">Pickup Address</Label>
                  <Textarea
                    id="pickupAddress"
                    value={formData.pickupAddress}
                    onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                    placeholder="Complete pickup address"
                    required
                  />
                </div>

                {/* Recipient Information */}
                <div className="col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2 mt-6">Recipient Information</h3>
                </div>
                <div>
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    placeholder="Full name of recipient"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="recipientPhone">Recipient Phone</Label>
                  <Input
                    id="recipientPhone"
                    value={formData.recipientPhone}
                    onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                    placeholder="Recipient phone number"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="recipientAddress">Recipient Address</Label>
                  <Textarea
                    id="recipientAddress"
                    value={formData.recipientAddress}
                    onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                    placeholder="Complete delivery address"
                    required
                  />
                </div>

                {/* Package Details */}
                <div className="col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2 mt-6">Package Details</h3>
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                    placeholder="Package weight in kg"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dimensions">Dimensions (LxWxH cm)</Label>
                  <Input
                    id="dimensions"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    placeholder="e.g., 30x20x15"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="value">Declared Value (Rp)</Label>
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })}
                    placeholder="Package value in Rupiah"
                    required
                  />
                </div>
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

                {/* Assignment and Notes */}
                <div className="col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2 mt-6">Assignment & Notes</h3>
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
                      <SelectValue placeholder="Select kurir" />
                    </SelectTrigger>
                    <SelectContent>
                      {kurirUsers.map((kurir: any) => (
                        <SelectItem key={kurir.id} value={kurir.id.toString()}>
                          {kurir.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="notes">Special Instructions</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special handling instructions or delivery notes"
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

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Packages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by Package ID, Barcode, Recipient Name, Phone, or Resi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setIsScannerOpen(true)}
              className="whitespace-nowrap"
            >
              <Scan className="w-4 h-4 mr-2" />
              Scan Barcode
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Package Categories */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 rounded-none border-b">
              <TabsTrigger value="all" className="rounded-none">
                All ({(packages || []).length})
              </TabsTrigger>
              <TabsTrigger value="created" className="rounded-none">
                Created ({(packages || []).filter((p: any) => p.status === "created").length})
              </TabsTrigger>
              <TabsTrigger value="assigned" className="rounded-none">
                Assigned ({(packages || []).filter((p: any) => p.status === "assigned").length})
              </TabsTrigger>
              <TabsTrigger value="in_transit" className="rounded-none">
                In Transit ({(packages || []).filter((p: any) => ["picked_up", "in_transit"].includes(p.status)).length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-none">
                Completed ({(packages || []).filter((p: any) => ["delivered", "failed"].includes(p.status)).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="p-6">
              {filteredPackages.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No packages found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery ? `No packages match "${searchQuery}"` : "No packages in this category"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Package ID</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Resi</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Recipient</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Phone</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Kurir</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Priority</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPackages.map((pkg: any) => (
                        <tr key={pkg.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{pkg.packageId}</div>
                            <div className="text-xs text-gray-500">{pkg.barcode}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-medium text-blue-600">{pkg.resi}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{pkg.recipientName}</div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">{pkg.recipientAddress}</div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{pkg.recipientPhone}</td>
                          <td className="py-3 px-4">
                            {pkg.assignedKurir ? (
                              <div className="flex items-center">
                                <User className="w-3 h-3 mr-1 text-blue-500" />
                                <span className="text-sm font-medium text-blue-600">{pkg.assignedKurir}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4">{getPriorityBadge(pkg.priority)}</td>
                          <td className="py-3 px-4">{getStatusBadge(pkg.status)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              {pkg.status === "created" && (
                                <Select onValueChange={(value) => handleAssignPackage(pkg.id, parseInt(value))}>
                                  <SelectTrigger className="w-24">
                                    <SelectValue placeholder="Assign" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {kurirUsers.map((kurir: any) => (
                                      <SelectItem key={kurir.id} value={kurir.id.toString()}>
                                        {kurir.fullName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scan Barcode</DialogTitle>
            </DialogHeader>
            <BarcodeScanner
              onScanSuccess={handleBarcodeSearch}
              scanType="pickup"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}