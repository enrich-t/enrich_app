export default function HomePage() {
  return (
    <div style={{ fontFamily: "Inter, system-ui, Arial", maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <h2>Welcome to Enrich</h2>
      <p><a href="/login">Log in</a> · <a href="/signup">Sign up</a> · <a href="/dashboard">Dashboard</a></p>
    </div>
  );
}
