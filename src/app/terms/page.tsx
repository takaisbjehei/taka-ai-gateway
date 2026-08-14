import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-300 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Gateway
        </Link>
        
        <header className="space-y-4 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">Terms of Service</h1>
          </div>
          <p className="text-slate-400">Last Updated: August 2026</p>
        </header>

        <article className="prose prose-invert prose-cyan max-w-none space-y-6 text-sm md:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Taka AI Neural Gateway ("Gateway", "Service", "Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you are prohibited from using the API or the web platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. API Access and Security</h2>
            <p>
              Access to the Taka API requires a valid Developer Access Key. You are solely responsible for maintaining the confidentiality of your API keys. Taka AI employs an active Neural Shield threat detection engine. Any attempt to reverse engineer, scrape, bypass rate limits, or tamper with the gateway interface will result in immediate API key revocation and IP blacklisting.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Acceptable Use Policy</h2>
            <p>
              You agree not to use the Taka AI Neural Gateway to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Generate illegal, harmful, or abusive content.</li>
              <li>Develop malware or weaponized exploits.</li>
              <li>Attempt to extract the underlying model weights or training data.</li>
              <li>Exceed the allocated rate limits (60 requests per minute per IP).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Limitation of Liability</h2>
            <p>
              THE TAKA AI SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". TAKA AI, ITS CREATOR TAKADORI, AND AFFILIATES MAKE NO WARRANTIES, EXPRESS OR IMPLIED, REGARDING THE ACCURACY, RELIABILITY, OR AVAILABILITY OF THE AI GENERATED CONTENT. 
            </p>
            <p className="mt-2">
              IN NO EVENT SHALL TAKA AI BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES (INCLUDING DATA LOSS OR BUSINESS INTERRUPTION) ARISING OUT OF YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>


        </article>
      </div>
    </div>
  );
}
