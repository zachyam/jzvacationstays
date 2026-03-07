import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/thermostat")({
  component: ThermostatPage,
});

function ThermostatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-stone-900">Thermostat</h1>
        <p className="text-stone-500 text-sm mt-1">
          Control thermostats for each property.
        </p>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 mb-4">
          <iconify-icon icon="mdi:thermostat" width="32" height="32" />
        </div>
        <h3 className="text-lg font-medium text-stone-900 mb-2">
          Coming Soon
        </h3>
        <p className="text-stone-500 text-sm max-w-md mx-auto">
          Thermostat integration is pending. Once the thermostat brand is
          selected, this page will allow you to view and control temperatures
          for each property remotely.
        </p>
      </div>
    </div>
  );
}
