export type HeroTraceStep = 'plan' | 'tool_call' | 'observe' | 'result';

export interface HeroTraceLine {
  type: HeroTraceStep;
  text: string;
}

export const heroTrace: HeroTraceLine[] = [
  { type: 'plan', text: 'Profile candidate: agents + systems' },
  { type: 'tool_call', text: 'read_resume("Rohan_Disa_Resume.pdf")' },
  { type: 'observe', text: 'AI SWE intern @ Ampere: perf-engineering agent, 80% less manual analysis' },
  { type: 'tool_call', text: 'inspect_repo("agent-eval-harness")' },
  { type: 'observe', text: '32-task suite, Wilson 95% CIs, BH-corrected tests' },
  { type: 'tool_call', text: 'run_cluster(nodes=3, kill="leader")' },
  { type: 'observe', text: 'new leader elected; 0 acknowledged writes lost' },
  { type: 'result', text: 'Hire signal: strong. Next step: view_work()' },
];

export const heroTraceSummary = heroTrace
  .map((line) => `${line.type}: ${line.text}`)
  .join(' ');
