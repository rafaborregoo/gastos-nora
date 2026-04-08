function getAllowedOrigins() {
  const origins = new Set(["localhost:3000", "127.0.0.1:3000"]);
  const appUrl = process.env.APP_URL;

  if (appUrl) {
    try {
      origins.add(new URL(appUrl).host);
    } catch {
      // Ignore invalid APP_URL values and keep safe defaults.
    }
  }

  return Array.from(origins);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: getAllowedOrigins()
    }
  }
};

export default nextConfig;
