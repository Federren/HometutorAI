// Parent-facing guide: how to set a child up to get the most from the tutor.
// English first; HE/AR translation tracked in the website task list.
export const metadata = {
  title: "Getting the most from HomeTutor AI",
  description: "A short guide for parents on how to set your child up to get the most out of HomeTutor AI.",
};

const green = "#1B3D2F";
const cream = "#FAF8F5";

function H({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 19, fontWeight: 700, color: green, margin: "34px 0 10px", lineHeight: 1.25 }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 15.5, color: "#3a352e", lineHeight: 1.75, margin: "0 0 10px" }}>{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ fontSize: 15.5, color: "#3a352e", lineHeight: 1.7, marginBottom: 8 }}>{children}</li>;
}
function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#E8F0EC", border: `1px solid #CFE0D6`, borderRadius: 12, padding: "16px 18px", margin: "18px 0", fontSize: 15.5, color: "#1c2a22", lineHeight: 1.7 }}>
      {children}
    </div>
  );
}

export default function Guide() {
  return (
    <main style={{ minHeight: "100vh", background: cream, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: "#151210" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 22px 96px" }}>
        <div style={{ fontSize: 13, color: "#7A7168", marginBottom: 6, letterSpacing: ".02em" }}>HomeTutor AI · For parents</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: green, margin: "0 0 12px", lineHeight: 1.15 }}>
          Getting the most from HomeTutor AI
        </h1>
        <P>
          HomeTutor AI isn&apos;t a homework machine that hands over answers. It&apos;s a patient tutor that guides your child to
          the answer with questions — the same way a great human tutor does. That means your child does the thinking, and the
          understanding sticks. This short guide helps you set them up to get the most from it.
        </P>

        <H>The one thing to tell your child</H>
        <Callout>
          <strong>&ldquo;You never need the right answer. Just tell it what you&apos;re thinking — even a guess — and say when you&apos;re stuck.&rdquo;</strong>
        </Callout>
        <P>
          The single biggest thing that helps a child get value is feeling safe to <em>not</em> know. The tutor is built around
          questions, so a child who freezes or waits to be told won&apos;t get much from it — but a child who&apos;s happy to guess,
          think out loud, and say &ldquo;I&apos;m stuck&rdquo; gets a huge amount. A quick word from you to reassure them there are
          no wrong answers makes all the difference.
        </P>

        <H>What it can do</H>
        <P>Your child can, right inside WhatsApp:</P>
        <ul>
          <Li>Ask about <strong>any school subject</strong> — maths, science, history, English, languages, and more.</Li>
          <Li><strong>Send a photo</strong> of a worksheet or their handwritten working — it can read it.</Li>
          <Li><strong>Send a voice note</strong> instead of typing.</Li>
          <Li>Get <strong>clear diagrams and step-by-step maths</strong>, and a short explainer <strong>video</strong> when it helps.</Li>
        </ul>

        <H>Helping your child ask good questions</H>
        <P>
          This is where children get the most value — and where many need a little help. Encourage your child to:
        </P>
        <ul>
          <Li>Say <strong>exactly what&apos;s confusing</strong> (&ldquo;I don&apos;t get why…&rdquo;) rather than just &ldquo;I don&apos;t know.&rdquo;</Li>
          <Li><strong>Share their thinking</strong>, even if unsure — the tutor works from what they say.</Li>
          <Li>Ask it to <strong>explain a different way</strong> if something doesn&apos;t land the first time.</Li>
          <Li>Ask <strong>&ldquo;why?&rdquo;</strong> — the tutor loves to go deeper.</Li>
        </ul>
        <P>The tutor will also gently coach these habits as they go, so your child gradually learns <em>how</em> to learn — not just tonight&apos;s topic.</P>

        <H>What to expect (and what not to)</H>
        <P>
          On purpose, the tutor <strong>won&apos;t just give the answer or write the essay</strong>. If your child asks it to, it will
          warmly steer them back to working it out themselves — because that moment of &ldquo;doing it themselves&rdquo; is exactly where
          the learning happens. If your child seems to want a shortcut, that&apos;s normal — it&apos;s the tutor&apos;s job to hold the line kindly.
        </P>

        <H>Good habits</H>
        <ul>
          <Li><strong>Short and regular</strong> beats long and rare — 15–20 minutes on real homework is ideal.</Li>
          <Li>Use it when they&apos;re <strong>genuinely stuck</strong>, not to skip the work.</Li>
          <Li>Let them <strong>sit with a tricky question</strong> for a moment — a little productive struggle is the point.</Li>
        </ul>

        <H>Safe by design</H>
        <P>
          The tutor sticks to schoolwork, responds with care if a child seems distressed and points them to appropriate help, and
          treats your child&apos;s information carefully. You can read the full{" "}
          <a href="/privacy" style={{ color: green }}>Privacy Policy</a>, and you can pause or remove your child at any time.
        </P>

        <div style={{ marginTop: 34, fontSize: 12.5, color: "#9a938a" }}>
          <a href="/consent" style={{ color: "#7A7168" }}>Join the pilot</a> · <a href="/privacy" style={{ color: "#7A7168" }}>Privacy</a> · hello@hometutorai.io
        </div>
      </div>
    </main>
  );
}
