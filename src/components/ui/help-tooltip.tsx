import { component$ } from "@builder.io/qwik";

type HelpTooltipProps = {
  text: string;
  placement?: "top-right" | "top-center" | "inline";
  widthClass?: string;
};

export const HelpTooltip = component$<HelpTooltipProps>(({ text, placement = "inline", widthClass }) => {
  const bubbleWidth = widthClass ?? "w-56";
  const rootClass =
    placement === "top-right"
      ? "pointer-events-none absolute right-2 top-2 z-10 group"
      : placement === "top-center"
        ? "pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 group"
        : "relative group inline-flex align-middle ml-2";
  const bubblePos =
    placement === "top-right"
      ? `right-0 top-6 ${bubbleWidth}`
      : placement === "top-center"
        ? `left-1/2 top-6 -translate-x-1/2 ${bubbleWidth}`
        : `left-1/2 top-6 -translate-x-1/2 ${bubbleWidth}`;

  return (
    <span class={rootClass}>
      <span
        class="pointer-events-auto inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#0a5b5f] bg-[#002629] text-[11px] font-bold text-[#7af4f4] shadow-sm shadow-black/30"
        aria-label="More information"
      >
        ?
      </span>
      <span
        class={`pointer-events-none absolute z-20 rounded-md border border-[#0a5b5f] bg-[#001a1c] px-2.5 py-2 text-[11px] leading-relaxed text-gray-300 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 ${bubblePos}`}
      >
        {text}
      </span>
    </span>
  );
});

