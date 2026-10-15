import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  MAX_PHOTOS,
  PHOTO_BUCKET,
  deletePhoto,
  getMyPhotos,
  markPhotosSection,
  registerPhoto,
  reorderPhotos,
  type ApplicantPhoto,
} from "@/lib/photos.functions";
import {
  ApplyMasthead,
  ApplyProgress,
  ErrorSummary,
  Panel,
  primaryButtonClass,
  quietButtonClass,
} from "@/components/apply/ApplyChrome";
import { revealField } from "@/components/apply/field";
import { useApplySession } from "@/lib/use-apply-session";

export const Route = createFileRoute("/apply/photos")({
  head: () => ({
    meta: [
      { title: "Apply — Photos | MotherlandMatch" },
      {
        name: "description",
        content:
          "Add a clear recent photo for your matchmaker. Your photos stay private to MotherlandMatch.",
      },
      { property: "og:title", content: "Apply — Photos | MotherlandMatch" },
      {
        property: "og:description",
        content:
          "Add a clear recent photo for your matchmaker. Your photos stay private to MotherlandMatch.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PhotosStage,
  errorComponent: StageProblem,
  notFoundComponent: StageProblem,
});

function StageProblem() {
  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />
      <div className="mx-auto max-w-[760px] px-6 py-20">
        <Panel>
          <h1 className="font-display text-[36px] leading-tight font-semibold text-charcoal">
            This step didn&rsquo;t load
          </h1>
          <p className="mt-4 text-[17px] text-charcoal">
            Please refresh the page. Anything you had already saved is kept.
          </p>
        </Panel>
      </div>
    </main>
  );
}

const REVIEW_LABEL: Record<string, string> = {
  uploaded: "Waiting for review",
  pending_review: "Waiting for review",
  approved: "Reviewed",
  rejected: "Not accepted — please replace this one",
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic";
const MAX_BYTES = 15 * 1024 * 1024;

function PhotosStage() {
  useApplySession();
  const navigate = useNavigate();
  const router = useRouter();
  const load = useServerFn(getMyPhotos);
  const register = useServerFn(registerPhoto);
  const remove = useServerFn(deletePhoto);
  const reorder = useServerFn(reorderPhotos);
  const markSection = useServerFn(markPhotosSection);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ApplicantPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [needsPhoto, setNeedsPhoto] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const addInput = useRef<HTMLInputElement>(null);
  const replaceFor = useRef<string | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const desk = await load();
    setProfileId(desk.profileId);
    setPhotos(desk.photos);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
        if (!cancelled) void markSection({});
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("We could not load your photos just now.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, markSection]);

  const upload = async (file: File) => {
    if (!profileId) return;
    if (file.size > MAX_BYTES) {
      setError("That photo is larger than 15MB. Please choose a smaller one.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage("Uploading…");
    try {
      const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
      const path = `${profileId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      await register({ data: { storage_path: path } });
      await refresh();
      setMessage("Saved");
    } catch (err) {
      console.error(err);
      setMessage(null);
      setError("We could not add that photo. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    setBusy(true);
    setError(null);
    setMessage("Removing…");
    try {
      await remove({ data: { id } });
      await refresh();
      setMessage("Saved");
    } catch (err) {
      console.error(err);
      setMessage(null);
      setError("We could not remove that photo. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    const moved = next[index]!;
    next[index] = next[target]!;
    next[target] = moved;
    setPhotos(next);
    setMessage("Saving…");
    try {
      await reorder({ data: { ids: next.map((p) => p.id) } });
      setMessage("Saved");
    } catch (err) {
      console.error(err);
      setError("We could not save that order. Please try again.");
    }
  };

  const onContinue = async () => {
    if (photos.length === 0) {
      setNeedsPhoto(true);
      revealField(["photos"]);
      return;
    }
    await navigate({ to: "/apply/consent" });
  };

  const goBack = async () => {
    await navigate({ to: "/apply/match" });
    router.invalidate();
  };

  const percent = Math.min(photos.length, 1) * 100;
  const canAdd = photos.length < MAX_PHOTOS && !busy;
  const photoMissing = needsPhoto && photos.length === 0;

  return (
    <main className="min-h-screen bg-ivory">
      <ApplyMasthead />

      <div className="mx-auto max-w-[860px] px-6 pt-12 pb-24 sm:pt-16">
        <p className="text-[13px] font-medium tracking-[0.18em] text-taupe uppercase">
          Your application
        </p>
        <div className="mt-5">
          <ApplyProgress current="photos" percent={percent} />
        </div>

        <div className="mt-10">
          <Panel>
            <h1 className="font-display text-[40px] leading-[1.05] font-semibold text-charcoal sm:text-[46px]">
              Photos for your matchmaker.
            </h1>
            <p className="mt-5 max-w-[48ch] text-[19px] leading-[1.6] text-charcoal">
              Add at least one clear photo. You can add up to six.
            </p>

            <div data-field="photos" className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo, index) => (
                <figure
                  key={photo.id}
                  className="overflow-hidden rounded-[16px] border border-sand-deep bg-card"
                >
                  <div className="aspect-[4/5] w-full bg-sand">
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={`Your photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[15px] text-taupe">
                        Preview unavailable
                      </div>
                    )}
                  </div>
                  <figcaption className="px-4 py-4">
                    <p className="text-[15px] font-medium text-charcoal">
                      {index === 0 ? "First photo" : `Photo ${index + 1}`}
                    </p>
                    <p className="mt-1 text-[14px] text-taupe">
                      {REVIEW_LABEL[photo.review_status] ?? "Waiting for review"}
                    </p>
                    {photo.review_status === "rejected" ? (
                      <p className="mt-1 text-[15px] text-charcoal">
                        {photo.rejected_reason_public ??
                          "This photo could not be used. Please upload a clear, recent photo."}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          replaceFor.current = photo.id;
                          replaceInput.current?.click();
                        }}
                        className="font-medium text-burgundy underline underline-offset-4 disabled:text-taupe"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onDelete(photo.id)}
                        className="font-medium text-burgundy underline underline-offset-4 disabled:text-taupe"
                      >
                        Remove
                      </button>
                      <span className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Move photo ${index + 1} earlier`}
                          disabled={busy || index === 0}
                          onClick={() => void move(index, -1)}
                          className="h-10 w-10 rounded-full border border-sand-deep text-[17px] text-charcoal disabled:text-taupe"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move photo ${index + 1} later`}
                          disabled={busy || index === photos.length - 1}
                          onClick={() => void move(index, 1)}
                          className="h-10 w-10 rounded-full border border-sand-deep text-[17px] text-charcoal disabled:text-taupe"
                        >
                          ↓
                        </button>
                      </span>
                    </div>
                  </figcaption>
                </figure>
              ))}

              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={() => addInput.current?.click()}
                  className={`flex aspect-[4/5] w-full flex-col items-center justify-center rounded-[16px] border border-dashed ${photoMissing ? "border-wine-red" : "border-sand-deep"} bg-sand/40 px-6 text-center transition-colors hover:bg-sand disabled:cursor-not-allowed`}
                >
                  <span className="font-display text-[26px] font-semibold text-charcoal">
                    Add a photo
                  </span>
                  <span className="mt-2 text-[15px] text-taupe">
                    {photos.length} of {MAX_PHOTOS} added
                  </span>
                </button>
              )}
            </div>

            <input
              ref={addInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
            <input
              ref={replaceInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                const id = replaceFor.current;
                replaceFor.current = null;
                if (file && id) {
                  void (async () => {
                    await onDelete(id);
                    await upload(file);
                  })();
                }
              }}
            />

            <p className="mt-8 max-w-[62ch] text-[15px] leading-[1.6] text-taupe">
              Clear recent photos help your matchmaker. Photo visibility is controlled by
              MotherlandMatch&rsquo;s introduction rules.
            </p>

            <ErrorSummary items={photoMissing ? [{ id: "photos", label: "Add at least one photo" }] : []} />

            {error && <p className="mt-6 text-[15px] font-medium text-wine-red">{error}</p>}

            <div className="mt-10 flex flex-col gap-4 border-t border-sand-deep/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[15px] text-taupe">
                Your progress is saved automatically.
                {message && <span className="ml-2 text-charcoal">{message}</span>}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={!loaded || busy}
                  onClick={() => void onContinue()}
                >
                  Continue
                </button>
                <button type="button" className={quietButtonClass} onClick={() => void goBack()}>
                  Back
                </button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
