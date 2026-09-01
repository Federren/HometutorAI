import GuideContent from "./GuideContent";

// Student-facing guide, trilingual (EN/HE/AR). Server wrapper keeps the page
// title/metadata; the language toggle + content live in the client component.
export const metadata = {
  title: "How to get the most out of your tutor",
  description: "A quick guide for students on getting the most out of HomeTutor AI.",
};

export default function GuidePage() {
  return <GuideContent />;
}
