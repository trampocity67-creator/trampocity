import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Ce fichier est rendu uniquement sur le serveur lors du build web.
// Il définit le contenu du <html> initial, y compris les meta tags PWA iOS.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA — Android / Chrome */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#E31E24" />

        {/* PWA — iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TRAMPO CITY" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />

        {/* Supprime le scroll horizontal sur mobile */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
