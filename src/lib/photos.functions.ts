import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PHOTO_BUCKET = "member-photos";
export const MAX_PHOTOS = 6;

export type ApplicantPhoto = {
  id: string;
  storage_path: string;
  sort_order: number;
  review_status: string;
  /** Controlled, applicant-facing wording only. The internal reason never leaves staff tools. */
  rejected_reason_public: string | null;
  url: string | null;
};


export type PhotoDesk = {
  profileId: string;
  photos: ApplicantPhoto[];
};

async function ownProfileId(context: { supabase: any; userId: string }): Promise<string> {
  const { data } = await context.supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", context.userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new Error("We could not find your application.");
  return data.id as string;
}

/**
 * Reads this applicant's own photos. Access is never a public object URL: each
 * thumbnail is a short-lived signed link minted for the signed-in owner, so a
 * guessed storage path cannot bypass the bucket's rules.
 */
export const getMyPhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PhotoDesk> => {
    const profileId = await ownProfileId(context);

    const { data: rows, error } = await context.supabase
      .from("photos")
      .select("id, storage_path, sort_order, review_status, rejected_reason_public")
      .eq("profile_id", profileId)
      .order("sort_order");
    if (error) throw new Error("We could not load your photos just now.");

    const photos: ApplicantPhoto[] = [];
    for (const row of rows ?? []) {
      const { data: signed } = await context.supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(row.storage_path, 600);
      photos.push({
        id: row.id,
        storage_path: row.storage_path,
        sort_order: row.sort_order,
        review_status: row.review_status,
        rejected_reason_public: row.rejected_reason_public ?? null,
        url: signed?.signedUrl ?? null,
      });
    }

    return { profileId, photos };
  });

/** Records an uploaded object as a photo, private to matchmakers by default. */
export const registerPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { storage_path: string }) => ({
    storage_path: String(input?.storage_path ?? "").slice(0, 400),
  }))
  .handler(async ({ data, context }) => {
    const profileId = await ownProfileId(context);
    // The object must live under this applicant's own folder.
    if (!data.storage_path.startsWith(`${profileId}/`)) {
      throw new Error("That upload could not be accepted.");
    }

    const { data: existing } = await context.supabase
      .from("photos")
      .select("id, sort_order")
      .eq("profile_id", profileId)
      .order("sort_order");

    if ((existing?.length ?? 0) >= MAX_PHOTOS) {
      await context.supabase.storage.from(PHOTO_BUCKET).remove([data.storage_path]);
      throw new Error(`You can keep up to ${MAX_PHOTOS} photos.`);
    }

    const nextOrder = (existing?.[existing.length - 1]?.sort_order ?? -1) + 1;

    const { error } = await context.supabase.from("photos").insert({
      profile_id: profileId,
      storage_path: data.storage_path,
      sort_order: nextOrder,
      review_status: "pending_review",
    } as never);
    if (error) {
      console.error("[photos] register failed", error.message);
      throw new Error("We could not save that photo. Please try again.");
    }

    await context.supabase.rpc("recompute_profile_sections", { _profile_id: profileId });
    return { ok: true };
  });

/** Removes both the stored object and its metadata. */
export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const profileId = await ownProfileId(context);

    const { data: row } = await context.supabase
      .from("photos")
      .select("id, storage_path")
      .eq("id", data.id)
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!row) return { ok: true };

    await context.supabase.storage.from(PHOTO_BUCKET).remove([row.storage_path]);
    const { error } = await context.supabase.from("photos").delete().eq("id", row.id);
    if (error) throw new Error("We could not remove that photo. Please try again.");

    // Keep the remaining order contiguous.
    const { data: rest } = await context.supabase
      .from("photos")
      .select("id")
      .eq("profile_id", profileId)
      .order("sort_order");
    let index = 0;
    for (const remaining of rest ?? []) {
      await context.supabase.from("photos").update({ sort_order: index }).eq("id", remaining.id);
      index += 1;
    }

    await context.supabase.rpc("recompute_profile_sections", { _profile_id: profileId });
    return { ok: true };
  });

/** Persists a new photo order. */
export const reorderPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => ({
    ids: Array.isArray(input?.ids) ? input.ids.map((v) => String(v)).slice(0, MAX_PHOTOS) : [],
  }))
  .handler(async ({ data, context }) => {
    const profileId = await ownProfileId(context);
    let index = 0;
    for (const id of data.ids) {
      await context.supabase
        .from("photos")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("profile_id", profileId);
      index += 1;
    }
    return { ok: true };
  });

/** Marks Photos as the section the applicant is on. */
export const markPhotosSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profileId = await ownProfileId(context);
    await context.supabase
      .from("profiles")
      .update({ current_section: "photos" })
      .eq("id", profileId);
    return { ok: true };
  });
