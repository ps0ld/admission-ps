import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p className="mt-3 text-ink-700">The page you opened does not exist or has moved.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="btn btn-primary">
          Go to Home
        </Link>
        <Link to="/explore" className="btn btn-quiet">
          Explore colleges
        </Link>
      </div>
    </div>
  );
}
