'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/forgot-password/patient');
  }, [router]);

  return null;
}
