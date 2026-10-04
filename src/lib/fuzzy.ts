/** Subsequence scorer. Higher is better. 0 means no match. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (t === q) return 10_000;

  let qi = 0;
  let score = 0;
  let streak = 0;
  let last = -2;

  for (let i = 0; i < t.length && qi < q.length; i += 1) {
    if (t.charCodeAt(i) !== q.charCodeAt(qi)) {
      streak = 0;
      continue;
    }

    let add = 2;
    if (i === 0) {
      add += 12;
    } else {
      const prev = t.charCodeAt(i - 1);
      if (prev === 32 || prev === 45 || prev === 95 || prev === 47) add += 10;
    }

    if (i === last + 1) {
      streak += 1;
      add += 6 + streak;
    } else {
      streak = 0;
    }

    score += add;
    last = i;
    qi += 1;
  }

  if (qi < q.length) return 0;
  return score * 8 - Math.min(t.length, score * 4);
}
