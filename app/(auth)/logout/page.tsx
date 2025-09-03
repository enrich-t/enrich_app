'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '//supabaseClient';
export default function Logout() {
  const router = useRouter();
  useEffect(()=>{ supabase.auth.signOut().then(()=>router.replace('/auth/login')); },[router]);
  return null;
}
