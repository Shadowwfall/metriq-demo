import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

/**
 * Runs the idempotent demo-data seeding once per browser session. Each step is
 * guarded on the server, so concurrent callers are safe and re-runs are no-ops.
 */
export function useAppSeed() {
  const status = useQuery(api.seed.seedStatus);
  const seedStep = useMutation(api.seed.seedStep);
  const running = useRef(false);

  useEffect(() => {
    if (!status || status.complete || running.current) return;
    const steps = status.pending;
    if (steps.length === 0) return;

    running.current = true;
    let cancelled = false;
    (async () => {
      try {
        for (const step of steps) {
          if (cancelled) return;
          await seedStep({ step });
        }
      } catch (error) {
        // A failed step stays pending; the next mount retries it.
        console.warn("[METRIQ] demo seed step failed", error);
      } finally {
        running.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, seedStep]);

  return {
    ready: status?.complete ?? false,
    loading: status === undefined || (!status.complete && status.doneCount < 3),
    pendingSteps: status?.pending ?? [],
  };
}
