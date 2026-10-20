"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import StudentAuthForm from "@/app/components/StudentAuthForm";

function Signup() {
  const role = useSearchParams().get("role") === "teacher" ? "teacher" : "student";
  return <StudentAuthForm key={role} mode="signup" initialRole={role} />;
}

/** Students and teachers register here; super admin accounts cannot be created publicly. */
export default function SignupPage() {
  return <Suspense><Signup /></Suspense>;
}
