import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Plus, Edit, Trash2, Navigation } from "lucide-react";

interface GeofenceZone {
  id: number;
  name: string;
  centerLat: string;
  centerLng: string;
  radius: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
}

const geofenceFormSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  centerLat: z.string().min(1, "Latitude is required"),
  centerLng: z.string().min(1, "Longitude is required"),
  radius: z.number().min(10, "Minimum radius is 10 meters").max(5000, "Maximum radius is 5000 meters"),
  isActive: z.boolean().default(true),
});

type GeofenceFormData = z.infer<typeof geofenceFormSchema>;

export default function GeofencingSetup() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<GeofenceZone | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<GeofenceFormData>({
    resolver: zodResolver(geofenceFormSchema),
    defaultValues: {
      name: "",
      centerLat: "",
      centerLng: "",
      radius: 100,
      isActive: true,
    },
  });

  // Fetch geofence zones
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["/api/geofence"],
  });

  // Create geofence zone mutation
  const createZoneMutation = useMutation({
    mutationFn: async (data: GeofenceFormData) => {
      return apiRequest({
        url: "/api/geofence",
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofence"] });
      toast({
        title: "Success",
        description: "Geofence zone created successfully",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create geofence zone",
        variant: "destructive",
      });
    },
  });

  // Update geofence zone mutation
  const updateZoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<GeofenceFormData> }) => {
      return apiRequest({
        url: `/api/geofence/${id}`,
        method: "PUT",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofence"] });
      toast({
        title: "Success",
        description: "Geofence zone updated successfully",
      });
      setDialogOpen(false);
      setEditingZone(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update geofence zone",
        variant: "destructive",
      });
    },
  });

  // Delete geofence zone mutation
  const deleteZoneMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest({
        url: `/api/geofence/${id}`,
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofence"] });
      toast({
        title: "Success",
        description: "Geofence zone deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete geofence zone",
        variant: "destructive",
      });
    },
  });

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue("centerLat", position.coords.latitude.toString());
          form.setValue("centerLng", position.coords.longitude.toString());
          toast({
            title: "Location detected",
            description: "Current location set as zone center",
          });
        },
        (error) => {
          toast({
            title: "Location error",
            description: "Could not detect current location",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Not supported",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (zone: GeofenceZone) => {
    setEditingZone(zone);
    form.setValue("name", zone.name);
    form.setValue("centerLat", zone.centerLat);
    form.setValue("centerLng", zone.centerLng);
    form.setValue("radius", zone.radius);
    form.setValue("isActive", zone.isActive);
    setDialogOpen(true);
  };

  const handleSubmit = (data: GeofenceFormData) => {
    if (editingZone) {
      updateZoneMutation.mutate({ id: editingZone.id, data });
    } else {
      createZoneMutation.mutate(data);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingZone(null);
    form.reset();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Geofencing Setup</h1>
          <p className="text-gray-600 mt-1">
            Configure attendance zones where couriers can check in and out
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingZone(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingZone ? "Edit Geofence Zone" : "Create New Geofence Zone"}
              </DialogTitle>
              <DialogDescription>
                Define a geographic area where couriers can perform attendance check-ins.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zone Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Office Building, Warehouse A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="centerLat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input placeholder="-6.2088" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="centerLng"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input placeholder="106.8456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  className="w-full"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Use Current Location
                </Button>

                <FormField
                  control={form.control}
                  name="radius"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Radius (meters)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="10"
                          max="5000"
                          placeholder="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Zone</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow check-ins in this zone
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createZoneMutation.isPending || updateZoneMutation.isPending}
                  >
                    {editingZone ? "Update Zone" : "Create Zone"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone: GeofenceZone) => (
            <Card key={zone.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{zone.name}</CardTitle>
                  <Badge variant={zone.isActive ? "default" : "secondary"}>
                    {zone.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>
                  Zone ID: {zone.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {parseFloat(zone.centerLat).toFixed(4)}, {parseFloat(zone.centerLng).toFixed(4)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Radius:</strong> {zone.radius}m
                </div>
                <div className="text-xs text-gray-500">
                  Created: {new Date(zone.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(zone)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteZoneMutation.mutate(zone.id)}
                    disabled={deleteZoneMutation.isPending}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {zones.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No geofence zones configured</h3>
            <p className="text-gray-600 mb-4">
              Create your first geofence zone to enable location-based attendance tracking.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Zone
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}