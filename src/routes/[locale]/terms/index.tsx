import { component$ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead } from "@builder.io/qwik-city";
import {
  getTermsSections,
  lastUpdatedLabel,
  termsTitle,
} from "~/legal/crypto-helper-legal";

export default component$(() => {
  const L = useLocation().params.locale || "en-us";
  const sections = getTermsSections(L);
  return (
    <article class="mx-auto max-w-3xl px-4 py-12 text-slate-300">
      <h1 class="text-3xl font-bold tracking-tight text-white">{termsTitle(L)}</h1>
      <p class="mt-2 text-sm text-slate-500">{lastUpdatedLabel(L)}</p>
      <p class="mt-6 rounded-xl border border-amber-500/25 bg-amber-950/15 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
        {L.toLowerCase().startsWith("es")
          ? "Texto informativo de ejemplo: no sustituye asesoramiento legal; revisa entidad, fuero y pagos Pro con tu abogado."
          : "Sample informational text — not a substitute for legal advice; have counsel review entity, venue, and Pro billing."}
      </p>

      {sections.map((s) => (
        <section key={s.id} id={s.id} class="mt-10 scroll-mt-28 border-t border-[#043234]/60 pt-10 first:mt-12 first:border-t-0 first:pt-0">
          <h2 class="text-lg font-semibold text-[#04E6E6]">{s.title}</h2>
          {s.paragraphs.map((p, i) => (
            <p
              key={i}
              class={
                s.id === "disclaimer-warranty" || s.id === "limitation-liability"
                  ? "mt-3 text-xs uppercase leading-relaxed tracking-wide text-slate-500"
                  : "mt-3 text-sm leading-relaxed text-slate-400"
              }
            >
              {p}
            </p>
          ))}
        </section>
      ))}

      <div class="mt-14 flex flex-wrap gap-4 border-t border-[#043234] pt-8">
        <Link href={`/${L}/privacy/`} class="text-sm font-medium text-[#04E6E6] hover:underline">
          {L.toLowerCase().startsWith("es") ? "Política de privacidad" : "Privacy Policy"}
        </Link>
        <Link href={`/${L}/`} class="text-sm text-slate-500 transition hover:text-[#04E6E6]">
          {L.toLowerCase().startsWith("es") ? "← Inicio" : "← Home"}
        </Link>
      </div>
    </article>
  );
});

export const head: DocumentHead = ({ params }) => {
  const L = params.locale || "en-us";
  const es = L.toLowerCase().startsWith("es");
  return {
    title: es ? "Términos y condiciones | Crypto Helper" : "Terms & Conditions | Crypto Helper",
    meta: [
      {
        name: "description",
        content: es
          ? "Términos de uso de Crypto Helper: riesgos, datos de terceros, wallets y limitación de responsabilidad."
          : "Crypto Helper terms of use: risks, third-party data, wallets, and limitation of liability.",
      },
    ],
  };
};
