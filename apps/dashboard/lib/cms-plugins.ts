export const LIVE_INTEGRATIONS = [
  { id: 'gtm',         name: 'Google Tag Manager', abbr: 'GTM' },
  { id: 'hubspot',     name: 'HubSpot',            abbr: 'HS'  },
  { id: 'webflow',     name: 'Webflow',            abbr: 'WF'  },
  { id: 'squarespace', name: 'Squarespace',        abbr: 'SS'  },
  { id: 'ghost',       name: 'Ghost',              abbr: 'GH'  },
  { id: 'prestashop',  name: 'Prestashop',         abbr: 'PS'  },
  { id: 'shopify',     name: 'Shopify',            abbr: 'SH'  },
  { id: 'bubble',      name: 'Bubble.io',          abbr: 'BB'  },
  { id: 'wix',         name: 'Wix',                abbr: 'WX'  },
  { id: 'mkdocs',      name: 'MkDocs',             abbr: 'MK'  },
] as const;

export const CMS_PLATFORMS_COMING_SOON = [
  { name: 'WordPress', abbr: 'WP' },
  { name: 'Drupal',    abbr: 'DR' },
  { name: 'Craft CMS', abbr: 'CR' },
  { name: 'Sylius',    abbr: 'SY' },
] as const;
