import { Hono } from 'hono';

import type { AppEnv } from '../../server';

const EFFECTIVE_DATE = 'August 20, 2026';

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} · Hominem</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { margin: 0; background: Canvas; color: CanvasText; }
      main { max-width: 760px; margin: 0 auto; padding: 48px 24px 72px; line-height: 1.6; }
      h1, h2 { line-height: 1.2; }
      h1 { margin-bottom: 8px; }
      .muted { color: color-mix(in srgb, CanvasText 65%, transparent); }
      a { color: LinkText; }
    </style>
  </head>
  <body><main>${body}</main></body>
</html>`;
}

export const legalRoutes = new Hono<AppEnv>()
  .get('/support', (c) =>
    c.html(
      page(
        'Support',
        `<h1>Hominem Support</h1>
         <p class="muted">Hominem support and service information.</p>
         <p>For account, data, privacy, or service questions, contact the Hominem team through <a href="https://ponti.io">Ponti Studios</a>.</p>
         <p><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a></p>`,
      ),
    ),
  )
  .get('/privacy', (c) =>
    c.html(
      page(
        'Privacy Policy',
        `<h1>Hominem Privacy Policy</h1>
         <p class="muted">Effective date: ${EFFECTIVE_DATE}</p>
         <p>Hominem is a personal data repository and workspace operated by Ponti Studios. This policy explains what information Hominem processes, why it is processed, and the choices available to you.</p>

         <h2>Information we process</h2>
         <ul>
           <li><strong>Account information:</strong> your name, email address, authentication records, and session information.</li>
           <li><strong>Information you store:</strong> data you choose to keep in Hominem, which may include career history, applications, education, contacts, finance, health, calendar, travel, media, places, collections, tags, notes, and related files or links.</li>
           <li><strong>Connected-service information:</strong> data imported from services you connect or authorize, limited to the permissions and workflows you use.</li>
           <li><strong>Technical information:</strong> request metadata, security events, error information, and usage information needed to operate, secure, and improve the service.</li>
         </ul>

         <h2>How we use information</h2>
         <p>We use information to provide Hominem, authenticate you, respond to your requests, synchronize or process connected data, protect the service, troubleshoot failures, measure reliability, and comply with legal obligations.</p>

         <h2>When information is shared</h2>
         <p>We share information with service providers that help operate Hominem, such as hosting, database, storage, email, AI, and monitoring providers. Those providers receive information needed for the service they perform. When you use Hominem through ChatGPT or another connected client, your request is also processed by that client under its own privacy terms.</p>

         <h2>Security and retention</h2>
         <p>We use access controls, authenticated sessions, scoped authorization, rate limits, and operational monitoring appropriate to the service. No internet service can guarantee absolute security. We retain information while your account or an active service need requires it, and may retain limited records when necessary for security, legal, or backup purposes.</p>

         <h2>Your choices</h2>
         <p>You may review, update, export, or request deletion of information through available Hominem features or by contacting support. Some records may need to be retained where required by law or legitimate security and accounting needs.</p>

         <h2>Children</h2>
         <p>Hominem is not directed to children under 13, and we do not knowingly collect personal information from children under 13.</p>

         <h2>Changes and contact</h2>
         <p>We may update this policy as Hominem changes. The effective date above indicates when this version took effect. For questions or privacy requests, visit <a href="/support">Hominem Support</a>.</p>
         <p><a href="/terms">Terms of Service</a> · <a href="/support">Support</a></p>`,
      ),
    ),
  )
  .get('/terms', (c) =>
    c.html(
      page(
        'Terms of Service',
        `<h1>Hominem Terms of Service</h1>
         <p class="muted">Effective date: ${EFFECTIVE_DATE}</p>
         <p>These Terms govern your use of Hominem, a personal data repository and workspace operated by Ponti Studios. By using Hominem, you agree to these Terms.</p>

         <h2>Using Hominem</h2>
         <p>You must provide accurate account information, keep your authentication methods secure, and use Hominem only for lawful purposes. You are responsible for the information and instructions you submit and for reviewing results before relying on them.</p>

         <h2>Personal data and connected services</h2>
         <p>Hominem stores and processes the information you choose to provide or connect. You represent that you have the rights and permissions needed to submit that information. Connected services may have separate terms, privacy policies, limits, or outages.</p>

         <h2>AI-assisted results</h2>
         <p>Some Hominem features use automated or AI-assisted processing. Results may be incomplete, inaccurate, or delayed. Hominem is not a substitute for professional financial, medical, legal, employment, or other expert advice, and you should verify consequential decisions independently.</p>

         <h2>Prohibited uses</h2>
         <p>You may not use Hominem to violate law or another person’s rights, access another person’s data without authorization, interfere with the service, bypass security controls, or submit content that introduces malicious code or harmful instructions.</p>

         <h2>Service changes and termination</h2>
         <p>We may modify, suspend, or discontinue features, including connected-service integrations, when reasonably necessary to operate or secure Hominem. You may stop using Hominem at any time. We may suspend or terminate access for abuse, security risk, legal requirement, or material violation of these Terms.</p>

         <h2>Ownership and feedback</h2>
         <p>Hominem and its underlying software, designs, and documentation remain the property of Ponti Studios or its licensors. You retain rights to the information you submit. Feedback you voluntarily provide may be used to improve the service without transferring ownership of your submitted data.</p>

         <h2>Disclaimers and limits</h2>
         <p>Hominem is provided on an availability basis, without a guarantee that it will be uninterrupted, error-free, or suitable for every purpose. To the extent permitted by law, Ponti Studios is not liable for indirect, incidental, special, consequential, or lost-profit damages arising from use of the service.</p>

         <h2>Changes and contact</h2>
         <p>We may update these Terms as Hominem changes. Continued use after an updated effective date means you accept the revised Terms. For questions, visit <a href="/support">Hominem Support</a>.</p>
         <p><a href="/privacy">Privacy Policy</a> · <a href="/support">Support</a></p>`,
      ),
    ),
  );
