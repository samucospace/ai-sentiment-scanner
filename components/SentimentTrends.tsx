'use client';

import React, { useState, useMemo } from 'react';
import { DailyDigest, IndustryDigest, IndustryKey } from '@/lib/types';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Layers,
  Sparkles,
  Users,
  Eye,
  Download,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface SentimentTrendsProps {
  digests: DailyDigest[];
  currentDigestId?: string;
  onSelectDigest: (digest: DailyDigest) => void;
  onNavigateToMatrix?: () => void;
}

interface DataPoint {
  date: string;
  timestamp: number;
  displayDate: string;
  workerScore: number;
  customerScore: number;
  workerLabel: string;
  customerLabel: string;
  rationale?: string;
  professions?: string[];
  totalArticles: number;
  totalUseCases: number;
  engineUsed?: string;
  digest: DailyDigest;
}

const INDUSTRY_OPTIONS: { key: 'all' | IndustryKey; label: string; icon: string }[] = [
  { key: 'all', label: 'All Industries (Macro Average)', icon: '🌐' },
  { key: 'healthcare', label: 'Healthcare & Medicine', icon: '🩺' },
  { key: 'legal', label: 'Legal & Judiciary', icon: '⚖️' },
  { key: 'education', label: 'Education & Academics', icon: '🎓' },
  { key: 'finance', label: 'Finance & Banking', icon: '💳' },
  { key: 'software', label: 'Software & IT', icon: '💻' },
  { key: 'creative', label: 'Creative & Media', icon: '🎨' },
  { key: 'retail', label: 'Retail & Support', icon: '🛍️' },
  { key: 'manufacturing', label: 'Manufacturing & Robotics', icon: '⚙️' },
  { key: 'payments', label: 'Payments & Agentic Commerce', icon: '🤖' },
];

