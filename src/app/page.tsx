'use client';

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Cpu, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Play, 
  Plus, 
  Clock, 
  Radio, 
  Layers
} from 'lucide-react';

interface KeyStat {
  id: string;
  apiKey: string;
  maskedKey: string;
  label: string;
  isActive: boolean;
  cooldownUntil: string | null;
  isInCooldown: boolean;
  cooldownRemainingSeconds: number;
  totalRequests: number;
  failedRequests: number;
  lastUsedAt: string | null;
}

interface StatsData {
  totalKeys: number;
  activeKeys: number;
  cooldownKeys: number;
  totalRequests: number;
  totalFailed: number;
  successRate: string;
  isSupabaseConnected: boolean;
  gatewayStatus: string;
}

export default function Dashboard() {
  const [keys, setKeys] = useState<KeyStat[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'python' | 'node'>('python');

  // Playground state
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [promptInput, setPromptInput] = useState('Explain quantum computing in 2 concise sentences.');
  const [isStreaming, setIsStreaming] = useState(true);
  const [chatOutput, setChatOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUsedKeyLabel, setLastUsedKeyLabel] = useState<string | null>(null);
  const [requestLatency, setRequestLatency] = useState<number | null>(null);

  // Add Key Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [addKeyError, setAddKeyError] = useState('');

  const fetchStatsAndKeys = async () => {
    setIsRefreshing(true);
    try {
      const [keysRes, statsRes] = await Promise.all([
        fetch('/api/keys'),
        fetch('/api/stats'),
      ]);
      const keysData = await keysRes.json();
      const statsData = await statsRes.json();

      if (keysData.success) setKeys(keysData.keys);
      if (statsData.success) setStats(statsData.stats);
    } catch (e) {
      console.error('Error fetching stats:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatsAndKeys();
    const interval = setInterval(fetchStatsAndKeys, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleResetCooldowns = async () => {
    try {
      await fetch('/api/keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_cooldowns' }),
      });
      fetchStatsAndKeys();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddKeyError('');
    if (!newKeyInput.startsWith('gsk_')) {
      setAddKeyError('API Key must start with gsk_');
      return;
    }
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newKeyInput.trim(), label: newKeyLabel || 'Taka Key' }),
      });
      const data = await res.json();
      if (!data.success) {
        setAddKeyError(data.error || 'Failed to add key');
        return;
      }
      setShowAddModal(false);
      setNewKeyInput('');
      setNewKeyLabel('');
      fetchStatsAndKeys();
    } catch (err: any) {
      setAddKeyError(err.message);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(id);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const runPlayground = async () => {
    if (!promptInput.trim() || isGenerating) return;
    setIsGenerating(true);
    setChatOutput('');
    setLastUsedKeyLabel(null);
    setRequestLatency(null);
    const startTime = Date.now();

    try {
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: promptInput }],
          stream: isStreaming,
        }),
      });

      const keyUsed = response.headers.get('X-Taka-Key-Label') || 'Auto Rotated Key';
      const keyMasked = response.headers.get('X-Taka-Key-Used');
      setLastUsedKeyLabel(`${keyUsed} ${keyMasked ? `(${keyMasked})` : ''}`);

      if (isStreaming) {
        if (!response.body) throw new Error('No readable stream');
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(trimmed.replace('data: ', ''));
                const delta = parsed.choices?.[0]?.delta?.content || '';
                accumulated += delta;
                setChatOutput(accumulated);
              } catch {
                // ignore parse chunk error
              }
            }
          }
        }
      } else {
        const data = await response.json();
        setChatOutput(data.choices?.[0]?.message?.content || 'No response returned');
      }

      setRequestLatency(Date.now() - startTime);
    } catch (err: any) {
      setChatOutput(`[Error]: ${err.message}`);
    } finally {
      setIsGenerating(false);
      fetchStatsAndKeys();
    }
  };

  const getOriginUrl = () => {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://your-domain.vercel.app';
  };

  const getCodeSnippet = (lang: string) => {
    const origin = getOriginUrl();
    if (lang === 'python') {
      return `from openai import OpenAI

client = OpenAI(
    base_url="${origin}/v1",
    api_key="taka-ai-key" # or your PROXY_AUTH_TOKEN
)

response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "Hello Taka AI!"}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")`;
    }

    if (lang === 'node') {
      return `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${origin}/v1",
  apiKey: "taka-ai-key", // or your PROXY_AUTH_TOKEN
});

async function main() {
  const stream = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: "Hello Taka AI!" }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();`;
    }

    return `curl ${origin}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer taka-ai-key" \\
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello Taka AI!"}],
    "stream": false
  }'`;
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-[#0c1220]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold tracking-wider">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-white">Taka AI Gateway</h1>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">Intelligent Key Pool & Rate-Limit Failover Proxy</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatsAndKeys}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleResetCooldowns}
            className="px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-amber-300 flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Reset Cooldowns
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Key
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>ACTIVE POOL KEYS</span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stats?.activeKeys ?? 8}</span>
              <span className="text-xs text-slate-500">/ {stats?.totalKeys ?? 8} Total</span>
            </div>
            <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Zero-downtime rotation ready
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>TOTAL REQUESTS</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats?.totalRequests ?? 0}</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Distributed evenly across keys
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>COOLDOWN KEYS</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats?.cooldownKeys ?? 0}</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Auto-recovers after 60s
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>GATEWAY STORAGE</span>
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-sm font-semibold text-white mt-1">
              {stats?.isSupabaseConnected ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Supabase Cloud DB
                </span>
              ) : (
                <span className="text-slate-300 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" /> High-Speed In-Memory
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats?.isSupabaseConnected ? 'Atomic SQL Locking Active' : 'Ready for Supabase connection'}
            </p>
          </div>
        </div>

        {/* 2 Columns: Key Pool Table & Interactive Playground */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Key Pool Matrix (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Groq API Key Pool Matrix</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {keys.length} Keys Configured
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[460px]">
              {keys.map((k, index) => (
                <div key={k.id || index} className="px-5 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs font-mono text-slate-400">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">{k.label}</span>
                        <code className="text-[11px] font-mono text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                          {k.maskedKey}
                        </code>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                        <span>Requests: <strong className="text-slate-300">{k.totalRequests}</strong></span>
                        {k.failedRequests > 0 && (
                          <span className="text-rose-400">429s: {k.failedRequests}</span>
                        )}
                        {k.lastUsedAt && (
                          <span>Last used: {new Date(k.lastUsedAt).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {k.isInCooldown ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-950/80 border border-amber-800/80 text-amber-300 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                        Cooldown ({k.cooldownRemainingSeconds}s)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Playground (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Live Rotator Playground</h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label className="text-slate-400 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isStreaming}
                    onChange={(e) => setIsStreaming(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  Stream SSE
                </label>
              </div>
            </div>

            <div className="p-5 space-y-4 flex-1 flex flex-col">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="llama-3.3-70b-versatile">Meta Llama 3.3 70B Versatile</option>
                  <option value="llama-3.1-8b-instant">Meta Llama 3.1 8B Instant (Ultra Fast)</option>
                  <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 Distill Llama 70B</option>
                  <option value="mixtral-8x7b-32768">Mixtral 8x7B (32k context)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Prompt</label>
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono resize-none"
                  placeholder="Enter test prompt..."
                />
              </div>

              <button
                onClick={runPlayground}
                disabled={isGenerating || !promptInput.trim()}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating via Rotated Key...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Send Request Through Gateway
                  </>
                )}
              </button>

              {/* Output area */}
              <div className="flex-1 flex flex-col min-h-[140px] bg-slate-950 rounded-lg border border-slate-800/80 p-3 text-xs font-mono text-slate-300 overflow-y-auto">
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800/60 pb-1.5 mb-2">
                  <span>Output Window</span>
                  {lastUsedKeyLabel && (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <Zap className="w-3 h-3" /> {lastUsedKeyLabel} {requestLatency ? `(${requestLatency}ms)` : ''}
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap flex-1 text-slate-200">
                  {chatOutput || <span className="text-slate-600 italic">Click "Send Request" to test live key rotation and response stream...</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Integration Code Hub */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
            <div>
              <h2 className="text-sm font-semibold text-white">Developer Integration</h2>
              <p className="text-xs text-slate-400">Use Taka AI Gateway as a 100% drop-in replacement for OpenAI SDKs</p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveCodeTab('python')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeCodeTab === 'python' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Python
              </button>
              <button
                onClick={() => setActiveCodeTab('node')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeCodeTab === 'node' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                TypeScript / Node
              </button>
              <button
                onClick={() => setActiveCodeTab('curl')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeCodeTab === 'curl' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                cURL
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="relative">
              <pre className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 border border-slate-800/80 overflow-x-auto">
                <code>{getCodeSnippet(activeCodeTab)}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(getCodeSnippet(activeCodeTab), activeCodeTab)}
                className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                {copiedTab === activeCodeTab ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Add Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Add Groq API Key to Pool
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddKey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Key Label (Optional)</label>
                <input
                  type="text"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  placeholder="e.g. Backup Key 9"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Groq API Key</label>
                <input
                  type="text"
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value)}
                  placeholder="gsk_..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {addKeyError && (
                <p className="text-xs text-rose-400">{addKeyError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Add Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500 bg-[#0c1220]/60">
        Taka AI Gateway • Enterprise-Grade Groq API Rotator • Zero-Downtime Serverless Engine
      </footer>
    </div>
  );
}
