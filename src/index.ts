import { nanoid } from "nanoid";
import { pubsub } from "./pubsub";
import { canCallSendMessage } from "./utils";
import { ISignature } from "./types";

var extensionId = "";

window.addEventListener(
  "message",
  async (event) => {
    // Accept messages only from same window
    if (event.source !== window) {
      return;
    }

    if (event.data?.type === "signify-extension") {
      console.log("Content script loaded from polaris-web");
      extensionId = event.data.data.extensionId;
      pubsub.publish("signify-extension-loaded", extensionId);
    }

    if (event.data?.type === "signify-signature" && event.data.requestId) {
      pubsub.publish(event.data.requestId, event.data.data);
    }
  },
  false
);

/**
 * @category Signed Headers
 * @param {string} rurl resource url for which AID is requested
 * @returns {Promise<ISignature>} signature with signed headers and identifier
 * @summary Requests signature for the origin url.
 * The extension listening to this request will prompt the user to select an AID.
 * @example
 * ```ts
 * const signature = await requestAid("https://example.com/resource");
 * ```
 */
const requestAid = (rurl: string): Promise<ISignature> => {
  return new Promise((resolve) => {
    const requestId = nanoid();
    window.postMessage({ type: "select-identifier", requestId, rurl }, "*");
    pubsub.subscribe(requestId, (_event: string, data: any) => {
      resolve(data);
      pubsub.unsubscribe(requestId);
    });
  });
};

/**
 * @category Signed Headers
 * @param {string} rurl resource url for which credential is requested
 * @returns {Promise<ISignature>} signature with signed headers and credential
 * @summary Requests signature for the origin url.
 * The extension listening to this request will prompt the user to select a credential.
 * @example
 * ```ts
 * const signature = await requestCredential("https://example.com/resource");
 * ```
 */
const requestCredential = (rurl: string): Promise<ISignature> => {
  return new Promise((resolve) => {
    const requestId = nanoid();
    window.postMessage({ type: "select-credential", requestId, rurl }, "*");
    pubsub.subscribe(requestId, (_event: string, data: any) => {
      resolve(data);
      pubsub.unsubscribe(requestId);
    });
  });
};

/**
 * @category Signed Headers
 * @param {string} rurl resource url for which AID or credential is requested
 * @returns {Promise<ISignature>} signature with signed headers and credential (or identifier)
 * @summary Requests signature for the origin url.
 * The extension listening to this request will prompt the user to select an AID or Credential.
 * @example
 * ```ts
 * const signature = await requestAidORCred("https://example.com/resource");
 * ```
 *
 */
const requestAidORCred = (rurl: string): Promise<ISignature> => {
  return new Promise((resolve) => {
    const requestId = nanoid();
    window.postMessage(
      { type: "select-aid-or-credential", requestId, rurl },
      "*"
    );
    pubsub.subscribe(requestId, (_event: string, data: any) => {
      resolve(data);
      pubsub.unsubscribe(requestId);
    });
  });
};

/**
 * @category Signed Headers
 * @param {string} rurl resource url for which auto signin is requested
 * @returns {Promise<ISignature>} signature with signed headers and credential (or identifier)
 * @summary Requests auto signin signature for the origin url
 * @example
 * ```ts
 * const signature = await requestAutoSignin("https://example.com/resource");
 * ```
 * @remarks
 * Auto signin means the user has already created a signin pair for (the origin url + credential) and marked that as auto signin.
 */
const requestAutoSignin = async (rurl: string): Promise<ISignature> => {
  return new Promise(async (resolve, reject) => {
    const requestId = nanoid();
    if (canCallSendMessage()) {
      const { data, error } = await chrome.runtime.sendMessage(extensionId, {
        type: "fetch-resource",
        subtype: "auto-signin-signature",
        data: {
          rurl,
        },
      });
      if (error) {
        if (error.code === 404) {
          window.postMessage(
            { type: "select-auto-signin", requestId, rurl },
            "*"
          );
          pubsub.subscribe(requestId, (_event: string, data: any) => {
            resolve(data);
            pubsub.unsubscribe(requestId);
          });
        } else {
          reject(error);
        }
      } else {
        resolve(data);
      }
    } else {
      window.postMessage(
        {
          type: "fetch-resource",
          subtype: "auto-signin-signature",
          requestId,
          rurl,
        },
        "*"
      );
      pubsub.subscribe(requestId, (_event: string, data: any) => {
        resolve(data);
        pubsub.unsubscribe(requestId);
      });
    }
  });
};

/**
 * @category Signed Headers
 * @param {string} rurl resource url for signed headers are requested
 * @param {RequestInit} req request headers
 * @param {string} aidName name associated with AID for which signed headers are requested
 * @returns {Promise<HeadersInit>} signed headers
 * @example
 * ```ts
 * const headers = await signifyHeaders(
      "https://example.com/resource",
      request,
      signin?.identifier?.name ?? signin.credential?.issueeName
    );
    return fetch(rurl, { ...request, headers });
 * ```
 * @summary Adds signed headers to the request headers, provided the aidName
 * @remarks
 * The extension will check if there exists a signin pair for the origin url and aidName that has autoSignin flag as true. 
 * Headers are not signed otherwise.
 */
const signifyHeaders = async (rurl: string, req: RequestInit, aidName = "") => {
  if (aidName) {
    if (canCallSendMessage()) {
      const { data, error } = await chrome.runtime.sendMessage(extensionId, {
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
  return req.headers;
};

/**
 * @category Config
 * @returns extensionId if extension is installed otherwise false
 * @summary Checks if signify extension is installed
 * @example
 * ```ts
 * const extensionId = await isExtensionInstalled();
 * setExtensionInstalled(Boolean(extensionId));
 * ```
 */

const isExtensionInstalled = (): Promise<boolean | string> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 1000);
    pubsub.subscribe(
      "signify-extension-loaded",
      (_event: string, extensionId: string) => {
        resolve(extensionId);
        clearTimeout(timeout);
        pubsub.unsubscribe("signify-extension-loaded");
      }
    );
  });
};

/**
 * @category Config
 * @param {string} vendorUrl vendor url to be set
 * @summary Tries to set the vendor url in the extension to load vendor supplied info e.g theme, logo etc.
 * @example
 * ```ts
 * await trySettingVendorUrl("https://api.npoint.io/52639f849bb31823a8c0");
 * ```
 * @remarks
 * This function is used to set the vendor url in the extension. The extension will fetch the vendor supplied info from the vendor url in json format.
 * 
 * @see Template for [Vendor Loaded JSON](https://api.npoint.io/52639f849bb31823a8c0)
 */

const trySettingVendorUrl = async (vendorUrl: string) => {
  window.postMessage(
    {
      type: "vendor-info",
      subtype: "attempt-set-vendor-url",
      data: {
        vendorUrl,
      },
    },
    "*"
  );
};

export {
  requestAid,
  requestCredential,
  requestAidORCred,
  requestAutoSignin,
  isExtensionInstalled,
  trySettingVendorUrl,
  signifyHeaders,
};
