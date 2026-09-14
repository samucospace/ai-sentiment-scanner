'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Sparkles, Check, ExternalLink, ShieldCheck, Cpu, Zap, Globe } from 'lucide-react';
import { LLMProvider } from '@/lib/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

const OPENROUTER_PRESETS = [
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nvidia Nemotron Super 120B (Free & Fast)', tag: 'FREE' },
  { id: 'openrouter/free', label: 'Auto Free Router', tag: 'FREE' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3 / Chat ($0.14/1M)', tag: 'CHEAP' },
  { id: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini', tag: 'CHEAP' },
  { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nvidia Nemotron 3.5 Lightning (Free)', tag: 'FREE' },
];

export function SettingsModal({ isOpen, onClose, onSettingsSaved }: SettingsModalProps) {
  const [provider, setProvider] = useState<LLMProvider>('openrouter');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [modelName, setModelName] = useState('openrouter/free');
  const [customModel, setCustomModel] = useState('');

  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [maskedOpenRouterKey, setMaskedOpenRouterKey] = useState('');
  const [maskedGeminiKey, setMaskedGeminiKey] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.provider) setProvider(data.provider);
          setHasOpenRouterKey(data.hasOpenRouterKey);
          setHasGeminiKey(data.hasGeminiKey);
          setMaskedOpenRouterKey(data.maskedOpenRouterKey || '');
          setMaskedGeminiKey(data.maskedGeminiKey || '');
          if (data.modelName) {
            setModelName(data.modelName);
            const isPreset = OPENROUTER_PRESETS.some((p) => p.id === data.modelName);
            if (!isPreset) setCustomModel(data.modelName);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const activeModel =
        provider === 'openrouter'
          ? customModel.trim() || modelName
          : 'gemini-1.5-flash';

      const payload: any = {
        provider,
        modelName: activeModel,
      };

      if (openRouterKey.trim()) payload.openrouterApiKey = openRouterKey.trim();
      if (geminiKey.trim()) payload.geminiApiKey = geminiKey.trim();

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        if (onSettingsSaved) {
          onSettingsSaved();
        }
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                LLM & Intelligence Settings
              </h3>
              <p className="text-xs text-slate-500">
                Configure OpenRouter (free/cheap models) or Google Gemini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Switcher Tabs */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Choose AI Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider('openrouter')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  provider === 'openrouter'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Globe className="w-4 h-4 text-indigo-500" />
                <span>OpenRouter (Free / Cheap)</span>
              </button>

              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  provider === 'gemini'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Cpu className="w-4 h-4 text-emerald-500" />
                <span>Google Gemini Direct</span>
              </button>
            </div>
          </div>

          {/* Provider Specific Settings */}
          {provider === 'openrouter' ? (
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-500" />
                    <span>OpenRouter API Key</span>
                  </label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Get Key (Free Tier Available)</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  placeholder={
                    hasOpenRouterKey
                      ? `Configured (${maskedOpenRouterKey}) - Enter new key to change`
                      : 'sk-or-v1-...'
                  }
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Model Preset Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Select Model
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  {OPENROUTER_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setModelName(p.id);
                        setCustomModel('');
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-colors ${
                        modelName === p.id && !customModel
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 font-semibold text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <span className="truncate">{p.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          p.tag === 'FREE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p.tag}
                      </span>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Or enter any custom OpenRouter model ID (e.g. mistralai/mistral-large)..."
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Google Gemini API Key</span>
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Get Key from Google AI Studio</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  placeholder={
                    hasGeminiKey
                      ? `Configured (${maskedGeminiKey}) - Enter new key to change`
                      : 'AIzaSy...'
                  }
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Offline / Zero-Config Fallback Active</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              If no API key is provided, the scanner automatically runs our deterministic heuristic extraction engine with zero setup.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
