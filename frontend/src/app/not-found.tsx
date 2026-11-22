import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFBF8] px-4 text-center">
      <h1 className="text-6xl font-bold text-[#064826] mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-6 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-[#064826] hover:bg-[#0B6B3A] text-white font-medium rounded-lg transition-colors shadow-sm"
      >
        Return to Home
      </Link>
    </div>
  );
}
