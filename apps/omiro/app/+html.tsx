import { ScrollViewStyleReset } from 'expo-router/html';

// Web-only: sets up the root HTML for static rendering. Runs in Node, so
// no DOM or browser APIs here.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* Scaling's disabled so the mobile site feels more like a native app
            (hurts accessibility a bit -- drop maximum-scale if that matters more) */}
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1.00001,viewport-fit=cover"
        />
        {/* Kills body scroll on web so ScrollView behaves closer to native */}
        <ScrollViewStyleReset />

        {/* raw CSS here so the background never flashes wrong in dark mode */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: var(--background);
  color: var(--text-primary);
}`;
