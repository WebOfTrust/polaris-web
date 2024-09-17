export interface SessionArgs {
  oneTime?: boolean;
}

export interface AuthorizeArgs {
  /**
   * The optional message to provide to the extension
   */
  message?: string;
  /**
   * The optional message to provide to the extension
   */
  session?: SessionArgs;
}

export interface AuthorizeResultCredential {
  /**
   * The credential data
   */
  raw: unknown;

  /**
   * The credential data as a CESR encoded key event stream
   */
  cesr: string;
}

export interface AuthorizeResultIdentifier {
  /**
   * The prefix of the selected identifier
   */
  prefix: string;
}

export interface AuthorizeResult {
  /**
   * If the extension responds with a credential, the data will be contained here.
   */
  credential?: AuthorizeResultCredential;

  /**
   * If the extension responds with an identifier, the data will be contained here.
   */
  identifier?: AuthorizeResultIdentifier;

  headers?: Record<string, string>;
}

export interface SignDataArgs {
  /**
   * The optional message to provide to the extension
   */
  message?: string;

  /**
   * The data to sign as utf-8 encoded strings
   */
  items: string[];
}

export interface SignDataResultItem {
  /**
   * The data that was signed
   */
  data: string;

  /**
   * The signature
   */
  signature: string;
}

export interface SignDataResult {
  /**
   * The prefix of the AID that signed the data.
   */
  aid: string;

  /**
   * The data and the signatures
   */
  items: SignDataResultItem[];
}

export interface SignRequestArgs {
  /**
   * The URL of the request to sign.
   */
  url: string;

  /**
   * The method of the request to sign.
   *
   * @default "GET"
   */
  method?: string;

  /**
   * Optional headers of the request.
   */
  headers?: Record<string, string>;
}

export interface SignRequestResult {
  /**
   * The Signify signed headers that should be appended to the request.
   */
  headers: Record<string, string>;
}

export interface ConfigureVendorArgs {
  /**
   * The vendor url
   */
  url: string;
}

export interface MessageData<T = unknown> {
  type: string;
  requestId: string;
  payload?: T;
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

export interface ExtensionClientOptions {
  /**
   * The target origin for the messages.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#targetorigin
   */
  targetOrigin?: string;
}

export class ExtensionClient {
  #requests = new Map<string, PendingRequest>();
  #extensionIdPromise: Deferred<string | false> = new Deferred<string | false>();

  constructor(private options: ExtensionClientOptions) {
    this.sendMessage = this.sendMessage.bind(this);
    window.addEventListener("message", this.#handleEvent, false);

    // Sending a notification to the extension that a client has been loaded. This is to avoid
    // the condition where the extension sends the "signify-extension" message before the client is loaded.
    // The idea is that the extension should send a "signify-extension" on load, but also whenever it receives
    // a signify-extension-client message.
    window.postMessage({ type: "signify-extension-client" }, this.options.targetOrigin ?? "/");
  }

  #handleEvent = async (event: MessageEvent) => {
    if (event.source !== window) {
      return;
    }

    if (!event.data || typeof event.data !== "object") {
      return;
    }

    const { requestId, type, error, payload } = event.data;

    if (!type || typeof type !== "string") {
      return;
    }

    if (type === "signify-extension") {
      this.#extensionIdPromise.resolve(event.data.data.extensionId);
      return;
    }

    if (type === "/signify/reply" && requestId && typeof requestId === "string") {
      const promise = this.#requests.get(requestId);

      if (!promise) {
        return;
      }

      if (error) {
        promise.reject(new Error(typeof error === "string" ? error : error.toString()));
      } else if (!payload || typeof payload !== "object") {
        promise.reject(new Error("No payload received in response"));
      } else {
        promise.resolve(payload);
      }

      this.#requests.delete(requestId);
    }
  };

  isExtensionInstalled = async (timeout: number = 3000): Promise<string | false> => {
    const timer = setTimeout(() => {
      this.#extensionIdPromise.resolve(false);
    }, timeout);

    const result = await this.#extensionIdPromise;
    clearTimeout(timer);

    return result;
  };

  /**
   * Sends a /signify/sign-request message to the extension.
   *
   * The extension decides whether or not it needs to prompt the user to approve the signing
   * or automatically sign the request.
   *
   * @param payload Information about the request that needs to be signed.
   * @returns
   */
  signRequest = async (payload: SignRequestArgs): Promise<SignRequestResult> => {
    return this.sendMessage("/signify/sign-request", { payload });
  };

  /**
   * Sends a /signify/sign-data message to the extension.
   *
   * The extension should prompt the user to select a credential or identifier to sign with.
   *
   * @param payload The arguments to pass to the extension.
   * @returns {AuthorizeResult}
   */
  signData = async (payload: SignDataArgs): Promise<SignDataResult> => {
    return this.sendMessage("/signify/sign-data", { payload });
  };

