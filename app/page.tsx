export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      color: "#f8fafc",
      padding: "2rem",
      textAlign: "center",
    }}>

      {/* Logo / icon */}
      <div style={{
        fontSize: "4rem",
        marginBottom: "1.5rem",
        filter: "drop-shadow(0 4px 24px rgba(99,179,237,0.4))",
      }}>
        📚
      </div>

      {/* Brand name */}
      <h1 style={{
        fontSize: "clamp(2rem, 6vw, 3.5rem)",
        fontWeight: 800,
        letterSpacing: "-0.02em",
        margin: "0 0 0.5rem 0",
        background: "linear-gradient(90deg, #63b3ed, #90cdf4)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}>
        HomeTutor AI
      </h1>

      {/* Tagline */}
      <p style={{
        fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
        color: "#94a3b8",
        maxWidth: "480px",
        lineHeight: 1.6,
        margin: "0 0 3rem 0",
      }}>
        A personal AI tutor for your child — available 24/7 on WhatsApp.
        Guides students to think, not just memorise.
      </p>

      {/* Coming soon badge */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        background: "rgba(99,179,237,0.12)",
        border: "1px solid rgba(99,179,237,0.3)",
        borderRadius: "999px",
        padding: "0.5rem 1.25rem",
        fontSize: "0.9rem",
        color: "#90cdf4",
        marginBottom: "3rem",
        letterSpacing: "0.05em",
        fontWeight: 600,
        textTransform: "uppercase",
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#68d391", display: "inline-block", boxShadow: "0 0 8px #68d391" }} />
        Coming Soon
      </div>

      {/* Feature pills */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        justifyContent: "center",
        maxWidth: "560px",
        marginBottom: "3rem",
      }}>
        {[
          "🧮 Maths",
          "🔬 Science",
          "📖 Literature",
          "🗺️ History",
          "🌍 Languages",
          "✡️ Tanakh",
        ].map((f) => (
          <span key={f} style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "999px",
            padding: "0.35rem 1rem",
            fontSize: "0.85rem",
            color: "#cbd5e1",
          }}>
            {f}
          </span>
        ))}
      </div>

      {/* Footer */}
      <p style={{
        fontSize: "0.8rem",
        color: "#475569",
        marginTop: "auto",
        paddingTop: "2rem",
      }}>
        © {new Date().getFullYear()} HomeTutor AI · hometutorai.to
      </p>
    </main>
  );
}
