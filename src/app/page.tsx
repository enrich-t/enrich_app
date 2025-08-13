export default function Home() {
  return (
    <div className="min-h-screen grid place-items-center p-10">
      <div className="card p-8 max-w-xl text-center space-y-3">
        <h1 className="text-2xl font-semibold">Enrich App</h1>
        <p className="text-zinc-600">Sign up or log in to access your dashboard.</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <a className="btn" href="/signup">Sign up</a>
          <a className="btn-ghost" href="/login">Log in</a>
        </div>
      </div>
    </div>
  );
}
