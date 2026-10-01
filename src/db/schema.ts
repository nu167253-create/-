import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

// Define the 'users' table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'requests' table
export const requests = pgTable('requests', {
  id: text('id').primaryKey(), // Using the REQ-... string ID
  userId: integer('user_id').references(() => users.id), // Nullable because some might not be logged in? Oh wait, Cloud SQL apps need Firebase Auth for API. Let's make it notNull if we require login, but let's allow null if public submission is possible, or not.
  category: text('category').notNull(),
  title: text('title').notNull(),
  applicant: jsonb('applicant').notNull(),
  details: jsonb('details').notNull(),
  reason: text('reason').notNull(),
  priority: text('priority').notNull(),
  attachments: jsonb('attachments'),
  signatureDataUrl: text('signature_data_url'),
  status: text('status').notNull(),
  statusHistory: jsonb('status_history'),
  officerNotes: text('officer_notes'),
  internalComments: jsonb('internal_comments'),
  approvalWorkflow: jsonb('approval_workflow'),
  assignedOfficer: text('assigned_officer'),
  appointment: jsonb('appointment'),
  feedback: jsonb('feedback'),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  expectedDate: text('expected_date'),
});

// Define relationships for the 'users' table.
export const usersRelations = relations(users, ({ many }) => ({
  requests: many(requests),
}));

// Define relationships for the 'requests' table.
export const requestsRelations = relations(requests, ({ one }) => ({
  author: one(users, {
    fields: [requests.userId],
    references: [users.id],
  }),
}));
