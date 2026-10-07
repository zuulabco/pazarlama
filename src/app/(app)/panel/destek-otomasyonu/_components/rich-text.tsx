/** Kılavuz metinlerindeki [[etiket|adres]] işaretlerini güvenli dış bağlantılara çevirir. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[\[.+?\|https?:\/\/.+?\]\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[\[(.+?)\|(https?:\/\/.+?)\]\]$/);
        return m ? (
          <a
            key={i}
            href={m[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-forest underline underline-offset-4 hover:no-underline"
          >
            {m[1]}
          </a>
        ) : (
          part
        );
      })}
    </>
  );
}
