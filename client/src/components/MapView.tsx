// MapView.tsx

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { apiRequest } from "@/lib/queryClient";
import { type Complaint } from "@shared/schema";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";
import { useMap } from "react-leaflet";
import { ColoredHeatmap } from "./ColoredHeatmap";
import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "./ui/card"

const filterByTime = (complaints: Complaint[], range: string) => {
  if (range === 'all') return complaints;

  const now = new Date();
  let cutoff: Date;

  if (range === 'week') {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  } else if (range === 'month') {
    cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); // 1 month ago
  } else {
    return complaints;
  }

  return complaints.filter(c => new Date(c.createdAt) >= cutoff);
};



// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapViewProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  onComplaintClick: (complaint: Complaint) => void;
  complaints: Complaint[];
  timeRangeFilter: string;
}


function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;

      // Get address from coordinates
      try {
        const response = await apiRequest(
          "GET",
          `/api/geocode?lat=${lat}&lng=${lng}`,
        );
        const data = await response.json();
        onLocationSelect(lat, lng, data.address);
      } catch (error) {
        console.error("Geocoding error:", error);
        onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    },
  });
  return null;
}

// Define Pakistan's bounding box coordinates
const PAKISTAN_BOUNDS: L.LatLngBoundsExpression = [
  [23.8047, 60.8728], // Southwest coordinates (minLat, minLng)
  [37.0839, 77.1203],  // Northeast coordinates (maxLat, maxLng)
];

// Define a suitable center for Pakistan
const PAKISTAN_CENTER: [number, number] = [30.3753, 69.3451]; // A general central point for Pakistan

  export function MapView({ onLocationSelect, onComplaintClick, complaints, timeRangeFilter }: MapViewProps) {
  const mapRef = useRef<L.Map>(null);
  // Initialize userLocation to PAKISTAN_CENTER
  const [userLocation, setUserLocation] = useState<[number, number]>(PAKISTAN_CENTER);
    const filteredComplaints = filterByTime(complaints, timeRangeFilter); // ✅ NOW it's inside and safe

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(coords);

          // Pan to user location if within bounds or near center
          if (mapRef.current) {
            mapRef.current.setView(coords, 13);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to PAKISTAN_CENTER if location is not available
          setUserLocation(PAKISTAN_CENTER);
        },
      );
    } else {
      // Default to PAKISTAN_CENTER if geolocation is not supported
      setUserLocation(PAKISTAN_CENTER);
    }
  }, []);

  // Removed the loading spinner as userLocation will always be initialized to PAKISTAN_CENTER
  // This ensures the map renders immediately

  return (
    <Card className="w-full animate-fade-in-up transition duration-500 delay-75 rounded-2xl shadow-md">

      {/* Legend + Map Together */}
          <CardHeader className="bg-white px-6 py-4 border-b">
        <h2 className="text-base font-semibold text-gray-800">Issue Type Legend</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2 text-sm">
          {Object.entries({
            "Road Damage": "#d73027",
            "Garbage Collection": "#1a9850",
            "Water Supply": "#4575b4",
            "Sewerage": "#FF69B4",
            "Traffic Issues": "#B8860B",
            "Electricity": "#fee08b",
            "Crime": "#36454F ",
          }).map(([issue, color]) => (
            <li key={issue} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      </CardHeader>

      <CardContent className="p-0">
        <div style={{ height: "500px", minHeight: "400px" }}>
          <MapContainer
            center={userLocation} // Initial center, will update if user location is found
            zoom={7} // Initial zoom level to show most of Pakistan
            maxBounds={PAKISTAN_BOUNDS} // Restrict map to Pakistan
            maxBoundsViscosity={1.0} // Prevents dragging outside bounds
            minZoom={6} // Prevent zooming out too far
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
              url="https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=a2EOQonylEjddNk8KR2i"
              tileSize={512}
              zoomOffset={-1}
              minZoom={1}
              crossOrigin={true}
            />
            <MapClickHandler onLocationSelect={onLocationSelect} />
            <ColoredHeatmap complaints={filteredComplaints} />

          </MapContainer>
        </div>

        {/* Optional Tip Below Map */}

      </CardContent>
    </Card>
  );



}
