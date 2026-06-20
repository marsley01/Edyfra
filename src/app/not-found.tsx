export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
          <span className="text-3xl font-black">404</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tightest">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <a
            href="/"
            className="h-11 inline-flex items-center px-5 rounded-full bg-foreground text-background text-xs font-black tracking-widest uppercase"
          >
            Go home
          </a>
          <a
            href="/dashboard"
            className="h-11 inline-flex items-center px-5 rounded-full border-2 border-border text-xs font-black tracking-widest uppercase"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
