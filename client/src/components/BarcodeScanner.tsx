import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Camera, X, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onScanSuccess?: (result: any) => void;
  scanType: "pickup" | "delivery";
}

export const BarcodeScanner = ({ onScanSuccess, scanType }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { getCurrentPosition } = useGeolocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scanMutation = useMutation({
    mutationFn: async (data: { barcode: string; scanType: string; location?: { lat: number; lng: number } }) => {
      const response = await apiRequest("POST", "/api/barcode/scan", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Scan successful",
        description: `Package ${scanType} recorded successfully`,
      });
      setScannedCode("");
      setIsScanning(false);
      onScanSuccess?.(data);
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
    },
    onError: (error: any) => {
      setError(error.message);
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startScanning = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (err) {
      setError("Camera access denied or not available");
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualInput = async () => {
    if (!scannedCode.trim()) {
      setError("Please enter a barcode");
      return;
    }

    try {
      const location = await getCurrentPosition();
      await scanMutation.mutateAsync({
        barcode: scannedCode.trim(),
        scanType,
        location,
      });
    } catch (locationError) {
      // Continue without location if permission denied
      await scanMutation.mutateAsync({
        barcode: scannedCode.trim(),
        scanType,
      });
    }
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="w-5 h-5" />
          <span>
            Barcode Scanner
            <Badge variant="outline" className="ml-2 capitalize">
              {scanType}
            </Badge>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isScanning ? (
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-48 bg-black rounded-lg"
              />
              <div className="absolute inset-0 border-2 border-dashed border-white rounded-lg m-8 flex items-center justify-center">
                <div className="text-white text-sm text-center">
                  Point camera at barcode
                </div>
              </div>
            </div>
            <Button onClick={stopScanning} variant="outline" className="w-full">
              <X className="w-4 h-4 mr-2" />
              Stop Scanning
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button onClick={startScanning} className="w-full">
              <Camera className="w-4 h-4 mr-2" />
              Start Camera Scanner
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or enter manually
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter barcode manually"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleManualInput();
                  }
                }}
              />
              <Button
                onClick={handleManualInput}
                disabled={!scannedCode.trim() || scanMutation.isPending}
                className="w-full"
              >
                {scanMutation.isPending ? (
                  "Processing..."
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Scan Barcode
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
