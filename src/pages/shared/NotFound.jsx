import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1>Page not found</h1>
      <p className="muted">The link may be old, or you may not have access to this page.</p>
      <Link to="/" className="btn">Go to your home page</Link>
    </main>
  );
}
