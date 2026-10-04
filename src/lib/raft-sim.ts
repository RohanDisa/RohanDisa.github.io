export type Role = 'follower' | 'candidate' | 'leader';
export type KvResult = 'KV_SUCCESS' | 'KV_NOTLEADER' | 'KV_TIMEOUT' | 'KV_PENDING';
export type EventKind = 'plan' | 'tool_call' | 'observe' | 'result';
export type Side = 'majority' | 'minority';

export interface LogEntry {
  term: number;
  cmd: string;
}

export interface SimEvent {
  t: number;
  type: EventKind;
  text: string;
}

export interface NodeView {
  id: number;
  role: Role;
  term: number;
  log: { term: number; cmd: string; committed: boolean; applied: boolean }[];
  commitIndex: number;
  alive: boolean;
  side: Side;
}

export interface MessageView {
  id: number;
  from: number;
  to: number;
  kind: 'ae' | 'rv';
  progress: number;
}

interface Node {
  id: number;
  role: Role;
  term: number;
  votedFor: number | null;
  votes: number;
  log: LogEntry[];
  commitIndex: number;
  lastApplied: number;
  nextIndex: number[];
  matchIndex: number[];
  electAt: number;
  beatAt: number;
  alive: boolean;
  side: Side;
  kv: Record<string, string>;
}

type Msg = {
  id: number;
  sent: number;
  at: number;
  from: number;
  to: number;
  kind: 'rv' | 'rv-ok' | 'ae' | 'ae-ok';
  term: number;
  lastIdx?: number;
  lastTerm?: number;
  granted?: boolean;
  prevIdx?: number;
  prevTerm?: number;
  entries?: LogEntry[];
  commit?: number;
  ok?: boolean;
  match?: number;
};

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HB = 50;
const MAJ = (n: number) => Math.floor(n / 2) + 1;

export class RaftEngine {
  clock = 0;
  partitioned = false;
  private rand: () => number;
  private inbox: Msg[] = [];
  private ev: SimEvent[] = [];
  private nextMsg = 1;
  private seed: number;
  nodes: Node[];

  constructor(opts?: { seed?: number; nodeCount?: 3 | 5 }) {
    this.seed = opts?.seed ?? 1;
    this.rand = rng(this.seed);
    this.nodes = this.makeNodes(opts?.nodeCount ?? 3);
  }

  private makeNodes(n: 3 | 5): Node[] {
    this.rand = rng(this.seed);
    return Array.from({ length: n }, (_, id) => ({
      id,
      role: 'follower' as Role,
      term: 0,
      votedFor: null,
      votes: 0,
      log: [{ term: 0, cmd: '' }],
      commitIndex: 0,
      lastApplied: 0,
      nextIndex: Array(n).fill(1),
      matchIndex: Array(n).fill(0),
      electAt: this.timeout(0),
      beatAt: 0,
      alive: true,
      side: 'majority' as Side,
      kv: {},
    }));
  }

  private timeout(from: number): number {
    return from + 150 + Math.floor(this.rand() * 151);
  }

  private delay(): number {
    return 8 + Math.floor(this.rand() * 10);
  }

  private majority(): number {
    return MAJ(this.nodes.length);
  }

  private emit(type: EventKind, text: string): void {
    this.ev.push({ t: Math.floor(this.clock), type, text });
    if (this.ev.length > 48) this.ev.splice(0, this.ev.length - 48);
  }

  private canTalk(from: number, to: number): boolean {
    const a = this.nodes[from];
    const b = this.nodes[to];
    if (!a.alive || !b.alive || from === to) return false;
    if (this.partitioned && a.side !== b.side) return false;
    return true;
  }

  private reachable(id: number): number {
    let n = 1;
    for (const peer of this.nodes) {
      if (this.canTalk(id, peer.id)) n += 1;
    }
    return n;
  }

  private send(msg: Omit<Msg, 'id' | 'sent' | 'at'> & { at?: number }): void {
    if (!this.canTalk(msg.from, msg.to)) return;
    const at = this.clock + this.delay();
    this.inbox.push({ ...msg, id: this.nextMsg++, sent: this.clock, at });
  }

