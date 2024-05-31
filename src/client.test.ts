import { expect, test, vitest, beforeEach, describe } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { LoginResult, SignArgs, createClient } from "./client.js";

Object.assign(window, {
  postMessage: (message: unknown) => {
    window.dispatchEvent(new MessageEvent("message", { data: message, source: window, origin: window.origin }));
  },
});

function resolve<T = unknown>(ev: MessageEvent, data: T) {
  postMessage({
    type: "signify-signature",
    requestId: ev.data.requestId,
    data,
  });
}

function reject(ev: MessageEvent, reason?: Error) {
  postMessage({
    type: "signify-signature",
    requestId: ev.data.requestId,
    error: reason?.message ?? "Something went wrong",
  });
}

const handleMessage = vitest.fn<[MessageEvent], void>();

window.addEventListener("message", async (ev) => {
  return handleMessage(ev);
});

beforeEach(() => {
  vitest.clearAllMocks();
});

describe("Check installation", () => {
  test("Should return extension id if installed", async () => {
    const client = createClient();

    const extensionId = randomUUID();
    postMessage({
      type: "signify-extension",
      data: {
        extensionId,
      },
    });

    const response = await client.isExtensionInstalled();

    expect(response).toEqual(extensionId);
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

    handleMessage.mockImplementationOnce((ev) => {
      resolve(ev, {
        aid: randomUUID(),
        signature: randomBytes(10).toString("hex"),
      });
    });

    const signRequest: SignArgs = {
      sessionId: randomUUID(),
      data: randomBytes(10).toString("hex"),
    };

    const response = await client.requestSignature(signRequest);

    const request = handleMessage.mock.calls[0][0];
    expect(request.data.data).toMatchObject(signRequest);
    expect(request.data.requestId).toBeDefined();
    expect(response.signature).toBeTypeOf("string");
  });

  test("Should throw when responding with error", async () => {
    const client = createClient();

    handleMessage.mockImplementationOnce((ev) => {
      reject(ev, new Error("Declined"));
    });

    const signRequest: SignArgs = {
      sessionId: randomUUID(),
      data: randomBytes(10).toString("hex"),
    };

    await expect(() => client.requestSignature(signRequest)).rejects.toThrow("Declined");
  });
});

describe("Select credential", () => {
  const cesr = randomUUID();
  const credential = { foo: "bar" };

  test("Should get credential response", async () => {
    const client = createClient();

    handleMessage.mockImplementationOnce((ev) => {
      resolve<LoginResult>(ev, { sessionId: randomUUID(), cesr, credential, headers: null });
    });

    const response = await client.requestLogin();

    expect(response).toMatchObject({ cesr, credential });
  });
});
