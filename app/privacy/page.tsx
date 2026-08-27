// Starter privacy policy for the private pilot. DRAFT — must be reviewed by
// qualified counsel and translated (HE/AR) before any public launch.
export const metadata = {
  title: "Privacy Policy — HomeTutor AI",
};

const green = "#1B3D2F";

function H({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 17, fontWeight: 700, color: green, margin: "26px 0 8px" }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14.5, color: "#3a352e", lineHeight: 1.75, margin: "0 0 8px" }}>{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ fontSize: 14.5, color: "#3a352e", lineHeight: 1.7, marginBottom: 6 }}>{children}</li>;
}

export default function PrivacyPolicy() {
  return (
    <main style={{ minHeight: "100vh", background: "#FAF8F5", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: "#151210" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 20px 90px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: green, margin: "0 0 4px" }}>Privacy Policy</h1>
        <div style={{ fontSize: 13, color: "#7A7168", marginBottom: 8 }}>HomeTutor AI · Private Pilot</div>
        <P>
          HomeTutor AI is a private, WhatsApp-based tutoring assistant for children, currently in a closed pilot.
          This policy explains what we collect, why, and your rights. Contact: <a href="mailto:hello@hometutorai.io" style={{ color: green }}>hello@hometutorai.io</a>.
        </P>

        <H>What we collect</H>
        <ul>
          <Li>Your child&apos;s name and age/grade</Li>
          <Li>Your child&apos;s WhatsApp phone number</Li>
          <Li>Parent/guardian name, email, and phone number</Li>
          <Li>Your child&apos;s conversation history with the tutor — text messages, voice notes, and photos of homework they send</Li>
          <Li>A few notes on your child&apos;s progress — what they have been working on and what helps them learn (never their answers); see below</Li>
          <Li>Parental consent records, including a typed signature, timestamp, and IP address for record-keeping</Li>
        </ul>

        <H>How we use it</H>
        <P>Only to provide and improve the tutoring service. We never sell your data, and we never share it with third parties for marketing.</P>

        <H>Who processes your data</H>
        <P>To operate the service, your data is processed by these trusted providers:</P>
        <ul>
          <Li><strong>Anthropic</strong> — the Claude AI tutor (processes conversation text and homework images)</Li>
          <Li><strong>OpenAI</strong> — transcribes voice notes (Whisper)</Li>
          <Li><strong>Meta Platforms</strong> — WhatsApp message delivery</Li>
          <Li><strong>Supabase</strong> — secure database, hosted in the European Union</Li>
          <Li><strong>Vercel</strong> — application hosting</Li>
        </ul>

        <H>Keeping track of progress</H>
        <P>
          So the tutor can follow your child&apos;s progress and guide them through their classes — rather than starting from
          scratch each session — it keeps a few simple notes on what your child has been working on and what helps them learn.
          These notes are about how to support your child&apos;s learning — never their answers or any solved homework. They are
          kept while your child uses HomeTutor AI and are removed with the rest of their data whenever you ask.
        </P>

        <H>Where your data is stored</H>
        <P>Our database is hosted in the European Union (eu-central-1).</P>

        <H>How long we keep it</H>
        <P>
          We keep your child&apos;s information — including their conversation history and progress notes — while your child is
          an active user of HomeTutor AI. The progress notes are refreshed as your child learns, so they stay a brief, current
          picture rather than a growing record. You can request deletion of any of your child&apos;s data at any time, and we
          remove it.
        </P>

        <H>Your rights</H>
        <P>
          As the parent or guardian, you may request a copy of your child&apos;s data, or ask us to delete it, at any time by emailing
          {" "}<a href="mailto:hello@hometutorai.io" style={{ color: green }}>hello@hometutorai.io</a>. You can pause or withdraw your child from the pilot at any time.
        </P>

        <H>Children&apos;s data</H>
        <P>HomeTutor AI is used by children only with verified parental consent. We collect the minimum necessary to provide tutoring and to keep your child safe.</P>

        <H>Safety</H>
        <P>The tutor is limited to academic subjects. If a child&apos;s messages suggest distress, the system responds with care and may point them toward appropriate support resources.</P>

        <H>Changes</H>
        <P>This policy applies to our private pilot and will be updated before any wider launch.</P>

        <div style={{ marginTop: 30, fontSize: 12.5, color: "#9a938a" }}>
          <a href="/consent" style={{ color: "#7A7168" }}>Consent form</a> · hello@hometutorai.io
        </div>
      </div>
    </main>
  );
}
