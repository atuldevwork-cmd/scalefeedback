'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

type IntegrationType = 'slack' | 'github' | 'jira' | 'clickup' | 'webhook';

interface Integration {
  type: IntegrationType;
  enabled: boolean;
  config: Record<string, string>;
}

const DEFAULTS: Record<IntegrationType, Integration> = {
  slack:   { type: 'slack',   enabled: false, config: {} },
  github:  { type: 'github',  enabled: false, config: {} },
  jira:    { type: 'jira',    enabled: false, config: {} },
  clickup: { type: 'clickup', enabled: false, config: {} },
  webhook: { type: 'webhook', enabled: false, config: { url: '', secret: '' } },
};

/* ─── Logos ─────────────────────────────────────────────────────────────────── */

function SlackLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 122.8 122.8" xmlns="http://www.w3.org/2000/svg">
      <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9z" fill="#E01E5A"/>
      <path d="M32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A"/>
      <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2z" fill="#36C5F0"/>
      <path d="M45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9H45.2z" fill="#36C5F0"/>
      <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2z" fill="#2EB67D"/>
      <path d="M90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2EB67D"/>
      <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9z" fill="#ECB22E"/>
      <path d="M77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E"/>
    </svg>
  );
}

function GitHubLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  );
}

function JiraLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="jira-a" x1="98%" y1="0.16%" x2="58.89%" y2="40.39%">
          <stop offset="18%" stopColor="#0052cc"/><stop offset="100%" stopColor="#2684ff"/>
        </linearGradient>
        <linearGradient id="jira-b" x1="2%" y1="99.84%" x2="41.11%" y2="59.61%">
          <stop offset="18%" stopColor="#0052cc"/><stop offset="100%" stopColor="#2684ff"/>
        </linearGradient>
      </defs>
      <path d="M28.54 1.6H15.66a6.27 6.27 0 006.27 6.27h2.56v2.47a6.27 6.27 0 006.27 6.27V3.73A2.13 2.13 0 0028.54 1.6z" fill="#2684ff"/>
      <path d="M22.1 8.09H9.22a6.27 6.27 0 006.27 6.27h2.56v2.47a6.27 6.27 0 006.27 6.27V10.22A2.13 2.13 0 0022.1 8.09z" fill="url(#jira-a)"/>
      <path d="M15.67 14.58H2.78A6.27 6.27 0 009.05 20.85h2.56v2.48a6.27 6.27 0 006.27 6.27V16.71a2.13 2.13 0 00-2.21-2.13z" fill="url(#jira-b)"/>
    </svg>
  );
}

function ClickUpLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cu-a" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8930FD"/><stop offset="100%" stopColor="#49CCF9"/>
        </linearGradient>
        <linearGradient id="cu-b" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF02F0"/><stop offset="100%" stopColor="#FFC800"/>
        </linearGradient>
      </defs>
      <path d="M3 14.4L5.9 12c1.5 1.8 3.1 2.7 4.8 2.7 1.7 0 3.3-.9 4.7-2.7l2.9 2.4C16.4 17 13.7 18.6 10.7 18.6c-3 0-5.7-1.6-7.7-4.2z" fill="url(#cu-b)"/>
      <path d="M10.7 5.4L5 10.3 3 8.1 10.7 1l7.7 7.1-2 2.2-5.7-4.9z" fill="url(#cu-a)"/>
    </svg>
  );
}

function WebhookLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const INTEGRATION_META: Record<IntegrationType, { label: string; logo: React.ReactNode; description: string }> = {
  slack:   { label: 'Slack',          logo: <SlackLogo />,   description: 'Post new feedback to a Slack channel.' },
  github:  { label: 'GitHub Issues',  logo: <GitHubLogo />,  description: 'Auto-create a GitHub Issue when feedback is submitted.' },
  jira:    { label: 'Jira',           logo: <JiraLogo />,    description: 'Create a Jira issue for every piece of feedback.' },
  clickup: { label: 'ClickUp',        logo: <ClickUpLogo />, description: 'Create a ClickUp task in any List when feedback is submitted.' },
  webhook: { label: 'Custom Webhook', logo: <WebhookLogo />, description: 'POST feedback JSON to any URL when new feedback arrives.' },
};

/* ─── Shared Helpers ─────────────────────────────────────────────────────────── */

