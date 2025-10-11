"use client";

import { Geist } from "next/font/google";
import "./globals.css";
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css'; // Amplify's default styles
import outputs from '../../amplify_outputs.json';
import Navbar from '../components/Navbar';

Amplify.configure(outputs);


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <Authenticator>
          <Navbar />
          {children}
        </Authenticator>
      </body>
    </html>
  );
}