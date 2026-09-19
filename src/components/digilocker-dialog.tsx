import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ExternalLink,
  Fingerprint,
  Info,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

type Stage = "consent" | "authenticating" | "authorised" | "done";

/**
 * Simulated DigiLocker hand-off.
 *
 * No DigiLocker API is called. The three-step flow reproduces the shape a real
 * integration would take (consent → OAuth authorisation → document push) so the
 * backend contract can be swapped for the live API later.
 */
export function DigiLockerDialog({
  open,
  onOpenChange,
  certificateNumber,
  holderName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateNumber: string;
  holderName: string;
}) {
  const [stage, setStage] = useState<Stage>("consent");
  const [aadhaar, setAadhaar] = useState("");

  useEffect(() => {
    if (!open) {
      setStage("consent");
      setAadhaar("");
    }
  }, [open]);

  const runFlow = () => {
    setStage("authenticating");
    window.setTimeout(() => setStage("authorised"), 1100);
    window.setTimeout(() => setStage("done"), 2200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" aria-hidden="true" />
            Save to DigiLocker
          </DialogTitle>
          <DialogDescription>
            Push {certificateNumber} into the holder&apos;s DigiLocker issued-documents
            folder.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-[color-mix(in_oklab,var(--caution)_38%,transparent)] bg-[color-mix(in_oklab,var(--caution)_8%,transparent)] p-3">
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <Info
              className="mt-0.5 size-3.5 shrink-0 text-[color-mix(in_oklab,var(--caution)_70%,black)]"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold text-foreground">
                Prototype integration.
              </strong>{" "}
              No DigiLocker API is contacted. The steps below simulate the authorisation
              handshake so the real API can be substituted later.
            </span>
          </p>
        </div>

        <ol className="space-y-3">
          <StageRow index={1} label="Consent" active={stage === "consent"} done={stage !== "consent"} />
          <StageRow
            index={2}
            label="Authorisation"
            active={stage === "authenticating"}
            done={stage === "authorised" || stage === "done"}
          />
          <StageRow
            index={3}
            label="Document push"
            active={stage === "authorised"}
            done={stage === "done"}
          />
        </ol>

        {stage === "consent" ? (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Holder {holderName ? `(${holderName})` : ""}
              </span>
              <Input
                className="mt-1.5"
                value={aadhaar}
                onChange={(event) => setAadhaar(event.target.value)}
                placeholder="Aadhaar-linked mobile number (simulated)"
                inputMode="numeric"
              />
            </label>
            <Button className="w-full gap-2" onClick={runFlow}>
              <Fingerprint className="size-4" aria-hidden="true" />
              Authorise DigiLocker hand-off
            </Button>
          </div>
        ) : null}

        {stage === "authenticating" ? (
          <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Simulating DigiLocker authorisation…
          </p>
        ) : null}

        {stage === "authorised" ? (
          <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Pushing signed certificate to the issued-documents folder…
          </p>
        ) : null}

        {stage === "done" ? (
          <div className="rounded-lg border border-[color-mix(in_oklab,var(--verify)_38%,transparent)] bg-[color-mix(in_oklab,var(--verify)_10%,transparent)] p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-[color-mix(in_oklab,var(--verify)_68%,black)]">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Certificate successfully added to DigiLocker
            </p>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Simulated URI:{" "}
              <span className="gov-id">digilocker://issued/{certificateNumber}</span>
            </p>
          </div>
        ) : null}

        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          In production this would call the DigiLocker Issued Documents API with an
          authorised partner key.
        </p>

        {stage === "done" ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => window.open("https://www.digilocker.gov.in/", "_blank", "noopener")}
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Open DigiLocker
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function StageRow({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
          done
            ? "border-[color-mix(in_oklab,var(--verify)_45%,transparent)] bg-[color-mix(in_oklab,var(--verify)_15%,transparent)] text-[color-mix(in_oklab,var(--verify)_68%,black)]"
            : active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground",
        )}
      >
        {done ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : index}
      </span>
      <span
        className={cn(
          "text-sm",
          active || done ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      {active ? (
        <span className="gov-id ml-auto text-[11px] text-primary">in progress</span>
      ) : null}
    </li>
  );
}
