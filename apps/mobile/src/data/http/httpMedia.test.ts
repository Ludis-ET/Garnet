import type { ApiClient } from "./client";
import { createHttpMedia } from "./httpMedia";

function asApiClient(mock: Record<string, unknown>): ApiClient {
  return mock as unknown as ApiClient;
}

describe("HttpMedia (B7, B-41)", () => {
  it("executes upload and commit sequence", async () => {
    const postMock = jest
      .fn()
      .mockResolvedValueOnce({
        id: "0192e2b3-5798-7521-8254-e6be95232c01",
        uploadUrl: "https://storage.local/upload?sig=abc",
        objectKey: "media/obj-1",
        expiresInSeconds: 300,
      })
      .mockResolvedValueOnce({
        status: "ready",
        media: {
          id: "0192e2b3-5798-7521-8254-e6be95232c01",
          type: "photo",
          url: "https://storage.local/view?sig=xyz",
          width: 1024,
          height: 768,
        },
      });

    const getMock = jest.fn().mockResolvedValue({
      url: "https://storage.local/view?sig=xyz",
      expiresInSeconds: 900,
    });

    const fakeClient = asApiClient({
      post: postMock,
      get: getMock,
    });

    const mediaUploader = createHttpMedia(fakeClient);

    // Mock global fetch for direct storage PUT
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = fetchMock;

    const dummyBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const result = await mediaUploader.uploadAndCommit(
      {
        bytes: dummyBytes,
        contentType: "image/jpeg",
        sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      },
      "chat_message",
      "0192e2b3-5798-7521-8254-e6be95232c02",
      { width: 1024, height: 768 },
    );

    expect(result.id).toBe("0192e2b3-5798-7521-8254-e6be95232c01");
    expect(result.type).toBe("photo");
    expect(result.width).toBe(1024);
    expect(result.url).toBe("https://storage.local/view?sig=xyz");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://storage.local/upload?sig=abc",
      expect.anything(),
    );
  });

  it("fetches short-lived download URL", async () => {
    const getMock = jest.fn().mockResolvedValue({
      url: "https://storage.local/view?sig=xyz",
      expiresInSeconds: 900,
    });
    const fakeClient = asApiClient({ get: getMock });
    const media = createHttpMedia(fakeClient);

    const url = await media.getDownloadUrl("media-123");
    expect(url).toBe("https://storage.local/view?sig=xyz");
  });
});
