'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Eye, 
  EyeOff, 
  Code, 
  Clock, 
  BarChart3, 
  MessageSquare,
  Send,
  Sliders,
  Settings,
  Bot,
  User,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { TAKA_MODELS } from '@/lib/models';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  isSearching?: boolean;
  latencyMs?: number;
  tokenCount?: number;
  tokensPerSec?: number;
  timestamp: string;
}

interface TakaKey {
  id: string;
  keySecret: string;
  keyMasked: string;
  name: string;
  isActive: boolean;
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
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

const DEFAULT_TAKAI_KEY = 'taka_live_e29d54a0a277890f0a1720fad57f12bf';

export default function TakaPortal() {
  // Main View Mode: 'chat' (AI Search & Assistant) or 'dashboard' (Developer API Platform)
  const [mainView, setMainView] = useState<'chat' | 'dashboard'>('chat');
  const [dashboardTab, setDashboardTab] = useState<'keys' | 'access-codes' | 'docs' | 'cluster'>('keys');

  // Auth State for Developer Dashboard
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Chat & Search State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: "Welcome. I am **Taka AI**, the autonomous super-intelligence system conceived and engineered by **Takadori**.\n\nPowered by our multi-cluster neural matrix, hypersonic 120B reasoning cores, and live orbital web reconnaissance. What breakthrough are we building today?",
      model: 'taka-search-v1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('taka-search-v1');
  const [isSearchMode, setIsSearchMode] = useState(true);
  const [isStreaming, setIsStreaming] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionTokens, setSessionTokens] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Active Key in Chat
  const [customUserKey, setCustomUserKey] = useState(DEFAULT_TAKAI_KEY);
  const [showKeySettings, setShowKeySettings] = useState(false);

  // Developer Platform Data
  const [takaKeys, setTakaKeys] = useState<TakaKey[]>([]);
  const [accessCodesList, setAccessCodesList] = useState<AccessCodeRecord[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State: Create API Key
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<TakaKey | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Modal State: View API Key Details
  const [inspectKey, setInspectKey] = useState<TakaKey | null>(null);
  const [revealSecret, setRevealSecret] = useState(false);
  const [inspectCodeLang, setInspectCodeLang] = useState<'python' | 'node' | 'curl'>('python');

  // Modal State: Create One-Time Passcode
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeLabel, setPasscodeLabel] = useState('');
  const [customPasscode, setCustomPasscode] = useState('');
  const [isOneTimePass, setIsOneTimePass] = useState(true);
  const [isCreatingPasscode, setIsCreatingPasscode] = useState(false);

  // Modal State: Select Model (Mobile & Desktop)
  const [showModelModal, setShowModelModal] = useState(false);

  // Active Code Tab in Docs
  const [docCodeTab, setDocCodeTab] = useState<'python' | 'node' | 'curl' | 'nextjs'>('python');

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

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
      if (inspectKey?.id === id) {
        setInspectKey(null);
      }
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

