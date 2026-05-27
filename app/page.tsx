import { getOptionalSession } from "@/server/actions/session";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Hero } from "@/components/landing/Hero";
import { LogoStrip } from "@/components/landing/LogoStrip";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { SecurityCallout } from "@/components/landing/SecurityCallout";
import { ClosingCta } from "@/components/landing/ClosingCta";

export default async function LandingPage() {
  let isAuthed = false;
  try {
    const session = await getOptionalSession();
    isAuthed = Boolean(session);
  } catch {
    isAuthed = false;
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <MarketingNavbar isAuthed={isAuthed} />

      <main className="flex-1">
        <Hero isAuthed={isAuthed} />
        <LogoStrip />
        <FeatureBento />
        <WorkflowSection />
        <SecurityCallout />
        <ClosingCta isAuthed={isAuthed} />
      </main>

      <MarketingFooter />
    </div>
  );
}
