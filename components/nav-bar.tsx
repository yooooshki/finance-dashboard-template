import { getPendingCount } from '@/lib/pending-count';
import NavClient from './nav-client';

export default async function NavBar() {
  const pendingCount = await getPendingCount();
  return <NavClient pendingCount={pendingCount} />;
}
