'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Default entry redirects strictly to the admin portal login
    router.replace('/login-admin');
  }, [router]);

  return null;
}