  private stepDown(n: Node, term: number): void {
    n.term = term;
    n.role = 'follower';
    n.votedFor = null;
    n.votes = 0;
    n.electAt = this.timeout(this.clock);
  }

  private maybeBump(n: Node, term: number): boolean {
    if (term < n.term) return false;
    if (term > n.term) this.stepDown(n, term);
    return true;
  }

  private last(n: Node): LogEntry {
    return n.log[n.log.length - 1];
  }

  private logOk(n: Node, lastIdx: number, lastTerm: number): boolean {
    const mine = this.last(n);
    const myIdx = n.log.length - 1;
    if (lastTerm !== mine.term) return lastTerm > mine.term;
    return lastIdx >= myIdx;
  }

  private apply(n: Node): void {
    while (n.lastApplied < n.commitIndex) {
      n.lastApplied += 1;
      const e = n.log[n.lastApplied];
      const m = /^put (\S+)=(\S+)$/.exec(e.cmd);
      if (m) n.kv[m[1]] = m[2];
      if (n.role === 'leader') this.emit('result', `node${n.id} applied ${e.cmd || 'noop'} KV_SUCCESS`);
    }
  }

  private tryCommit(n: Node): void {
    if (n.role !== 'leader') return;
    for (let idx = n.log.length - 1; idx > n.commitIndex; idx -= 1) {
      if (n.log[idx].term !== n.term) continue;
      let acks = 0;
      for (let i = 0; i < this.nodes.length; i += 1) {
        if (n.matchIndex[i] >= idx) acks += 1;
      }
      if (acks >= this.majority()) {
        n.commitIndex = idx;
        this.emit('observe', `t=${Math.floor(this.clock)} node${n.id} commit index=${idx}`);
        this.apply(n);
        break;
      }
    }
  }

  private becomeLeader(n: Node): void {
    n.role = 'leader';
    n.nextIndex = this.nodes.map(() => n.log.length);
    n.matchIndex = this.nodes.map(() => 0);
    n.matchIndex[n.id] = n.log.length - 1;
    n.beatAt = this.clock;
    this.emit('result', `t=${Math.floor(this.clock)} node${n.id} → leader term=${n.term}`);
    this.beat(n);
  }

  private elect(n: Node): void {
    n.role = 'candidate';
    n.term += 1;
    n.votedFor = n.id;
    n.votes = 1;
    n.electAt = this.timeout(this.clock);
    this.emit('plan', `t=${Math.floor(this.clock)} node${n.id} campaign term=${n.term}`);
    if (n.votes >= this.majority()) {
      this.becomeLeader(n);
      return;
    }
    const lastIdx = n.log.length - 1;
    const lastTerm = this.last(n).term;
    for (const peer of this.nodes) {
      this.send({
        from: n.id,
        to: peer.id,
        kind: 'rv',
        term: n.term,
        lastIdx,
        lastTerm,
      });
    }
  }

  private beat(n: Node): void {
    n.beatAt = this.clock + HB;
    for (const peer of this.nodes) {
      if (peer.id === n.id) continue;
      const next = n.nextIndex[peer.id];
      const prevIdx = next - 1;
      const prevTerm = n.log[prevIdx]?.term ?? 0;
      this.send({
        from: n.id,
        to: peer.id,
        kind: 'ae',
        term: n.term,
        prevIdx,
        prevTerm,
        entries: n.log.slice(next),
        commit: n.commitIndex,
      });
    }
  }