  // SEND CHAT / SEARCH MESSAGE
  const handleSendMessage = async (promptOverride?: string) => {
    const textToSend = promptOverride || userInput;
    if (!textToSend.trim() || isGenerating) return;

    const chosenModel = isSearchMode ? 'taka-search-v1' : selectedModel;
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        content: textToSend,
        timestamp: timeStr,
      },
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        model: chosenModel,
        isSearching: isSearchMode,
        timestamp: timeStr,
      },
    ];

    setMessages(newMessages);
    setUserInput('');
    setIsGenerating(true);

    const startTime = Date.now();
    const apiKey = customUserKey || DEFAULT_TAKAI_KEY;

    try {
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: chosenModel,
          messages: newMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          stream: isStreaming,
        }),
      });

      if (isStreaming) {
        if (!response.body) throw new Error('No stream body received');
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulated = '';
        let streamTokenCount = 0;

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
                if (delta) {
                  streamTokenCount++;
                  accumulated += delta;
                  const elapsedSec = (Date.now() - startTime) / 1000;
                  const tps = elapsedSec > 0 ? Math.round(streamTokenCount / elapsedSec) : 0;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: accumulated, latencyMs: Date.now() - startTime, tokenCount: streamTokenCount, tokensPerSec: tps }
                        : msg
                    )
                  );
                }
              } catch {
                // ignore
              }
            }
          }
        }
        // Final token count update
        const finalWords = accumulated.split(/\s+/).length;
        const estimatedTokens = Math.max(streamTokenCount, Math.ceil(finalWords * 1.3));
        const finalElapsed = (Date.now() - startTime) / 1000;
        const finalTps = finalElapsed > 0 ? Math.round(estimatedTokens / finalElapsed) : 0;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, tokenCount: estimatedTokens, tokensPerSec: finalTps }
              : msg
          )
        );
        setSessionTokens((prev) => prev + estimatedTokens);
      } else {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || 'No response returned.';
        const usage = data.usage;
        const respTokens = usage?.total_tokens || Math.ceil(content.split(/\s+/).length * 1.3);
        const elapsedSec = (Date.now() - startTime) / 1000;
        const tps = elapsedSec > 0 ? Math.round(respTokens / elapsedSec) : 0;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content, latencyMs: Date.now() - startTime, tokenCount: respTokens, tokensPerSec: tps }
              : msg
          )
        );
        setSessionTokens((prev) => prev + respTokens);
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: `⚠️ Error communicating with Taka Gateway: ${err.message}` }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
      if (isAuthenticated) fetchData();
    }
  };

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') return `${window.location.origin}/v1`;
    return 'https://taka-ai-gateway.vercel.app/v1';
  };

  const getCodeSnippet = (lang: 'python' | 'node' | 'curl' | 'nextjs', customKey?: string) => {
    const baseUrl = getBaseUrl();
    const sampleKey = customKey || customUserKey || takaKeys[0]?.keySecret || 'taka_live_your_api_key';

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

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Universal Navbar */}
      <header className="border-b border-slate-800/80 bg-[#0b101d]/90 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setMainView('chat')}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-amber-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg cursor-pointer hover:border-cyan-400 transition-all group"
            title="Arc Neural Core"
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span 
                onClick={() => setMainView('chat')}
                className="text-base font-extrabold tracking-tight text-white cursor-pointer hover:text-cyan-300 transition-colors"
              >
                Taka AI
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-700/80 text-cyan-300 shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                by Takadori
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Autonomous Arc Super-Intelligence & Live Web Reconnaissance</p>
          </div>
        </div>

        {/* Center Mode Switcher: AI Search vs Developer Gateway */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setMainView('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mainView === 'chat'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            AI Search & Chat
          </button>
          <button
            onClick={() => setMainView('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mainView === 'dashboard'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            Developer Gateway
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {mainView === 'chat' && (
            <button
              onClick={() => setShowKeySettings(!showKeySettings)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-slate-700 transition-colors"
              title="API Key Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              setMainView('dashboard');
              setDashboardTab('keys');
              if (isAuthenticated) {
                setGeneratedKey(null);
                setNewKeyName('');
                setShowCreateModal(true);
              }
            }}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Make Your Own</span> API Key
          </button>

          {/* Security Shield Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 text-[10px] font-bold animate-pulse" title="Taka AI Neural Shield v3.0 — Active">
            <ShieldCheck className="w-3.5 h-3.5" />
            Shield Active
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 1. CONSUMER AI SEARCH & CHAT EXPERIENCE (MAIN VIEW)       */}
      {/* ========================================================= */}
      {mainView === 'chat' && (
        <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 md:p-6 space-y-4">
          {/* Key Settings Drawer (Optional) */}
          {showKeySettings && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 animate-in fade-in slide-in-from-top duration-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  Active Client API Key
                </span>
                <span className="text-[11px] text-emerald-400">● Connected to Taka Gateway</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customUserKey}
                  onChange={(e) => setCustomUserKey(e.target.value)}
                  placeholder="taka_live_..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => {
                    setMainView('dashboard');
                    setDashboardTab('keys');
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium whitespace-nowrap"
                >
                  Generate New Key
                </button>
              </div>
            </div>
          )}

          {/* Model & Search Mode Bar (Mobile & Desktop Responsive) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-sm">
            {/* Search Engine Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newSearch = !isSearchMode;
                  setIsSearchMode(newSearch);
                  if (newSearch && !selectedModel.startsWith('taka-search')) {
                    setSelectedModel('taka-search-v1');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 ${
                  isSearchMode
                    ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300 shadow-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Search className={`w-3.5 h-3.5 ${isSearchMode ? 'text-amber-400 animate-pulse' : ''}`} />
                {isSearchMode ? 'Live Web Search: Active' : 'Live Web Search: Off'}
              </button>

              <span className="text-[11px] text-slate-500 hidden md:inline">
                {isSearchMode ? 'Real-time web retrieval' : 'Direct neural reasoning'}
              </span>
            </div>

            {/* Interactive Model Selector Button (Works on all mobile devices!) */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowModelModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-700/80 text-cyan-300 text-xs font-mono font-medium flex items-center gap-2 transition-all shadow-inner active:scale-95"
                title="Tap to Change AI Model"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-none">{selectedModel}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-400 ml-1">
                  Change ▾
                </span>
              </button>
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 min-h-[380px] max-h-[560px] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 space-y-2 shadow-sm ${
                    m.role === 'user'
                      ? 'bg-cyan-600 text-white rounded-br-none'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {/* Assistant Header Tag */}
                  {m.role === 'assistant' && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5 mb-1.5 flex-wrap gap-y-1">
                      <span className="font-mono text-cyan-400 flex items-center gap-1.5">
                        {m.isSearching && <Search className="w-3 h-3 text-amber-400" />}
                        {m.model || 'taka-ai'}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {m.tokensPerSec != null && m.tokensPerSec > 0 && (
                          <span className="text-amber-400 flex items-center gap-1 font-semibold">
                            <Flame className="w-3 h-3" /> {m.tokensPerSec} tok/s
                          </span>
                        )}
                        {m.tokenCount != null && m.tokenCount > 0 && (
                          <span className="text-cyan-300 flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" /> {m.tokenCount} tokens
                          </span>
                        )}
                        {m.latencyMs && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> {m.latencyMs}ms
                          </span>
                        )}
                        <span>{m.timestamp}</span>
                      </div>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap text-xs md:text-sm font-sans leading-relaxed">
                    {m.content || (
                      <span className="flex items-center gap-2 text-cyan-400 italic">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {m.isSearching ? 'Searching live web & synthesizing...' : 'Taka Neural Engine generating...'}
                      </span>
                    )}
                  </div>

                  {m.role === 'assistant' && m.content && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => copyToClipboard(m.content, m.id)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 transition-colors"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Starter Suggestions */}
          {messages.length <= 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
              <button
                onClick={() => {
                  setIsSearchMode(true);
                  handleSendMessage('Perform global live reconnaissance on latest fusion energy breakthroughs this month.');
                }}
                className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-left text-xs text-slate-300 transition-all hover:border-amber-500/50 hover:shadow-lg group"
              >
                <div className="text-amber-400 font-semibold flex items-center gap-1.5 mb-1">
                  <Search className="w-3.5 h-3.5" />
                  Live Web Reconnaissance
                </div>
                <div className="text-slate-400 text-[11px] leading-snug">Global live research on fusion energy & clean power</div>
              </button>

              <button
                onClick={() => {
                  setIsSearchMode(false);
                  setSelectedModel('taka-max-120b');
                  handleSendMessage('Architect a complete high-performance distributed microservice engine in Rust with Tokio.');
                }}
                className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-left text-xs text-slate-300 transition-all hover:border-cyan-500/50 hover:shadow-lg group"
              >
                <div className="text-cyan-400 font-semibold flex items-center gap-1.5 mb-1">
                  <Code className="w-3.5 h-3.5" />
                  120B Systems Architecture
                </div>
                <div className="text-slate-400 text-[11px] leading-snug">High-performance distributed engine in Rust</div>
              </button>

              <button
                onClick={() => {
                  setIsSearchMode(true);
                  handleSendMessage('Search global tech financial markets, semiconductor earnings, and AI infrastructure investments.');
                }}
                className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-left text-xs text-slate-300 transition-all hover:border-emerald-500/50 hover:shadow-lg group"
              >
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5 mb-1">
                  <Flame className="w-3.5 h-3.5" />
                  Global Market Intelligence
                </div>
                <div className="text-slate-400 text-[11px] leading-snug">Live semiconductor & AI infrastructure telemetry</div>
              </button>

              <button
                onClick={() => {
                  setIsSearchMode(false);
                  setSelectedModel('taka-qwen-27b');
                  handleSendMessage('Design an autonomous flight trajectory algorithm for hypersonic orbit navigation.');
                }}
                className="p-3.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-left text-xs text-slate-300 transition-all hover:border-indigo-500/50 hover:shadow-lg group"
              >
                <div className="text-indigo-400 font-semibold flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  Hypersonic Algorithms
                </div>
                <div className="text-slate-400 text-[11px] leading-snug">Autonomous trajectory & orbital mechanics physics</div>
              </button>
            </div>
          )}
          {/* Session Token Telemetry Bar */}
          {messages.length > 1 && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800/60 text-[11px]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Session: {sessionTokens.toLocaleString()} tokens
                </span>
                <span className="text-slate-500 hidden sm:flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {messages.filter(m => m.role === 'assistant' && m.content).length} responses
                </span>
                {(() => {
                  const assistantMsgs = messages.filter(m => m.role === 'assistant' && m.tokensPerSec && m.tokensPerSec > 0);
                  if (assistantMsgs.length === 0) return null;
                  const avgTps = Math.round(assistantMsgs.reduce((sum, m) => sum + (m.tokensPerSec || 0), 0) / assistantMsgs.length);
                  return (
                    <span className="text-amber-400 hidden sm:flex items-center gap-1 font-semibold">
                      <Flame className="w-3 h-3" />
                      Avg {avgTps} tok/s
                    </span>
                  );
                })()}
              </div>
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3 h-3" />
                Encrypted
              </span>
            </div>
          )}

          {/* User Input Bar with Search Action Button */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-xl space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  isSearchMode
                    ? 'Search anything on the live web or ask questions...'
                    : 'Ask Taka AI reasoning & coding models...'
                }
                className="flex-1 bg-transparent px-3 py-2 text-xs md:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />

              {/* Live Search Toggle inside prompt bar */}
              <button
                type="button"
                onClick={() => setIsSearchMode(!isSearchMode)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSearchMode
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
                title="Toggle Live Web Search"
              >
                <Search className={`w-3.5 h-3.5 ${isSearchMode ? 'text-amber-400' : ''}`} />
                <span className="hidden sm:inline">{isSearchMode ? 'Search ON' : 'Search OFF'}</span>
              </button>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isGenerating || !userInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-40"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-3 pt-1 border-t border-slate-800/60">
              <span>
                Engine: <strong className="text-slate-400">{isSearchMode ? 'taka-search-v1 (Web Agent)' : selectedModel}</strong>
              </span>
              <span>
                Stream: <strong className="text-emerald-400">SSE Active (~120ms TTFT)</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. DEVELOPER GATEWAY & API PORTAL (DASHBOARD VIEW)        */}
      {/* ========================================================= */}
      {mainView === 'dashboard' && (
        <>
          {/* If NOT Authenticated -> Show Passcode Login Gate */}
          {!isAuthenticated ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-[#0d1322] border border-slate-800/90 rounded-2xl p-8 space-y-6 shadow-2xl backdrop-blur-xl">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Developer Gateway Gate</h2>
                  <p className="text-xs text-slate-400">
                    Enter your access pass or one-time passcode to manage API keys and inspect gateway telemetry.
                  </p>
                </div>

                <form onSubmit={handleAccessCodeLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Access Passcode
                    </label>
                    <input
                      type="text"
                      value={accessCodeInput}
                      onChange={(e) => setAccessCodeInput(e.target.value)}
                      placeholder="e.g. TAKA-MASTER-2026 or TAKA-VIP-8899"
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
                        Verifying Passcode...
                      </>
                    ) : (
                      <>
                        Unlock Developer Dashboard
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-800/80 text-center flex items-center justify-between text-[11px] text-slate-500">
                  <span>Protected by Taka AI Security</span>
                  <button
                    onClick={() => setMainView('chat')}
                    className="text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    ← Back to AI Chat & Search
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* If Authenticated -> Full Developer Portal */
            <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
              {/* Dashboard Sub Navigation */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDashboardTab('keys')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                      dashboardTab === 'keys' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    API Keys
                  </button>
                  <button
                    onClick={() => setDashboardTab('access-codes')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                      dashboardTab === 'access-codes' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5 text-amber-400" />
                    Access Passcodes
                  </button>
                  <button
                    onClick={() => setDashboardTab('docs')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                      dashboardTab === 'docs' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    API Connection Guide
                  </button>
                  <button
                    onClick={() => setDashboardTab('cluster')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                      dashboardTab === 'cluster' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Cluster Health
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Lock Dashboard"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

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
                    Round-Robin Active
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                    <span>TOTAL INFERENCE CALLS</span>
                    <Layers className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{stats?.totalRequests ?? 0}</div>
                  <p className="text-[11px] text-slate-400 mt-1">Distributed across cluster</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                    <span>STREAMING LATENCY (TTFT)</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">~120ms</div>
                  <p className="text-[11px] text-emerald-400 mt-1">Real-time SSE token stream</p>
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

              {/* DASHBOARD TAB 1: API KEYS */}
              {dashboardTab === 'keys' && (
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
                    <div>
                      <h2 className="text-base font-semibold text-white flex items-center gap-2">
                        <Key className="w-4 h-4 text-cyan-400" />
                        Taka AI Secret API Keys
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Generate, inspect token telemetry, and manage authentication keys for your applications.
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

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                        <tr>
                          <th className="px-6 py-3">NAME</th>
                          <th className="px-6 py-3">SECRET KEY</th>
                          <th className="px-6 py-3">CREATED</th>
                          <th className="px-6 py-3">CALLS & TOKENS</th>
                          <th className="px-6 py-3">STATUS</th>
                          <th className="px-6 py-3 text-right">ACTIONS & ANALYTICS</th>
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
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-200">
                                  {k.totalRequests} calls
                                </div>
                                <div className="text-[11px] text-cyan-400 font-mono">
                                  {(k.totalTokens || 0).toLocaleString()} tokens
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 inline-flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  Active
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setInspectKey(k);
                                      setRevealSecret(false);
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/60 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                                    title="View API Details & Usage"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                                    View API
                                  </button>
                                  <button
                                    onClick={() => handleDeleteKey(k.id)}
                                    className="p-1.5 rounded-md hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                                    title="Revoke Key"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DASHBOARD TAB 2: ACCESS PASSCODES */}
              {dashboardTab === 'access-codes' && (
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
                    <div>
                      <h2 className="text-base font-semibold text-white flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-amber-400" />
                        One-Time Access Passcodes
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Generate single-use or permanent access codes for clients to unlock the developer dashboard.
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
              )}

              {/* DASHBOARD TAB 3: API CONNECTION GUIDE & STREAMING SHOWCASE */}
              {dashboardTab === 'docs' && (
                <div className="space-y-6">
                  {/* Quick Info Card */}
                  <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <Info className="w-4 h-4 text-cyan-400" />
                      How to Connect to Taka AI Gateway
                    </h3>
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

                  {/* SDK Quickstart */}
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

                  {/* STREAMING SHOWCASE CARD */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-7 shadow-lg space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                          <Zap className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                          Everything You Need to Know About Streaming on Taka AI
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Complete reference for ultra-low latency Server-Sent Events (SSE), multi-language implementation, and token flow.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/90 border border-emerald-800 text-emerald-400 flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          TTFT ~100–120ms
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/90 border border-cyan-800 text-cyan-400">
                          SSE Protocol
                        </span>
                      </div>
                    </div>

                    {/* Comparison Matrix */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                        <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="p-3.5">METRIC / FEATURE</th>
                            <th className="p-3.5 text-slate-400">STANDARD REQUEST (NO STREAM)</th>
                            <th className="p-3.5 text-cyan-300 font-bold bg-cyan-950/30">TAKA STREAMING (stream=true)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          <tr>
                            <td className="p-3.5 font-medium text-white">Time to First Token (TTFT)</td>
                            <td className="p-3.5 text-slate-400">2,000ms – 6,000ms (Waits for full text)</td>
                            <td className="p-3.5 text-emerald-400 font-semibold bg-cyan-950/20">⚡ 100ms – 150ms (Instant!)</td>
                          </tr>
                          <tr>
                            <td className="p-3.5 font-medium text-white">User Experience</td>
                            <td className="p-3.5 text-slate-400">Blank loading spinner, sudden block pop-in</td>
                            <td className="p-3.5 text-slate-200 bg-cyan-950/20">Smooth typing animation word-by-word</td>
                          </tr>
                          <tr>
                            <td className="p-3.5 font-medium text-white">Network Protocol</td>
                            <td className="p-3.5 text-slate-400">HTTP application/json</td>
                            <td className="p-3.5 text-slate-200 bg-cyan-950/20">HTTP text/event-stream (SSE)</td>
                          </tr>
                          <tr>
                            <td className="p-3.5 font-medium text-white">Connection Resilience</td>
                            <td className="p-3.5 text-slate-400">High timeout risk on 1000+ token outputs</td>
                            <td className="p-3.5 text-slate-200 bg-cyan-950/20">Zero timeouts — persistent chunk pipeline</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Model Directory */}
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

              {/* DASHBOARD TAB 4: CLUSTER HEALTH */}
              {dashboardTab === 'cluster' && (
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
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* MODALS: CREATE KEY, INSPECT KEY, PASSCODES                */}
      {/* ========================================================= */}

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
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Key Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Application"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">An identifying label for your application or service.</p>
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
                    onClick={() => {
                      setCustomUserKey(generatedKey.keySecret);
                      setShowCreateModal(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white"
                  >
                    Use Key in Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECT / VIEW API KEY DETAILS & ANALYTICS */}
      {inspectKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-slate-800/90 rounded-2xl max-w-2xl w-full p-7 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {inspectKey.name}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-400">
                      Active & Healthy
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Key ID: {inspectKey.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectKey(null)}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Secret Key Display Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Secret API Key</span>
                <button
                  onClick={() => setRevealSecret(!revealSecret)}
                  className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 transition-colors"
                >
                  {revealSecret ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Hide Key
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Reveal Secret Key
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type={revealSecret ? 'text' : 'password'}
                  readOnly
                  value={inspectKey.keySecret}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 select-all tracking-wider"
                />
                <button
                  onClick={() => copyToClipboard(inspectKey.keySecret, `inspect-key-${inspectKey.id}`)}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {copiedId === `inspect-key-${inspectKey.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedId === `inspect-key-${inspectKey.id}` ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Token Analytics Grid */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Token Consumption & Bandwidth Telemetry
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">TOTAL TOKENS</div>
                  <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
                    {(inspectKey.totalTokens || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Tokens processed</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">PROMPT (INPUT)</div>
                  <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
                    {(inspectKey.promptTokens || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Context tokens</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">COMPLETION (OUTPUT)</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                    {(inspectKey.completionTokens || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Generated tokens</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">AVG / REQUEST</div>
                  <div className="text-xl font-bold text-white mt-1 font-mono">
                    {Math.round((inspectKey.totalTokens || 0) / Math.max(1, inspectKey.totalRequests || 1))}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Tokens / call</div>
                </div>
              </div>
            </div>

            {/* Live Performance Telemetry Grid */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Live Health & Performance Telemetry
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">TOTAL REQUESTS</div>
                  <div className="text-xl font-bold text-white mt-1">{inspectKey.totalRequests}</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Successful calls</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">SUCCESS RATE</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">100.0%</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">0 failovers</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">AVG LATENCY</div>
                  <div className="text-xl font-bold text-cyan-400 mt-1">~120ms</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Edge streaming</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">CREATED ON</div>
                  <div className="text-xs font-semibold text-slate-200 mt-1.5 truncate">
                    {new Date(inspectKey.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Verified active</div>
                </div>
              </div>
            </div>

            {/* Pre-filled Integration Code Snippet */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-400" />
                  Pre-Configured Code (Using this API Key)
                </h4>
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setInspectCodeLang('python')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      inspectCodeLang === 'python' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Python
                  </button>
                  <button
                    onClick={() => setInspectCodeLang('node')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      inspectCodeLang === 'node' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setInspectCodeLang('curl')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      inspectCodeLang === 'curl' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    cURL
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-slate-950 rounded-xl p-3.5 font-mono text-xs text-slate-300 border border-slate-800/80 overflow-x-auto max-h-[160px]">
                  <code>{getCodeSnippet(inspectCodeLang, inspectKey.keySecret)}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(getCodeSnippet(inspectCodeLang, inspectKey.keySecret), `inspect-code-${inspectKey.id}`)}
                  className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1 border border-slate-700 transition-colors"
                >
                  {copiedId === `inspect-code-${inspectKey.id}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Copied
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

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
              <button
                onClick={() => handleDeleteKey(inspectKey.id)}
                className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/60 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Revoke Key
              </button>
              <button
                onClick={() => setInspectKey(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE ONE-TIME PASSCODE */}
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

      {/* MODAL 4: SELECT AI MODEL (MOBILE & DESKTOP OPTIMIZED) */}
      {showModelModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0b101e] border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Select AI Neural Engine</h3>
                  <p className="text-[11px] text-slate-400">Choose the optimal model for your query or search task</p>
                </div>
              </div>
              <button
                onClick={() => setShowModelModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {TAKA_MODELS.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      if (m.isSearchEngine) {
                        setIsSearchMode(true);
                      }
                      setShowModelModal(false);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-start justify-between gap-3 transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/50'
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {m.isSearchEngine ? (
                          <Search className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                        )}
                        <span className={`font-mono text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                          {m.id}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 font-sans">
                          {m.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-medium">{m.name}</div>
                      <p className="text-[11px] text-slate-500 leading-snug">{m.description}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {m.contextWindow}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Universal Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-400 bg-[#070b16] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Taka AI</span>
          <span className="text-slate-600">•</span>
          <span className="text-cyan-300 font-medium">Architected & Engineered by Takadori</span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="text-slate-500 hidden md:inline">Autonomous Arc Neural Super-Intelligence</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
          <button onClick={() => setMainView('chat')} className="hover:text-cyan-300 transition-colors flex items-center gap-1">
            <Search className="w-3 h-3 text-amber-400" />
            AI Search
          </button>
          <button onClick={() => { setMainView('dashboard'); setDashboardTab('keys'); }} className="hover:text-cyan-300 transition-colors flex items-center gap-1">
            <Key className="w-3 h-3 text-cyan-400" />
            Developer Gateway
          </button>
          <button onClick={() => { setMainView('dashboard'); setDashboardTab('docs'); }} className="hover:text-cyan-300 transition-colors flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-indigo-400" />
            API & Streaming
          </button>
        </div>
      </footer>
    </div>
  );
}
