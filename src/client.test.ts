import { expect, test, vitest, beforeEach, describe } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { AuthorizeResult, SignDataArgs, SignDataResult, createClient } from "./client.js";

Object.assign(window, {
  postMessage: (message: unknown) => {
    window.dispatchEvent(new MessageEvent("message", { data: message, source: window, origin: window.origin }));
  },
});

function createMockExtension(type = "/signify/reply") {
  const extensionId = randomUUID();
  function resolve<T = unknown>(ev: MessageEvent, payload: T) {
    postMessage({
      type,
      requestId: ev.data.requestId,
      payload,
    });
  }

  function reject(ev: MessageEvent, reason?: Error) {
    postMessage({
      type,
      requestId: ev.data.requestId,
      error: reason?.message ?? "Something went wrong",
    });
  }

  function postExtension() {
    postMessage({
      type: "signify-extension",
      data: {
        extensionId,
      },
    });
  }

  return {
    resolve,
    reject,
    postExtension,
    extensionId,
  };
}

const handleMessage = vitest.fn<[MessageEvent], void>();

window.addEventListener("message", async (ev) => {
  return handleMessage(ev);
});

beforeEach(() => {
  vitest.clearAllMocks();
});

describe("Check installation", () => {
  test("Should post signify-extension-client to notify that client is loaded", async () => {
    createClient();
    expect(handleMessage.mock.lastCall?.[0].data).toMatchObject({ type: "signify-extension-client" });
  });

  test("Should return extension id if installed", async () => {
    const client = createClient();
    const extension = createMockExtension();

    extension.postExtension();

    const response = await client.isExtensionInstalled();
    expect(response).toEqual(extension.extensionId);
  });

  test("Should return false if not installed", async () => {
    const client = createClient();

    const response = await client.isExtensionInstalled(1);

    expect(response).toEqual(false);
  });

  test("Should return extensionId once message is received", async () => {
    const client = createClient();

    const responsePromise = client.isExtensionInstalled(1);

    const extensionId = randomUUID();
    postMessage({
      type: "signify-extension",
      data: {
        extensionId,
      },
    });

    const response = await responsePromise;
    expect(response).toEqual(extensionId);
  });

  test("Should handle multiple queries to extension check", async () => {
    const client = createClient();

    const extensionId = randomUUID();

    const response1 = client.isExtensionInstalled();
    const response2 = client.isExtensionInstalled();
    const response3 = client.isExtensionInstalled();

    postMessage({
      type: "signify-extension",
      data: {
        extensionId,
      },
    });

    expect(await response1).toEqual(extensionId);
    expect(await response2).toEqual(extensionId);
    expect(await response3).toEqual(extensionId);
  });
});

describe("Sign request", () => {
  test("Should get sign response", async () => {
    const client = createClient();
    const extension = createMockExtension();

    handleMessage.mockImplementationOnce((ev: MessageEvent<{ payload: SignDataArgs }>) => {
      extension.resolve<SignDataResult>(ev, {
        aid: randomUUID(),
        items: ev.data.payload.items.map((item) => ({ data: item, signature: randomBytes(10).toString("hex") })),
      });
    });

    const signRequest: SignDataArgs = {
      items: [randomBytes(10).toString("hex")],
    };

    handleMessage.mockClear();
    const response = await client.signData(signRequest);

    const request = handleMessage.mock.calls[0][0];
    expect(request.data.payload).toMatchObject(signRequest);
    expect(request.data.requestId).toBeDefined();
    expect(response.items[0].signature).toBeTypeOf("string");
  });

  test("Should throw when responding with error", async () => {
    const client = createClient();
    const extension = createMockExtension();

    handleMessage.mockImplementationOnce((ev) => {
      extension.reject(ev, new Error("Declined"));
    });

    await expect(() =>
      client.signData({
        items: [randomBytes(10).toString("hex")],
      }),
    ).rejects.toThrow("Declined");
  });
});

describe("Authorize", () => {
  const cesr = randomUUID();
  const credential = { foo: "bar" };
  const extension = createMockExtension();

  test("Should get credential response", async () => {
    const client = createClient();

    handleMessage.mockImplementationOnce((ev) => {
      extension.resolve<AuthorizeResult>(ev, { credential: { cesr, raw: credential } });
    });

    const response = await client.authorize();

    expect(response).toMatchObject({ credential: { cesr, raw: credential } });
  });
});
