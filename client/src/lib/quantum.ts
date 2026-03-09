export type QuantumCategory =
  | "quantum_computing"
  | "quantum_communication"
  | "quantum_sensing"
  | "quantum_cryptography"
  | "general";

export const CATEGORY_META: Record<
  QuantumCategory,
  { en: string; zh: string; icon: string; cssClass: string }
> = {
  quantum_computing: {
    en: "Quantum Computing",
    zh: "量子计算",
    icon: "⚛",
    cssClass: "cat-quantum_computing",
  },
  quantum_communication: {
    en: "Quantum Communication",
    zh: "量子通信",
    icon: "📡",
    cssClass: "cat-quantum_communication",
  },
  quantum_sensing: {
    en: "Quantum Sensing",
    zh: "量子传感",
    icon: "🔬",
    cssClass: "cat-quantum_sensing",
  },
  quantum_cryptography: {
    en: "Quantum Cryptography",
    zh: "量子密码学",
    icon: "🔐",
    cssClass: "cat-quantum_cryptography",
  },
  general: {
    en: "General",
    zh: "综合",
    icon: "🌐",
    cssClass: "cat-general",
  },
};

export function getScoreColor(score: number): string {
  if (score >= 8) return "text-red-400";
  if (score >= 6) return "text-amber-400";
  if (score >= 4) return "text-emerald-400";
  return "text-slate-500";
}

export function getScoreLabel(score: number): string {
  if (score >= 8) return "Critical";
  if (score >= 6) return "High";
  if (score >= 4) return "Medium";
  return "Low";
}

export function formatReportDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatReportDateZh(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

export const STATUS_META = {
  pending: { label: "Pending", labelZh: "等待中", color: "text-slate-400" },
  crawling: { label: "Crawling", labelZh: "抓取中", color: "text-blue-400" },
  analyzing: { label: "Analyzing", labelZh: "分析中", color: "text-purple-400" },
  generating: { label: "Generating PDF", labelZh: "生成PDF", color: "text-amber-400" },
  completed: { label: "Completed", labelZh: "已完成", color: "text-emerald-400" },
  failed: { label: "Failed", labelZh: "失败", color: "text-red-400" },
} as const;
