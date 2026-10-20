import type { ObjectId } from "mongodb";

export type UserRole = "student" | "admin" | "super-admin";
/** "pending" = signed up and waiting for super-admin approval; "rejected" = approval refused. */
export type UserStatus = "pending" | "active" | "restricted" | "banned" | "rejected";

export type DbUser = {
  _id?: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  plan: "free" | "monthly" | "yearly" | "teacher";
  /** Subject a teacher applied to teach. */
  subject?: string;
  reviewedAt?: Date;
  reviewedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = Pick<DbUser, "name" | "email" | "role" | "status" | "plan" | "subject"> & { id: string };

export type DbQuestion = {
  _id?: ObjectId;
  subject: string;
  grade: string;
  unit: string;
  year: string;
  /** "mcq" (default for older questions) or "truefalse" (choices are always ["True", "False"]). */
  type?: "mcq" | "truefalse";
  prompt: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
  teacherName: string;
  createdBy: ObjectId;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};
