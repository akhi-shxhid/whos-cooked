import { describe, expect, it } from "vitest";
import { bufferedEvents, setTransport, track, type TrackedEvent } from "./index.ts";

describe("analytics", () => {
  it("buffers until a transport is set, then flushes in order", () => {
    track("game_started", { device_class: "phone" });
    track("score_revealed", { cooked_score: 46, level: "Crispy" });
    expect(bufferedEvents().map((e) => e.event)).toEqual(["game_started", "score_revealed"]);

    const sent: TrackedEvent[] = [];
    setTransport((e) => sent.push(e));
    expect(sent.map((e) => e.event)).toEqual(["game_started", "score_revealed"]);
    expect(bufferedEvents()).toHaveLength(0);

    track("result_saved", { share_method: "download" });
    expect(sent).toHaveLength(3);
    setTransport(null);
  });
});
