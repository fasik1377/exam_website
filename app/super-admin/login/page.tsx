import RoleLogin from "@/app/components/RoleLogin";

export default function SuperAdminLoginPage() {
  return (
    <RoleLogin
      role="Super Admin"
      eyebrow="Platform owner access"
      title="Sign in to control packages, admins, and platform security."
      description="Super admins manage teacher accounts, payment packages, schools, permissions, and the quality of content published to students."
      accent="sky"
      permissions={[
        "Approve or suspend teacher admin accounts",
        "Create weekly, monthly, and yearly packages",
        "Control platform permissions and security",
        "Monitor schools, subscriptions, and content quality",
      ]}
    />
  );
}
