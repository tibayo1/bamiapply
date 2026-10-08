"use client";

import { useSyncExternalStore } from "react";

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const subscribe = () => () => {};

interface GreetingProps {
  name: string;
}

/**
 * Greeting — time-of-day heading.
 * useSyncExternalStore gives the server a stable fallback and switches to
 * the visitor's local time on the client without a hydration mismatch.
 */
export function Greeting({ name }: GreetingProps) {
  const greeting = useSyncExternalStore(subscribe, greetingForNow, () => "Good afternoon");

  return (
    <header>
      <h1 className="text-title font-semibold text-ink">
        {greeting}, {name}.
      </h1>
      <p className="mt-1 text-body text-ink-secondary">Find the opportunities worth your time.</p>
    </header>
  );
}
