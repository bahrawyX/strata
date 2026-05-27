import { getOptionalSession } from "@/server/actions/session";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Hero } from "@/components/landing/Hero";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { Testimonials } from "@/components/landing/Testimonials";
import { CtaBanner } from "@/components/landing/CtaBanner";

export default async function LandingPage() {
  let isAuthed = false;
  try {
    const session = await getOptionalSession();
    isAuthed = Boolean(session);
  } catch {
    isAuthed = false;
  }

  return (
    <div className="page-in relative flex min-h-screen flex-col">
      <MarketingNavbar isAuthed={isAuthed} />
      <main>
        <Hero isAuthed={isAuthed} />
        <ProductPreview />
        <HowItWorks />
        <FeatureBento />
        <Testimonials />
        <CtaBanner isAuthed={isAuthed} />
      </main>
      <MarketingFooter />
    </div>
  );
}
