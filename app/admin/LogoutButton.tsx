"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }
  return (
    <button
      onClick={logout}
      style={{ fontSize: 13, fontWeight: 600, color: "#7A7168", background: "white", border: "1px solid #DDD8CE", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}
    >
      Sign out
    </button>
  );
}
