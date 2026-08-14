import { notFound } from 'next/navigation';
import { CMS_INTEGRATIONS } from '../cms-integrations';
import { IntegrationArticle } from './integration-article';

export default function PlatformIntegrationDocs({ params }: { params: { platform: string } }) {
  const integration = CMS_INTEGRATIONS[params.platform];
  if (!integration) notFound();

  return <IntegrationArticle integration={integration} />;
}
