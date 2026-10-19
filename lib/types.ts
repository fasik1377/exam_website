import type { ObjectId } from "mongodb";

export type UserRole = "student" | "admin" | "super-admin";
export type UserStatus = "active" | "restricted" | "banned";

export type DbUser = {
  _id?: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  plan: "free" | "monthly" | "yearly" | "teacher";
  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = Pick<DbUser, "name" | "email" | "role" | "status" | "plan"> & { id: string };

export type DbQuestion = {
  _id?: ObjectId;
  subject: string;
  grade: string;
  unit: string;
  year: string;
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
