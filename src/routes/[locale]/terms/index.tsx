import { component$ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  const L = useLocation().params.locale || "en-us";
  return (
    <div class="mx-auto max-w-2xl px-4 py-16 text-slate-200">
      <h1 class="text-2xl font-bold text-white">Terms</h1>
      <p class="mt-4 text-sm text-slate-400">
        Placeholder page. Replace this copy with your terms of service.
      </p>
      <Link href={`/${L}/`} class="mt-8 inline-block text-[#04E6E6] hover:underline">
        Home
      </Link>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Terms | Crypto Helper",
};
