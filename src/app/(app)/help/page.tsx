import Link from "next/link";
import { BookOpen, Camera, ChevronDown, CreditCard, Mail, MessageCircle, QrCode, ScanLine, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";

const SUPPORT_EMAIL = "support@arcade3d.app";

const captureSteps = [
  { title: "Light it evenly", text: "Soft daylight or two lamps on either side. Avoid direct sun, harsh shadows and strong reflections." },
  { title: "Use a plain background", text: "A matte table or floor with some texture helps. Avoid glass, mirrors and busy patterns." },
  { title: "Circle the object slowly", text: "2–3 loops at different heights: low, eye level, and looking down. Keep the whole object in frame." },
  { title: "Overlap every shot", text: "Each photo should share 60–70% of the previous one. For video, move slowly and steadily." },
  { title: "Stay within the limits", text: "20–300 photos, or one MP4 up to 1080p and 3 minutes. Very shiny or transparent objects may fail." },
];

const faqs: { icon: LucideIcon; q: string; a: string }[] = [
  { icon: ScanLine, q: "Do my customers need an app?", a: "No. Scanning the QR code opens the model in the browser. On iPhone it opens in AR Quick Look, on Android in Scene Viewer, and on desktop it shows an interactive 3D preview with a QR code to continue on a phone." },
  { icon: QrCode, q: "If I replace a model’s file, do I need new QR codes?", a: "No. Links and QR codes point to the model, not the file. Replace the 3D file on the model page and every printed code shows the new version." },
  { icon: Camera, q: "Generation failed. Do I lose a credit?", a: "No. Failed generations are refunded automatically and retrying is free. Most failures come from too little overlap between photos or reflective surfaces; see the capture guide above." },
  { icon: BookOpen, q: "Can I upload a 3D model I already have?", a: "Yes. Choose “Upload a 3D file” when creating a model and add a .glb up to 150 MB. Uploads don’t use a generation credit, and we create the iPhone (USDZ) version automatically." },
  { icon: CreditCard, q: "What counts as a scan?", a: "One opening of a model’s link, QR code or website embed. Repeat opens from the same device within 30 minutes count once. See Billing for your plan’s monthly allowance." },
  { icon: ScanLine, q: "How do I show models on my online shop?", a: "Open a live model and copy the embed code from “Add to your website”. Paste it into your product page’s HTML. Add a buy button to the model to track clicks back to your shop." },
];

function ContactCard({ icon: Icon, title, text, href, cta }: { icon: LucideIcon; title: string; text: string; href: string; cta: string }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="size-[18px]" aria-hidden />
      </div>
      <h2 className="mt-3 font-medium text-slate-900">{title}</h2>
      <p className="mt-1 flex-1 text-sm text-slate-500">{text}</p>
      <a href={href} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500">
        {cta} →
      </a>
    </Card>
  );
}

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Help & support</h1>
        <p className="mt-1 text-sm text-slate-500">Guides for great scans, answers to common questions, and a way to reach us.</p>
      </div>

      <section aria-label="Contact" className="grid gap-4 sm:grid-cols-2">
        <ContactCard icon={Mail} title="Email support" text="We answer within one business day. Include the model name or link if it’s about a specific model." href={`mailto:${SUPPORT_EMAIL}`} cta={SUPPORT_EMAIL} />
        <ContactCard
          icon={MessageCircle}
          title="Report a problem with a model"
          text="Something looks wrong in AR, or generation keeps failing? Send us the model link and we’ll take a look."
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Problem with a model")}`}
          cta="Report a problem"
        />
      </section>

      <section id="capture-guide" aria-labelledby="capture-heading" className="mt-8 scroll-mt-8">
        <h2 id="capture-heading" className="mb-3 font-semibold text-slate-900">
          Capture guide
        </h2>
        <Card className="p-5">
          <ol className="grid gap-4 sm:grid-cols-2">
            {captureSteps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo-600 text-sm font-semibold text-white">{i + 1}</span>
                <div>
                  <p className="font-medium text-slate-900">{s.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section aria-labelledby="faq-heading" className="mt-8">
        <h2 id="faq-heading" className="mb-3 font-semibold text-slate-900">
          Frequently asked questions
        </h2>
        <Card className="divide-y divide-slate-100">
          {faqs.map(({ icon: Icon, q, a }) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center gap-3 font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                <Icon className="size-4 shrink-0 text-slate-400" aria-hidden />
                <span className="flex-1">{q}</span>
                <ChevronDown className="size-4 text-slate-400 transition group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-2 pl-7 text-sm text-slate-600">{a}</p>
            </details>
          ))}
        </Card>
      </section>

      <p className="mt-8 text-center text-sm text-slate-500">
        Looking for plans and limits? See <Link href="/billing" className="font-medium text-indigo-600 hover:text-indigo-500">Billing</Link>.
      </p>
    </main>
  );
}
