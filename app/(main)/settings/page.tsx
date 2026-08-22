import type { Metadata } from 'next';
import PaymentTypesSection from '@/components/settings/payment-types-section';
import CategoriesSection from '@/components/settings/categories-section';
import MerchantDefaultsSection from '@/components/settings/merchant-defaults-section';
import BudgetsSection from '@/components/settings/budgets-section';
import ScanSection from '@/components/settings/scan-section';
import SessionSection from '@/components/settings/session-section';
import { displayFont } from '@/components/pop-ui';
import { authEnabled } from '@/lib/auth';

export const metadata: Metadata = { title: 'Settings — Mooolah Tracker' };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 pb-24 md:px-6">
      <h1 className="text-4xl uppercase tracking-tight text-(--ink) md:text-6xl" style={displayFont}>
        The controls
      </h1>
      <PaymentTypesSection />
      <CategoriesSection />
      <BudgetsSection />
      <MerchantDefaultsSection />
      <ScanSection />
      {authEnabled() && <SessionSection />}
    </div>
  );
}
