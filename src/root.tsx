import { component$ } from "@builder.io/qwik";
import {
  QwikCityProvider,
  RouterOutlet,
  ServiceWorkerRegister,
} from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";
import { useSpeakLocale, useQwikSpeak } from 'qwik-speak';
import { config } from './speak-config';
import { translationFn } from './speak-functions';

import "./global.css";

export default component$(() => {
  /**
   * The root of a QwikCity site always start with the <QwikCityProvider> component,
   * immediately followed by the document's <head> and <body>.
   *
   * Don't remove the `<head>` and `<body>` elements.
   */

  useQwikSpeak({ config, translationFn });
  const loc = useSpeakLocale();

  return (
    <QwikCityProvider viewTransition={true}>
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <RouterHead />
        <ServiceWorkerRegister />
      </head>
      <body lang={loc.lang}>
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