const SELECT_CLASS = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all disabled:bg-gray-50 disabled:text-gray-400';
const LABEL_CLASS  = 'block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide';
const INPUT_CLASS  = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#ff724f]/30 focus:border-[#ff724f] transition-all';

interface ConnectedBadgeProps {
  projectId: string;
  provider: string;
  children: React.ReactNode;
}
function ConnectedBadge({ projectId, provider, children }: ConnectedBadgeProps) {
  async function handleDisconnect() {
    // ClickUp needs to clean up the registered webhook before removing the record
    if (provider === 'clickup') {
      await fetch(`/api/clickup/${projectId}/setup`, { method: 'DELETE' });
    } else {
      await fetch(`/api/integrations/${projectId}?type=${provider}`, { method: 'DELETE' });
    }
    window.location.reload();
  }

  return (
    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        <span className="text-sm font-medium text-green-800">{children}</span>
      </div>
      <button onClick={handleDisconnect} className="text-xs text-red-500 hover:text-red-700 font-medium">
        Disconnect
      </button>
    </div>
  );
}

interface ConfigSummaryProps {
  rows: { label: string; value: string }[];
  onEdit: () => void;
}
function ConfigSummary({ rows, onEdit }: ConfigSummaryProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
              <span className="font-medium text-gray-800">{value}</span>
            </div>
          ))}
        </div>
        <button onClick={onEdit} className="text-xs text-[#ff724f] hover:text-[#e8603a] font-semibold shrink-0">
          Change
        </button>
      </div>
    </div>
  );
}

interface ConfigModalProps {
  title: string;
  logo: React.ReactNode;
  subtitle?: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
  children: React.ReactNode;
}
function ConfigModal({ title, logo, subtitle, onClose, onSave, saving, canSave, children }: ConfigModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
            {logo}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-xl hover:bg-white transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!canSave || saving}
            className="flex-1 bg-[#ff724f] hover:bg-[#e8603a] text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Slack Config ───────────────────────────────────────────────────────────── */
// Slack OAuth returns the webhook URL directly — no post-OAuth modal needed.

