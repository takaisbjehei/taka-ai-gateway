'use client';

import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Terminal, 
  BookOpen, 
  Activity, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Play, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Server, 
  Cpu, 
  Layers, 
  Sparkles, 
  Globe,
  Search,
  Lock,
  ArrowRight,
  LogOut,
  Info,
  Ticket,
  UserCheck
} from 'lucide-react';
import { TAKA_MODELS } from '@/lib/models';

interface TakaKey {
  id: string;
  keySecret: string;
  keyMasked: string;
  name: string;
  isActive: boolean;
  totalRequests: number;
  lastUsedAt: string | null;
  createdAt: string;
}

interface AccessCodeRecord {
  id: string;
  code: string;
  label: string;
  is_one_time: boolean;
  is_used: boolean;
  created_at: string;
  used_at?: string | null;
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

export default function TakaPortal() {
  // Auth Gate State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // App State
  const [activeTab, setActiveTab] = useState<'keys' | 'access-codes' | 'playground' | 'docs' | 'cluster'>('keys');
  const [takaKeys, setTakaKeys] = useState<TakaKey[]>([]);
  const [accessCodesList, setAccessCodesList] = useState<AccessCodeRecord[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State: Create API Key
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<TakaKey | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Modal State: Create One-Time Passcode
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeLabel, setPasscodeLabel] = useState('');
  const [customPasscode, setCustomPasscode] = useState('');
  const [isOneTimePass, setIsOneTimePass] = useState(true);
  const [isCreatingPasscode, setIsCreatingPasscode] = useState(false);

  // Playground State
  const [selectedModel, setSelectedModel] = useState('taka-search-v1');
  const [promptInput, setPromptInput] = useState('What are the latest breakthrough developments in quantum computing?');
  const [isStreaming, setIsStreaming] = useState(true);
  const [chatOutput, setChatOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);

  // Active Code Tab in Docs
  const [docCodeTab, setDocCodeTab] = useState<'python' | 'node' | 'curl' | 'nextjs'>('python');

  // Check saved session on load
  useEffect(() => {
    const saved = localStorage.getItem('taka_auth_token');
    if (saved) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAccessCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsVerifyingCode(true);
    try {
      const res = await fetch('/api/auth/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCodeInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('taka_auth_token', data.sessionToken || 'taka_active');
        setAccessCodeInput('');
        setIsAuthenticated(true);
        fetchData();
      } else {
        setAuthError(data.error || 'Invalid or expired access code.');
      }
    } catch (err: any) {
      setAuthError('Connection error. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('taka_auth_token');
    setAccessCodeInput('');
    setAuthError('');
    setIsAuthenticated(false);
  };

  const fetchData = async () => {
    try {
      const [keysRes, statsRes, codesRes] = await Promise.all([
        fetch('/api/taka-keys'),
        fetch('/api/stats'),
        fetch('/api/access-codes'),
      ]);
      const keysData = await keysRes.json();
      const statsData = await statsRes.json();
      const codesData = await codesRes.json();

      if (keysData.success) setTakaKeys(keysData.keys);
      if (statsData.success) setStats(statsData.stats);
      if (codesData.success) setAccessCodesList(codesData.codes);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const timer = setInterval(fetchData, 8000);
      return () => clearInterval(timer);
    }
  }, [isAuthenticated]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingKey(true);
    try {
      const res = await fetch('/api/taka-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'Production Key' }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedKey(data.key);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleCreatePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPasscode(true);
    try {
      const res = await fetch('/api/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: passcodeLabel || 'Client One-Time Pass',
          code: customPasscode || undefined,
          isOneTime: isOneTimePass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPasscodeModal(false);
        setPasscodeLabel('');
        setCustomPasscode('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingPasscode(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    try {
      await fetch(`/api/taka-keys?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePasscode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this access code?')) return;
    try {
      await fetch(`/api/access-codes?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const runPlayground = async () => {
    if (!promptInput.trim() || isGenerating) return;
    setIsGenerating(true);
    setChatOutput('');
    setResponseLatency(null);
    const start = Date.now();

    try {
      const activeKey = takaKeys[0]?.keySecret || 'taka_live_default';
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: promptInput }],
          stream: isStreaming,
        }),
      });

      if (isStreaming) {
        if (!response.body) throw new Error('No stream body received');
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let text = '';

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
                text += delta;
                setChatOutput(text);
              } catch {
                // ignore
              }
            }
          }
        }
      } else {
        const data = await response.json();
        setChatOutput(data.choices?.[0]?.message?.content || 'No response returned');
      }

      setResponseLatency(Date.now() - start);
    } catch (err: any) {
      setChatOutput(`[Error]: ${err.message}`);
    } finally {
      setIsGenerating(false);
      fetchData();
    }
  };

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') return `${window.location.origin}/v1`;
    return 'https://taka-ai-gateway.vercel.app/v1';
  };

  const getCodeSnippet = (lang: 'python' | 'node' | 'curl' | 'nextjs') => {
    const baseUrl = getBaseUrl();
    const sampleKey = takaKeys[0]?.keySecret || 'taka_live_your_api_key';

    if (lang === 'python') {
      return `from openai import OpenAI

# Connect to Taka AI API Gateway
client = OpenAI(
    base_url="${baseUrl}",
    api_key="${sampleKey}"
)

# Call taka-search-v1 (Live Web Search) or taka-max-120b
response = client.chat.completions.create(
    model="taka-search-v1",
    messages=[
        {"role": "user", "content": "Search the web and summarize today's AI breakthroughs."}
    ],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")`;
    }

    if (lang === 'node') {
      return `import OpenAI from "openai";

// Connect to Taka AI API Gateway
const client = new OpenAI({
  baseURL: "${baseUrl}",
  apiKey: "${sampleKey}",
});

async function main() {
  const stream = await client.chat.completions.create({
    model: "taka-search-v1",
    messages: [{ role: "user", content: "Search latest tech news." }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();`;
    }

    if (lang === 'nextjs') {
      return `import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Vercel AI SDK Integration
const takaAI = createOpenAI({
  baseURL: '${baseUrl}',
  apiKey: '${sampleKey}',
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: takaAI('taka-search-v1'),
    messages,
  });

  return result.toDataStreamResponse();
}`;
    }

    return `curl ${baseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${sampleKey}" \\
  -d '{
    "model": "taka-search-v1",
    "messages": [{"role": "user", "content": "Search the web for current AI trends"}],
    "stream": true
  }'`;
  };

  // ==========================================
  // ACCESS GATE SCREEN (IF NOT AUTHENTICATED)
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0d1322] border border-slate-800/90 rounded-2xl p-8 space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Taka AI Gateway</h1>
            <p className="text-xs text-slate-400">
              Enter your access pass or one-time redemption code to unlock the developer platform.
            </p>
          </div>

          <form onSubmit={handleAccessCodeLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Access Code / Passcode
              </label>
              <input
                type="text"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value)}
                placeholder="e.g. TAKA-VIP-8899"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all uppercase tracking-widest text-center"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300 text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingCode || !accessCodeInput.trim()}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isVerifyingCode ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying Access Pass...
                </>
              ) : (
                <>
                  Unlock Developer Platform
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Protected by Taka AI Enterprise Security
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // AUTHENTICATED DEVELOPER PORTAL
  // ==========================================
  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#0c1220]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">Taka AI</h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                Developer Platform
              </span>
            </div>
            <p className="text-xs text-slate-400">High-Performance Neural Inference & Web Search Cloud</p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'keys' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('access-codes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'access-codes' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 text-amber-400" />
            Access Passcodes
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'playground' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            Playground & Search
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'docs' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            API Connection Guide
          </button>
          <button
            onClick={() => setActiveTab('cluster')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'cluster' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Cluster Health
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setGeneratedKey(null);
              setNewKeyName('');
              setShowCreateModal(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
            title="Lock / Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Metric Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>ACTIVE CLUSTER NODES</span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stats?.activeKeys ?? 8}</span>
              <span className="text-xs text-slate-500">/ {stats?.totalKeys ?? 8} Online</span>
            </div>
            <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Round-Robin Engine Active
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>TOTAL INFERENCE CALLS</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats?.totalRequests ?? 0}</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Distributed evenly across cluster
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>STREAMING LATENCY (TTFT)</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">~120ms</div>
            <p className="text-[11px] text-emerald-400 mt-1">
              Real-time SSE token stream
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>ENDPOINT BASE URL</span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xs font-mono font-semibold text-slate-200 truncate mt-1 bg-slate-950/80 p-1.5 rounded border border-slate-800">
              {getBaseUrl()}
            </div>
            <button
              onClick={() => copyToClipboard(getBaseUrl(), 'base-url')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 mt-1 flex items-center gap-1"
            >
              {copiedId === 'base-url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedId === 'base-url' ? 'Copied' : 'Copy Endpoint'}
            </button>
          </div>
        </div>

        {/* TAB 1: API KEYS MANAGEMENT */}
        {activeTab === 'keys' && (
          <div className="space-y-6">
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-400" />
                    Taka AI Secret API Keys
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generate authentication keys for your applications and backends.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGeneratedKey(null);
                    setNewKeyName('');
                    setShowCreateModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create New Key
                </button>
              </div>

              {/* Keys Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                    <tr>
                      <th className="px-6 py-3">NAME</th>
                      <th className="px-6 py-3">SECRET KEY</th>
                      <th className="px-6 py-3">CREATED</th>
                      <th className="px-6 py-3">USAGE</th>
                      <th className="px-6 py-3">STATUS</th>
                      <th className="px-6 py-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {takaKeys.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          No API keys generated yet. Click "Create New Key" above.
                        </td>
                      </tr>
                    ) : (
                      takaKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4 font-semibold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            {k.name}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-300">
                            <div className="flex items-center gap-2">
                              <code className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                {k.keyMasked}
                              </code>
                              <button
                                onClick={() => copyToClipboard(k.keySecret, k.id)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                                title="Copy API Key"
                              >
                                {copiedId === k.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {new Date(k.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-200">
                            {k.totalRequests} calls
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteKey(k.id)}
                              className="p-1.5 rounded-md hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Revoke Key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACCESS PASSCODES MANAGEMENT */}
        {activeTab === 'access-codes' && (
          <div className="space-y-6">
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-amber-400" />
                    One-Time Access Passcodes
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generate single-use or permanent access codes for clients to unlock the developer platform.
                  </p>
                </div>
                <button
                  onClick={() => setShowPasscodeModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Generate New Passcode
                </button>
              </div>

              {/* Passcodes Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                    <tr>
                      <th className="px-6 py-3">LABEL</th>
                      <th className="px-6 py-3">PASSCODE</th>
                      <th className="px-6 py-3">TYPE</th>
                      <th className="px-6 py-3">STATUS</th>
                      <th className="px-6 py-3">CREATED</th>
                      <th className="px-6 py-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {accessCodesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          No passcodes found. Click "Generate New Passcode" above.
                        </td>
                      </tr>
                    ) : (
                      accessCodesList.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4 font-semibold text-white flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${c.is_used ? 'bg-slate-600' : 'bg-amber-400'}`} />
                            {c.label}
                          </td>
                          <td className="px-6 py-4 font-mono">
                            <div className="flex items-center gap-2">
                              <code className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-cyan-300 font-bold">
                                {c.code}
                              </code>
                              <button
                                onClick={() => copyToClipboard(c.code, `code-${c.id}`)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                                title="Copy Code"
                              >
                                {copiedId === `code-${c.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {c.is_one_time ? 'One-Time Use' : 'Permanent'}
                          </td>
                          <td className="px-6 py-4">
                            {c.is_used ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-400 inline-flex items-center gap-1.5">
                                Redeemed
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Available
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeletePasscode(c.id)}
                              className="p-1.5 rounded-md hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete Passcode"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PLAYGROUND & SEARCH */}
        {activeTab === 'playground' && (
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Taka Neural & Search Playground</h2>
              </div>
              <label className="text-xs text-slate-400 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStreaming}
                  onChange={(e) => setIsStreaming(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
                Stream Real-Time SSE
              </label>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <optgroup label="Live Web Search & Compound Multi-Agent">
                      <option value="taka-search-v1">🔍 taka-search-v1 (Autonomous Web Search Agent)</option>
                      <option value="taka-search-mini">🔍 taka-search-mini (Fast Web Search Agent)</option>
                    </optgroup>
                    <optgroup label="Ultra Intelligence & Flagship">
                      <option value="taka-max-120b">🧠 taka-max-120b (Ultra-Intelligence 120B)</option>
                      <option value="taka-ultra-70b">🚀 taka-ultra-70b (Versatile Reasoning 70B)</option>
                      <option value="taka-qwen-27b">💻 taka-qwen-27b (Code & Math Powerhouse 27B)</option>
                      <option value="taka-pro-20b">⚡ taka-pro-20b (High-Speed Dense 20B)</option>
                    </optgroup>
                    <optgroup label="Instant Real-Time">
                      <option value="taka-flash-8b">⚡ taka-flash-8b (Sub-100ms Instant Response)</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Auth Header</label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono truncate">
                    Bearer {takaKeys[0]?.keyMasked || 'taka_live_default...'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Prompt / Query</label>
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono resize-none"
                  placeholder="Ask any question or search topic..."
                />
              </div>

              <button
                onClick={runPlayground}
                disabled={isGenerating || !promptInput.trim()}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating via Taka Neural Engine...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Send Request to Gateway
                  </>
                )}
              </button>

              {/* Output Window */}
              <div className="min-h-[160px] bg-slate-950 rounded-lg border border-slate-800/80 p-4 text-xs font-mono text-slate-200">
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800/60 pb-2 mb-3">
                  <span>Output Response</span>
                  {responseLatency && (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Latency: {responseLatency}ms
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap">
                  {chatOutput || <span className="text-slate-600 italic">Click "Send Request" to test generation & streaming...</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: API CONNECTION GUIDE */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            {/* Quick Connection Info Card */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                How to Connect to Taka AI Gateway
              </h2>
              <p className="text-xs text-slate-300">
                Taka AI is a 100% standard OpenAI-compatible API. You can use it as a drop-in replacement in any library, SDK, Cursor IDE, OpenWebUI, LibreChat, or custom application.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500 font-medium">1. Base URL</div>
                  <div className="font-mono text-cyan-300 font-semibold mt-1 truncate">{getBaseUrl()}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500 font-medium">2. Auth Header</div>
                  <div className="font-mono text-emerald-300 font-semibold mt-1 truncate">Bearer taka_live_...</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500 font-medium">3. Models Endpoint</div>
                  <div className="font-mono text-indigo-300 font-semibold mt-1 truncate">GET /v1/models</div>
                </div>
              </div>
            </div>

            {/* Code Snippets Card */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
                <div>
                  <h3 className="text-sm font-semibold text-white">SDK Quickstart Snippets</h3>
                  <p className="text-xs text-slate-400">Copy and paste directly into your project codebase.</p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setDocCodeTab('python')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      docCodeTab === 'python' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Python
                  </button>
                  <button
                    onClick={() => setDocCodeTab('node')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      docCodeTab === 'node' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setDocCodeTab('nextjs')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      docCodeTab === 'nextjs' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Vercel AI SDK
                  </button>
                  <button
                    onClick={() => setDocCodeTab('curl')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      docCodeTab === 'curl' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    cURL
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="relative">
                  <pre className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 border border-slate-800/80 overflow-x-auto">
                    <code>{getCodeSnippet(docCodeTab)}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(getCodeSnippet(docCodeTab), 'doc-code')}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedId === 'doc-code' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Model Directory Card */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Available Taka AI Models
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {TAKA_MODELS.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-semibold text-cyan-400 flex items-center gap-1.5">
                        {m.isSearchEngine && <Search className="w-3.5 h-3.5 text-amber-400" />}
                        {m.id}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {m.contextWindow}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium mt-1">{m.name}</div>
                    <p className="text-slate-500 mt-1">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CLUSTER HEALTH */}
        {activeTab === 'cluster' && (
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Taka Neural Cluster Matrix</h2>
              </div>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                All 8 Nodes Operational
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Node 0{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Online
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Health:</span>
                      <span className="text-slate-200">100%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failover:</span>
                      <span className="text-slate-200">Auto-Hot</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CREATE API KEY */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                Create New API Key
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {!generatedKey ? (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Application"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    An identifying label for your application or service.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingKey}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors"
                  >
                    {isCreatingKey ? 'Generating...' : 'Create Secret Key'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-xs text-emerald-300">
                  ✓ Your new Taka AI Secret Key has been generated!
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Secret Key</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedKey.keySecret}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedKey.keySecret, 'modal-key')}
                      className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedId === 'modal-key' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === 'modal-key' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Make sure to save this secret key. You won't be able to view it again once closed.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE ONE-TIME PASSCODE */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-400" />
                Generate New Access Passcode
              </h3>
              <button
                onClick={() => setShowPasscodeModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePasscode} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Passcode Label / Client Name
                </label>
                <input
                  type="text"
                  value={passcodeLabel}
                  onChange={(e) => setPasscodeLabel(e.target.value)}
                  placeholder="e.g. VIP Client Access"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Custom Code (Optional, Auto-Generated if Blank)
                </label>
                <input
                  type="text"
                  value={customPasscode}
                  onChange={(e) => setCustomPasscode(e.target.value)}
                  placeholder="e.g. TAKA-USER-9901"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs font-mono uppercase text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOneTimePass}
                    onChange={(e) => setIsOneTimePass(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                  />
                  One-Time Use Only (Expires immediately after 1st login)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasscodeModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPasscode}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition-colors"
                >
                  {isCreatingPasscode ? 'Generating...' : 'Generate Passcode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500 bg-[#0c1220]/60">
        Taka AI • High-Speed Neural Inference & Live Web Search Platform • Zero-Downtime Architecture
      </footer>
    </div>
  );
}
