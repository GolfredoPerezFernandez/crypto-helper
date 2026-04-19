import { component$ } from "@builder.io/qwik";

/** Skip empty strings and generic placeholders so we show monogram fallback instead. */
export function usableTokenLogoUrl(src: string | null | undefined): string | null {
  const s = src?.trim();
  if (!s || !s.startsWith("http")) return null;
  if (s.includes("via.placeholder.com")) return null;
  return s;
}

export const TokenLogoImg = component$(
  (props: {
    src?: string | null;
    symbol?: string;
    size?: number;
    class?: string;
  }) => {
    const px = props.size ?? 32;
    const sym = (props.symbol || "?").replace(/\s/g, "").toUpperCase();
    const label = sym.length <= 4 ? sym : sym.slice(0, 4);
    const url = usableTokenLogoUrl(props.src ?? null);
    const base = `inline-flex shrink-0 items-center justify-center rounded-full bg-[#043234] object-cover ring-1 ring-[#043234]`;
    if (url) {
      return (
        <img
          src={url}
          alt=""
          width={px}
          height={px}
          class={[base, props.class].filter(Boolean).join(" ")}
          loading="lazy"
        />
      );
    }
    return (
      <span
        class={[
          base,
          "text-[10px] font-bold uppercase leading-none text-gray-400",
          props.class,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width: `${px}px`, height: `${px}px` }}
        aria-hidden
      >
        {label.slice(0, 2) || "?"}
      </span>
    );
  },
);
