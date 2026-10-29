export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Access denied</h1>
      <p className="text-ink-700">
        AWED is limited to site admins. Sign in through the portal with an admin identity, then open
        AWED again.
      </p>
    </main>
  );
}
