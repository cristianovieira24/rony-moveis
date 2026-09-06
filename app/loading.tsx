export default function Loading() {
  return (
    <main className="site-loading" aria-live="polite" aria-busy="true">
      <img src="/brand/logo-horizontal.svg" alt="Rony Móveis" />
      <div className="site-loading-track"><span /></div>
      <p>Preparando o catálogo…</p>
    </main>
  );
}
