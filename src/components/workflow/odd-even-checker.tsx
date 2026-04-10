import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { checkOddEven } from "../../server/functions/workflows";

export function OddEvenChecker() {
  const [number, setNumber] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (num: number) => {
      const response = await checkOddEven({ data: { number: num } });
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        setResult(data.result || `Workflow started (ID: ${data.workflowId})`);
      } else {
        setResult(`Error: ${data.error}`);
      }
    },
    onError: (error) => {
      setResult(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(number, 10);
    if (isNaN(num)) {
      setResult("Please enter a valid integer");
      return;
    }
    setResult(null);
    mutation.mutate(num);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-stone-200 p-6">
      <h2 className="text-xl font-semibold text-stone-800 mb-4">
        Odd or Even Checker
      </h2>
      <p className="text-stone-600 text-sm mb-6">
        Enter a number to check if it's odd or even using our Conductor workflow
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="number-input" className="block text-sm font-medium text-stone-700 mb-2">
            Number
          </label>
          <input
            id="number-input"
            type="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Enter an integer"
            className={cn(
              "w-full px-3 py-2.5 border border-stone-300 rounded-lg",
              "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500",
              "placeholder-stone-400 text-stone-900"
            )}
            required
          />
        </div>

        <Button
          type="submit"
          loading={mutation.isPending}
          disabled={!number.trim()}
          className="w-full"
        >
          Check Odd or Even
        </Button>
      </form>

      {result && (
        <div
          className={cn(
            "mt-4 p-3 rounded-lg text-sm font-medium",
            result.startsWith("Error")
              ? "bg-red-50 text-red-700 border border-red-200"
              : result === "EVEN"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : result === "ODD"
              ? "bg-sky-50 text-sky-700 border border-sky-200"
              : "bg-stone-50 text-stone-700 border border-stone-200"
          )}
        >
          {result === "EVEN" && "✨ The number is EVEN"}
          {result === "ODD" && "✨ The number is ODD"}
          {result !== "EVEN" && result !== "ODD" && result}
        </div>
      )}
    </div>
  );
}