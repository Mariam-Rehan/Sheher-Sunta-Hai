// ComplaintForm.tsx

import { useState, useEffect } from "react"; // <--- Make sure useEffect is imported
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { X, MapPin, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ComplaintFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialLocation?: { lat: number; lng: number; address: string } | null;
}

const issueTypes = [
  "Road Damage",
  "Garbage Collection",
  "Water Supply",
  "Sewerage",
  "Traffic Issues",
  "Electricity",
  "Crime",
];

export function ComplaintForm({
  onClose,
  onSuccess,
  initialLocation,
}: ComplaintFormProps) {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState({ lat: 0, lng: 0, address: "" });
  const [locationLoading, setLocationLoading] = useState(false);
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);


  const [formData, setFormData] = useState({
    title: "",
    description: "",
    issueType: "",
    location: initialLocation?.address || "",
    latitude: initialLocation?.lat || 0,
    longitude: initialLocation?.lng || 0,
    image: null as File | null,
  });

  // ADDED: useEffect to synchronize 'location' state with 'initialLocation' prop
  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
      // Also update formData for consistency if initialLocation changes after initial render
      setFormData((prev) => ({
        ...prev,
        location: initialLocation.address,
        latitude: initialLocation.lat,
        longitude: initialLocation.lng,
      }));
    }
  }, [initialLocation]); //

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
            const data = await response.json();

            setLocation({
              lat,
              lng,
              address: data.address || `${lat}, ${lng}`,
            });

            setFormData((prev) => ({
              ...prev,
              location: data.address || `${lat}, ${lng}`,
            }));
          } catch (error) {
            console.error("Geocoding error:", error);
            setLocation({
              lat,
              lng,
              address: `${lat}, ${lng}`,
            });
            setFormData((prev) => ({
              ...prev,
              location: `${lat}, ${lng}`,
            }));
          }

          setLocationLoading(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "Location Error",
            description:
              "Could not get your location. Please enter it manually.",
            variant: "destructive",
          });
          setLocationLoading(false);
        },
      );
    } else {
      toast({
        title: "Geolocation Not Supported",
        description: "Please enter your location manually.",
        variant: "destructive",
      });
      setLocationLoading(false);
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) return;

    try {
      const response = await fetch(`/api/search-location?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSuggestions(data.slice(0, 5));
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast({
          title: "File Too Large",
          description: "Image must be less than 5MB.",
          variant: "destructive",
        });
        return;
      }
      setFormData((prev) => ({ ...prev, image: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.title ||
      !formData.description ||
      !formData.issueType ||
      !formData.location
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append("title", formData.title);
      submitData.append("description", formData.description);
      submitData.append("issueType", formData.issueType);
      submitData.append("location", formData.location);
      submitData.append("latitude", location.lat.toString()); // Uses 'location' state
      submitData.append("longitude", location.lng.toString()); // Uses 'location' state

      if (formData.image) {
        submitData.append("image", formData.image);
      }

      const response = await fetch("/api/complaints", {
        method: "POST",
        body: submitData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error response:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      toast({
        title: "✅ Complaint Submitted!",
        description: "Your complaint has been received and will be reviewed.",
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description:
          "There was an error submitting your complaint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    // MODIFIED: top-[72px] to start below the header
    <div className="fixed top-[72px] bottom-0 left-0 right-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Report a Civic Issue</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Brief description of the issue"
                required
              />
            </div>

            <div>
              <Label htmlFor="issueType">Issue Type *</Label>
              <Select
                value={formData.issueType}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, issueType: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {issueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Provide detailed information about the issue"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="location">Location *</Label>
              <div className="relative">
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prev) => ({ ...prev, location: value }));
                    fetchSuggestions(value);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200); // let click happen
                  }}
                  placeholder="Enter address or area"
                  required
                />

                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-md max-h-40 overflow-y-auto text-sm">
                    {suggestions.map((s, idx) => (
                      <li
                        key={idx}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          const newLat = parseFloat(s.lat);
                          const newLon = parseFloat(s.lon);
                          setFormData((prev) => ({
                            ...prev,
                            location: s.display_name,
                            latitude: newLat,
                            longitude: newLon,
                          }));
                          // ADDED: Update the 'location' state here as well
                          setLocation({
                            lat: newLat,
                            lng: newLon,
                            address: s.display_name,
                          });
                          setSuggestions([]);
                          setShowSuggestions(false);
                        }}
                      >
                        {s.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {location.address && (
                <p className="text-sm text-gray-600 mt-1">
                  Detected: {location.address}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="image">Attach Image (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1"
                />
                <Upload className="h-4 w-4 text-gray-400" />
              </div>
              {formData.image && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {formData.image.name}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Complaint"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
