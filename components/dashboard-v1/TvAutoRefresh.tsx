"use client";

import { useEffect } from "react";

// Client island que garante o refresh a 60s do /tv mesmo se o React não
// fizer hoist do `<meta httpEquiv="refresh">` quando está dentro de um
// Client Provider (I18nProvider). `setInterval` é determinístico e re-roda
// middleware + JWT + queries a cada tick, cumprindo o contrato do modo TV.
export function TvAutoRefresh({ seconds = 60 }: { seconds?: number }) {
  useEffect(() => {
    const id = window.setInterval(() => window.location.reload(), seconds * 1000);
    return () => window.clearInterval(id);
  }, [seconds]);
  return null;
}
