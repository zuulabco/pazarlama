/** Harcamayı ve kötüye kullanımı sınırlayan değerler (ücretsiz plan: aylık 10 $ Apify kredisi). */
export const searchLimits = {
  /** Bir aramada çekilebilecek firma sayısı seçenekleri. */
  resultOptions: [10, 20, 30, 50],
  defaultResults: 30,
  /** Kullanıcı başına son 24 saatte açılabilecek arama sayısı. */
  perDay: 5,
  /** Aynı anda devam eden arama bulunan kullanıcıya yeni arama açılmaz (dakika). */
  activeWindowMinutes: 15,
  /** Bir koşunun harcayabileceği en yüksek tutar (USD). Apify'ın izin verdiği alt sınır 0,5'tir. */
  maxChargeUsd: 0.5,
  /** Koşu zaman aşımı (saniye). */
  runTimeoutSecs: 300,
} as const;

/** Skorlama aynı anda en fazla bu kadar JEV isteği açar. */
export const jevConcurrency = 6;

/** "scoring" durumunda bu kadar süre güncellenmeyen arama takılmış sayılır ve yeniden işlenir. */
export const staleScoringSeconds = 120;
