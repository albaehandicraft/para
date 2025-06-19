import { storage } from "../storage";

export class GeofencingService {
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  static async validateLocation(lat: number, lng: number): Promise<boolean> {
    const zones = await storage.getActiveGeofenceZones();
    
    for (const zone of zones) {
      const distance = this.calculateDistance(
        lat,
        lng,
        parseFloat(zone.centerLat),
        parseFloat(zone.centerLng)
      );
      
      if (distance <= zone.radius) {
        return true;
      }
    }
    
    return false;
  }

  static async getNearestZone(lat: number, lng: number) {
    const zones = await storage.getActiveGeofenceZones();
    let nearestZone = null;
    let minDistance = Infinity;

    for (const zone of zones) {
      const distance = this.calculateDistance(
        lat,
        lng,
        parseFloat(zone.centerLat),
        parseFloat(zone.centerLng)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestZone = { ...zone, distance };
      }
    }

    return nearestZone;
  }
}
