import { describe, expect, it } from 'vitest';
import { RaftEngine } from './raft-sim';

function electLeader(sim: RaftEngine, limit = 8000): number {
  sim.step(limit);
  const id = sim.leaderId(sim.partitioned ? 'majority' : undefined) ?? sim.leaderId();
  if (id === null) throw new Error('no leader');
  return id;
}

function leadersByTerm(sim: RaftEngine): Map<number, Set<number>> {
  const seen = new Map<number, Set<number>>();
  for (const n of sim.nodes) {
    if (n.role === 'leader' && n.alive) {
      const set = seen.get(n.term) ?? new Set<number>();
      set.add(n.id);
      seen.set(n.term, set);
    }
  }
  return seen;
}

describe('RaftEngine', () => {
  it('has exactly one leader per term', () => {
    for (const nodeCount of [3, 5] as const) {
      const sim = new RaftEngine({ seed: 11, nodeCount });
      const seen = new Map<number, Set<number>>();
      for (let i = 0; i < 80; i += 1) {
        sim.step(40);
        if (i === 20) sim.killLeader();
        if (i === 40) sim.restoreNode();
        for (const [term, ids] of leadersByTerm(sim)) {
          const acc = seen.get(term) ?? new Set<number>();
          for (const id of ids) acc.add(id);
          seen.set(term, acc);
        }
      }
      expect(seen.size).toBeGreaterThan(0);
      for (const [term, ids] of seen) {
        expect(ids.size, `term ${term} on ${nodeCount} nodes`).toBe(1);
      }
    }
  });

  it('replaces a killed leader', () => {
    const sim = new RaftEngine({ seed: 22, nodeCount: 3 });
    const before = electLeader(sim);
    const term = sim.nodes[before].term;
    sim.killLeader();
    const after = electLeader(sim);
    expect(after).not.toBe(before);
    expect(sim.nodes[after].alive).toBe(true);
    expect(sim.nodes[after].term).toBeGreaterThan(term);
  });

  it('never loses a committed entry', () => {
    const sim = new RaftEngine({ seed: 33, nodeCount: 5 });
    electLeader(sim);
    sim.put('k', '1');
    sim.step(2000);
    const committed = sim.committedEntries();
    expect(committed.length).toBeGreaterThan(0);
    expect(committed.some((e) => e.cmd === 'put k=1')).toBe(true);
    sim.killLeader();
    electLeader(sim);
    sim.killLeader();
    electLeader(sim);
    const after = sim.committedEntries();
    for (const entry of committed) {
      expect(after.some((e) => e.term === entry.term && e.cmd === entry.cmd)).toBe(true);
    }
  });

  it('a partitioned minority cannot commit or serve reads', () => {
    const sim = new RaftEngine({ seed: 44, nodeCount: 3 });
    const lead = electLeader(sim);
    sim.setPartitioned(true);
    expect(sim.nodes[lead].side).toBe('minority');
    expect(sim.nodes[lead].role).toBe('leader');
    const commitBefore = sim.nodes[lead].commitIndex;
    sim.put('z', '9', lead);
    sim.step(3000);
    expect(sim.nodes[lead].commitIndex).toBe(commitBefore);
    expect(sim.get('z', lead)).toBe('KV_TIMEOUT');
    const majorityLead = electLeader(sim);
    expect(sim.nodes[majorityLead].side).toBe('majority');
    expect(majorityLead).not.toBe(lead);
  });
});
