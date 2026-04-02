// Used as fallback when Supabase is not yet configured
import type { Project, Feedback } from '@scalefeedback/shared';

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'demo-1',
    organisation_id: 'org-demo',
    name: 'My Client Site',
    domain: 'client-site.com',
    api_key: 'proj_demo_abc123def456',
    is_active: true,
    widget_config: { position: 'bottom-right', color: '#7C3AED', collectConsole: true, collectNetwork: false, guestReporting: true },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    organisation_id: 'org-demo',
    name: 'E-Commerce Store',
    domain: 'mystore.io',
    api_key: 'proj_demo_xyz789ghi012',
    is_active: true,
    widget_config: { position: 'bottom-right', color: '#FF6B35', collectConsole: true, collectNetwork: true, guestReporting: true },
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export const MOCK_FEEDBACK: Feedback[] = [
  {
    id: 'fb-1',
    project_id: 'demo-1',
    title: 'Button not clickable on mobile',
    description: 'The submit button is hidden behind the footer on iPhone 14. Happens consistently when the keyboard is open.',
    type: 'bug', status: 'open', priority: 'high',
    reporter_name: 'Priya Sharma', reporter_email: 'priya@example.com',
    page_url: 'https://client-site.com/checkout',
    browser: 'Safari 17.0', os: 'iOS (iPhone)',
    screen_size: '390x844', viewport_size: '390x664', device_pixel_ratio: 3,
    screenshot_url: null,
    console_logs: [
      { level: 'error', message: 'Uncaught TypeError: Cannot read properties of undefined (reading "submit")', timestamp: Date.now() - 5000 },
      { level: 'warn', message: 'Layout shift detected: 0.18', timestamp: Date.now() - 4000 },
    ],
    network_logs: [
      { url: 'https://api.client-site.com/checkout', method: 'POST', status: 422, duration: 340, timestamp: Date.now() - 3000 },
    ],
    custom_metadata: {},
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'fb-2',
    project_id: 'demo-1',
    title: 'Dark mode suggestion',
    description: 'Would love a dark mode option in the settings panel. Most of us work at night!',
    type: 'suggestion', status: 'in_progress', priority: 'low',
    reporter_name: null, reporter_email: null,
    page_url: 'https://client-site.com/settings',
    browser: 'Chrome 124.0', os: 'macOS 14.4',
    screen_size: '1920x1080', viewport_size: '1440x900', device_pixel_ratio: 2,
    screenshot_url: null,
    console_logs: [], network_logs: [], custom_metadata: {},
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'fb-3',
    project_id: 'demo-1',
    title: 'Login page 500 error',
    description: 'Getting a 500 error when trying to log in with Google OAuth.',
    type: 'bug', status: 'resolved', priority: 'critical',
    reporter_name: 'Rahul Verma', reporter_email: 'rahul@example.com',
    page_url: 'https://client-site.com/login',
    browser: 'Firefox 126.0', os: 'Windows 10/11',
    screen_size: '1366x768', viewport_size: '1366x768', device_pixel_ratio: 1,
    screenshot_url: null,
    console_logs: [
      { level: 'error', message: 'Failed to fetch: POST https://api.client-site.com/auth/google → 500', timestamp: Date.now() - 86400000 },
    ],
    network_logs: [
      { url: 'https://api.client-site.com/auth/google', method: 'POST', status: 500, duration: 1200, timestamp: Date.now() - 86400000 },
    ],
    custom_metadata: {},
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'fb-4',
    project_id: 'demo-2',
    title: 'Checkout flow broken on Safari',
    description: 'Payment form does not submit on Safari 17. Works fine on Chrome.',
    type: 'bug', status: 'open', priority: 'critical',
    reporter_name: 'Alex Kim', reporter_email: 'alex@mystore.io',
    page_url: 'https://mystore.io/checkout',
    browser: 'Safari 17.0', os: 'macOS 14',
    screen_size: '1440x900', viewport_size: '1440x900', device_pixel_ratio: 2,
    screenshot_url: null,
    console_logs: [], network_logs: [], custom_metadata: {},
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return url.length > 0 && !url.includes('your-project');
}
