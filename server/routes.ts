import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertComplaintSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import fetch from "node-fetch"; // If not already imported
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Configure multer for S3 uploads (store in memory instead of disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// OpenRouter API for AI summaries
async function generateAISummary(complaints: any[], location?: string, timeRange?: string) {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || "default_key";

  if (!complaints.length) {
    return "No complaints found for the selected criteria.";
  }

  const complaintsText = complaints.map(c => 
    `${c.issueType}: ${c.title} - ${c.description} (${c.upvotes} upvotes)`
  ).join('\n');

  const prompt = `Analyze these civic complaints from ${location || 'Pakistan'} ${timeRange ? `over the past ${timeRange}` : ''}:

${complaintsText}

Provide a brief summary highlighting:
1. Most common issue types
2. Key areas of concern
3. Notable trends or patterns
4. Any urgent issues that need attention

Keep the summary concise and actionable for city officials.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.REPLIT_DOMAINS || 'http://localhost:5000',
        'X-Title': 'Sheher Sunta Hai'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 300
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Unable to generate summary at this time.";
  } catch (error) {
    console.error('AI Summary generation failed:', error);
    return "Summary generation is temporarily unavailable.";
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/search-location", async (req, res) => {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    try {
      const url = `https://us1.locationiq.com/v1/search.php?key=${process.env.LOCATIONIQ_ACCESS_TOKEN}&q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=pk&accept-language=en`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "SheherSuntaHai/1.0 (contact@example.com)",
        },
      });

      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("Error fetching from Nominatim:", err);
      res.status(500).json({ error: "Nominatim fetch failed" });
    }
  });

  // Complaint routes

  app.post("/api/complaints", upload.single('image'), async (req, res) => {
    try {
      console.log("🔥 Received complaint body:", req.body);
      console.log("🖼️ Uploaded file:", req.file);

      // Log the parsed data
      const complaintData = insertComplaintSchema.parse({
        ...req.body,
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
      });

      console.log("✅ Parsed complaint data:", complaintData);

      // Handle image upload to S3
      if (req.file) {
        console.log("🖼️ Starting S3 upload...");
        console.log("📁 File info:", {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.buffer.length
        });

        const bucketName = process.env.S3_BUCKET_NAME || 'sheher-sunta-hai-uploads';
        const key = Date.now() + '-' + req.file.originalname;

        const s3Params = {
          Bucket: bucketName,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        };

        console.log("🔧 S3 params:", {
          Bucket: s3Params.Bucket,
          Key: s3Params.Key,
          ContentType: s3Params.ContentType
        });

        try {
          const command = new PutObjectCommand(s3Params);
          await s3Client.send(command);
          const imageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${key}`;
          console.log("✅ S3 upload successful:", imageUrl);
          complaintData.imageUrl = imageUrl;
        } catch (error) {
          console.error("❌ S3 upload failed:", error);
          throw error;
        }
      }

      const complaint = await storage.createComplaint(complaintData);
      console.log("✅ Complaint created successfully:", complaint.id);
      res.json(complaint);
    } catch (error) {
      console.error('Complaint creation error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(400).json({ error: "Invalid complaint data", details: error.message });
    }
  });

  app.get("/api/complaints", async (req, res) => {
    try {
      const filters = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        issueType: req.query.issueType as string,
        location: req.query.location as string,
        timeRange: req.query.timeRange as 'week' | 'month' | 'all',
      };

      const complaints = await storage.getComplaints(filters);
      res.json(complaints);
    } catch (error) {
      console.error('Get complaints error:', error);
      res.status(500).json({ error: "Failed to fetch complaints" });
    }
  });

  app.get("/api/complaints/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const complaint = await storage.getComplaint(id);

      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }

      // Increment view count
      await storage.incrementComplaintViews(id);

      res.json(complaint);
    } catch (error) {
      console.error('Get complaint error:', error);
      res.status(500).json({ error: "Failed to fetch complaint" });
    }
  });

  // Voting routes (anonymous)
  app.post("/api/complaints/:id/vote", async (req, res) => {
    try {
      const complaintId = parseInt(req.params.id);
      const { voteType } = req.body;

      if (!voteType || !['up', 'down'].includes(voteType)) {
        return res.status(400).json({ error: "Invalid vote type" });
      }

      await storage.voteOnComplaint(complaintId, voteType);
      res.json({ success: true });
    } catch (error) {
      console.error('Vote error:', error);
      res.status(400).json({ error: "Invalid vote data" });
    }
  });

  // Heatmap data
  app.get("/api/heatmap", async (req, res) => {
    try {
      const heatmapData = await storage.getHeatmapData();
      res.json(heatmapData);
    } catch (error) {
      console.error('Heatmap data error:', error);
      res.status(500).json({ error: "Failed to fetch heatmap data" });
    }
  });

  // AI Summary
  app.get("/api/ai-summary", async (req, res) => {
    try {
      const filters = {
        location: req.query.location as string,
        timeRange: req.query.timeRange as 'week' | 'month',
        limit: 10
      };

      const complaints = await storage.getComplaintsForAISummary(filters);
      const summary = await generateAISummary(complaints, filters.location, filters.timeRange);

      res.json({ summary });
    } catch (error) {
      console.error('AI Summary error:', error);
      res.status(500).json({ error: "Failed to generate AI summary" });
    }
  });

  // Reverse geocoding (using OpenStreetMap Nominatim)
  app.get("/api/geocode", async (req, res) => {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Sheher-Sunta-Hai-App'
          }
        }
      );

      const data = await response.json();
      const address = data.display_name || `${lat}, ${lng}`;

      res.json({ address });
    } catch (error) {
      console.error('Geocoding error:', error);
      res.status(500).json({ error: "Failed to reverse geocode location" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