  private handle(msg: Msg): void {
    const n = this.nodes[msg.to];
    if (!n.alive) return;
    if (msg.kind === 'rv') {
      if (!this.maybeBump(n, msg.term) || msg.term < n.term) {
        this.send({ from: n.id, to: msg.from, kind: 'rv-ok', term: n.term, granted: false });
        return;
      }
      const ok =
        (n.votedFor === null || n.votedFor === msg.from) &&
        this.logOk(n, msg.lastIdx ?? 0, msg.lastTerm ?? 0);
      if (ok) {
        n.votedFor = msg.from;
        n.electAt = this.timeout(this.clock);
        this.emit('tool_call', `node${msg.from} RequestVote → node${n.id}`);
        this.emit('observe', `node${n.id} granted vote term=${n.term}`);
      }
      this.send({ from: n.id, to: msg.from, kind: 'rv-ok', term: n.term, granted: ok });
      return;
    }
    if (msg.kind === 'rv-ok') {
      if (!this.maybeBump(n, msg.term) || n.role !== 'candidate' || msg.term !== n.term) return;
      if (msg.granted) n.votes += 1;
      if (n.votes >= this.majority()) this.becomeLeader(n);
      return;
    }
    if (msg.kind === 'ae') {
      if (!this.maybeBump(n, msg.term) || msg.term < n.term) {
        this.send({ from: n.id, to: msg.from, kind: 'ae-ok', term: n.term, ok: false, match: 0 });
        return;
      }
      n.electAt = this.timeout(this.clock);
      const prevIdx = msg.prevIdx ?? 0;
      const prevTerm = msg.prevTerm ?? 0;
      if (n.log[prevIdx]?.term !== prevTerm) {
        this.send({ from: n.id, to: msg.from, kind: 'ae-ok', term: n.term, ok: false, match: 0 });
        return;
      }
      const entries = msg.entries ?? [];
      for (let i = 0; i < entries.length; i += 1) {
        const idx = prevIdx + 1 + i;
        if (n.log[idx] && n.log[idx].term !== entries[i].term) n.log = n.log.slice(0, idx);
        if (!n.log[idx]) n.log.push(entries[i]);
      }
      const leaderCommit = msg.commit ?? 0;
      if (leaderCommit > n.commitIndex) {
        n.commitIndex = Math.min(leaderCommit, n.log.length - 1);
        this.apply(n);
      }
      this.send({
        from: n.id,
        to: msg.from,
        kind: 'ae-ok',
        term: n.term,
        ok: true,
        match: prevIdx + entries.length,
      });
      return;
    }
    if (msg.kind === 'ae-ok') {
      if (!this.maybeBump(n, msg.term) || n.role !== 'leader' || msg.term !== n.term) return;
      if (msg.ok) {
        n.matchIndex[msg.from] = Math.max(n.matchIndex[msg.from], msg.match ?? 0);
        n.nextIndex[msg.from] = n.matchIndex[msg.from] + 1;
        this.tryCommit(n);
      } else {
        n.nextIndex[msg.from] = Math.max(1, n.nextIndex[msg.from] - 1);
      }
    }
  }

  private nextTime(): number | null {
    let t: number | null = null;
    const consider = (x: number) => {
      if (x > this.clock && (t === null || x < t)) t = x;
    };
    for (const m of this.inbox) consider(m.at);
    for (const n of this.nodes) {
      if (!n.alive) continue;
      if (n.role === 'leader') consider(n.beatAt);
      else consider(n.electAt);
    }
    return t;
  }

  private fire(): void {
    const due = this.inbox.filter((m) => m.at <= this.clock);
    this.inbox = this.inbox.filter((m) => m.at > this.clock);
    for (const m of due) this.handle(m);
    for (const n of this.nodes) {
      if (!n.alive) continue;
      if (n.role === 'leader') {
        if (n.beatAt <= this.clock) this.beat(n);
      } else if (n.electAt <= this.clock) {
        this.elect(n);
      }
    }
  }

  step(dt: number): void {
    const end = this.clock + Math.max(0, dt);
    for (let i = 0; i < 20000 && this.clock < end; i += 1) {
      const next = this.nextTime();
      if (next === null || next > end) {
        this.clock = end;
        break;
      }
      this.clock = next;
      this.fire();
    }
  }

  leaderId(side?: Side): number | null {
    const found = this.nodes.find(
      (n) => n.alive && n.role === 'leader' && (side ? n.side === side : true),
    );
    return found ? found.id : null;
  }

