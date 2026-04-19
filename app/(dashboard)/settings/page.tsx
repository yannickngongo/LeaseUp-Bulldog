"use client";

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your account and billing</p>
        </div>

        {/* Profile */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-gray-500">Profile</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">First Name</label>
                <input defaultValue="Marcus" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Last Name</label>
                <input defaultValue="Thompson" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" defaultValue="marcus@sunriseproperties.com" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Company Name</label>
              <input defaultValue="Sunrise Properties LLC" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none" />
            </div>
            <div className="flex justify-end">
              <button className="rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#A50D25]">
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Plan & Billing */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-gray-500">Plan & Billing</h2>

          <div className="mb-6 rounded-xl border border-[#C8102E]/20 bg-[#C8102E]/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">Growth Plan</p>
                <p className="text-sm text-gray-500">Up to 10 properties · $399/mo per property</p>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Active</span>
            </div>
            <div className="mt-3 text-xs text-gray-500">Next billing date: May 19, 2026 · 2 active properties → $798/mo</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Payment method</p>
                <p className="text-xs text-gray-500">Visa ending in 4242</p>
              </div>
              <button className="text-xs font-medium text-[#C8102E] hover:underline">Update</button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Billing history</p>
                <p className="text-xs text-gray-500">Invoices and receipts</p>
              </div>
              <button className="text-xs font-medium text-[#C8102E] hover:underline">View</button>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Upgrade Plan
            </button>
            <button className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              Cancel Subscription
            </button>
          </div>
        </div>

        {/* Integrations */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-gray-500">Integrations</h2>
          <div className="space-y-3">
            {[
              { name: "Twilio", desc: "SMS delivery for AI responses", status: "connected" },
              { name: "Anthropic (Claude)", desc: "AI engine for lead replies", status: "connected" },
              { name: "Supabase", desc: "Database and storage", status: "connected" },
              { name: "Zapier", desc: "Connect to 5000+ apps", status: "coming_soon" },
            ].map((int) => (
              <div key={int.name} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{int.name}</p>
                  <p className="text-xs text-gray-500">{int.desc}</p>
                </div>
                {int.status === "connected" ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Connected</span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">Coming soon</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-red-400">Danger Zone</h2>
          <div className="flex items-center justify-between rounded-lg border border-red-100 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete Account</p>
              <p className="text-xs text-gray-500">Permanently delete your account and all data. This cannot be undone.</p>
            </div>
            <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
