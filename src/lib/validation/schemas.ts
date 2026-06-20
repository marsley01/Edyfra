import { z } from "zod";

export const nameField = z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be under 100 characters").trim().regex(/^[a-zA-Z\s\-'\.]+$/, "Name contains invalid characters");
export const emailField = z.string().email("Invalid email address").max(254, "Email too long").toLowerCase().trim();
export const passwordField = z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and a number");
export const messageField = z.string().min(1, "Message cannot be empty").max(2000, "Message too long").trim();
export const subjectField = z.string().min(1, "Subject is required").max(100, "Subject name too long").trim();
export const bioField = z.string().max(300, "Bio must be under 300 characters").trim().optional();
export const phoneField = z.string().regex(/^(\+254|0)[17]\d{8}$/, "Enter a valid Kenyan phone number").optional();
export const uuidField = z.string().uuid("Invalid identifier");

export const signupSchema = z.object({ name: nameField, email: emailField, password: passwordField, role: z.enum(["student", "tutor"]) });
export const loginSchema = z.object({ email: emailField, password: z.string().min(1, "Password is required").max(128, "Password too long") });
export const messageSchema = z.object({ content: messageField, room_id: uuidField });
export const bookingSchema = z.object({ tutor_id: uuidField, subject: subjectField, date: z.string().datetime("Invalid date format"), duration_minutes: z.number().int().min(30, "Minimum 30 minute session").max(120, "Maximum 2 hour session") });
export const aiChatSchema = z.object({ message: z.string().min(1, "Message cannot be empty").max(500, "Message too long (max 500 chars)").trim(), subject: subjectField, education_level: z.enum(["high_school", "university"]) });
export const tutorOnboardingSchema = z.object({ primary_subject: subjectField, secondary_subjects: z.array(subjectField).max(3, "Maximum 3 secondary subjects"), bio: bioField, education_level: z.enum(["high_school", "university", "both"]), phone: phoneField });
export const resourceSchema = z.object({ title: z.string().min(3, "Title too short").max(200, "Title too long").trim(), subject: subjectField, description: z.string().max(500, "Description too long").trim(), price: z.number().min(0, "Price cannot be negative").max(300, "Price cannot exceed KES 300"), education_level: z.enum(["high_school", "university"]) });
