/** Dövüş katmanının veri tipleri. Tüm sayılar tam sayı; konum ve hızlar sabit noktalı (1 taban pikseli = 256). */

/** Kutu: taban pikseli, dövüşçünün ayak ortasına göre, sağa bakarken; y yukarı doğru negatif. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Vuruşun nasıl bloklanacağı: orta (ayakta ya da çömelik), alçak (yalnız çömelik), havadan/üstten (yalnız ayakta). */
export type Guard = 'mid' | 'low' | 'over';

export interface AttackDef {
  readonly name: string;
  readonly startup: number;
  readonly active: number;
  /** Yerde: aktif karelerden sonraki toparlanma. Havada kullanılmaz (yere inince biter). */
  readonly recovery: number;
  readonly damage: number;
  readonly hitstun: number;
  readonly blockstun: number;
  /** Temas anında iki dövüşçünün donduğu kare sayısı. */
  readonly hitstop: number;
  /** Savunanın geri itilme mesafesi, taban pikseli. */
  readonly push: number;
  readonly guard: Guard;
  readonly box: Box;
  /** Hafif vuruşlar temas edince hafif vuruşla iptal edilebilir (zincir). */
  readonly chain?: boolean;
  /** İsabet edince yere düşürür. */
  readonly knockdown?: boolean;
}

/** Ayakta, çömelik, havada; her biri [A, B, C, D] = [Hafif Yumruk, Hafif Tekme, Ağır Yumruk, Ağır Tekme]. */
export interface NormalTable {
  readonly st: readonly [number, number, number, number];
  readonly cr: readonly [number, number, number, number];
  readonly air: readonly [number, number, number, number];
}

export interface FighterDef {
  readonly id: string;
  readonly name: string;
  readonly health: number;
  /** Hızlar sabit noktalı (birim / kare). */
  readonly walkF: number;
  readonly walkB: number;
  readonly run: number;
  readonly backdash: { readonly frames: number; readonly vx: number; readonly decel: number; readonly invuln: number };
  readonly jump: {
    readonly prejump: number;
    readonly vy: number;
    readonly hopVy: number;
    readonly vxF: number;
    readonly vxB: number;
    readonly gravity: number;
    readonly land: number;
  };
  readonly standHurt: Box;
  readonly crouchHurt: Box;
  readonly airHurt: Box;
  /** İtme kutusunun yarı genişliği, taban pikseli. */
  readonly pushHalf: number;
  readonly attacks: readonly AttackDef[];
  readonly normals: NormalTable;
}

/** Dövüşçü durumları (özete girer; sıra değişirse altın özet değişir). */
export const ST = {
  IDLE: 0,
  WALK_F: 1,
  WALK_B: 2,
  CROUCH: 3,
  PREJUMP: 4,
  AIR: 5,
  LANDING: 6,
  RUN: 7,
  BACKDASH: 8,
  ATTACK: 9,
  AIR_ATTACK: 10,
  BLOCK_ST: 11,
  BLOCK_CR: 12,
  HIT_ST: 13,
  HIT_CR: 14,
  HIT_AIR: 15,
  KNOCKDOWN: 16,
  WAKEUP: 17,
  KO: 18,
  WIN: 19,
} as const;

export interface Fighter {
  readonly x: number;
  /** Ayak yüksekliği; yerde FLOOR. */
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: 1 | -1;
  readonly hp: number;
  readonly state: number;
  /** Bu durumda geçen kare (girişte 0). */
  readonly stateFrame: number;
  /** Saldırı tablosundaki sıra; yoksa -1. */
  readonly attack: number;
  /** Bu saldırının teması: 0 yok, 1 isabet, 2 blok. */
  readonly contact: number;
  /** Sersemletme, blok, yerde yatma, kalkma ve iniş için geri sayım. */
  readonly stun: number;
  /** Geri itilme hızı (birim / kare, işaretli) ve kalan kare. */
  readonly pushV: number;
  readonly pushFrames: number;
  /** Savunan olarak art arda yediği vuruş ve toplam hasar. */
  readonly combo: number;
  readonly comboDamage: number;
  readonly invuln: number;
  /** Havadayken: 1 = kısa zıplama, 2 = hava vuruşu kullanıldı (bit). */
  readonly air: number;
  /** Son ileri ve geri dokunuşun karesi (çift dokunuş için). */
  readonly fwdTap: number;
  readonly backTap: number;
  /** Vuruş donması sırasında basılan tuşlar; donma bitince işlenir. */
  readonly buffered: number;
  /** Önceki karenin temizlenmiş girdisi. */
  readonly prev: number;
  /** Havada vurulunca yere inişte düşecek mi (1). */
  readonly knock: number;
}

export interface FightOptions {
  readonly seed: number;
  /** Maçı kazanmak için gereken raunt (varsayılan 2). */
  readonly roundsToWin?: number;
  /** Raunt süresi, saniye (varsayılan 99). */
  readonly timerSeconds?: number;
  /** Raunt girişi ("RAUNT 1 · DÖVÜŞ!") oynansın mı (varsayılan evet; testler kapatabilir). */
  readonly intro?: boolean;
  /** Antrenman: süre bitmez, can kombo bitince dolar, nakavt yok. */
  readonly training?: boolean;
  /** Dövüşçü seçimi (kadro sırası); varsayılan iki kukla. */
  readonly chars?: readonly [number, number];
}

export interface FightState {
  readonly frame: number;
  readonly rng: number;
  readonly chars: readonly [number, number];
  readonly fighters: readonly [Fighter, Fighter];
  /** Kalan vuruş donması; sıfırdan büyükken hiçbir şey hareket etmez. */
  readonly hitstop: number;
  /** Son temasın kıvılcımı: konum (birim), kare ve tür (0 yok, 1 isabet, 2 blok). */
  readonly sparkX: number;
  readonly sparkY: number;
  readonly sparkFrame: number;
  readonly sparkKind: number;
  readonly phase: number;
  readonly phaseFrame: number;
  readonly round: number;
  /** Kalan süre, kare. */
  readonly timer: number;
  readonly wins: readonly [number, number];
  /** Son raunt: 0 yok, 1 Oyuncu 1, 2 Oyuncu 2, 3 berabere; sebep 0 nakavt, 1 süre. */
  readonly roundResult: number;
  readonly roundReason: number;
  /** Maç: -1 sürüyor, 0 Oyuncu 1, 1 Oyuncu 2, 2 berabere. */
  readonly winner: number;
  readonly roundsToWin: number;
  readonly timerFrames: number;
  readonly training: number;
}

/** Raunt akışı evreleri. */
export const PHASE = { INTRO: 0, FIGHT: 1, ROUND_END: 2, MATCH_END: 3 } as const;
