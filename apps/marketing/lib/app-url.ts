const appHost = process.env.NEXT_PUBLIC_APP_HOST;

export const appUrl = (path: string) => (appHost ? `https://${appHost}${path}` : path);
