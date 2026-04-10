import { createFileRoute } from "@tanstack/react-router";
import { OddEvenChecker } from "../components/workflow/odd-even-checker";

export const Route = createFileRoute("/workflow-test")({
  component: WorkflowTestPage,
});

function WorkflowTestPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            Workflow Test
          </h1>
          <p className="text-stone-600">
            Test the Conductor odd/even workflow integration
          </p>
        </div>

        <div className="flex justify-center">
          <OddEvenChecker />
        </div>
      </div>
    </div>
  );
}