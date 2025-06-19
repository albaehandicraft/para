import { storage } from "../storage";

export class BarcodeService {
  static generateBarcode(packageId: string): string {
    // Generate a simple barcode based on package ID
    const timestamp = Date.now().toString().slice(-6);
    return `${packageId}-${timestamp}`;
  }

  static async scanBarcode(
    barcode: string,
    scannedBy: number,
    scanType: "pickup" | "delivery",
    location?: { lat: number; lng: number }
  ) {
    // Find package by barcode
    const packages = await storage.getPackages();
    const package_ = packages.find(p => p.barcode === barcode);

    if (!package_) {
      throw new Error("Package not found for this barcode");
    }

    // Validate scan type based on current status
    if (scanType === "pickup" && package_.status !== "assigned") {
      throw new Error("Package is not ready for pickup");
    }

    if (scanType === "delivery" && package_.status !== "in_transit") {
      throw new Error("Package is not ready for delivery");
    }

    // Update package status
    const newStatus = scanType === "pickup" ? "picked_up" : "delivered";
    await storage.updatePackageStatus(package_.id, newStatus, scannedBy);

    // Log the scan
    await storage.logBarcodeScan(package_.id, scannedBy, scanType, location);

    return package_;
  }

  static async getRecentScans(limit: number = 10) {
    // This would need to be implemented with proper joins
    // For now, return mock data structure
    return [];
  }
}
