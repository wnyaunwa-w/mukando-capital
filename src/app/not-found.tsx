import Link from 'next/link';
      export default function NotFound() {
        return (
          <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
            <h1 className="text-4xl font-bold text-gray-800">404 - Page Not Found</h1>
            <p className="mb-4 text-gray-600">The page you are looking for does not exist.</p>
            <Link href="/" className="px-4 py-2 bg-green-700 text-white rounded">
              Go Home
            </Link>
          </div>
        );
      }