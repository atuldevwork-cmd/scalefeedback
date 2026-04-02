import { sendSlackNotification } from './slack';
import { createGithubIssue } from './github';
import { createJiraIssue } from './jira';
import { fireWebhook } from './webhook';
import { createClickUpTask } from './clickup';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface FeedbackIntegrationData {
  feedbackId: string;
  projectId: string;
  projectName: string;
  feedbackTitle: string;
  feedbackType: string;
  description?: string;
  reporterName?: string;
  pageUrl: string;
  status: string;
  dashboardUrl: string;
  screenshotUrl?: string;
}

export interface Integration {
  id: string;
  type: 'slack' | 'github' | 'jira' | 'clickup' | 'webhook';
  enabled: boolean;
  config: Record<string, string>;
}

export async function fireIntegrations(
  integrations: Integration[],
  data: FeedbackIntegrationData,
  // Service client passed in so ClickUp can write external_id back to feedback
  supabase?: SupabaseClient
): Promise<void> {
  const enabled = integrations.filter((i) => i.enabled);
  await Promise.allSettled(
    enabled.map((integration) => fireOne(integration, data, supabase))
  );
}

async function fireOne(
  integration: Integration,
  data: FeedbackIntegrationData,
  supabase?: SupabaseClient
): Promise<void> {
  try {
    switch (integration.type) {
      case 'slack':
        await sendSlackNotification({
          webhookUrl: integration.config.webhookUrl,
          projectName: data.projectName,
          feedbackTitle: data.feedbackTitle,
          feedbackType: data.feedbackType,
          reporterName: data.reporterName,
          pageUrl: data.pageUrl,
          dashboardUrl: data.dashboardUrl,
          status: data.status,
        });
        break;

      case 'github':
        await createGithubIssue({
          accessToken: integration.config.accessToken,
          owner: integration.config.owner,
          repo: integration.config.repo,
          projectName: data.projectName,
          feedbackTitle: data.feedbackTitle,
          feedbackType: data.feedbackType,
          description: data.description,
          reporterName: data.reporterName,
          pageUrl: data.pageUrl,
          dashboardUrl: data.dashboardUrl,
        });
        break;

      case 'jira':
        await createJiraIssue({
          accessToken: integration.config.accessToken,
          cloudId: integration.config.cloudId,
          projectKey: integration.config.projectKey,
          feedbackTitle: data.feedbackTitle,
          feedbackType: data.feedbackType,
          description: data.description,
          reporterName: data.reporterName,
          pageUrl: data.pageUrl,
          dashboardUrl: data.dashboardUrl,
        });
        break;

      case 'clickup': {
        const result = await createClickUpTask({
          accessToken: integration.config.accessToken,
          listId: integration.config.listId,
          assigneeId: integration.config.assigneeId,
          feedbackTitle: data.feedbackTitle,
          feedbackType: data.feedbackType,
          description: data.description,
          reporterName: data.reporterName,
          pageUrl: data.pageUrl,
          dashboardUrl: data.dashboardUrl,
          screenshotUrl: data.screenshotUrl,
        });
        // Store the ClickUp task ID on the feedback row so the webhook can look it up
        if (result && supabase) {
          await supabase
            .from('feedback')
            .update({ external_id: result.taskId, external_url: result.taskUrl })
            .eq('id', data.feedbackId);
        }
        break;
      }

      case 'webhook':
        await fireWebhook({
          url: integration.config.url,
          secret: integration.config.secret,
          feedbackId: data.feedbackId,
          projectName: data.projectName,
          feedbackTitle: data.feedbackTitle,
          feedbackType: data.feedbackType,
          description: data.description,
          reporterName: data.reporterName,
          pageUrl: data.pageUrl,
          status: data.status,
          dashboardUrl: data.dashboardUrl,
        });
        break;
    }
  } catch (err) {
    console.error(`Integration ${integration.type} failed:`, err);
  }
}
