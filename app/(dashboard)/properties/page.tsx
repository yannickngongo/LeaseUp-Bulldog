// Properties page — list of all properties managed by this operator.
// Each property has its own Twilio number, active specials, and lead pipeline.
// TODO: replace mock data with Supabase query.
// TODO: add "Create Property" form/modal.

import type { Property } from "@/lib/types";

// ─── Mock data ────────────────────────────────────────────────────────────────

const NOW = new Date().toISOString();

const MOCK_PROPERTIES: Property[] = [
  {
    id: "prop-1",
    created_at: NOW,
    updated_at: NOW,
    operator_id: "op-1",
    name: "The Monroe",
    address: "1200 Monroe Ave",
    city: "Las Vegas",
    state: "NV",
    zip: "89101",
    phone_number: "+17025550100",
    active_special: "1 month free on 13-month leases",
    website_url: "https://themonroe.example.com",
  },
  {
    id: "prop-2",
    created_at: NOW,
    updated_at: NOW,
    operator_id: "op-1",
    name: "Parkview Commons",
    address: "840 Parkview Dr",
    city: "Henderson",
    state: "NV",
    zip: "89002",
    phone_number: "+17025550200",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PropertiesPage() {
  // TODO: replace with real Supabase query
  // const db = getSupabaseAdmin();
  // const { data: properties } = await db.from("properties").select("*").order("name");
  const properties: Property[] = MOCK_PROPERTIES;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="text-sm text-gray-500">{properties.length} propert{properties.length !== 1 ? "ies" : "y"}</p>
          </div>
          {/* TODO: wire up to a create form */}
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Add Property
          </button>
        </div>

        {/* Property cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {properties.map((property) => (
            <div
              key={property.id}
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{property.name}</h2>
                  <p className="mt-0.5 text-sm text-gray-500">{property.address}</p>
                </div>
                {/* TODO: link to property-level lead pipeline */}
              </div>

              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Twilio Number</dt>
                  <dd className="font-medium text-gray-700">{property.phone_number}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Active Special</dt>
                  <dd className="font-medium text-gray-700">
                    {property.active_special ?? (
                      <span className="text-gray-400">None</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
