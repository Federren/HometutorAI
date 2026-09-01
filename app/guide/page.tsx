// Student-facing guide: how to get the most out of the tutor, written to the
// pupil in the tutor's own warm voice. English first; HE/AR tracked separately.
export const metadata = {
  title: "How to get the most out of your tutor",
  description: "A quick guide for students on getting the most out of HomeTutor AI.",
};

const green = "#1B3D2F";
const cream = "#FAF8F5";

function H({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 20, fontWeight: 700, color: green, margin: "34px 0 10px", lineHeight: 1.25 }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 16, color: "#3a352e", lineHeight: 1.8, margin: "0 0 10px" }}>{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ fontSize: 16, color: "#3a352e", lineHeight: 1.7, marginBottom: 8 }}>{children}</li>;
}
function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#E8F0EC", border: `1px solid #CFE0D6`, borderRadius: 12, padding: "16px 18px", margin: "18px 0", fontSize: 16.5, color: "#1c2a22", lineHeight: 1.7 }}>
      {children}
    </div>
  );
}

export default function Guide() {
  return (
    <main style={{ minHeight: "100vh", background: cream, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: "#151210" }}>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "44px 22px 96px" }}>
        <div style={{ fontSize: 13, color: "#7A7168", marginBottom: 6, letterSpacing: ".02em" }}>Your HomeTutor AI</div>
        <h1 style={{ fontSize: 31, fontWeight: 800, color: green, margin: "0 0 12px", lineHeight: 1.15 }}>
          How to get the most out of me
        </h1>
        <P>
          Hi! I&apos;m your tutor. I work a bit differently from just Googling an answer — instead of handing you the answer,
          I ask you questions and help you work it out yourself. That&apos;s what makes it actually stick (and what gets you the
          marks). Here&apos;s how to get the most out of me.
        </P>

        <H>The one thing to remember</H>
        <Callout>
          <strong>You never need the &ldquo;right&rdquo; answer. Just tell me what you&apos;re thinking — even a guess — and say when you&apos;re stuck.</strong>
        </Callout>
        <P>
          When I ask you something, don&apos;t worry about getting it perfect. A guess is great. And &ldquo;I&apos;m stuck&rdquo; or
          &ldquo;I don&apos;t get it&rdquo; isn&apos;t failing — it&apos;s exactly when I can help you most. The more you talk to me
          like a person, the more I can help.
        </P>

        <H>What you can do</H>
        <ul>
          <Li><strong>Ask me about any subject</strong> — maths, science, history, English, whatever you&apos;re working on.</Li>
          <Li><strong>Send a photo</strong> of your homework or your working — I can read it, even your handwriting.</Li>
          <Li><strong>Send a voice note</strong> if that&apos;s easier than typing.</Li>
          <Li>Ask me to <strong>draw a diagram</strong>, show the <strong>maths step by step</strong>, or find you a <strong>short video</strong>.</Li>
        </ul>

        <H>The trick to getting unstuck</H>
        <P>Here&apos;s what the students who get the most out of me do — they tell me exactly what&apos;s confusing them. So:</P>
        <ul>
          <Li>Instead of &ldquo;I don&apos;t know&rdquo;, try &ldquo;I don&apos;t get why we do this bit.&rdquo;</Li>
          <Li>Tell me what you&apos;re thinking, even if you&apos;re not sure.</Li>
          <Li>If my explanation doesn&apos;t click, just say <strong>&ldquo;can you explain it a different way?&rdquo;</strong></Li>
          <Li>Ask <strong>&ldquo;why?&rdquo;</strong> whenever you&apos;re curious — I love that.</Li>
        </ul>

        <H>Fair warning 😄</H>
        <P>
          I <strong>won&apos;t just do your homework or write your essay for you</strong>. I know — but it&apos;s on purpose. If I
          handed you the answer, you&apos;d forget it by the test. Instead I&apos;ll help <em>you</em> get there, one step at a time.
          It feels slower, but it&apos;s how you actually learn it.
        </P>

        <H>A few tips</H>
        <ul>
          <Li><strong>Little and often</strong> beats one big cram — 15 minutes when you&apos;re stuck is perfect.</Li>
          <Li><strong>Don&apos;t be scared to guess and be wrong.</strong> That&apos;s literally how learning works.</Li>
          <Li>Take a second to <strong>think before you answer</strong> — the tricky ones are the ones worth it.</Li>
        </ul>

        <P style={{ marginTop: 24 }}>
          And if you&apos;re ever having a hard time with something that <em>isn&apos;t</em> schoolwork, you can tell me — I&apos;ll
          help you find the right person to talk to.
        </P>

        <div style={{ marginTop: 30, fontSize: 17, fontWeight: 600, color: green }}>
          That&apos;s it — say hi whenever you&apos;re ready. What are you working on? 👋
        </div>
      </div>
    </main>
  );
}
