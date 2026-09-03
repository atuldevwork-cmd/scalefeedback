'use client';

import type { FeedbackType } from '@pinmarks/shared';
import type { FieldKey } from './issue-fields-editor';

interface Props {
  selectedType: { key: FeedbackType; label: string; icon: string };
  fields: FieldKey[];
}

// Self-contained, static visual mockup of the widget's own share-feedback
// form (see renderFormStep()/renderDesktopSplitPanel() in
// packages/widget/src/core/widget.ts) — it does not hit /api/feedback or any
// live endpoint, same as marker.io's own preview pane doesn't actually
// submit anything either. It re-renders instantly from the `fields` prop
// whenever a toggle changes in IssueFieldsEditor, since that state lives one
// level up in IssueTypesPanel and both columns are siblings re-rendered
// together on every state update — no extra plumbing needed here.
export function WidgetFieldsPreview({ selectedType, fields }: Props) {
  const showTitle = fields.includes('title');
  const showPriority = fields.includes('priority');
  const showAssignee = fields.includes('assignee');
  const showDueDate = fields.includes('dueDate');

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</span>
      </div>

      <div className="p-3.5">
        <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Branded header, matching the widget's own modal header + FAB branding */}
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-gray-100">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-[#ff724f] flex items-center justify-center font-bold text-white text-[10px] shrink-0">P</div>
              <span className="text-sm font-semibold text-gray-800 truncate">Share Feedback</span>
            </div>
            <span className="text-gray-300 text-base leading-none">×</span>
          </div>

          <div className="p-3.5 space-y-3">
            {/* Issue type — always on, non-editable pill showing the selected type */}
            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-1">Type</p>
              <span className="inline-flex items-center gap-1.5 bg-[#fff3f0] text-[#ff724f] text-xs font-semibold px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[14px] leading-none">{selectedType.icon}</span>{selectedType.label}
              </span>
            </div>

            {/* Title — real field, wired end-to-end */}
            {showTitle && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1">Title *</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-400">
                  Brief summary…
                </div>
              </div>
            )}

            {/* Description — always on, "Improve writing" shown as a static
                element since it's an org-level AI Settings toggle unrelated
                to per-field visibility (see aiRewrite in widget.ts). */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-gray-500">Explain your feedback *</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#ff724f]">
                  ✨ Improve writing
                </span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-400 h-14">
                What happened? What did you expect?
              </div>
            </div>

            {/* Priority — real field, wired end-to-end */}
            {showPriority && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1">Priority</p>
                <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 flex items-center justify-between">
                  Medium
                  <span className="text-gray-400">▾</span>
                </div>
              </div>
            )}

            {/* Assignee / Due date — real fields, wired end-to-end (see
                issue-fields-editor.tsx). Assignee's actual options come from
                the project's org members at render time in the live widget;
                this preview shows a static placeholder instead. */}
            {showAssignee && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1">Assignee</p>
                <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-400 flex items-center justify-between">
                  Unassigned
                  <span className="text-gray-400">▾</span>
                </div>
              </div>
            )}
            {showDueDate && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1">Due date</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-400">
                  Select date…
                </div>
              </div>
            )}

            <button
              type="button"
              disabled
              className="w-full bg-[#ff724f] text-white text-xs font-semibold py-2 rounded-lg opacity-90 cursor-default"
            >
              Send Feedback
            </button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Preview only — this mockup doesn&apos;t submit anything.
        </p>
      </div>
    </div>
  );
}