  put(key: string, value: string, nodeId?: number): KvResult {
    const id = nodeId ?? this.leaderId(this.partitioned ? 'majority' : undefined) ?? this.leaderId();
    if (id === null) return 'KV_NOTLEADER';
    const n = this.nodes[id];
    if (!n.alive || n.role !== 'leader') return 'KV_NOTLEADER';
    n.log.push({ term: n.term, cmd: `put ${key}=${value}` });
    n.matchIndex[n.id] = n.log.length - 1;
    this.emit('tool_call', `client Put ${key}=${value} → node${n.id}`);
    this.tryCommit(n);
    this.beat(n);
    return 'KV_PENDING';
  }

  get(key: string, nodeId?: number): KvResult {
    const id = nodeId ?? this.leaderId() ?? null;
    if (id === null) return 'KV_NOTLEADER';
    const n = this.nodes[id];
    if (!n.alive || n.role !== 'leader') return 'KV_NOTLEADER';
    if (this.reachable(n.id) < this.majority()) {
      this.emit('observe', `Get ${key} node${n.id} KV_TIMEOUT`);
      return 'KV_TIMEOUT';
    }
    this.emit('result', `Get ${key} node${n.id} KV_SUCCESS`);
    return 'KV_SUCCESS';
  }

  killLeader(): number | null {
    const id = this.leaderId('majority') ?? this.leaderId();
    if (id === null) return null;
    const n = this.nodes[id];
    n.alive = false;
    this.emit('observe', `kill node${id}`);
    return id;
  }

  restoreNode(): number | null {
    const n = this.nodes.find((node) => !node.alive);
    if (!n) return null;
    n.alive = true;
    n.role = 'follower';
    n.votedFor = null;
    n.electAt = this.timeout(this.clock);
    this.emit('observe', `restore node${n.id}`);
    return n.id;
  }

  setPartitioned(on: boolean): void {
    this.partitioned = on;
    if (!on) {
      for (const n of this.nodes) n.side = 'majority';
      this.emit('observe', 'heal partition');
      return;
    }
    const lead = this.leaderId() ?? 0;
    const minorityCount = Math.max(1, Math.floor((this.nodes.length - 1) / 2));
    const order = [lead, ...this.nodes.map((n) => n.id).filter((id) => id !== lead)];
    const minority = new Set(order.slice(0, minorityCount));
    for (const n of this.nodes) n.side = minority.has(n.id) ? 'minority' : 'majority';
    this.emit('observe', `partition minority=[${[...minority].join(',')}]`);
    const isolated = this.leaderId('minority');
    if (isolated !== null) this.get('x', isolated);
  }

  setNodeCount(n: 3 | 5): void {
    this.clock = 0;
    this.partitioned = false;
    this.inbox = [];
    this.ev = [];
    this.nextMsg = 1;
    this.nodes = this.makeNodes(n);
    this.emit('plan', `cluster nodes=${n}`);
  }

  committedEntries(): LogEntry[] {
    let idx = 0;
    for (const n of this.nodes) {
      if (n.alive) idx = Math.max(idx, n.commitIndex);
    }
    const src = this.nodes.find((n) => n.commitIndex >= idx) ?? this.nodes[0];
    return src.log.slice(1, idx + 1).map((e) => ({ term: e.term, cmd: e.cmd }));
  }

  events(): SimEvent[] {
    return this.ev;
  }

  snapshot(): { clock: number; nodes: NodeView[]; messages: MessageView[]; partitioned: boolean } {
    return {
      clock: this.clock,
      partitioned: this.partitioned,
      nodes: this.nodes.map((n) => ({
        id: n.id,
        role: n.role,
        term: n.term,
        commitIndex: n.commitIndex,
        alive: n.alive,
        side: n.side,
        log: n.log.slice(1).map((e, i) => {
          const idx = i + 1;
          return {
            term: e.term,
            cmd: e.cmd,
            committed: idx <= n.commitIndex,
            applied: idx <= n.lastApplied,
          };
        }),
      })),
      messages: this.inbox
        .filter((m): m is Msg & { kind: 'ae' | 'rv' } => m.kind === 'ae' || m.kind === 'rv')
        .map((m) => ({
          id: m.id,
          from: m.from,
          to: m.to,
          kind: m.kind,
          progress: m.at === m.sent ? 1 : Math.min(1, Math.max(0, (this.clock - m.sent) / (m.at - m.sent))),
        })),
    };
  }
}

