import { ClientSettingsWrapper } from '@/components/settings/client-settings-wrapper';
import { PageHeader } from '@/components/layout/page-header';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-transparent pt-48 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Settings"
          description="Manage your profile and account preferences."
        />

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            Profile Information
          </h2>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <ClientSettingsWrapper />
          </div>
        </section>
      </div>
    </div>
  );
}
