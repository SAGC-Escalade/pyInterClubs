import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

/**
 * Tranche 6 — Hook d'abonnement Realtime (broadcast par topic).
 * On mocke le client Supabase : chaque `channel(topic)` renvoie un faux canal
 * dont on capture le handler de broadcast et le callback de statut.
 */

type Chan = {
  topic: string;
  handler: ((m: { payload: unknown }) => void) | null;
  statusCb: ((s: string) => void) | null;
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
};

const state: {
  channels: Chan[];
  channelFn: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
} = { channels: [], channelFn: vi.fn(), removeChannel: vi.fn() };

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: (t: string) => state.channelFn(t),
    removeChannel: (c: unknown) => state.removeChannel(c),
  }),
}));

import { useRealtime } from "@/lib/realtime/useRealtime";

function resetSupabase() {
  state.channels = [];
  state.removeChannel = vi.fn();
  state.channelFn = vi.fn((topic: string) => {
    const ch: Chan = {
      topic,
      handler: null,
      statusCb: null,
      on: vi.fn((_type, _filter, cb) => {
        ch.handler = cb;
        return ch;
      }),
      subscribe: vi.fn((cb) => {
        ch.statusCb = cb;
        return ch;
      }),
    };
    state.channels.push(ch);
    return ch;
  });
}

beforeEach(() => resetSupabase());
afterEach(() => vi.useRealTimers());

describe("useRealtime", () => {
  it("ouvre un canal par topic et s'abonne au broadcast « change »", () => {
    renderHook(() => useRealtime(["a", "b"], vi.fn()));
    expect(state.channelFn).toHaveBeenCalledTimes(2);
    expect(state.channels.map((c) => c.topic)).toEqual(["a", "b"]);
    for (const ch of state.channels) {
      expect(ch.on).toHaveBeenCalledWith(
        "broadcast",
        { event: "change" },
        expect.any(Function),
      );
      expect(ch.subscribe).toHaveBeenCalled();
    }
  });

  it("relaie le payload du broadcast à onMessage", () => {
    const onMessage = vi.fn();
    renderHook(() => useRealtime(["t"], onMessage));
    state.channels[0].handler!({ payload: { id: 1, points: 10 } });
    expect(onMessage).toHaveBeenCalledWith({ id: 1, points: 10 });
  });

  it("debounce une rafale et n'émet que le dernier payload", () => {
    vi.useFakeTimers();
    const onMessage = vi.fn();
    renderHook(() => useRealtime(["t"], onMessage, { debounceMs: 100 }));
    const ch = state.channels[0];
    ch.handler!({ payload: { id: 1 } });
    ch.handler!({ payload: { id: 2 } });
    expect(onMessage).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({ id: 2 });
  });

  it("signale les changements de statut (perte de connexion)", () => {
    const onStatus = vi.fn();
    renderHook(() => useRealtime(["t"], vi.fn(), { onStatus }));
    state.channels[0].statusCb!("CHANNEL_ERROR");
    expect(onStatus).toHaveBeenCalledWith("CHANNEL_ERROR");
  });

  it("retire tous les canaux au démontage", () => {
    const { unmount } = renderHook(() => useRealtime(["a", "b"], vi.fn()));
    unmount();
    expect(state.removeChannel).toHaveBeenCalledTimes(2);
  });
});