interface SlackConfigProps {
  projectId: string;
  config: Record<string, string>;
  saved: boolean;
}
function SlackConfig({ projectId, config, saved }: SlackConfigProps) {
  if (!config.accessToken) {
    return (
      <div className="flex items-center gap-3 py-1">
        <a href={`/api/slack/auth?projectId=${projectId}`}
          className="inline-flex items-center gap-2 bg-[#4A154B] hover:bg-[#3a1039] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <SlackLogo size={18} /> Connect Slack
        </a>
        <span className="text-xs text-gray-400">You&apos;ll pick the channel in Slack&apos;s UI.</span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <ConnectedBadge projectId={projectId} provider="slack">
        Connected to Slack
      </ConnectedBadge>
      <ConfigSummary
        rows={[
          { label: 'Workspace', value: config.workspaceName ?? '—' },
          { label: 'Channel',   value: config.channel ?? '—' },
        ]}
        onEdit={() => window.location.assign(`/api/slack/auth?projectId=${projectId}`)}
      />
      {saved && <p className="text-xs text-green-600 font-medium">✓ Active</p>}
    </div>
  );
}

/* ─── GitHub Config ──────────────────────────────────────────────────────────── */

interface GitHubOption { id: string; name: string; owner: string; repo: string; private: boolean }

interface GitHubConfigProps {
  projectId: string;
  config: Record<string, string>;
  onSave: (updates: Record<string, string>) => Promise<void>;
  saving: boolean;
  saved: boolean;
  autoOpen: boolean;
}
function GitHubConfig({ projectId, config, onSave, saving, saved, autoOpen }: GitHubConfigProps) {
  const isConnected = Boolean(config.accessToken);
  const [modalOpen, setModalOpen] = useState(false);
  const [repos, setRepos] = useState<GitHubOption[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selRepo, setSelRepo] = useState<GitHubOption | null>(null);

  useEffect(() => { if (autoOpen && isConnected) openModal(); }, [autoOpen, isConnected]); // eslint-disable-line

  function openModal() {
    setSelRepo(repos.find(r => r.id === config.owner + '/' + config.repo) ?? null);
    setModalOpen(true);
  }

  useEffect(() => {
    if (!modalOpen || !isConnected) return;
    setLoadingRepos(true);
    fetch(`/api/github/${projectId}/data?type=repos`)
      .then(r => r.json()).then(j => setRepos(j.data ?? []))
      .finally(() => setLoadingRepos(false));
  }, [modalOpen, isConnected, projectId]);

  if (!isConnected) {
    return (
      <div className="flex items-center gap-3 py-1">
        <a href={`/api/github/auth?projectId=${projectId}`}
          className="inline-flex items-center gap-2 bg-[#24292e] hover:bg-[#1a1f23] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <GitHubLogo size={18} /> Connect GitHub
        </a>
        <span className="text-xs text-gray-400">Authorize to list your repositories.</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <ConnectedBadge projectId={projectId} provider="github">Connected to GitHub ({config.githubLogin})</ConnectedBadge>
        {config.repo ? (
          <ConfigSummary rows={[{ label: 'Repository', value: `${config.owner}/${config.repo}` }]} onEdit={openModal} />
        ) : (
          <button onClick={openModal} className="w-full border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-500 hover:border-[#ff724f] hover:text-[#ff724f] transition-colors text-left">
            + Select repository
          </button>
        )}
        {saved && <p className="text-xs text-green-600 font-medium">✓ Saved</p>}
      </div>

      {modalOpen && (
        <ConfigModal
          title="Configure GitHub Issues"
          logo={<GitHubLogo size={20} />}
          subtitle="Select the repository to create issues in"
          onClose={() => setModalOpen(false)}
          onSave={async () => {
            if (!selRepo) return;
            await onSave({ accessToken: config.accessToken, githubLogin: config.githubLogin, owner: selRepo.owner, repo: selRepo.repo });
            setModalOpen(false);
          }}
          saving={saving}
          canSave={Boolean(selRepo)}
        >
          <div>
            <label className={LABEL_CLASS}>Repository</label>
            <select
              value={selRepo?.id ?? ''}
              onChange={e => setSelRepo(repos.find(r => r.id === e.target.value) ?? null)}
              disabled={loadingRepos}
              className={SELECT_CLASS}
            >
              <option value="">{loadingRepos ? 'Loading repositories…' : 'Select repository'}</option>
              {repos.map(r => (
                <option key={r.id} value={r.id}>{r.name}{r.private ? ' 🔒' : ''}</option>
              ))}
            </select>
          </div>
        </ConfigModal>
      )}
    </>
  );
}

/* ─── Jira Config ────────────────────────────────────────────────────────────── */

interface JiraOption { id: string; name: string; url?: string; key?: string }

interface JiraConfigProps {
  projectId: string;
  config: Record<string, string>;
  onSave: (updates: Record<string, string>) => Promise<void>;
  saving: boolean;
  saved: boolean;
  autoOpen: boolean;
}
function JiraConfig({ projectId, config, onSave, saving, saved, autoOpen }: JiraConfigProps) {
  const isConnected = Boolean(config.accessToken);
  const [modalOpen, setModalOpen] = useState(false);
  const [sites, setSites] = useState<JiraOption[]>([]);
  const [projects, setProjects] = useState<JiraOption[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selSiteId, setSelSiteId] = useState('');
  const [selSiteName, setSelSiteName] = useState('');
  const [selProjectKey, setSelProjectKey] = useState('');
  const [selProjectName, setSelProjectName] = useState('');

  useEffect(() => { if (autoOpen && isConnected) openModal(); }, [autoOpen, isConnected]); // eslint-disable-line

  function openModal() {
    setSelSiteId(config.cloudId ?? '');
    setSelSiteName(config.siteName ?? '');
    setSelProjectKey(config.projectKey ?? '');
    setSelProjectName(config.projectName ?? '');
    setSites([]); setProjects([]);
    setModalOpen(true);
  }

  useEffect(() => {
    if (!modalOpen || !isConnected) return;
    setLoadingSites(true);
    fetch(`/api/jira/${projectId}/data?type=sites`)
      .then(r => r.json()).then(j => setSites(j.data ?? []))
      .finally(() => setLoadingSites(false));
  }, [modalOpen, isConnected, projectId]);

  useEffect(() => {
    if (!modalOpen || !selSiteId) { setProjects([]); return; }
    setLoadingProjects(true);
    setProjects([]);
    fetch(`/api/jira/${projectId}/data?type=projects&cloudId=${selSiteId}`)
      .then(r => r.json()).then(j => setProjects(j.data ?? []))
      .finally(() => setLoadingProjects(false));
  }, [modalOpen, selSiteId, projectId]);

  if (!isConnected) {
    return (
      <div className="flex items-center gap-3 py-1">
        <a href={`/api/jira/auth?projectId=${projectId}`}
          className="inline-flex items-center gap-2 bg-[#0052CC] hover:bg-[#0041a8] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <JiraLogo size={18} /> Connect Jira
        </a>
        <span className="text-xs text-gray-400">Authorize with your Atlassian account.</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <ConnectedBadge projectId={projectId} provider="jira">Connected to Jira</ConnectedBadge>
        {config.projectKey ? (
          <ConfigSummary rows={[
            { label: 'Site',    value: config.siteName ?? config.cloudId },
            { label: 'Project', value: `${config.projectName} (${config.projectKey})` },
          ]} onEdit={openModal} />
        ) : (
          <button onClick={openModal} className="w-full border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-500 hover:border-[#ff724f] hover:text-[#ff724f] transition-colors text-left">
            + Select Jira site &amp; project
          </button>
        )}
        {saved && <p className="text-xs text-green-600 font-medium">✓ Saved</p>}
      </div>

      {modalOpen && (
        <ConfigModal
          title="Configure Jira"
          logo={<JiraLogo size={20} />}
          subtitle="Select your Jira site and project"
          onClose={() => setModalOpen(false)}
          onSave={async () => {
            await onSave({
              accessToken: config.accessToken,
              refreshToken: config.refreshToken ?? '',
              cloudId: selSiteId,
              siteName: selSiteName,
              projectKey: selProjectKey,
              projectName: selProjectName,
            });
            setModalOpen(false);
          }}
          saving={saving}
          canSave={Boolean(selSiteId && selProjectKey)}
        >
          <div>
            <label className={LABEL_CLASS}>Jira Site</label>
            <select value={selSiteId} onChange={e => {
              const s = sites.find(x => x.id === e.target.value);
              setSelSiteId(s?.id ?? ''); setSelSiteName(s?.name ?? '');
              setSelProjectKey(''); setSelProjectName('');
            }} disabled={loadingSites} className={SELECT_CLASS}>
              <option value="">{loadingSites ? 'Loading sites…' : 'Select site'}</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {selSiteId && (
            <div>
              <label className={LABEL_CLASS}>Project</label>
              <select value={selProjectKey} onChange={e => {
                const p = projects.find(x => x.key === e.target.value);
                setSelProjectKey(p?.key ?? ''); setSelProjectName(p?.name ?? '');
              }} disabled={loadingProjects} className={SELECT_CLASS}>
                <option value="">{loadingProjects ? 'Loading projects…' : 'Select project'}</option>
                {projects.map(p => <option key={p.id} value={p.key!}>{p.name} ({p.key})</option>)}
              </select>
            </div>
          )}
        </ConfigModal>
      )}
    </>
  );
}

/* ─── ClickUp Config ─────────────────────────────────────────────────────────── */

interface ClickUpOption { id: string; name: string; folder?: string }

interface ClickUpConfigProps {
  projectId: string;
  config: Record<string, string>;
  onSave: (updates: Record<string, string>) => Promise<void>;
  saving: boolean;
  saved: boolean;
  autoOpen: boolean;
}
function ClickUpConfig({ projectId, config, onSave, saving, saved, autoOpen }: ClickUpConfigProps) {
  const isConnected = Boolean(config.accessToken);
  const [modalOpen, setModalOpen] = useState(false);

  const [selWorkspaceId, setSelWorkspaceId] = useState('');
  const [selWorkspaceName, setSelWorkspaceName] = useState('');
  const [selSpaceId, setSelSpaceId] = useState('');
  const [selSpaceName, setSelSpaceName] = useState('');
  const [selListId, setSelListId] = useState('');
  const [selListName, setSelListName] = useState('');
  const [selAssigneeId, setSelAssigneeId] = useState('');
  const [selAssigneeName, setSelAssigneeName] = useState('');

  const [workspaces, setWorkspaces] = useState<ClickUpOption[]>([]);
  const [spaces, setSpaces] = useState<ClickUpOption[]>([]);
  const [lists, setLists] = useState<ClickUpOption[]>([]);
  const [members, setMembers] = useState<ClickUpOption[]>([]);
  const [loadingWs, setLoadingWs] = useState(false);
  const [loadingSp, setLoadingSp] = useState(false);
  const [loadingLi, setLoadingLi] = useState(false);
  const [loadingMe, setLoadingMe] = useState(false);

  const fetchData = useCallback(async (type: string, params: Record<string, string>) => {
    const qs = new URLSearchParams({ type, ...params });
    const res = await fetch(`/api/clickup/${projectId}/data?${qs}`);
    return (await res.json()).data ?? [];
  }, [projectId]);

  useEffect(() => { if (autoOpen && isConnected) openModal(); }, [autoOpen, isConnected]); // eslint-disable-line

  function openModal() {
    setSelWorkspaceId(config.workspaceId ?? ''); setSelWorkspaceName(config.workspaceName ?? '');
    setSelSpaceId(config.spaceId ?? '');         setSelSpaceName(config.spaceName ?? '');
    setSelListId(config.listId ?? '');           setSelListName(config.listName ?? '');
    setSelAssigneeId(config.assigneeId ?? '');   setSelAssigneeName(config.assigneeName ?? '');
    setSpaces([]); setLists([]); setMembers([]);
    setModalOpen(true);
  }

  useEffect(() => {
    if (!modalOpen || !isConnected) return;
    setLoadingWs(true);
    fetchData('workspaces', {}).then(setWorkspaces).finally(() => setLoadingWs(false));
  }, [modalOpen, isConnected, fetchData]);

  useEffect(() => {
    if (!modalOpen || !selWorkspaceId) { setSpaces([]); return; }
    setLoadingSp(true); setSpaces([]); setLists([]); setMembers([]);
    fetchData('spaces', { workspaceId: selWorkspaceId }).then(setSpaces).finally(() => setLoadingSp(false));
  }, [modalOpen, selWorkspaceId, fetchData]);

  useEffect(() => {
    if (!modalOpen || !selSpaceId) { setLists([]); return; }
    setLoadingLi(true); setLists([]); setMembers([]);
    fetchData('lists', { spaceId: selSpaceId }).then(setLists).finally(() => setLoadingLi(false));
  }, [modalOpen, selSpaceId, fetchData]);

  useEffect(() => {
    if (!modalOpen || !selListId) { setMembers([]); return; }
    setLoadingMe(true); setMembers([]);
    fetchData('members', { listId: selListId }).then(setMembers).finally(() => setLoadingMe(false));
  }, [modalOpen, selListId, fetchData]);

  if (!isConnected) {
    return (
      <div className="flex items-center gap-3 py-1">
        <a href={`/api/clickup/auth?projectId=${projectId}`}
          className="inline-flex items-center gap-2 bg-[#7B68EE] hover:bg-[#6A58DD] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <ClickUpLogo size={18} /> Connect ClickUp
        </a>
        <span className="text-xs text-gray-400">You&apos;ll be redirected to ClickUp to authorize.</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <ConnectedBadge projectId={projectId} provider="clickup">ClickUp connected</ConnectedBadge>
        {config.listId ? (
          <ConfigSummary rows={[
            ...(config.workspaceName ? [{ label: 'Workspace', value: config.workspaceName }] : []),
            ...(config.spaceName     ? [{ label: 'Space',     value: config.spaceName }]     : []),
            { label: 'List',     value: config.listName },
            ...(config.assigneeName  ? [{ label: 'Assignee',  value: config.assigneeName }]  : []),
          ]} onEdit={openModal} />
        ) : (
          <button onClick={openModal} className="w-full border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-500 hover:border-[#ff724f] hover:text-[#ff724f] transition-colors text-left">
            + Select workspace, space, list &amp; assignee
          </button>
        )}
        {saved && <p className="text-xs text-green-600 font-medium">✓ Saved</p>}
      </div>

      {modalOpen && (
        <ConfigModal
          title="Configure ClickUp"
          logo={<ClickUpLogo size={20} />}
          subtitle="Select where to create tasks"
          onClose={() => setModalOpen(false)}
          onSave={async () => {
            await onSave({ accessToken: config.accessToken, workspaceId: selWorkspaceId, workspaceName: selWorkspaceName, spaceId: selSpaceId, spaceName: selSpaceName, listId: selListId, listName: selListName, assigneeId: selAssigneeId, assigneeName: selAssigneeName });
            setModalOpen(false);
          }}
          saving={saving}
          canSave={Boolean(selListId)}
        >
          <div>
            <label className={LABEL_CLASS}>Workspace</label>
            <select value={selWorkspaceId} onChange={e => {
              const w = workspaces.find(x => x.id === e.target.value);
              setSelWorkspaceId(w?.id ?? ''); setSelWorkspaceName(w?.name ?? '');
              setSelSpaceId(''); setSelSpaceName(''); setSelListId(''); setSelListName(''); setSelAssigneeId(''); setSelAssigneeName('');
            }} disabled={loadingWs} className={SELECT_CLASS}>
              <option value="">{loadingWs ? 'Loading workspaces…' : 'Select workspace'}</option>
              {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {selWorkspaceId && (
            <div>
              <label className={LABEL_CLASS}>Space</label>
              <select value={selSpaceId} onChange={e => {
                const s = spaces.find(x => x.id === e.target.value);
                setSelSpaceId(s?.id ?? ''); setSelSpaceName(s?.name ?? '');
                setSelListId(''); setSelListName(''); setSelAssigneeId(''); setSelAssigneeName('');
              }} disabled={loadingSp} className={SELECT_CLASS}>
                <option value="">{loadingSp ? 'Loading spaces…' : 'Select space'}</option>
                {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {selSpaceId && (
            <div>
              <label className={LABEL_CLASS}>List</label>
              <select value={selListId} onChange={e => {
                const l = lists.find(x => x.id === e.target.value);
                setSelListId(l?.id ?? ''); setSelListName(l?.name ?? '');
                setSelAssigneeId(''); setSelAssigneeName('');
              }} disabled={loadingLi} className={SELECT_CLASS}>
                <option value="">{loadingLi ? 'Loading lists…' : 'Select list'}</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.folder ? `${l.folder} / ${l.name}` : l.name}</option>)}
              </select>
            </div>
          )}

          {selListId && (
            <div>
              <label className={LABEL_CLASS}>Assignee <span className="normal-case font-normal text-gray-400">(optional)</span></label>
              <select value={selAssigneeId} onChange={e => {
                const m = members.find(x => x.id === e.target.value);
                setSelAssigneeId(m?.id ?? ''); setSelAssigneeName(m?.name ?? '');
              }} disabled={loadingMe} className={SELECT_CLASS}>
                <option value="">{loadingMe ? 'Loading members…' : 'Unassigned'}</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
        </ConfigModal>
      )}
    </>
  );
}

/* ─── Webhook Config (manual — no OAuth) ────────────────────────────────────── */

interface WebhookConfigProps {
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}
function WebhookConfig({ config, onChange, onSave, saving, saved }: WebhookConfigProps) {
  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
        When feedback is submitted, we&apos;ll send a <strong>POST</strong> request with the feedback JSON to your URL.
        Set a secret to verify requests via the <code className="bg-blue-100 px-1 rounded">X-ScaleFeedback-Secret</code> header.
      </div>
      <div>
        <label className={LABEL_CLASS}>Endpoint URL</label>
        <input type="url" value={config.url ?? ''} onChange={e => onChange('url', e.target.value)}
          placeholder="https://your-app.com/webhook" className={INPUT_CLASS} />
      </div>
      <div>
        <label className={LABEL_CLASS}>Secret <span className="normal-case font-normal text-gray-400">(optional)</span></label>
        <input type="text" value={config.secret ?? ''} onChange={e => onChange('secret', e.target.value)}
          placeholder="my-secret-key" className={INPUT_CLASS} />
      </div>
      <button onClick={onSave} disabled={!config.url || saving}
        className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-60 ${saved ? 'bg-green-50 text-green-700' : 'bg-[#ff724f] hover:bg-[#e8603a] text-white shadow-sm'}`}>
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

/* ─── Main Panel ─────────────────────────────────────────────────────────────── */

export function IntegrationsPanel({ projectId }: { projectId: string }) {
  const [integrations, setIntegrations] = useState<Record<IntegrationType, Integration>>({ ...DEFAULTS });
  const [saving, setSaving] = useState<IntegrationType | null>(null);
  const [saved, setSaved] = useState<IntegrationType | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch(`/api/integrations/${projectId}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (!data?.length) return;
        const map = { ...DEFAULTS };
        for (const row of data) {
          map[row.type as IntegrationType] = { type: row.type, enabled: row.enabled, config: row.config ?? {} };
        }
        setIntegrations(map);
      })
      .catch(() => {});
  }, [projectId]);

  // Auto-expand integrations that just connected via OAuth
  useEffect(() => {
    const providers: IntegrationType[] = ['slack', 'github', 'jira', 'clickup'];
    for (const p of providers) {
      if (searchParams.get(p) === 'connected') {
        setIntegrations(prev => ({ ...prev, [p]: { ...prev[p], enabled: true } }));
      }
    }
  }, [searchParams]);

  function toggleEnabled(type: IntegrationType) {
    setIntegrations(prev => ({ ...prev, [type]: { ...prev[type], enabled: !prev[type].enabled } }));
  }

  function updateConfig(type: IntegrationType, key: string, value: string) {
    setIntegrations(prev => ({
      ...prev,
      [type]: { ...prev[type], config: { ...prev[type].config, [key]: value } },
    }));
  }

  // Save with a specific config object (used by OAuth integrations)
  async function saveWithConfig(type: IntegrationType, configUpdates: Record<string, string>) {
    setSaving(type);
    const updated: Integration = { ...integrations[type], enabled: true, config: configUpdates };
    try {
      if (type === 'clickup') {
        // ClickUp goes through /setup which also registers/updates the webhook
        const res = await fetch(`/api/clickup/${projectId}/setup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configUpdates),
        });
        if (res.ok) {
          const { data } = await res.json();
          // Use the config returned by setup (it includes webhookId)
          updated.config = data?.config ?? configUpdates;
        }
      } else {
        await fetch(`/api/integrations/${projectId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
      }
      setIntegrations(prev => ({ ...prev, [type]: updated }));
      setSaved(type);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  // Save current state (used by webhook)
  async function saveManual(type: IntegrationType) {
    setSaving(type);
    try {
      await fetch(`/api/integrations/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(integrations[type]),
      });
      setSaved(type);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-3">
      {(Object.keys(INTEGRATION_META) as IntegrationType[]).map((type) => {
        const meta = INTEGRATION_META[type];
        const integration = integrations[type];

        return (
          <div key={type} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-card">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                {meta.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#300a46] text-sm font-heading">{meta.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{meta.description}</div>
              </div>
              <button
                onClick={() => toggleEnabled(type)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 ${integration.enabled ? 'bg-[#ff724f]' : 'bg-gray-200'}`}
                aria-label={`Toggle ${meta.label}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${integration.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {integration.enabled && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                {type === 'slack' && (
                  <SlackConfig projectId={projectId} config={integration.config} saved={saved === 'slack'} />
                )}
                {type === 'github' && (
                  <GitHubConfig
                    projectId={projectId} config={integration.config}
                    onSave={c => saveWithConfig('github', c)}
                    saving={saving === 'github'} saved={saved === 'github'}
                    autoOpen={searchParams.get('github') === 'connected'}
                  />
                )}
                {type === 'jira' && (
                  <JiraConfig
                    projectId={projectId} config={integration.config}
                    onSave={c => saveWithConfig('jira', c)}
                    saving={saving === 'jira'} saved={saved === 'jira'}
                    autoOpen={searchParams.get('jira') === 'connected'}
                  />
                )}
                {type === 'clickup' && (
                  <ClickUpConfig
                    projectId={projectId} config={integration.config}
                    onSave={c => saveWithConfig('clickup', c)}
                    saving={saving === 'clickup'} saved={saved === 'clickup'}
                    autoOpen={searchParams.get('clickup') === 'connected'}
                  />
                )}
                {type === 'webhook' && (
                  <WebhookConfig
                    config={integration.config}
                    onChange={(k, v) => updateConfig('webhook', k, v)}
                    onSave={() => saveManual('webhook')}
                    saving={saving === 'webhook'} saved={saved === 'webhook'}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
