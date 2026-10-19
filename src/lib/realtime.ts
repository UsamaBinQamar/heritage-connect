import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";

export type Watch = { table: string; filter?: string };

/**
 * Calls `onChange` whenever a watched row changes, so a page shows staff
 * decisions and applicant edits without a refresh. Bursts (one save touches
 * several rows) are collapsed into a single call. Supabase Realtime applies
 * the subscriber's row-level security, so nobody hears about rows they
 * cannot read. Tables must be in the supabase_realtime publication
 * (migration 20261019150000).
 */
export function useLiveRefresh(watches: Watch[] | null, onChange: () => void) {
  const latest = useRef(onChange);
  latest.current = onChange;
  const key = watches ? JSON.stringify(watches) : null;

  useEffect(() => {
    if (!key) return;
    const list = JSON.parse(key) as Watch[];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      clearTimeout(timer);
      timer = setTimeout(() => latest.current(), 300);
    };

    const channel = supabase.channel(`live:${key}:${Math.random().toString(36).slice(2)}`);
    for (const w of list) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: w.table, ...(w.filter ? { filter: w.filter } : {}) },
        fire,
      );
    }
    channel.subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [key]);
}
