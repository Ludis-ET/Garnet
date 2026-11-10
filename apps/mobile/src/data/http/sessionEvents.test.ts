import {
  handleUnauthorized,
  onSessionLost,
  reportSessionLost,
  resetSessionEventsForTest,
} from "./sessionEvents";

beforeEach(() => {
  resetSessionEventsForTest();
});

describe("a 401 from the API (production-fix-plan A5)", () => {
  it("forgets the cookie only when it is the one the refused request carried", async () => {
    const clear = jest.fn(() => Promise.resolve());
    const lost = jest.fn();
    onSessionLost(lost);
    await handleUnauthorized({ getCookie: () => "session=old" }, { cookie: "session=old" }, clear);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(lost).toHaveBeenCalledTimes(1);
  });

  it("keeps a session signed in after the request was sent (a fresh sign-in wins)", async () => {
    const clear = jest.fn(() => Promise.resolve());
    const lost = jest.fn();
    onSessionLost(lost);
    await handleUnauthorized({ getCookie: () => "session=new" }, { cookie: "session=old" }, clear);
    expect(clear).not.toHaveBeenCalled();
    // The gate still re-asks the server; it decides, not this one request.
    expect(lost).toHaveBeenCalledTimes(1);
  });

  it("clears nothing when the request carried no cookie", async () => {
    const clear = jest.fn(() => Promise.resolve());
    await handleUnauthorized({ getCookie: () => "" }, {}, clear);
    expect(clear).not.toHaveBeenCalled();
  });

  it("reports a burst of refusals once, then again after a quiet spell", () => {
    const lost = jest.fn();
    const off = onSessionLost(lost);
    reportSessionLost(1_000);
    reportSessionLost(2_000);
    reportSessionLost(5_999);
    expect(lost).toHaveBeenCalledTimes(1);
    reportSessionLost(6_000);
    expect(lost).toHaveBeenCalledTimes(2);
    off();
    reportSessionLost(20_000);
    expect(lost).toHaveBeenCalledTimes(2);
  });
});
