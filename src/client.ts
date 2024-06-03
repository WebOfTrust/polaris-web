export interface AuthorizeArgs {
  /**
   * The optional message to provide to the extension
   */
  message?: string;
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

export interface AuthorizeResult {
  /**
   * If the extension responds with a credential, the data will be contained here.
   */
  credential?: AuthorizeResultCredential;

  /**
   * The session id of this authorization, if permissions to sign headers were requested, this
   * session id needs to be provided.
   */
  sessionId: string;
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
   * The authorization session id that for the permission to sign requests
   */
  sessionId: string;

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

export class ExtensionClient {
  #requests = new Map<string, PendingRequest>();
  #extensionIdPromise: Deferred<string | false> = new Deferred<string | false>();

  constructor() {
    this.sendMessage = this.sendMessage.bind(this);
    window.addEventListener("message", this.#handleEvent, false);
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

  isExtensionInstalled = async (timeout: number = 1000): Promise<string | false> => {
    const timer = setTimeout(() => {
      this.#extensionIdPromise.resolve(false);
    }, timeout);

    const result = await this.#extensionIdPromise;
    clearTimeout(timer);

    return result;
  };

  signRequest = async (req: SignRequestArgs): Promise<SignRequestResult> => {
    return this.sendMessage("/signify/sign-request", req);
  };

  signData = async (payload: SignDataArgs): Promise<SignDataResult> => {
    return this.sendMessage("/signify/sign-data", payload);
  };

  authorize = async (payload?: AuthorizeArgs): Promise<AuthorizeResult> => {
    return this.sendMessage("/signify/authorize", payload);
  };

  async sendMessage(type: "/signify/sign-request", payload?: SignRequestArgs): Promise<SignRequestResult>;
  async sendMessage(type: "/signify/sign-data", payload?: SignDataArgs): Promise<SignDataResult>;
  async sendMessage(type: "/signify/authorize", payload?: AuthorizeArgs): Promise<AuthorizeResult>;
  async sendMessage<TRequest, TResponse>(type: string, payload?: TRequest): Promise<TResponse> {
    const requestId = window.crypto.randomUUID();

    const promise = new Promise<TResponse>((resolve, reject) => {
      this.#requests.set(requestId, {
        resolve(value: unknown) {
          resolve(value as TResponse);
        },
        reject,
      });
    });

    window.postMessage({ requestId, type, payload }, "/");

    return promise;
  }
}

export function createClient(): ExtensionClient {
  return new ExtensionClient();
}
