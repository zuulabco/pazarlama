import styles from "./shape-loader.module.css";

/** Dört şekilli yükleme animasyonu. Süs olduğu için ekran okuyuculardan gizlenir; durum metni ayrıca verilir. */
export function ShapeLoader({ size = "lg" }: { size?: "lg" | "sm" }) {
  return (
    <div className={styles.loader} data-size={size} aria-hidden="true">
      <span className={`${styles.shape} ${styles.a}`} />
      <span className={`${styles.shape} ${styles.b}`} />
      <span className={`${styles.shape} ${styles.c}`} />
      <span className={`${styles.shape} ${styles.d}`} />
    </div>
  );
}
