import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite aceder ao dev server pelo IP/host externo (servidor remoto).
  allowedDevOrigins: ["91.99.211.238"],
};

export default nextConfig;
