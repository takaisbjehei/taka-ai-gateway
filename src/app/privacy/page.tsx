import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-300 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Gateway
        </Link>
        
        <header className="space-y-4 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Lock className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-slate-400">Last Updated: August 2026</p>
        </header>

        <article className="prose prose-invert prose-cyan max-w-none space-y-6 text-sm md:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
            <p>
              When you use the Taka AI Neural Gateway, we collect only the necessary telemetry data to ensure service stability, security, and accurate billing/rate-limiting. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>API Keys:</strong> Masked versions of your developer keys and usage statistics (prompt tokens, completion tokens).</li>
              <li><strong>Security Telemetry:</strong> IP addresses, user-agent strings, and browser fingerprints strictly for the purpose of threat detection via the Neural Shield.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h2>
            <p>
              We use the collected information exclusively to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Provide, operate, and maintain our API gateway.</li>
              <li>Enforce rate limits and prevent abuse/scraping.</li>
              <li>Monitor total token consumption per developer key.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Data Retention and Chat Logs</h2>
            <p>
              <strong>We do not store your chat histories.</strong> All prompts and generated responses are processed in-memory during the streaming response and are immediately discarded. We do not use your inputs to train or fine-tune our models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Third-Party Infrastructure</h2>
            <p>
              The Taka AI Gateway operates as a secure proxy layer. Queries may be routed through encrypted channels to underlying foundation model providers (such as Groq, Meta, or OpenAI). These queries are anonymized where possible and stripped of identifying developer metadata before transmission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Contact Us</h2>
            <p>
              If you have any questions regarding this Privacy Policy or your data, please contact the lead architect, Takadori, through the official Taka AI developer channels.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
