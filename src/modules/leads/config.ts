/** Harcamayı ve kötüye kullanımı sınırlayan değerler (ücretsiz plan: aylık 10 $ Apify kredisi). */
export const searchLimits = {
  /** Hızlı seçim düğmeleri. Ayrıca özel sayı yazılabilir; "Tümü" üst sınıra eşittir. */
  presets: [10, 25, 50],
  /** Bir aramada getirilebilecek en çok firma ("Tümü" ve özel sayının üst sınırı). */
  maxResults: 100,
  defaultResults: 25,
  /** Aynı anda devam eden arama bulunan kullanıcıya yeni arama açılmaz (dakika). */
  activeWindowMinutes: 15,
  /** Bir koşunun harcayabileceği en yüksek tutar (USD). 100 firma ≈ 0,40–0,50 $. */
  maxChargeUsd: 0.6,
  /** Koşu zaman aşımı (saniye). */
  runTimeoutSecs: 300,
} as const;

/** Skorlama aynı anda en fazla bu kadar JEV isteği açar. */
export const jevConcurrency = 10;

/**
 * Bir istek aramayı işlemeye başlarken kısa süreli "kira" alır. Bu süre boyunca güncellenmeyen
 * arama (istek yarıda kesildi) başka bir istek tarafından devralınır.
 */
export const leaseSeconds = 45;