export function SentimentTrends({
  digests,
  currentDigestId,
  onSelectDigest,
  onNavigateToMatrix,
}: SentimentTrendsProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<'all' | IndustryKey>('all');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Chronologically sorted digests (oldest to newest for time-series charts)
  const sortedChronologicalDigests = useMemo(() => {
    return [...digests].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [digests]);

  // Transform digests into chart data points based on selected industry
  const timeSeriesData: DataPoint[] = useMemo(() => {
    return sortedChronologicalDigests.map((d) => {
      const dateObj = new Date(d.date + 'T00:00:00');
      const timestamp = dateObj.getTime();
      const displayDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      if (selectedIndustry === 'all') {
        const indList = d.industries || [];
        const count = Math.max(1, indList.length);
        const avgWorker =
          indList.reduce((acc, ind) => acc + (ind?.workerSentiment?.score ?? 0), 0) / count;
        const avgCustomer =
          indList.reduce((acc, ind) => acc + (ind?.customerSentiment?.score ?? 0), 0) / count;

        const totalUc = indList.reduce((acc, ind) => acc + (ind?.useCases?.length || 0), 0);

        return {
          date: d.date,
          timestamp,
          displayDate,
          workerScore: parseFloat(avgWorker.toFixed(2)),
          customerScore: parseFloat(avgCustomer.toFixed(2)),
          workerLabel:
            avgWorker <= -0.35
              ? 'Skeptical & Guarded'
              : avgWorker < 0.1
              ? 'Mixed / Observant'
              : 'Enthusiastic & Adopting',
          customerLabel:
            avgCustomer <= -0.35
              ? 'Distrustful & Concerned'
              : avgCustomer < 0.1
              ? 'Cautious & Scrutinizing'
              : 'Enthusiastic & Adopting',
          rationale: d.executiveSummary,
          totalArticles: d.totalArticlesScanned,
          totalUseCases: totalUc,
          engineUsed: d.engineUsed,
          digest: d,
        };
      } else {
        const ind = (d.industries || []).find((i) => i.industryKey === selectedIndustry);
        const workerScore = ind?.workerSentiment?.score ?? 0;
        const customerScore = ind?.customerSentiment?.score ?? 0;

        return {
          date: d.date,
          timestamp,
          displayDate,
          workerScore: parseFloat(workerScore.toFixed(2)),
          customerScore: parseFloat(customerScore.toFixed(2)),
          workerLabel: ind?.workerSentiment?.label || 'Neutral',
          customerLabel: ind?.customerSentiment?.label || 'Neutral',
          rationale: ind?.summary || ind?.workerSentiment?.rationale,
          professions: ind?.workerSentiment?.professionsImpacted,
          totalArticles: ind?.topArticles?.length || 0,
          totalUseCases: ind?.useCases?.length || 0,
          engineUsed: ind?.engineUsed || d.engineUsed,
          digest: d,
        };
      }
    });
  }, [sortedChronologicalDigests, selectedIndustry]);

  // Selected point details (defaults to hovered, or latest point)
  const activePoint =
    hoveredPointIndex !== null && timeSeriesData[hoveredPointIndex]
      ? timeSeriesData[hoveredPointIndex]
      : timeSeriesData[timeSeriesData.length - 1];

  // Calculate macro shifts (latest vs earliest) and true calendar span
  const stats = useMemo(() => {
    if (timeSeriesData.length === 0) return null;
    const first = timeSeriesData[0];
    const latest = timeSeriesData[timeSeriesData.length - 1];

    const workerDelta = latest.workerScore - first.workerScore;
    const customerDelta = latest.customerScore - first.customerScore;
    const divergenceGap = Math.abs(latest.workerScore - latest.customerScore);
    const daySpan = Math.max(1, Math.round((latest.timestamp - first.timestamp) / (24 * 60 * 60 * 1000)));

    return {
      firstDate: first.date,
      latestDate: latest.date,
      daySpan,
      totalScans: timeSeriesData.length,
      currentWorkerScore: latest.workerScore,
      currentCustomerScore: latest.customerScore,
      workerDelta: parseFloat(workerDelta.toFixed(2)),
      customerDelta: parseFloat(customerDelta.toFixed(2)),
      divergenceGap: parseFloat(divergenceGap.toFixed(2)),
    };
  }, [timeSeriesData]);

  // Accurate linear time domain calculation
  const { minTime, maxTime, totalDuration } = useMemo(() => {
    if (timeSeriesData.length === 0) {
      return { minTime: 0, maxTime: 0, totalDuration: 0 };
    }
    const min = timeSeriesData[0].timestamp;
    const max = timeSeriesData[timeSeriesData.length - 1].timestamp;
    return {
      minTime: min,
      maxTime: max,
      totalDuration: Math.max(0, max - min),
    };
  }, [timeSeriesData]);

  // SVG Chart Dimensions & Coordinate Mapping
  const chartWidth = 760;
  const chartHeight = 280;
  const padding = { top: 30, right: 35, bottom: 44, left: 55 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Sentiment scale: -1.0 (bottom) to +1.0 (top)
  const getY = (val: number) => {
    const normalized = (val + 1) / 2;
    return padding.top + innerHeight * (1 - normalized);
  };

  // Linear mathematical mapping: timestamp -> proportional SVG X coordinate
  const getX = (timestamp: number) => {
    if (totalDuration === 0) {
      return padding.left + innerWidth / 2;
    }
    return padding.left + ((timestamp - minTime) / totalDuration) * innerWidth;
  };

  // Uniform calendar grid ticks based on true elapsed days
  const axisTicks = useMemo(() => {
    if (timeSeriesData.length === 0) return [];
    if (totalDuration === 0) {
      return [
        {
          timestamp: timeSeriesData[0].timestamp,
          label: timeSeriesData[0].displayDate,
          x: padding.left + innerWidth / 2,
        },
      ];
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.round(totalDuration / dayMs));

    // Choose friendly step size in days (e.g. 1, 2, 3, 5, 7, 14, 30)
    let stepDays = 1;
    if (totalDays > 90) stepDays = 14;
    else if (totalDays > 45) stepDays = 7;
    else if (totalDays > 25) stepDays = 5;
    else if (totalDays > 14) stepDays = 3;
    else if (totalDays > 7) stepDays = 2;
    else stepDays = 1;

    const ticks: { timestamp: number; label: string; x: number }[] = [];
    let t = minTime;
    while (t <= maxTime) {
      const dObj = new Date(t);
      ticks.push({
        timestamp: t,
        label: dObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        x: getX(t),
      });
      t += stepDays * dayMs;
    }

    // Ensure the latest date is labeled if not too close to the last tick
    const lastTick = ticks[ticks.length - 1];
    const maxX = getX(maxTime);
    if (!lastTick || Math.abs(maxX - lastTick.x) > 36) {
      const maxObj = new Date(maxTime);
      ticks.push({
        timestamp: maxTime,
        label: maxObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        x: maxX,
      });
    }

    return ticks;
  }, [minTime, maxTime, totalDuration, innerWidth, padding.left, timeSeriesData]);

  // Build SVG Path strings using exact proportional timestamps
  const workerPoints = timeSeriesData.map((d) => `${getX(d.timestamp).toFixed(1)},${getY(d.workerScore).toFixed(1)}`);
  const customerPoints = timeSeriesData.map((d) => `${getX(d.timestamp).toFixed(1)},${getY(d.customerScore).toFixed(1)}`);

  const workerPath = workerPoints.length > 1 ? `M ${workerPoints.join(' L ')}` : '';
  const customerPath = customerPoints.length > 1 ? `M ${customerPoints.join(' L ')}` : '';

  // Area under curves
  const zeroY = getY(0);
  const firstX = timeSeriesData.length > 0 ? getX(timeSeriesData[0].timestamp) : padding.left;
  const lastX = timeSeriesData.length > 0 ? getX(timeSeriesData[timeSeriesData.length - 1].timestamp) : padding.left;

  const workerArea =
    workerPoints.length > 1
      ? `${workerPath} L ${lastX.toFixed(1)},${zeroY.toFixed(1)} L ${firstX.toFixed(1)},${zeroY.toFixed(1)} Z`
      : '';
  const customerArea =
    customerPoints.length > 1
      ? `${customerPath} L ${lastX.toFixed(1)},${zeroY.toFixed(1)} L ${firstX.toFixed(1)},${zeroY.toFixed(1)} Z`
      : '';

  // Mouse hover proximity detection
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (timeSeriesData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * chartWidth;

    let closestIdx = 0;
    let minDiff = Infinity;
    timeSeriesData.forEach((d, idx) => {
      const px = getX(d.timestamp);
      const diff = Math.abs(px - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoveredPointIndex(closestIdx);
  };

  const handleSvgMouseLeave = () => {
    setHoveredPointIndex(null);
  };

  // Export local time-series data as JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalScans: digests.length,
        timeSeriesData,
        digests,
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentiment-trends-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 md:p-8 text-white shadow-xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Historical Intelligence • Local Store Log</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Sentiment Tracking Over Time
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Continuous monitoring of workforce liability concerns versus customer convenience
              adoption across daily alert scans. Persisted locally in your file database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Export History (JSON)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Trajectory Stat Metric Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Workforce Trajectory */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" />
                Workforce Sentiment
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Current
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats.currentWorkerScore > 0
                  ? `+${stats.currentWorkerScore.toFixed(2)}`
                  : stats.currentWorkerScore.toFixed(2)}
              </span>
              <div
                className={`flex items-center text-xs font-semibold ${
                  stats.workerDelta > 0
                    ? 'text-emerald-500'
                    : stats.workerDelta < 0
                    ? 'text-rose-500'
                    : 'text-slate-400'
                }`}
              >
                {stats.workerDelta > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : stats.workerDelta < 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                ) : null}
                <span>
                  {stats.workerDelta > 0 ? `+${stats.workerDelta}` : stats.workerDelta} shift
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Net movement from first scan ({stats.firstDate}) to latest.
            </p>
          </div>

          {/* Customer Trajectory */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Customer Sentiment
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Current
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats.currentCustomerScore > 0
                  ? `+${stats.currentCustomerScore.toFixed(2)}`
                  : stats.currentCustomerScore.toFixed(2)}
              </span>
              <div
                className={`flex items-center text-xs font-semibold ${
                  stats.customerDelta > 0
                    ? 'text-emerald-500'
                    : stats.customerDelta < 0
                    ? 'text-rose-500'
                    : 'text-slate-400'
                }`}
              >
                {stats.customerDelta > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : stats.customerDelta < 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                ) : null}
                <span>
                  {stats.customerDelta > 0 ? `+${stats.customerDelta}` : stats.customerDelta} shift
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              End-user adoption trend over recorded days.
            </p>
          </div>

          {/* Divergence Gap */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Divergence Gap
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                Δ Spread
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats.divergenceGap.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {stats.divergenceGap < 0.15
                  ? 'Highly Aligned'
                  : stats.divergenceGap < 0.4
                  ? 'Moderate Divergence'
                  : 'Sharp Polarization'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Gap between workforce caution and customer enthusiasm.
            </p>
          </div>

          {/* Database Depth */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-500" />
                Database Depth
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                .data/store
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats.totalScans} Scans
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {stats.firstDate} → {stats.latestDate}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Stored in local file database for offline access.
            </p>
          </div>
        </div>
      )}

      {/* Industry Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Time-Series Trajectory Analysis</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a track below to isolate sentiment patterns for specific industries.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Workforce / Practitioners
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Customers / End-Users
            </span>
          </div>
        </div>
      </div>

      {/* Track Selection Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {INDUSTRY_OPTIONS.map((opt) => {
          const isSelected = selectedIndustry === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => {
                setSelectedIndustry(opt.key);
                setHoveredPointIndex(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive SVG Chart Container */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl relative backdrop-blur-sm">
        {/* Active Inspection Header */}
        {activePoint && (
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Scan Date: {activePoint.date}</span>
              </div>
              {activePoint.engineUsed && (
                <span className="text-[11px] text-slate-400 hidden sm:inline-block">
                  Engine: {activePoint.engineUsed}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Workforce:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    activePoint.workerScore > 0
                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                      : activePoint.workerScore < -0.2
                      ? 'bg-rose-950/70 text-rose-400 border border-rose-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {activePoint.workerScore > 0
                    ? `+${activePoint.workerScore.toFixed(2)}`
                    : activePoint.workerScore.toFixed(2)}{' '}
                  ({activePoint.workerLabel})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Customer:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    activePoint.customerScore > 0
                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                      : activePoint.customerScore < -0.2
                      ? 'bg-rose-950/70 text-rose-400 border border-rose-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {activePoint.customerScore > 0
                    ? `+${activePoint.customerScore.toFixed(2)}`
                    : activePoint.customerScore.toFixed(2)}{' '}
                  ({activePoint.customerLabel})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SVG Chart */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[640px]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto overflow-visible select-none cursor-crosshair"
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={handleSvgMouseLeave}
              onClick={() => {
                if (hoveredPointIndex !== null && timeSeriesData[hoveredPointIndex]) {
                  onSelectDigest(timeSeriesData[hoveredPointIndex].digest);
                }
              }}
            >
              <defs>
                {/* Indigo Worker Gradient */}
                <linearGradient id="workerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                </linearGradient>
                {/* Emerald Customer Gradient */}
                <linearGradient id="customerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Reference Grid Lines */}
              {[1.0, 0.5, 0.0, -0.5, -1.0].map((level) => {
                const y = getY(level);
                const isZero = level === 0.0;
                return (
                  <g key={level}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke={isZero ? '#475569' : '#1e293b'}
                      strokeWidth={isZero ? 1.5 : 1}
                      strokeDasharray={isZero ? '4,4' : undefined}
                    />
                    <text
                      x={padding.left - 12}
                      y={y + 4}
                      fill={isZero ? '#94a3b8' : '#64748b'}
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {level > 0 ? `+${level.toFixed(1)}` : level.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Baseline Zero Label */}
              <text
                x={chartWidth - padding.right + 6}
                y={getY(0) + 3}
                fill="#64748b"
                fontSize="9"
                fontFamily="sans-serif"
              >
                Neutral
              </text>

              {/* Calendar Date Grid Ticks & Vertical Lines */}
              {axisTicks.map((tick, idx) => (
                <g key={`tick-${idx}`}>
                  <line
                    x1={tick.x}
                    y1={padding.top}
                    x2={tick.x}
                    y2={chartHeight - padding.bottom}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="2,4"
                  />
                  <line
                    x1={tick.x}
                    y1={chartHeight - padding.bottom}
                    x2={tick.x}
                    y2={chartHeight - padding.bottom + 4}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <text
                    x={tick.x}
                    y={chartHeight - padding.bottom + 16}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {/* X-Axis Baseline */}
              <line
                x1={padding.left}
                y1={chartHeight - padding.bottom}
                x2={chartWidth - padding.right}
                y2={chartHeight - padding.bottom}
                stroke="#334155"
                strokeWidth="1"
              />

              {/* Shaded Areas */}
              {workerArea && <path d={workerArea} fill="url(#workerGrad)" />}
              {customerArea && <path d={customerArea} fill="url(#customerGrad)" />}

              {/* Curves */}
              {workerPath && (
                <path
                  d={workerPath}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {customerPath && (
                <path
                  d={customerPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Timeline Scan Dots on Baseline */}
              {timeSeriesData.map((d, i) => {
                const x = getX(d.timestamp);
                const isHovered = hoveredPointIndex === i;
                const isCurrent = d.digest.id === currentDigestId;
                return (
                  <circle
                    key={`baseline-dot-${d.date}`}
                    cx={x}
                    cy={chartHeight - padding.bottom}
                    r={isHovered || isCurrent ? 3.5 : 2}
                    fill={isHovered ? '#818cf8' : isCurrent ? '#a5b4fc' : '#475569'}
                  />
                );
              })}

              {/* Active Hover Guide & Date Pill */}
              {hoveredPointIndex !== null && timeSeriesData[hoveredPointIndex] && (() => {
                const active = timeSeriesData[hoveredPointIndex];
                const activeX = getX(active.timestamp);
                return (
                  <g className="pointer-events-none">
                    <line
                      x1={activeX}
                      y1={padding.top}
                      x2={activeX}
                      y2={chartHeight - padding.bottom}
                      stroke="#818cf8"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                      opacity="0.8"
                    />
                    <rect
                      x={activeX - 26}
                      y={chartHeight - padding.bottom + 4}
                      width={52}
                      height={18}
                      rx={4}
                      fill="#1e1b4b"
                      stroke="#6366f1"
                      strokeWidth="1"
                    />
                    <text
                      x={activeX}
                      y={chartHeight - padding.bottom + 16}
                      fill="#e0e7ff"
                      fontWeight="bold"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {active.displayDate}
                    </text>
                  </g>
                );
              })()}

              {/* Data Points on Curves */}
              {timeSeriesData.map((d, i) => {
                const x = getX(d.timestamp);
                const workerY = getY(d.workerScore);
                const customerY = getY(d.customerScore);
                const isHovered = hoveredPointIndex === i;
                const isCurrent = d.digest.id === currentDigestId;

                return (
                  <g
                    key={d.date}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDigest(d.digest);
                    }}
                  >
                    {/* Worker Dot */}
                    <circle
                      cx={x}
                      cy={workerY}
                      r={isHovered ? 6 : isCurrent ? 5 : 4}
                      fill="#818cf8"
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={workerY}
                        r={9}
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                      />
                    )}

                    {/* Customer Dot */}
                    <circle
                      cx={x}
                      cy={customerY}
                      r={isHovered ? 6 : isCurrent ? 5 : 4}
                      fill="#10b981"
                      stroke="#0f172a"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={customerY}
                        r={9}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Data Point Detail Card */}
        {activePoint && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2 text-slate-400 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Signals & Findings for {activePoint.date}:</span>
              </div>
              <p className="text-slate-300 leading-relaxed italic">
                "{activePoint.rationale || 'Regular scan completed without major anomalies.'}"
              </p>
              {activePoint.professions && activePoint.professions.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-500 uppercase">Impacted Roles:</span>
                  <span>{activePoint.professions.join(', ')}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  onSelectDigest(activePoint.digest);
                  if (onNavigateToMatrix) onNavigateToMatrix();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-sm active:scale-95"
              >
                <span>Inspect This Day's Digest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historical Scans Ledger Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Historical Scan Database Ledger</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete history of scans saved in your local store. Click any entry to load that day's
              full breakdown.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {digests.length} records in .data/store.json
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Scan Date</th>
                <th className="py-3 px-4">Workforce Avg</th>
                <th className="py-3 px-4">Customer Avg</th>
                <th className="py-3 px-4">Articles</th>
                <th className="py-3 px-4">Use Cases</th>
                <th className="py-3 px-4">Engine</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {sortedChronologicalDigests
                .slice()
                .reverse()
                .map((d) => {
                  const isCurrent = d.id === currentDigestId;
                  const indList = d.industries || [];
                  const count = Math.max(1, indList.length);
                  const avgW =
                    indList.reduce((acc, ind) => acc + (ind?.workerSentiment?.score ?? 0), 0) /
                    count;
                  const avgC =
                    indList.reduce((acc, ind) => acc + (ind?.customerSentiment?.score ?? 0), 0) /
                    count;
                  const totalUc = indList.reduce(
                    (acc, ind) => acc + (ind?.useCases?.length || 0),
                    0
                  );

                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isCurrent ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{d.date}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold uppercase">
                            Viewing
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`font-semibold ${
                            avgW > 0
                              ? 'text-emerald-500'
                              : avgW < -0.2
                              ? 'text-rose-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {avgW > 0 ? `+${avgW.toFixed(2)}` : avgW.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`font-semibold ${
                            avgC > 0
                              ? 'text-emerald-500'
                              : avgC < -0.2
                              ? 'text-rose-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {avgC > 0 ? `+${avgC.toFixed(2)}` : avgC.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {d.totalArticlesScanned} stories
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {totalUc} cataloged
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-mono">
                          {d.engineUsed || 'Heuristic Fallback'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            onSelectDigest(d);
                            if (onNavigateToMatrix) onNavigateToMatrix();
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                        >
                          Load Day →
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
