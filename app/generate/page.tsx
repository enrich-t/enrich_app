export const dynamic = 'force-dynamic';

import GenerateClient from '../../components/generate/GenerateClient';
import { ToastProvider } from '../../components/Toast';

export default function Page() {
  return (
    <ToastProvider>
      <GenerateClient />
    </ToastProvider>
  );
}
