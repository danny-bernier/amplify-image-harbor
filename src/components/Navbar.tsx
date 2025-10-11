"use client";

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">Image Harbor</h1>
        <div className="space-x-4">
          <Link href="/" className="hover:text-blue-200">Gallery</Link>
          <Link href="/upload" className="hover:text-blue-200">Upload</Link>
          <Link href="/admin" className="hover:text-blue-200">Admin</Link>
        </div>
      </div>
    </nav>
  );
}