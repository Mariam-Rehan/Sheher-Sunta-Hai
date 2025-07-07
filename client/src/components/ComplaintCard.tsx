import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Eye, MapPin, Calendar } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Complaint } from "@shared/schema";
import * as React from "react";

interface ComplaintCardProps {
  complaint: Complaint;
  onVote?: () => void;
  onClick?: (complaint: Complaint) => void;
}

export default function ComplaintCard({ complaint, onVote, onClick }: ComplaintCardProps) {
  const [voting, setVoting] = useState(false);
  const { toast } = useToast();

  const handleVote = async (voteType: 'up' | 'down') => {
    setVoting(true);
    try {
      await apiRequest('POST', `/api/complaints/${complaint.id}/vote`, {
        voteType
      });

      toast({
        title: voteType === 'up' ? "Upvoted!" : "Downvoted!",
        description: "Your vote has been recorded.",
      });

      onVote?.();
    } catch (error) {
      console.error('Vote error:', error);
      toast({
        title: "Vote Failed",
        description: "There was an error recording your vote.",
        variant: "destructive",
      });
    } finally {
      setVoting(false);
    }
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(complaint);
    }
  };

  return (
    <Card 
      className="mb-6 break-inside-avoid w-full transition-transform hover:scale-[1.015] hover:shadow-lg hover:shadow-indigo-100 duration-300 ease-in-out rounded-2xl border border-gray-200 bg-white cursor-pointer" 
      onClick={handleCardClick}
    >

      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2 line-clamp-1 break-words">
              {complaint.title}
            </CardTitle>

            <Badge variant="secondary" className="mb-2">
              {complaint.issueType}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Eye className="w-4 h-4" />
            {complaint.views || 0}
          </div>
        </div>
      </CardHeader>
        <CardContent className="flex flex-col justify-between flex-1">

        <p className="text-gray-700 mb-4 line-clamp-3">{complaint.description}</p>

        {complaint.imageUrl && (
      /*<div className="mb-4">*/
            <img 
              src={complaint.imageUrl}
              alt="Complaint"
              className="w-full h-40 object-cover rounded-t-md"
              />
          /*</div>*/
        )}

          <div className="flex justify-between items-center gap-2 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1 overflow-hidden">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{complaint.location}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <Calendar className="w-4 h-4" />
              <span className="whitespace-nowrap">{formatDate(complaint.createdAt)}</span>
            </div>
          </div>


        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVote('up')}
              disabled={voting}
              className="flex items-center gap-1"
            >
              <ThumbsUp className="w-4 h-4" />
              {complaint.upvotes || 0}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVote('down')}
              disabled={voting}
              className="flex items-center gap-1"
            >
              <ThumbsDown className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Anonymous Report #{complaint.id}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}