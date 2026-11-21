'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Default entry redirects to the patient portal login
    router.replace('/login-patient');
  }, [router]);

  return null;
}
