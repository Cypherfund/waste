'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ReferralPage() {
  const params = useParams();

  useEffect(() => {
    const referralToken = params.token as string;
    
    if (referralToken) {
      // Redirect to the mobile web app's register screen with the referral token
      window.location.href = `https://app.kmertrash.com/register?token=${referralToken}`;
    } else {
      // No token found, redirect to home
      window.location.href = '/';
    }
  }, [params.token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-4 text-neutral-600">Redirecting to app...</p>
      </div>
    </div>
  );
}
