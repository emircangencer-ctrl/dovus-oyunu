import type { RollbackSession } from '@dovus/engine';
import type { SimState } from '@dovus/fight';

/** İki sekme arasındaki kanal (tarayıcıda BroadcastChannel). */
export interface LinkChannel {
  postMessage(m: unknown): void;
  onmessage: ((e: { data: unknown }) => void) | null;
}

export type LinkMessage =
  | { t: 'merhaba'; id: number }
  | { t: 'girdi'; from: 0 | 1; frame: number; inputs: number[] }
  | { t: 'ozet'; from: 0 | 1; frame: number; hash: number };

const JITTER_MS = 20;

/** Gönderilen her mesajı gecikme ± 20 ms sonra karşıya iletir (sıra korunmaz): yapay ağ gecikmesi. */
export class DelayedLink {
  private readonly channel: LinkChannel;
  private readonly delayMs: number;
  private readonly rng: () => number;

  constructor(channel: LinkChannel, delayMs: number, rng: () => number) {
    this.channel = channel;
    this.delayMs = delayMs;
    this.rng = rng;
  }

  send(m: unknown): void {
    const jitter = this.delayMs > 0 ? Math.round((this.rng() * 2 - 1) * JITTER_MS) : 0;
    setTimeout(() => this.channel.postMessage(m), Math.max(0, this.delayMs + jitter));
  }

  onReceive(cb: (m: unknown) => void): void {
    this.channel.onmessage = (e) => cb(e.data);
  }
}

const SEND_LAST = 8;
const HASH_EVERY = 60;

/** Bir tarafın rollback oturumunu bağlantıya bağlar: girdisini (son 8 kareyle) gönderir, rakibinkini alır,
 *  60 karede bir kesinleşmiş durum özetini karşılaştırır. Girdi kaynağı, girdinin uygulanacağı kareyle çağrılır. */
export class LinkPeer {
  readonly session: RollbackSession<SimState>;
  compared = 0;
  stalls = 0;
  maxRollback = 0;
  onMismatch: ((frame: number) => void) | null = null;

  private readonly link: DelayedLink;
  private readonly source: (frame: number) => number;
  private readonly sent = new Map<number, number>();
  private readonly pendingRemote = new Map<number, number>();
  private nextHashFrame = HASH_EVERY - 1;

  constructor(session: RollbackSession<SimState>, link: DelayedLink, source: (frame: number) => number) {
    this.session = session;
    this.link = link;
    this.source = source;
    link.onReceive((m) => this.receive(m as LinkMessage));
    for (let f = 0; f < session.opts.delay; f++) this.addLocal(f);
  }

  private get me(): 0 | 1 {
    return this.session.opts.local;
  }

  private addLocal(frame: number): void {
    const input = this.source(frame);
    this.session.addLocal(frame, input);
    this.sent.set(frame, input);
    this.sent.delete(frame - SEND_LAST - 1);
    const inputs: number[] = [];
    for (let f = Math.max(0, frame - SEND_LAST + 1); f <= frame; f++) inputs.push(this.sent.get(f) ?? 0);
    this.link.send({ t: 'girdi', from: this.me, frame, inputs } satisfies LinkMessage);
  }

  private receive(m: LinkMessage): void {
    if (m.t === 'girdi' && m.from !== this.me) {
      const first = m.frame - m.inputs.length + 1;
      m.inputs.forEach((input, k) => {
        this.session.addRemote(first + k, input);
      });
    } else if (m.t === 'ozet' && m.from !== this.me) {
      this.pendingRemote.set(m.frame, m.hash);
      this.check();
    }
  }

  private check(): void {
    for (const [frame, hash] of this.pendingRemote) {
      const mine = this.session.confirmedHash(frame);
      if (mine === undefined) {
        if (frame <= this.session.confirmedFrame - 1100) this.pendingRemote.delete(frame);
        continue;
      }
      this.pendingRemote.delete(frame);
      if (mine === hash) this.compared += 1;
      else this.onMismatch?.(frame);
    }
  }

  /** Bir simülasyon karesi: rakip çok gerideyse bekler (geri sarma sınırı), değilse girdisini ekleyip ilerler. */
  tick(): void {
    if (!this.session.canAdvance()) {
      this.stalls += 1;
      this.session.sync();
    } else {
      this.addLocal(this.session.state.frame + this.session.opts.delay);
      this.session.advance();
    }
    this.maxRollback = Math.max(this.maxRollback, this.session.lastRollbackFrames);
    while (this.session.confirmedFrame >= this.nextHashFrame) {
      const hash = this.session.confirmedHash(this.nextHashFrame);
      if (hash !== undefined)
        this.link.send({ t: 'ozet', from: this.me, frame: this.nextHashFrame, hash } satisfies LinkMessage);
      this.nextHashFrame += HASH_EVERY;
    }
    this.check();
  }
}
