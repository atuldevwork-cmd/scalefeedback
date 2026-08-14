const marketingHost = process.env.NEXT_PUBLIC_MARKETING_HOST;

export const marketingUrl = (path: string) => {
  if (!marketingHost) return path;
  const protocol = marketingHost.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${marketingHost}${path}`;
};
