import Link from "next/link";

export const metadata = { title: "Terms of Service | LeaseUp Bulldog" };

export default function TermsPage() {
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
        <h1 className="mb-2 text-4xl font-black">Terms of Service</h1>
        <p className="mb-12 text-sm text-gray-500">Effective date: April 21, 2026 · Last updated: April 21, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using LeaseUp Bulldog (&quot;Service&quot;), operated by LeaseUp Bulldog LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Description of Service</h2>
            <p>LeaseUp Bulldog is an AI-powered lead qualification and follow-up platform for multifamily apartment operators. The Service sends automated SMS messages to prospective renters on behalf of operators using the Twilio communications platform and the Anthropic Claude API.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Operator Responsibilities</h2>
            <p>As an operator using the Service, you are solely responsible for:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Obtaining proper TCPA consent from all prospects before submitting them to the Service</li>
              <li>Ensuring your use of the Service complies with all applicable laws, including but not limited to the Telephone Consumer Protection Act (TCPA), the CAN-SPAM Act, and the Fair Housing Act</li>
              <li>The content of your property listings and any information you configure in the platform</li>
              <li>Maintaining accurate &quot;opt-out&quot; records and honoring opt-out requests promptly</li>
              <li>Supervising AI-generated responses and intervening when necessary</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Fair Housing Compliance</h2>
            <p>The Service is configured with Fair Housing Act guardrails. However, operators acknowledge that AI systems are imperfect and must not rely solely on the Service to ensure Fair Housing compliance. Operators remain solely responsible for compliance with the Fair Housing Act and all applicable anti-discrimination laws.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. TCPA Compliance</h2>
            <p>You represent and warrant that all phone numbers submitted to the Service have provided prior express written consent to receive automated text messages from you at the number provided. You agree to maintain records of such consent and provide them to us upon request. We record the timestamp, source, and IP address of each lead intake for your compliance records.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Payment Terms</h2>
            <p>The Service is billed monthly after a 14-day free trial. Pricing is plan-based: Starter ($500/month + $200/lease), Pro ($1,500/month + $150/lease), Portfolio ($3,000/month + $100/lease). A Marketing Add-On is available on any plan for an additional $500/month. Performance fees apply per lease marked &quot;Won&quot; in the platform within the 30-day attribution window. You may cancel at any time; cancellation takes effect at the end of the current billing cycle.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Acceptable Use</h2>
            <p>You may not use the Service to: send spam or unsolicited messages; harass, threaten, or discriminate against any person; violate any applicable law; or interfere with the operation of the Service. We reserve the right to suspend or terminate your account for violations.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Data & Privacy</h2>
            <p>Lead data submitted to the Service is stored securely and used only to power the features you configure. We do not sell lead data to third parties. See our <Link href="/privacy" className="text-[#C8102E] hover:underline">Privacy Policy</Link> for full details.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNTS PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Indemnification</h2>
            <p>You agree to indemnify and hold harmless the Company from any claims, damages, or expenses (including legal fees) arising from your use of the Service, your violation of these Terms, or your violation of any law or third-party rights.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify you of material changes by email. Continued use of the Service after changes take effect constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">12. Contact</h2>
            <p>Questions about these Terms? Email us at <a href="mailto:legal@leaseuphq.com" className="text-[#C8102E] hover:underline">legal@leaseuphq.com</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
