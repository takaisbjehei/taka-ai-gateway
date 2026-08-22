export interface TakaModelDef {
  id: string;
  backendId: string;
  name: string;
  category: 'Flagship' | 'Search & Multi-Agent' | 'Fast & Instant' | 'Specialized' | 'Audio';
  description: string;
  contextWindow: string;
  isSearchEngine?: boolean;
}

export const TAKA_MODELS: TakaModelDef[] = [
  // 1. Live Web Search & Multi-Agent Compound Models
  {
    id: 'taka-search-v1',
    backendId: 'groq/compound',
    name: 'Taka Search v1 (Compound Web Agent)',
    category: 'Search & Multi-Agent',
    description: 'Autonomous compound multi-agent model with real-time web search and live grounding.',
    contextWindow: '128k',
    isSearchEngine: true,
  },
  {
    id: 'taka-search-mini',
    backendId: 'groq/compound-mini',
    name: 'Taka Search Mini (Fast Web Agent)',
    category: 'Search & Multi-Agent',
    description: 'Lightweight, ultra-fast compound search agent for instantaneous web retrieval.',
    contextWindow: '128k',
    isSearchEngine: true,
  },

  // 2. High-Capacity Flagship Models
  {
    id: 'taka-max-120b',
    backendId: 'openai/gpt-oss-120b',
    name: 'Taka Max 120B (Ultra Intelligence)',
    category: 'Flagship',
    description: 'Next-generation 120B parameter open-architecture powerhouse for massive reasoning and coding.',
    contextWindow: '128k',
  },
  {
    id: 'taka-ultra-70b',
    backendId: 'llama-3.3-70b-versatile',
    name: 'Taka Ultra 70B (Versatile Engine)',
    category: 'Flagship',
    description: 'Industry-standard 70B versatile reasoning and synthesis engine.',
    contextWindow: '128k',
  },
  {
    id: 'taka-qwen-27b',
    backendId: 'qwen/qwen3.6-27b',
    name: 'Taka Qwen 27B (Coder & Math)',
    category: 'Flagship',
    description: 'Top-tier 27B architecture specialized in code generation, math, and multilingual tasks.',
    contextWindow: '32k',
  },
  {
    id: 'taka-pro-20b',
    backendId: 'openai/gpt-oss-20b',
    name: 'Taka Pro 20B (High Speed & Dense)',
    category: 'Flagship',
    description: 'Compact 20B model delivering flagship-grade quality at 3x the token speed.',
    contextWindow: '128k',
  },

  // 3. Fast & Instant Low-Latency Models
  {
    id: 'taka-flash-8b',
    backendId: 'llama-3.1-8b-instant',
    name: 'Taka Flash 8B (Sub-100ms Instant)',
    category: 'Fast & Instant',
    description: 'Ultra-low latency model engineered for instantaneous real-time chat and streaming.',
    contextWindow: '128k',
  },

  // 4. Specialized & Safety Models
  {
    id: 'taka-guard-20b',
    backendId: 'openai/gpt-oss-safeguard-20b',
    name: 'Taka Safeguard 20B',
    category: 'Specialized',
    description: 'Content safety, alignment, and policy enforcement filter.',
    contextWindow: '128k',
  },
  {
    id: 'taka-prompt-guard',
    backendId: 'meta-llama/llama-prompt-guard-2-86m',
    name: 'Taka Prompt Guard 86M',
    category: 'Specialized',
    description: 'Injection attack and jailbreak protection classifier.',
    contextWindow: '8k',
  },

  // 5. Audio & Voice Models
  {
    id: 'taka-transcribe-turbo',
    backendId: 'whisper-large-v3-turbo',
    name: 'Taka Transcribe Turbo',
    category: 'Audio',
    description: 'Blazing fast multilingual speech-to-text transcription.',
    contextWindow: 'Audio',
  },
  {
    id: 'taka-voice-en',
    backendId: 'canopylabs/orpheus-v1-english',
    name: 'Taka Voice English',
    category: 'Audio',
    description: 'High-fidelity natural English speech synthesis engine.',
    contextWindow: 'Voice',
  },
  {
    id: 'taka-voice-ar',
    backendId: 'canopylabs/orpheus-arabic-saudi',
    name: 'Taka Voice Arabic',
    category: 'Audio',
    description: 'High-fidelity natural Arabic speech synthesis engine.',
    contextWindow: 'Voice',
  },
];

// Mapping helper: translates any requested model ID (proprietary or legacy) to the exact upstream backend model
export const MODEL_MAP: Record<string, string> = {
  // New Taka Models
  'taka-search-v1': 'groq/compound',
  'taka-search-mini': 'groq/compound-mini',
  'taka-max-120b': 'openai/gpt-oss-120b',
  'taka-pro-20b': 'openai/gpt-oss-20b',
  'taka-guard-20b': 'openai/gpt-oss-safeguard-20b',
  'taka-qwen-27b': 'qwen/qwen3.6-27b',
  'taka-ultra-70b': 'openai/gpt-oss-120b',
  'taka-ultra-v1': 'openai/gpt-oss-120b',
  'taka-flash-8b': 'openai/gpt-oss-20b',
  'taka-flash-v1': 'openai/gpt-oss-20b',
  'taka-reasoning-v1': 'openai/gpt-oss-120b',
  'taka-core-v1': 'qwen/qwen3.6-27b',
  'taka-transcribe-turbo': 'whisper-large-v3-turbo',
  'taka-voice-en': 'canopylabs/orpheus-v1-english',
  'taka-voice-ar': 'canopylabs/orpheus-arabic-saudi',

  // Direct mappings if developer passes original names
  'groq/compound': 'groq/compound',
  'groq/compound-mini': 'groq/compound-mini',
  'openai/gpt-oss-120b': 'openai/gpt-oss-120b',
  'openai/gpt-oss-20b': 'openai/gpt-oss-20b',
  'openai/gpt-oss-safeguard-20b': 'openai/gpt-oss-safeguard-20b',
  'qwen/qwen3.6-27b': 'qwen/qwen3.6-27b',
  'llama-3.3-70b-versatile': 'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant': 'llama-3.1-8b-instant',
  'whisper-large-v3-turbo': 'whisper-large-v3-turbo',
};
