const marketingHost = process.env.NEXT_PUBLIC_MARKETING_HOST;

export const marketingUrl = (path: string) => (marketingHost ? `https://${marketingHost}${path}` : path);
