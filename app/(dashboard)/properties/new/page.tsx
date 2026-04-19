"use client";
import Link from "next/link";

export default function NewPropertyPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/properties" className="text-sm text-gray-400 hover:text-gray-600">← Properties</Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
            <p className="text-sm text-gray-500">A Twilio phone number will be provisioned automatically</p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Basic Info */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-gray-500">Property Info</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Property Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Sunrise Apartments"
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Street Address <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="1234 Desert Rose Blvd"
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Las Vegas"
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">State <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="NV"
                    maxLength={2}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">ZIP <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="89101"
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Website URL</label>
                <input
                  type="url"
                  placeholder="https://sunriseapts.com"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* AI Config */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-gray-500">AI Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Current Special / Promotion</label>
                <input
                  type="text"
                  placeholder="1st month free on 12-month leases · Limited time"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">Leave blank if none. AI will mention this in replies automatically.</p>
              </div>
            </div>
          </div>

          {/* Phone Number */}
          <div className="rounded-xl border border-blue-50 bg-blue-50 p-6">
            <div className="flex gap-3">
              <span className="text-2xl">📞</span>
              <div>
                <p className="font-semibold text-blue-900">Phone number will be provisioned automatically</p>
                <p className="mt-1 text-sm text-blue-700">
                  When you save this property, we&apos;ll assign a local Twilio number from your area code. This is the number leads will text and receive messages from.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/properties"
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Add Property →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
