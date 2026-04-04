"use client";

import { useState } from "react";
import { OkrTree } from "./okr-tree";
import { RoadmapView } from "./roadmap-view";
import { ObjectivesMap } from "./objectives-map";
import type { OkrObjectiveData, RoadmapItem } from "@/lib/types";

interface Props {
  objectives: OkrObjectiveData[];
  roadmapItems: RoadmapItem[];
  projects: { id: string; name: string; slug: string; color: string }[];
}

export function OkrTabs({ objectives, roadmapItems, projects }: Props) {
  const [tab, setTab] = useState<"okr" | "roadmap" | "mapa">("okr");

  return (
    <>
      <div className="cc-tabs" style={{ marginBottom: 20 }}>
        <button className={`cc-tab ${tab === "okr" ? "active" : ""}`} onClick={() => setTab("okr")}>
          OKRs
        </button>
        <button className={`cc-tab ${tab === "roadmap" ? "active" : ""}`} onClick={() => setTab("roadmap")}>
          Roadmap
        </button>
        <button className={`cc-tab ${tab === "mapa" ? "active" : ""}`} onClick={() => setTab("mapa")}>
          Mapa
        </button>
      </div>

      {tab === "okr" && <OkrTree objectives={objectives} projects={projects} />}
      {tab === "roadmap" && <RoadmapView items={roadmapItems} />}
      {tab === "mapa" && <ObjectivesMap objectives={objectives} />}
    </>
  );
}
