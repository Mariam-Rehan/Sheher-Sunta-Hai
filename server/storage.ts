import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { complaints, type InsertComplaint } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/postgres";

console.log("Using DB:", process.env.DATABASE_URL);

const client = postgres(connectionString);
export const db = drizzle(client);

export class Storage {
  async createComplaint(complaint: InsertComplaint) {
    const [result] = await db.insert(complaints).values(complaint).returning();
    return result;
  }

  async getComplaints(filters: {
    limit?: number;
    offset?: number;
    issueType?: string;
    location?: string;
    timeRange?: 'week' | 'month' | 'all';
  }) {
    let query = db.select().from(complaints);

    const conditions = [];

    if (filters.issueType) {
      conditions.push(eq(complaints.issueType, filters.issueType));
    }

    if (filters.location) {
      conditions.push(sql`${complaints.location} ILIKE ${`%${filters.location}%`}`);
    }

    if (filters.timeRange) {
      const now = new Date();
      let cutoffDate: Date;

      if (filters.timeRange === 'week') {
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filters.timeRange === 'month') {
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        cutoffDate = new Date(0);
      }

      conditions.push(sql`${complaints.createdAt} >= ${cutoffDate}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query
      .orderBy(desc(complaints.createdAt))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);
  }

  async getComplaint(id: number) {
    const [result] = await db.select().from(complaints).where(eq(complaints.id, id));
    return result;
  }

  async incrementComplaintViews(id: number) {
    await db.update(complaints)
      .set({ views: sql`${complaints.views} + 1` })
      .where(eq(complaints.id, id));
  }

  async voteOnComplaint(complaintId: number, voteType: 'up' | 'down') {
    // Simple anonymous voting - just increment/decrement upvotes
    if (voteType === 'up') {
      await db.update(complaints)
        .set({ upvotes: sql`${complaints.upvotes} + 1` })
        .where(eq(complaints.id, complaintId));
    } else {
      await db.update(complaints)
        .set({ upvotes: sql`GREATEST(${complaints.upvotes} - 1, 0)` })
        .where(eq(complaints.id, complaintId));
    }
  }

  async getHeatmapData() {
    return db.select({
      latitude: complaints.latitude,
      longitude: complaints.longitude,
      count: sql<number>`count(*)`.as('count')
    })
    .from(complaints)
    .groupBy(complaints.latitude, complaints.longitude);
  }

  async getComplaintsForAISummary(filters: {
    location?: string;
    timeRange?: 'week' | 'month';
    limit?: number;
  }) {
    let query = db.select({
      issueType: complaints.issueType,
      title: complaints.title,
      description: complaints.description,
      upvotes: complaints.upvotes,
    }).from(complaints);

    const conditions = [];

    if (filters.location) {
      conditions.push(sql`${complaints.location} ILIKE ${`%${filters.location}%`}`);
    }

    if (filters.timeRange) {
      const now = new Date();
      let cutoffDate: Date;

      if (filters.timeRange === 'week') {
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filters.timeRange === 'month') {
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        cutoffDate = new Date(0);
      }

      conditions.push(sql`${complaints.createdAt} >= ${cutoffDate}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query
      .orderBy(desc(complaints.upvotes))
      .limit(filters.limit || 10);
  }
}

export const storage = new Storage();