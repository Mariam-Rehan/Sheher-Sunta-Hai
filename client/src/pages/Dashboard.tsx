// Dashboard (1).tsx

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapView } from "@/components/MapView";
import { ExploreView } from "@/components/ExploreView";
import { ComplaintForm } from "@/components/ComplaintForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Map, List } from "lucide-react";
import { type Complaint } from '@shared/schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import * as React from "react";


export default function Dashboard() {
  // Background gradient + orbs
  const backgroundDecor = (
    <>
      {/* Ambient soft radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-white to-blue-100 -z-10 pointer-events-none" />
MAIN
      {/* Floating orbs */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-purple-300 opacity-20 blur-3xl rounded-full animate-float pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-28 h-28 bg-blue-300 opacity-25 blur-2xl rounded-full animate-float-delay pointer-events-none" />
    </>
  );

  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [timeRangeFilter, setTimeRangeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("map");
  const [scrollY, setScrollY] = useState(0);

  // Fetch complaints data
  const { data: complaints = [] } = useQuery<Complaint[]>({
    queryKey: ['complaints'],
    queryFn: async () => {
      const response = await fetch("/api/complaints");
      return response.json();
    },
  });


  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setSelectedLocation({ lat, lng, address });
    setScrollY(window.scrollY);
    setShowComplaintForm(true);
  };

  const handleComplaintClick = (complaint: Complaint) => {
    // Handle complaint click - could show details modal or navigate
    console.log('Complaint clicked:', complaint);
  };

  const handleOpenComplaintForm = () => {
    setScrollY(window.scrollY);
    setShowComplaintForm(true);
  };

  const handleCloseComplaintForm = () => {
    setShowComplaintForm(false);
    setSelectedLocation(null);
    window.scrollTo(0, scrollY);
  };

      return (
        <div className="relative min-h-screen overflow-hidden">
          {backgroundDecor}
          
          {/* Header */}
          <header className="fixed top-0 left-0 right-0 z-[10000] bg-white shadow-sm border-b animate-fadeInUp">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                    Sheher Sunta Hai
                  </h1>
                </div>
                <Button
                  onClick={handleOpenComplaintForm}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:brightness-110 transition hover:scale-[1.02] font-semibold shadow-md"
                  size="sm"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Report Issue
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content - Added pt-20 to push content below the fixed header */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-24 sm:pt-20">
            <div className="absolute top-10 left-20 w-40 h-40 bg-purple-300 rounded-full opacity-30 blur-3xl animate-float pointer-events-none" />
            <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-300 rounded-full opacity-20 blur-2xl animate-float-delay pointer-events-none" />

               <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow">
              <TabsList className="grid w-full grid-cols-2 mb-5">
                <TabsTrigger
                  value="map"
                  className="flex items-center justify-center gap-2 transition font-medium px-4 py-2 rounded-md text-sm shadow-sm cursor-pointer
                    data-[state=active]:bg-gradient-to-r
                    data-[state=active]:from-blue-600
                    data-[state=active]:to-purple-600
                    data-[state=active]:text-white
                    data-[state=active]:shadow-md
                    data-[state=active]:hover:brightness-110
                    data-[state=active]:hover:scale-[1.02] animate-fadeInUp"
                >
                 <Map className="w-4 h-4" />
                  Map View
                </TabsTrigger>

                <TabsTrigger
                  value="explore"
                  className="flex items-center justify-center gap-2 transition font-medium px-4 py-2 rounded-md text-sm shadow-sm cursor-pointer
                    data-[state=active]:bg-gradient-to-r
                    data-[state=active]:from-blue-600
                    data-[state=active]:to-purple-600
                    data-[state=active]:text-white
                    data-[state=active]:shadow-md
                    data-[state=active]:hover:brightness-110
                    data-[state=active]:hover:scale-[1.02] animate-fadeInUp"
                >
                  <List className="w-4 h-4" />
                  Explore
                </TabsTrigger>

              </TabsList>

              <TabsContent value="map">
                <Card className="animate-fadeInUp [animation-delay:0.2s]">
                  <CardHeader className="flex items-start">
                    <div className="flex-grow min-w-0 pr-4">
                      <CardTitle className="text-3xl font-bold text-gray-900 mb-2">Civic Issues Heatmap</CardTitle>
                      <div>
                        <p className="text-sm italic">
                          Click anywhere on the map to report an issue
                        </p>
                      </div>
                    </div>
                    {/* Filter now explicitly set to not shrink */}
                    <div className="flex-shrink-0">
                      <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Filter by time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="week">Past Week</SelectItem>
                          <SelectItem value="month">Past Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div style={{ height: '500px' }}>
                      <MapView
                        timeRangeFilter={timeRangeFilter}
                        onLocationSelect={handleLocationSelect}
                        onComplaintClick={handleComplaintClick}
                        complaints={complaints}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="explore">
                <div className="animate-fadeInUp [animation-delay:0.25s]">
                  <ExploreView onComplaintClick={handleComplaintClick} />
                </div>
              </TabsContent>
            </Tabs>
          </main>

          {showComplaintForm && (
            <ComplaintForm
              onClose={handleCloseComplaintForm}
              onSuccess={handleCloseComplaintForm}
              initialLocation={selectedLocation}
            />
          )}
        </div>
      );
}