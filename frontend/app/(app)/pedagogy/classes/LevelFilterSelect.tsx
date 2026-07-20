"use client";

import React from "react";
import { Search } from "lucide-react";

interface Level {
  id: string;
  name: string;
}

interface LevelFilterSelectProps {
  levels: Level[];
  defaultValue: string;
}

export default function LevelFilterSelect({ levels, defaultValue }: LevelFilterSelectProps) {
  return (
    <div className="relative flex-1 max-w-xs">
      <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
      <select
        name="level_id"
        defaultValue={defaultValue}
        onChange={(e) => e.target.form?.requestSubmit()}
        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
      >
        <option value="">Tous les niveaux</option>
        {levels.map((lv) => (
          <option key={lv.id} value={lv.id}>
            {lv.name}
          </option>
        ))}
      </select>
    </div>
  );
}
