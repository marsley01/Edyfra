"use client";

import { useCallback, useSyncExternalStore } from "react";
import { setFollow } from "@/app/actions/social";

/* A tiny client store for "do I follow X?" so following someone from one
   post header instantly updates every other post, the suggestions sidebar
   and the profile header — without refetching anything. */

const state = new Map<string, boolean>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useFollowing(userId: string, initial: boolean): { following: boolean; pending: boolean } {
  const following = useSyncExternalStore(
    subscribe,
    useCallback(() => (state.has(userId) ? state.get(userId)! : initial), [userId, initial]),
    () => initial,
  );
  const isPending = useSyncExternalStore(
    subscribe,
    useCallback(() => pending.has(userId), [userId]),
    () => false,
  );
  return { following, pending: isPending };
}

/**
 * Optimistically sets the follow state, then reconciles with the server.
 * Resolves to the final state, or throws an Error with a user-facing message
 * after rolling back.
 */
export async function changeFollow(userId: string, want: boolean, current: boolean): Promise<boolean> {
  if (pending.has(userId)) return current;
  pending.add(userId);
  state.set(userId, want);
  emit();
  try {
    const res = await setFollow(userId, want);
    if (!res.ok) throw new Error(res.error);
    state.set(userId, res.following);
    return res.following;
  } catch (e) {
    state.set(userId, current);
    throw e instanceof Error ? e : new Error("We couldn't update that follow.");
  } finally {
    pending.delete(userId);
    emit();
  }
}
