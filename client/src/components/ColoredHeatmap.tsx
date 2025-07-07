import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { type Complaint } from "@shared/schema";

const issueTypeColors: Record<string, string> = {
  "Road Damage": "#d73027",
  "Garbage Collection": "#1a9850",
  "Water Supply": "#4575b4",
  "Sewerage": "#FF69B4",
  "Traffic Issues": "#B8860B ",
  "Electricity": "#fee08b",
  "Crime": "#36454F",
};

  export function ColoredHeatmap({ complaints = [] }: { complaints?: Complaint[] }) {
  const map = useMap();

  useEffect(() => {
    const layers: L.Layer[] = [];

    const grouped = complaints.reduce((acc, c) => {
      acc[c.issueType] = acc[c.issueType] || [];
      acc[c.issueType].push([c.latitude, c.longitude]);
      return acc;
    }, {} as Record<string, [number, number][]>);

    Object.entries(grouped).forEach(([issueType, coords]) => {
      const color = issueTypeColors[issueType] || "#FF0000";
      const gradient = {
        0.3: color,
        0.4: color,
        0.6: color,
        0.8: color,
        1.0: color,
      };

      const layer = (L as any).heatLayer(coords, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient,
      }).addTo(map);

      layers.push(layer);
    });

    return () => {
      layers.forEach((layer) => map.removeLayer(layer));
    };
  }, [complaints, map]);

  return null;
}
