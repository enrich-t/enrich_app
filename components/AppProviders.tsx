'use client';

import * as React from 'react';
import { ToastProvider } from '../components/Toast';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  // Add more global providers here later if needed (theme, query, etc.)
  return <ToastProvider>{children}</ToastProvider>;
}
