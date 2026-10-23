import { payloadLines, respondedLine, sendLabel } from "../signalText";

describe("Us text (US-02 to US-10)", () => {
  it("lists what a signal carries, leaving out what the headline already says", () => {
    const payload = { need: "lonely", note: "x", attachments: ["voice"] } as const;
    expect(payloadLines(payload)).toEqual(["🌙 I feel lonely", "🎙️ Voice note"]);
    expect(payloadLines(payload, 'Noah: "I feel lonely"')).toEqual(["🎙️ Voice note"]);
    expect(payloadLines({ topic: "Just listen" }, "Noah would like to talk — just listen")).toEqual(
      [],
    );
  });

  it("names the person and never claims they saw anything", () => {
    expect(respondedLine("here", "Noah")).toBe("You let Noah know you're here.");
    expect(sendLabel("need-you", "Noah")).toBe("Send to Noah");
    expect(sendLabel("thought-of-you", "Noah")).toBe("💭 Send a thought");
  });
});