  /**
   * Sends a /signify/authorize message to the extension.
   *
   * The extension should prompt the user to select a credential or identifier,
   * on success, it should send a /signify/reply message back to the browser page.
   *
   * This method is used to start an authorized "session" with the extension. Depending
   * on the implemention, the extension can start to allow "signRequest" messages
   * after a successful authorization.
   *
   * @param payload The arguments to pass to the extension.
   * @returns {AuthorizeResult}
   */
  authorize = async (payload?: AuthorizeArgs): Promise<AuthorizeResult> => {
    return this.sendMessage("/signify/authorize", { payload });
  };

  /**
   * Sends a /signify/authorize message to the extension.
   *
   * The extension should prompt the user to select a identifier,
   * on success, it should send a /signify/reply message back to the browser page.
   *
   * This method is used to start an authorized "session" with the extension. Depending
   * on the implemention, the extension can start to allow "signRequest" messages
   * after a successful authorization.
   *
   * @param payload The arguments to pass to the extension.
   * @returns {AuthorizeResult}
   */
  authorizeAid = async (payload?: AuthorizeArgs): Promise<AuthorizeResult> => {
    return this.sendMessage("/signify/authorize/aid", { payload });
  };

  /**
   * Sends a /signify/authorize message to the extension.
   *
   * The extension should prompt the user to select a credential,
   * on success, it should send a /signify/reply message back to the browser page.
   *
   * This method is used to start an authorized "session" with the extension. Depending
   * on the implemention, the extension can start to allow "signRequest" messages
   * after a successful authorization.
   *
   * @param payload The arguments to pass to the extension.
   * @returns {AuthorizeResult}
   */
  authorizeCred = async (payload?: AuthorizeArgs): Promise<AuthorizeResult> => {
    return this.sendMessage("/signify/authorize/credential", { payload });
  };

  /**
   * Sends a /signify/get-session-info message to the extension.
   * prereq:
   * once webapp has received an authorized result, a session is created on the extension
   *
   * Upon successfull session, this method is used to receive previously
   * selected signature conditioned to its session validity. If session is expired this would throw an error.
   * Otherwise, it returns AuthorizeResult
   *
   * @param payload The arguments to pass to the extension.
   * @returns {AuthorizeResult}
   */
  getSessionInfo = async (payload?: AuthorizeArgs): Promise<AuthorizeResult> => {
    return this.sendMessage("/signify/get-session-info", { payload });
  };

  /**
   * Sends a /signify/clear-session message to the extension.
   *
   * This method is used to clear session with extension if exist.
   *
   * @param payload The arguments to pass to the extension.
   * @returns {AuthorizeResult}
   */
  clearSession = async (payload?: AuthorizeArgs): Promise<AuthorizeResult> => {
    return this.sendMessage("/signify/clear-session", { payload });
  };

  /**
   * Configures the extension with the specified vendor.
   * @param payload The vendor configuration
   * @summary Tries to set the vendor url in the extension to load vendor supplied info e.g theme, logo etc.
   * @example
   * ```ts
   * await signifyClient.provideConfigUrl({url: "https://api.npoint.io/52639f849bb31823a8c0"});
   * ```
   * @remarks
   * This function is used to set the vendor url in the extension. The extension will fetch the vendor supplied info from the vendor url in json format.
   *
   * @see Template for [Vendor Loaded JSON](https://api.npoint.io/52639f849bb31823a8c0)
   */
  configureVendor = async (payload?: ConfigureVendorArgs): Promise<number> => {
    this.sendMessage("/signify/configure-vendor", { payload });
    return "str";
  };

  /**
   * Sends an arbitrary message to the extension.
   *
   * This method can be used if there is no shorthand method implemented yet
   * for the message that needs to be sent.
   *
   * The message will always contain the "type" property and a unique "requestId".
   * The second parameter will be spread, this allows you to add any additional properties to the request.
   *
   * ```typescript
   * {
   *    "type": string,
   *    "requestId": string,
   *    ...payload
   * }
   * ```
   *
   * @param type
   * @param payload
   * @returns
   */
  sendMessage = async <TRequest, TResponse>(type: string, payload?: TRequest): Promise<TResponse> => {
    const requestId = window.crypto.randomUUID();

    const promise = new Promise<TResponse>((resolve, reject) => {
      this.#requests.set(requestId, {
        resolve(value: unknown) {
          resolve(value as TResponse);
        },
        reject,
      });
    });

    window.postMessage({ requestId, type, ...(payload ?? {}) }, this.options.targetOrigin ?? "/");

    return promise;
  };
}

/**
 * Creates and returns a new extension client.
 * The created instance can be used to communicate with a compatible browser extension.
 *
 * @example
 * const client = createClient();
 * const authResult = await client.authorize({ message: "A message" });
 *
 * const signResult = await client.signRequest({
 *   url: "http://example.com",
 *   method: "GET"
 * });
 *
 * await fetch("http://example.com", { headers: signResult.headers })
 *
 *
 * @returns {ExtensionClient}
 */
export function createClient(options?: ExtensionClientOptions): ExtensionClient {
  return new ExtensionClient(options ?? {});
}
