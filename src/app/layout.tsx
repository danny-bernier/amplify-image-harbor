"use client";

import { Geist } from "next/font/google";
import "./globals.css";
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css'; // Amplify's default styles
import outputs from '../../amplify_outputs.json';
import Navbar from '../components/Navbar';

Amplify.configure(outputs);

// Configure Authenticator to use email as username
const authenticatorFormFields = {
  signUp: {
    email: {
      order: 1,
      isRequired: true,
      placeholder: 'Enter your email address',
    },
    password: {
      order: 2,
      isRequired: true,
    },
    confirm_password: {
      order: 3,
      isRequired: true,
    },
  },
};


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
        <Authenticator 
          formFields={authenticatorFormFields}
          loginMechanisms={['email']}
          signUpAttributes={['email']}
        >
          <Navbar />
          {children}
        </Authenticator>
      </body>
    </html>
  );
}