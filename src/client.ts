import { canCallAsync } from "./utils.js";

export interface SelectCredentialResult {
  credential?: unknown;
  cesr?: string;
  headers?: unknown;
}

export interface SignArgs {
  body: string;
  items: string[];
}

export interface SignResult {
  aid: string;
  signatures: string[];
}

export interface SignedHeadersArgs {
  url: string;
  method: string;
  headers?: Record<string, string | undefined>;
}

export interface SignedHeadersResult {
  headers: Record<string, string>;
}

export interface MessageData {
  type: string;
  requestId: string;
  subtype?: string;
  rurl?: string;
  data?: unknown;
  error?: string;
}

type PendingRequest<T = unknown> = { resolve: (value: T) => void; reject: (reason: Error) => void };

class Deferred<T = void> implements PromiseLike<T> {
  promise: Promise<T>;
  resolve: (value: T) => void = () => {};
  reject: (reason?: Error) => void = () => {};

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }
}

export class ExtensionClient {
  #requests = new Map<string, PendingRequest>();
  #extensionIdPromise: Deferred<string | false> = new Deferred<string | false>();
  #extensionId: string | null = null;

  constructor() {
    window.addEventListener("message", this.#handleEvent, false);
  }

  #handleEvent = async (event: MessageEvent) => {
    if (event.source !== window) {
      return;
    }

    if (!event.data || typeof event.data !== "object") {
      return;
    }

    const { requestId, type, error, data } = event.data;

    if (!type || typeof type !== "string") {
      return;
    }

    if (type === "signify-extension") {
      this.#extensionIdPromise.resolve(event.data.data.extensionId);
      return;
    }

    if (type === "signify-signature" && requestId && typeof requestId === "string") {
      const promise = this.#requests.get(requestId);

      if (!promise) {
        return;
      }

      if (error) {
        promise.reject(new Error(typeof error === "string" ? error : error.toString()));
      } else if (!data || typeof data !== "object") {
        promise.reject(new Error("No data received in response"));
      } else {
        promise.resolve(data);
      }

      this.#requests.delete(requestId);
    }
  };

  #sendMessage = async <T = unknown>(message: Omit<MessageData, "requestId">): Promise<T> => {
    const requestId = window.crypto.randomUUID();

    const promise = new Promise<T>((resolve, reject) => {
      this.#requests.set(requestId, {
        resolve(value: unknown) {
          resolve(value as T);
        },
        reject,
      });
    });

    window.postMessage({ requestId, ...message }, "/");

    return promise;
  };

  isExtensionInstalled = async (timeout: number = 1000): Promise<string | false> => {
    const timer = setTimeout(() => {
      this.#extensionIdPromise.resolve(false);
    }, timeout);

    const result = await this.#extensionIdPromise;
    clearTimeout(timer);

    return result;
  };

  requestSignatures = async (args: SignArgs): Promise<SignResult> => {
    return this.#sendMessage({ type: "sign", data: args });
  };

  requestAid = async (): Promise<unknown> => {
    return this.#sendMessage({ type: "select-identifier" });
  };

  requestCredential = async (rurl?: string): Promise<SelectCredentialResult> => {
    return this.#sendMessage({ type: "select-credential", rurl });
  };

  requestAidORCred = async (rurl?: string): Promise<unknown> => {
    return this.#sendMessage({ type: "select-aid-or-credential", rurl });
  };

  requestSignedHeaders = async (req: SignedHeadersArgs): Promise<SignedHeadersResult> => {
    return this.#sendMessage<SignedHeadersResult>({
      type: "signed-headers",
      data: req,
    });
  };

  trySettingVendorUrl = async (vendorUrl: string): Promise<void> => {
    window.postMessage(
      {
        type: "vendor-info",
        subtype: "attempt-set-vendor-url",
        data: {
          vendorUrl,
        },
      },
      "/",
    );
  };

  requestAutoSignin = async (rurl?: string): Promise<unknown> => {
    const execute = async () => {
      if (canCallAsync()) {
        const { data, error } = await chrome.runtime.sendMessage(this.#extensionId, {
          type: "fetch-resource",
          subtype: "auto-signin-signature",
          data: {
            rurl,
          },
        });
        if (error) {
          if (error.code === 404) {
            return await this.#sendMessage({ type: "select-auto-signin", rurl });
          } else {
            throw error;
          }
        } else {
          return data;
        }
      } else {
        return this.#sendMessage({
          type: "fetch-resource",
          subtype: "auto-signin-signature",
          rurl,
        });
      }
    };

    return new Promise((resolve, reject) => {
      execute().then(resolve, reject);
    });
  };

  signifyHeaders = async (rurl: string, req: RequestInit, aidName = ""): Promise<HeadersInit> => {
    if (aidName) {
      if (canCallAsync() && this.#extensionId) {
        const { data, error } = await chrome.runtime.sendMessage(this.#extensionId, {
          type: "fetch-resource",
          subtype: "signify-headers",
          data: { aidName, rurl, reqInit: req },
        });
        if (error && error.message) {
          throw new Error(error.message);
        }
        req.headers = { ...(req.headers ?? {}), ...(data.headers ?? {}) };
      } else {
        req.headers = {
          ...(req.headers ?? {}),
          rurl,
          "x-aid-name": aidName,
        };
      }
    }

    return req.headers ?? {};
  };
}

export function createClient(): ExtensionClient {
  return new ExtensionClient();
}
