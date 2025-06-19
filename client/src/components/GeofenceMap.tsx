import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Edit } from "lucide-react";

interface GeofenceZone {
  id: number;
  name: string;
  centerLat: string;
  centerLng: string;
  radius: number;
  isActive: boolean;
}

export const GeofenceMap = () => {
  const [selectedZone, setSelectedZone] = useState<GeofenceZone | null>(null);

  const { data: zones, isLoading } = useQuery<GeofenceZone[]>({
    queryKey: ["/api/geofence"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map placeholder - In a real app, use Google Maps or similar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Geofence Zones</span>
            </span>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Zone
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Interactive map would be displayed here</p>
              <p className="text-xs text-gray-400 mt-1">
                Integration with Google Maps or similar mapping service
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone list */}
      <Card>
        <CardHeader>
          <CardTitle>Active Zones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {zones?.map((zone) => (
              <div
                key={zone.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedZone?.id === zone.id
                    ? "border-primary bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedZone(zone)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{zone.name}</h4>
                  <Badge variant={zone.isActive ? "default" : "secondary"}>
                    {zone.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Radius: {zone.radius}m</p>
                  <p>
                    Center: {parseFloat(zone.centerLat).toFixed(4)},{" "}
                    {parseFloat(zone.centerLng).toFixed(4)}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="mt-2 h-6 px-2">
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>
            ))}
            
            {!zones?.length && (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No geofence zones configured</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
