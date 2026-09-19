import { BrandMark } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Compass, Home, Search } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="grid-backdrop absolute inset-0 opacity-40" aria-hidden="true" />
      <header className="relative border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <BrandMark />
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-lg text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-5 font-display text-sm font-semibold tracking-[0.18em] text-[color-mix(in_oklab,var(--saffron)_70%,black)] uppercase">
            Error 404
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            This record could not be found
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The page or reference you opened does not exist in the MetriQ portal. If you
            arrived here from a QR code, verify the certificate ID on the public
            verification page instead.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Button asChild className="gap-2">
              <Link to="/verify">
                <Search className="size-4" aria-hidden="true" />
                Verify a certificate
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/">
                <Home className="size-4" aria-hidden="true" />
                Back to home
              </Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="relative border-t border-border py-6">
        <p className="mx-auto max-w-5xl px-4 text-xs text-muted-foreground sm:px-6">
          MetriQ prototype · not an official Government of India service.
        </p>
      </footer>
    </div>
  );
}
