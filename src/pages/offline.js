export default function Offline() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h1>📡 You&apos;re Offline</h1>
      <p>Please check your internet connection</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
}
