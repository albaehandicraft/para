import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Package, QrCode, MapPin, Clock, CheckCircle, AlertCircle, Truck, Camera } from "lucide-react";

interface PackageItem {
  id: number;
  packageId: string;
  barcode: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  priority: string;
  status: string;
  notes?: string;
  createdAt: string;
}

const statusColors = {
  assigned: "bg-blue-100 text-blue-800",
  picked_up: "bg-yellow-100 text-yellow-800",
  in_transit: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800"
};

const priorityColors = {
  normal: "bg-gray-100 text-gray-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

export default function KurirPackages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanType, setScanType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Fetch packages for current courier
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["/api/packages/kurir", user?.id],
    enabled: !!user?.id,
  });

  // Manual package update mutation
  const updatePackageMutation = useMutation({
    mutationFn: async (data: { packageId: number; action: string; notes?: string }) => {
      const endpoint = data.action === "pickup" 
        ? `/api/packages/${data.packageId}/pickup`
        : `/api/packages/${data.packageId}/delivery`;
      const response = await apiRequest("POST", endpoint, { notes: data.notes });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Status berhasil diperbarui",
        description: `Paket ${variables.action === "pickup" ? "diambil" : "dikirim"} berhasil`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/packages/kurir"] });
      setSelectedPackage(null);
      setDeliveryNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Gagal mengupdate status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleScanSuccess = (result: any) => {
    setShowScanner(false);
    queryClient.invalidateQueries({ queryKey: ["/api/packages/kurir"] });
  };

  const handleManualAction = (pkg: PackageItem, action: "pickup" | "delivery") => {
    if (action === "delivery" && !deliveryNotes.trim()) {
      toast({
        title: "Catatan pengiriman diperlukan",
        description: "Silakan masukkan catatan untuk konfirmasi pengiriman",
        variant: "destructive",
      });
      return;
    }

    updatePackageMutation.mutate({
      packageId: pkg.id,
      action,
      notes: action === "delivery" ? deliveryNotes : undefined
    });
  };

  const openScanner = (type: "pickup" | "delivery") => {
    setScanType(type);
    setShowScanner(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "assigned": return <Package className="w-4 h-4" />;
      case "picked_up": return <Truck className="w-4 h-4" />;
      case "in_transit": return <MapPin className="w-4 h-4" />;
      case "delivered": return <CheckCircle className="w-4 h-4" />;
      case "failed": return <AlertCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "assigned": return "Ditugaskan";
      case "picked_up": return "Diambil";
      case "in_transit": return "Dalam Perjalanan";
      case "delivered": return "Terkirim";
      case "failed": return "Gagal";
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "normal": return "Normal";
      case "high": return "Tinggi";
      case "urgent": return "Mendesak";
      default: return priority;
    }
  };

  const PackageCard = ({ pkg }: { pkg: PackageItem }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg">{pkg.packageId}</h3>
            <p className="text-sm text-gray-600">{pkg.recipientName}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={priorityColors[pkg.priority as keyof typeof priorityColors] || "bg-gray-100 text-gray-800"}>
              {getPriorityText(pkg.priority)}
            </Badge>
            <Badge className={statusColors[pkg.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
              <span className="flex items-center gap-1">
                {getStatusIcon(pkg.status)}
                {getStatusText(pkg.status)}
              </span>
            </Badge>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            {pkg.recipientAddress}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            {new Date(pkg.createdAt).toLocaleDateString('id-ID')}
          </div>
          {pkg.notes && (
            <div className="text-sm text-gray-600">
              <strong>Catatan:</strong> {pkg.notes}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {pkg.status === "assigned" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openScanner("pickup")}
                className="flex-1"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Scan Ambil
              </Button>
              <Button
                size="sm"
                onClick={() => handleManualAction(pkg, "pickup")}
                disabled={updatePackageMutation.isPending}
                className="flex-1"
              >
                <Package className="w-4 h-4 mr-2" />
                {updatePackageMutation.isPending ? "Memproses..." : "Ambil Manual"}
              </Button>
            </>
          )}

          {(pkg.status === "picked_up" || pkg.status === "in_transit") && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openScanner("delivery")}
                className="flex-1"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Scan Kirim
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedPackage(pkg)}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Kirim Manual
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Memuat data paket...</div>
      </div>
    );
  }

  const assignedPackages = (packages as PackageItem[]).filter((pkg: PackageItem) => pkg.status === "assigned");
  const inTransitPackages = (packages as PackageItem[]).filter((pkg: PackageItem) => ["picked_up", "in_transit"].includes(pkg.status));
  const completedPackages = (packages as PackageItem[]).filter((pkg: PackageItem) => ["delivered", "failed"].includes(pkg.status));

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Manajemen Paket</h1>
        <p className="text-gray-600">Kelola pengambilan dan pengiriman paket Anda</p>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Scanner Barcode - {scanType === "pickup" ? "Pengambilan" : "Pengiriman"}
              </h2>
              <Button variant="ghost" onClick={() => setShowScanner(false)}>
                ✕
              </Button>
            </div>
            <BarcodeScanner
              scanType={scanType}
              onScanSuccess={handleScanSuccess}
            />
          </div>
        </div>
      )}

      {/* Delivery Notes Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Konfirmasi Pengiriman</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Paket: {selectedPackage.packageId}</p>
              <p className="text-sm text-gray-600 mb-2">Penerima: {selectedPackage.recipientName}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Catatan Pengiriman *
              </label>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Masukkan catatan pengiriman (wajib diisi)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPackage(null);
                  setDeliveryNotes("");
                }}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={() => handleManualAction(selectedPackage, "delivery")}
                disabled={updatePackageMutation.isPending || !deliveryNotes.trim()}
                className="flex-1"
              >
                {updatePackageMutation.isPending ? "Memproses..." : "Konfirmasi Kirim"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Scanner Pengambilan</h3>
                <p className="text-sm text-gray-600">Scan barcode untuk mengambil paket</p>
              </div>
              <Button onClick={() => openScanner("pickup")}>
                <Camera className="w-4 h-4 mr-2" />
                Scan
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Scanner Pengiriman</h3>
                <p className="text-sm text-gray-600">Scan barcode untuk konfirmasi kirim</p>
              </div>
              <Button onClick={() => openScanner("delivery")}>
                <Camera className="w-4 h-4 mr-2" />
                Scan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages Tabs */}
      <Tabs defaultValue="assigned" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assigned">
            Ditugaskan ({assignedPackages.length})
          </TabsTrigger>
          <TabsTrigger value="transit">
            Dalam Perjalanan ({inTransitPackages.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Selesai ({completedPackages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="mt-6">
          {assignedPackages.length === 0 ? (
            <Alert>
              <Package className="w-4 h-4" />
              <AlertDescription>
                Tidak ada paket yang ditugaskan untuk Anda saat ini.
              </AlertDescription>
            </Alert>
          ) : (
            <div>
              {assignedPackages.map((pkg: PackageItem) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transit" className="mt-6">
          {inTransitPackages.length === 0 ? (
            <Alert>
              <Truck className="w-4 h-4" />
              <AlertDescription>
                Tidak ada paket dalam perjalanan saat ini.
              </AlertDescription>
            </Alert>
          ) : (
            <div>
              {inTransitPackages.map((pkg: PackageItem) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedPackages.length === 0 ? (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                Belum ada paket yang selesai dikirim.
              </AlertDescription>
            </Alert>
          ) : (
            <div>
              {completedPackages.map((pkg: PackageItem) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}