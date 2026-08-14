import type { ReactNode } from 'react';

export interface CmsIntegration {
  id: string;
  name: string;
  abbr: string;
  tagline: string;
  why: string;
  steps: ReactNode[];
}

export const CMS_INTEGRATIONS: Record<string, CmsIntegration> = {
  gtm: {
    id: 'gtm',
    name: 'Google Tag Manager',
    abbr: 'GTM',
    tagline: 'Add Pinmarks to any site through your existing GTM container — no plugin required.',
    why: 'Google Tag Manager lets you deploy scripts across your site without editing code directly, and manage triggers and versions from one dashboard.',
    steps: [
      <>In Google Tag Manager, create a new tag and choose <strong>Custom HTML</strong> as the tag type.</>,
      <>Paste the snippet into the HTML field.</>,
      <>Set the trigger to <strong>All Pages</strong>.</>,
      <>Click <strong>Save</strong>, then <strong>Submit</strong> to publish the container version.</>,
    ],
  },
  squarespace: {
    id: 'squarespace',
    name: 'Squarespace',
    abbr: 'SS',
    tagline: 'Collect feedback on your Squarespace site with a single paste into Code Injection.',
    why: 'Squarespace combines website building and hosting in one platform, with a built-in Code Injection field for exactly this kind of script.',
    steps: [
      <>In Squarespace, go to <strong>Settings → Advanced → Code Injection</strong>.</>,
      <>Paste the snippet into the <strong>Footer</strong> box.</>,
      <>Click <strong>Save</strong>.</>,
    ],
  },
  ghost: {
    id: 'ghost',
    name: 'Ghost',
    abbr: 'GH',
    tagline: 'Collect feedback on your Ghost site with a single paste into Code Injection.',
    why: 'Ghost is a modern publishing platform with a built-in Code injection field for header and footer scripts.',
    steps: [
      <>In Ghost, go to <strong>Settings → Code injection</strong>.</>,
      <>Paste the snippet into <strong>Site Footer</strong>.</>,
      <>Click <strong>Save</strong>.</>,
    ],
  },
  prestashop: {
    id: 'prestashop',
    name: 'Prestashop',
    abbr: 'PS',
    tagline: 'Add Pinmarks to your PrestaShop store by editing your theme template.',
    why: 'PrestaShop is an open-source e-commerce platform; most themes expose a header/footer template you can edit directly.',
    steps: [
      <>In your PrestaShop back office, go to <strong>Design → Theme</strong>, and edit your theme.</>,
      <>Add the snippet to your theme&apos;s header/footer template (or a custom HTML block, if your theme provides one) just before <code className="bg-muted px-1 rounded text-xs">&lt;/body&gt;</code>.</>,
      <>Save and clear your cache.</>,
    ],
  },
  shopify: {
    id: 'shopify',
    name: 'Shopify',
    abbr: 'SH',
    tagline: 'Add Pinmarks to your Shopify store by editing your theme file.',
    why: 'Shopify themes are fully editable, so any script can be added directly to your theme.liquid file.',
    steps: [
      <>In Shopify, go to <strong>Online Store → Themes → Edit code</strong>.</>,
      <>Open <strong>theme.liquid</strong>.</>,
      <>Paste the snippet just before <code className="bg-muted px-1 rounded text-xs">&lt;/body&gt;</code>.</>,
      <>Click <strong>Save</strong>.</>,
    ],
  },
  bubble: {
    id: 'bubble',
    name: 'Bubble.io',
    abbr: 'BB',
    tagline: 'Add Pinmarks to your Bubble app through its built-in header script field.',
    why: 'Bubble is a visual, no-code app builder with a dedicated field for header/body scripts on paid plans.',
    steps: [
      <>In Bubble, go to <strong>Settings → SEO / metatags</strong>.</>,
      <>Paste the snippet into <strong>Script/meta tags in header</strong>.</>,
      <>Click <strong>Save</strong>.</>,
    ],
  },
  wix: {
    id: 'wix',
    name: 'Wix',
    abbr: 'WX',
    tagline: 'Add Pinmarks to your Wix site through its Custom Code panel.',
    why: 'Wix supports adding custom code to specific pages or your entire site via its Custom Code panel (available on eligible plans).',
    steps: [
      <>In Wix, go to <strong>Settings → Custom Code</strong>.</>,
      <>Click <strong>+ Add Custom Code</strong> and paste the snippet.</>,
      <>Set it to load on <strong>All pages</strong>, placed in <strong>Body — end</strong>.</>,
      <>Click <strong>Apply</strong>.</>,
    ],
  },
  mkdocs: {
    id: 'mkdocs',
    name: 'MkDocs',
    abbr: 'MK',
    tagline: 'Add Pinmarks to your MkDocs site through a theme template override.',
    why: 'MkDocs is a static site generator, so the snippet lives in your theme template rather than an admin dashboard.',
    steps: [
      <>Add the snippet to your theme&apos;s HTML template — e.g. a <code className="bg-muted px-1 rounded text-xs">main.html</code> override in your <code className="bg-muted px-1 rounded text-xs">custom_dir</code> — just before <code className="bg-muted px-1 rounded text-xs">&lt;/body&gt;</code>.</>,
      <>Rebuild and redeploy your site (<code className="bg-muted px-1 rounded text-xs">mkdocs build</code> or your deploy command).</>,
    ],
  },
};
