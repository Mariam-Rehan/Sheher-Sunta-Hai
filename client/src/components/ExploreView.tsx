import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import ComplaintCard from "./ComplaintCard";
import { type Complaint } from "@shared/schema";
import * as React from "react";

interface ExploreViewProps {
  onComplaintClick: (complaint: Complaint) => void;
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


export function ExploreView({ onComplaintClick }: ExploreViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [issueTypeFilter, setIssueTypeFilter] = useState("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all");

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["complaints", searchTerm, issueTypeFilter, timeRangeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("location", searchTerm);
      if (issueTypeFilter !== "all")
        params.append("issueType", issueTypeFilter);
      if (timeRangeFilter !== "all")
        params.append("timeRange", timeRangeFilter);

      const response = await apiRequest(
        "GET",
        `/api/complaints?${params.toString()}`,
      );
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="relative w-16 mx-auto">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Explore Issues
          </h2>
          <p className="text-gray-600">
            View and filter community complaints submitted by users
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-10">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-base"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Select
                value={issueTypeFilter}
                onValueChange={setIssueTypeFilter}
              >
                <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 hover:ring-1 hover:ring-purple-200 text-base h-12 w-full sm:w-48">
                  <SelectValue placeholder="Issue Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {issueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={timeRangeFilter}
                onValueChange={setTimeRangeFilter}
              >
                <SelectTrigger className="w-full sm:w-48 h-12 text-base">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setIssueTypeFilter("all");
                  setTimeRangeFilter("all");
                }}
                className="h-12"
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Complaints */}
        {complaints.length > 0 ? (
      <div className="columns-1 sm:columns-2 xl:columns-3 gap-6">
            {complaints.map((complaint: Complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                onClick={onComplaintClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No issues found
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              We couldn’t find any complaints matching your filters. Try
              adjusting them.
            </p>
            <Button
              onClick={() => {
                setSearchTerm("");
                setIssueTypeFilter("all");
                setTimeRangeFilter("all");
              }}
              className="mt-6"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
