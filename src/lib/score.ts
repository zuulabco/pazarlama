/** Puan çubuklarının rengi (tasarım token'ları): yüksek puan koyu, düşük puan soluk. */
export function scoreTone(score: number) {
  if (score >= 80) return "bg-score-high";
  if (score >= 55) return "bg-score-mid";
  return "bg-score-low";
}
