import Link from 'next/link';

function SlackLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A"/>
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#24292F">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

function JiraLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.571 11.429L6.055 5.914a.83.83 0 0 1 0-1.172l5.516-5.514a.83.83 0 0 1 1.172 0l5.516 5.514a.83.83 0 0 1 0 1.172l-5.516 5.515a.83.83 0 0 1-.587.243.83.83 0 0 1-.585-.243zM.243 12.815l5.516 5.514a.83.83 0 0 0 1.172 0l5.516-5.514a.83.83 0 0 0 0-1.172L6.931 6.129a.83.83 0 0 0-1.172 0L.243 11.643a.83.83 0 0 0 0 1.172z" fill="#2684FF"/>
      <path d="M11.571 11.429L6.055 5.914l5.516 5.515 5.516-5.515-5.516 5.515z" fill="url(#jira-gradient)"/>
      <defs>
        <linearGradient id="jira-gradient" x1="6.055" y1="8.672" x2="12.743" y2="8.672" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0052CC"/>
          <stop offset="100%" stopColor="#2684FF"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function ClickUpLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.143 17.234l2.666-2.048c1.549 2.014 3.192 2.935 5.01 2.935 1.81 0 3.428-.907 4.944-2.913l2.691 2.015C15.365 19.737 12.955 21.143 9.819 21.143c-3.14 0-5.578-1.42-7.676-3.909z" fill="#8930FD"/>
      <path d="M0 10.462l2.854 2.196c1.882-2.447 3.917-3.656 6.14-3.656 2.214 0 4.224 1.196 6.07 3.626L17.92 10.44C15.466 7.177 12.73 5.429 9.143 5.429 5.523 5.429 2.607 7.198 0 10.462z" fill="url(#clickup-gradient)"/>
      <defs>
        <linearGradient id="clickup-gradient" x1="0" y1="7.946" x2="17.92" y2="7.946" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8930FD"/>
          <stop offset="1" stopColor="#49CCF9"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function WebhookLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 3a9 9 0 0 1 6.364 15.364M10.5 21a9 9 0 0 1-6.364-15.364" stroke="#ff724f" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2.5" fill="#ff724f"/>
      <path d="M12 9.5V3M12 21v-5.5" stroke="#ff724f" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  slack: <SlackLogo />,
  github: <GitHubLogo />,
  jira: <JiraLogo />,
  clickup: <ClickUpLogo />,
  webhook: <WebhookLogo />,
};

const APPS = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send feedback notifications to Slack channels via Incoming Webhook.',
    category: 'Notifications',
    comingSoon: true,
  },
  {
    id: 'github',
    name: 'GitHub Issues',
    description: 'Automatically create GitHub Issues for every feedback submission.',
    category: 'Project Management',
    comingSoon: true,
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Create Jira issues and sync feedback status with your Jira board.',
    category: 'Project Management',
    comingSoon: true,
  },
  {
    id: 'clickup',
    name: 'ClickUp',
    description: 'Create ClickUp tasks automatically when feedback is submitted.',
    category: 'Project Management',
    comingSoon: false,
  },
  {
    id: 'webhook',
    name: 'Custom Webhook',
    description: 'POST feedback data as JSON to any endpoint — connect any tool.',
    category: 'Developer',
    comingSoon: true,
  },
];

const CATEGORIES = ['Notifications', 'Project Management', 'Developer'];

export default function ConnectedAppsPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-[#300a46] mb-1">Connected apps</h1>
      <p className="text-sm text-gray-500 mb-8">
        Connect ScaleFeedback to your existing tools. Configure integrations per project in{' '}
        <Link href="/projects" className="text-[#ff724f] hover:underline">Project Settings → Integrations</Link>.
      </p>

      <div className="space-y-8">
        {CATEGORIES.map((cat) => {
          const apps = APPS.filter((a) => a.category === cat);
          return (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{cat}</h2>
              <div className="grid grid-cols-1 gap-3">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className={`bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 transition-all ${app.comingSoon ? 'opacity-60' : 'hover:border-[#ff724f]/30 hover:shadow-sm'}`}
                  >
                    <div className={`w-12 h-12 rounded-xl border border-gray-100 flex items-center justify-center shrink-0 ${app.comingSoon ? 'bg-gray-100' : 'bg-gray-50'}`}>
                      {ICONS[app.id]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900">{app.name}</span>
                        {app.comingSoon && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{app.description}</p>
                    </div>
                    {!app.comingSoon && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href="/projects"
                          className="text-xs font-medium text-[#ff724f] border border-[#ff724f]/30 px-3 py-1.5 rounded-lg hover:bg-[#fff3f0] transition-colors"
                        >
                          Configure
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Coming soon */}
      <div className="mt-8 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center">
        <p className="text-sm font-medium text-gray-700 mb-1">More integrations coming soon</p>
        <p className="text-xs text-gray-400">Linear, Trello, Notion, Asana, and more.</p>
      </div>
    </div>
  );
}
