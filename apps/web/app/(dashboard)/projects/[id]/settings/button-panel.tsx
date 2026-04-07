'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Project } from '@scalefeedback/shared';

const PLACEMENTS = [
  { value: 'middle-right', label: 'Middle right' },
  { value: 'middle-left', label: 'Middle left' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'top-left', label: 'Top left' },
];

interface Props {
  project: Project;
}

export function ButtonPanel({ project }: Props) {
  const cfg = project.widget_config ?? {};
  const [color, setColor] = useState<string>((cfg as Record<string, string>).color ?? '#ff724f');
  const [buttonText, setButtonText] = useState<string>((cfg as Record<string, string>).buttonText ?? 'Report issue');
  const [placement, setPlacement] = useState<string>((cfg as Record<string, string>).buttonPlacement ?? (cfg as Record<string, string>).position ?? 'middle-right');
  const [audience, setAudience] = useState<string>((cfg as Record<string, string>).audience ?? 'everyone');
  const [pages, setPages] = useState<string>((cfg as Record<string, string>).pages ?? 'all');
  const [secretParamType, setSecretParamType] = useState<string>((cfg as Record<string, string>).secretParamType ?? 'default');
  const [secretParam, setSecretParam] = useState<string>((cfg as Record<string, string>).secretParam ?? '');
  const [appearanceLoading, setAppearanceLoading] = useState(false);
  const [appearanceSaved, setAppearanceSaved] = useState(false);
  const [targetingLoading, setTargetingLoading] = useState(false);
  const [targetingSaved, setTargetingSaved] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setAppearanceLoading(true);

    const updatedConfig = {
      ...(cfg as object),
      color,
      buttonText,
      buttonPlacement: placement,
      position: placement,
      audience,
      pages,
      secretParamType,
      secretParam,
    };

    await supabase
      .from('projects')
      .update({ widget_config: updatedConfig })
      .eq('id', project.id);

    setAppearanceLoading(false);
    setAppearanceSaved(true);
    setTimeout(() => setAppearanceSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Button Appearance */}
      <div>
        <div className="grid grid-cols-[200px_1fr] gap-8">
          <div>
            <p className="text-sm font-medium text-foreground">Button appearance</p>
          </div>
          <form onSubmit={handleSave} className="space-y-5">
            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Button and widget color
              </label>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    style={{ backgroundColor: color }}
                  />
                </div>
                <input
                  type="text"
                  value={color.toUpperCase()}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColor(v);
                  }}
                  className="w-28 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50"
                />
              </div>
            </div>

            {/* Button Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
              <input
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Report issue"
                className="w-full max-w-sm border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50"
              />
            </div>

            {/* Placement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placement</label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                className="w-48 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50"
              >
                {PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={appearanceLoading}
              className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {appearanceSaved ? 'Saved!' : appearanceLoading ? 'Saving…' : 'Save'}
            </button>
          </form>
        </div>
      </div>

      <hr className="border-border" />

      {/* Button Targeting */}
      <div className="grid grid-cols-[200px_1fr] gap-8">
        <div>
          <p className="text-sm font-medium text-foreground">Button targeting</p>
        </div>
        <div className="space-y-6">
          {/* Audience */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Audience</p>
            <p className="text-xs text-muted-foreground mb-3">Choose who can view the button</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  value="everyone"
                  checked={audience === 'everyone'}
                  onChange={() => setAudience('everyone')}
                  className="accent-[#ff724f]"
                />
                <span className="text-sm">Everyone</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  value="members_only"
                  checked={audience === 'members_only'}
                  onChange={() => setAudience('members_only')}
                  className="accent-[#ff724f]"
                />
                <span className="text-sm">Only logged in members and guests</span>
              </label>
            </div>
          </div>

          {/* Pages */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Pages</p>
            <p className="text-xs text-muted-foreground mb-3">Choose where the button is displayed</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="pages"
                  value="all"
                  checked={pages === 'all'}
                  onChange={() => setPages('all')}
                  className="accent-[#ff724f]"
                />
                <span className="text-sm">On all pages where the widget snippet is installed</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="pages"
                  value="secret_param"
                  checked={pages === 'secret_param'}
                  onChange={() => setPages('secret_param')}
                  className="accent-[#ff724f]"
                />
                <span className="text-sm">When secret URL parameter is added</span>
              </label>

              {/* Sub-options for secret_param */}
              {pages === 'secret_param' && (
                <div className="ml-7 mt-1 mb-1 border border-border rounded-xl overflow-hidden">
                  {/* URL preview */}
                  <div className="bg-muted/40 px-4 py-3 border-b border-border">
                    <p className="text-xs text-muted-foreground mb-1">Preview URL</p>
                    <code className="text-sm font-mono text-foreground">
                      https://yoursite.com/?{secretParamType === 'custom' && secretParam ? secretParam : 'bug'}
                    </code>
                  </div>

                  {/* Default option */}
                  <label className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border">
                    <input
                      type="radio"
                      name="secretParamType"
                      value="default"
                      checked={secretParamType === 'default'}
                      onChange={() => setSecretParamType('default')}
                      className="accent-[#ff724f] mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">Default</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Use <code className="bg-muted px-1 rounded">?bug</code> or <code className="bg-muted px-1 rounded">?feedback</code>.</p>
                    </div>
                  </label>

                  {/* Custom option */}
                  <label className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <input
                      type="radio"
                      name="secretParamType"
                      value="custom"
                      checked={secretParamType === 'custom'}
                      onChange={() => setSecretParamType('custom')}
                      className="accent-[#ff724f] mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground">Custom URL parameter</p>
                        <span className="text-amber-500 text-xs">⚡</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        For extra security and better onboarding. All other triggers are disabled.
                      </p>
                      {secretParamType === 'custom' && (
                        <input
                          type="text"
                          value={secretParam}
                          onChange={(e) => setSecretParam(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                          placeholder="e.g. internal"
                          className="mt-2 w-full max-w-xs border border-border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#ff724f]/50 bg-background"
                        />
                      )}
                    </div>
                  </label>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="pages"
                  value="hidden"
                  checked={pages === 'hidden'}
                  onChange={() => setPages('hidden')}
                  className="accent-[#ff724f]"
                />
                <span className="text-sm">Do not display the button</span>
              </label>
            </div>
          </div>

          <button
            onClick={async () => {
              setTargetingLoading(true);
              const updatedConfig = {
                ...(cfg as object),
                color,
                buttonText,
                buttonPlacement: placement,
                position: placement,
                audience,
                pages,
                secretParamType,
                secretParam,
              };
              await supabase.from('projects').update({ widget_config: updatedConfig }).eq('id', project.id);
              setTargetingLoading(false);
              setTargetingSaved(true);
              setTimeout(() => setTargetingSaved(false), 2000);
              router.refresh();
            }}
            disabled={targetingLoading}
            className="bg-[#ff724f] hover:bg-[#e8603a] text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {targetingSaved ? 'Saved!' : targetingLoading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
