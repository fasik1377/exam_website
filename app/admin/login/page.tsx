import RoleLogin from "@/app/components/RoleLogin";

export default function AdminLoginPage() {
  return (
    <RoleLogin
      role="Admin"
      eyebrow="Teacher and content admin access"
      title="Sign in to manage Ethiopian national exam questions."
      description="Teacher admins can add questions, write answer explanations, upload exam content, and monitor student package access."
      accent="teal"
      permissions={[
        "Create and edit national exam questions",
        "Add correct answers and explanations",
        "Review student attempts and subject performance",
        "Manage content visibility for paid packages",
      ]}
    />
  );
}
