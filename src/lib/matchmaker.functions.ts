import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ApplicationRow = {
  profile_id: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  country_of_residence: string | null;
  city: string | null;
  state_or_region: string | null;
  application_status: string;
  submitted_at: string | null;
};

/** Throws unless the signed-in person holds staff access. */
async function requireStaff(context: { supabase: any }): Promise<void> {
  const { data: staff } = await context.supabase.rpc("is_staff");
  if (!staff) throw new Error("This area is for MotherlandMatch staff.");
}

/** Every submitted application, newest first. */
export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApplicationRow[]> => {
    await requireStaff(context);
    const { data, error } = await context.supabase.rpc("list_applications");
    if (error) throw new Error("We could not load the applications just now.");
    return ((data ?? []) as any[]).map((r) => ({
      profile_id: r.profile_id,
      first_name: r.first_name,
      last_name: r.last_name,
      gender: r.gender,
      date_of_birth: r.date_of_birth,
      country_of_residence: r.country_of_residence,
      city: r.city,
      state_or_region: r.state_or_region,
      application_status: r.application_status,
      submitted_at: r.submitted_at,
    }));
  });

export type ApplicationFile = {
  profile: Record<string, any>;
  facts: Record<string, any> | null;
  preferences: {
    attribute_key: string;
    value: string | null;
    json: any;
    weight: string;
    section: string;
  }[];
  notes: { id: string; body: string; created_at: string }[];
  photos: { id: string; url: string | null; sort_order: number }[];
};

/** Read-only file for one applicant. Never lists anyone else. */
export const getApplicationFile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { profile_id: string }) => ({
    profile_id: String(input?.profile_id ?? ""),
  }))
  .handler(async ({ data, context }): Promise<ApplicationFile> => {
    await requireStaff(context);

    const { loadApplicationFile } = await import("@/lib/application-file.server");
    const file = await loadApplicationFile(context.supabase, { id: data.profile_id });
    if (!file) throw new Error("That application could not be found.");
    return file;
  });

export const DECISIONS = [
  { value: "accepted", label: "Accept" },
  { value: "waitlisted", label: "Waitlist" },
  { value: "declined", label: "Decline" },
] as const;

/**
 * Accepts, waitlists or declines a submitted application. Waitlist and
 * decline need a reason, which the applicant sees. The database re-checks
 * staff access and the reason, and refuses drafts and any other status.
 */
export const setApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { profile_id: string; status: string; reason?: string }) => ({
    profile_id: String(input?.profile_id ?? ""),
    status: String(input?.status ?? ""),
    reason: String(input?.reason ?? "")
      .trim()
      .slice(0, 1000),
  }))
  .handler(async ({ data, context }): Promise<{ outcome: string }> => {
    await requireStaff(context);
    const { data: outcome, error } = await context.supabase.rpc("set_application_status", {
      _profile_id: data.profile_id,
      _status: data.status as never,
      _reason: data.reason,
    });
    if (error) throw new Error("We could not update that status just now.");
    return { outcome: String(outcome) };
  });
