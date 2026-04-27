import Link from "next/link";

export const metadata = { title: "Privacy Policy | LeaseUp Bulldog" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">
      <header className="border-b border-[#1E1E2E] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log in</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-black">Privacy Policy</h1>
        <p className="mb-12 text-sm text-gray-500">Effective date: April 21, 2026 · Last updated: April 21, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Who We Are</h2>
            <p>LeaseUp Bulldog LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us&quot;) operates LeaseUp Bulldog, an AI-powered SMS lead qualification platform for apartment operators. This policy explains what data we collect, how we use it, and your rights.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Data We Collect</h2>
            <p><strong className="text-white">Operator data:</strong> When you create an account, we collect your name, email, company name, and billing information (processed by Stripe — we do not store raw card data).</p>
            <p className="mt-2"><strong className="text-white">Lead/prospect data:</strong> We store name, phone number, email, unit preferences, conversation history, and TCPA consent records for prospects submitted to the platform by operators.</p>
            <p className="mt-2"><strong className="text-white">Usage data:</strong> We collect logs of platform activity for security, debugging, and product improvement.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. How We Use Data</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To provide and improve the Service</li>
              <li>To send AI-generated SMS messages on behalf of operators to prospects who have consented</li>
              <li>To send operators notifications about their leads and account</li>
              <li>To comply with legal obligations (TCPA, Fair Housing, etc.)</li>
              <li>To process payments via Stripe</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Data Sharing</h2>
            <p>We do not sell your data or your leads&apos; data. We share data only with:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-white">Supabase</strong> — database and authentication infrastructure</li>
              <li><strong className="text-white">Twilio</strong> — SMS delivery (prospect phone numbers are transmitted to send messages)</li>
              <li><strong className="text-white">Anthropic</strong> — AI message generation (conversation context is transmitted to generate replies; no data is used to train their models per our API agreement)</li>
              <li><strong className="text-white">Stripe</strong> — payment processing</li>
              <li><strong className="text-white">Sentry</strong> — error monitoring (sanitized error logs only)</li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. TCPA & SMS Consent</h2>
            <p>We record the timestamp, source platform, and originating IP address for every lead intake. This consent record is maintained on your behalf as the operator. You remain responsible for obtaining and documenting valid prior express written consent before submitting any phone number to the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Opt-Out Handling</h2>
            <p>When a prospect replies STOP (or any standard opt-out keyword) to any message, we immediately mark them as opted out and cease all automated communications. We also send a confirmation message as required by TCPA. Opt-out status is permanent unless the prospect re-opts-in by texting START.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Data Retention</h2>
            <p>We retain operator account data for the duration of your subscription plus 90 days after cancellation. Lead and conversation data is retained for 2 years unless you request deletion. TCPA consent records are retained for 4 years to satisfy potential legal requirements.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Security</h2>
            <p>We use industry-standard security measures including encryption in transit (TLS), encryption at rest, and role-based access controls. We use Supabase Row Level Security and Stripe for PCI-compliant payment handling. However, no system is perfectly secure — report any security concerns to <a href="mailto:security@leaseuphq.com" className="text-[#C8102E] hover:underline">security@leaseuphq.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by emailing us. For lead data deletion requests, please note that TCPA consent records may be retained for the legally required period.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you by email for material changes. Your continued use of the Service constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Contact</h2>
            <p>Privacy questions: <a href="mailto:privacy@leaseuphq.com" className="text-[#C8102E] hover:underline">privacy@leaseuphq.com</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
