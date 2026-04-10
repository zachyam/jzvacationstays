/**
 * Worker implementation for checking if a number is odd or even
 */

interface TaskInput {
  number: number;
}

interface TaskOutput {
  result: "EVEN" | "ODD";
}

export function checkOddEven(input: TaskInput): TaskOutput {
  const { number } = input;

  if (typeof number !== 'number' || !Number.isInteger(number)) {
    throw new Error('Input must be an integer');
  }

  const result = number % 2 === 0 ? "EVEN" : "ODD";

  return { result };
}

// Export task handler for Conductor worker registration
export const taskHandlers = {
  check_odd_even: checkOddEven,
};