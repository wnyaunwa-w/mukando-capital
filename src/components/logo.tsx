'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-90">
      <div className="relative h-10 w-10">
        {/* We use '/images/' because your folder is named 'images' in the screenshot */}
        <Image 
          src="/images/logo.png" 
          alt="Mukando Capital" 
          fill
          className="object-contain"
          priority
        />
      </div>
      <span className="font-bold text-xl tracking-tight text-gray-900">
        Mukando Capital
      </span>
    </Link>
  );
}