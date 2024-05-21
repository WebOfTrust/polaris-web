import { nanoid } from "nanoid";
import { pubsub } from "./pubsub";
import { canCallAsync } from "./utils";

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
 * 
 * @param {string} rurl resource url for which AID is requested 
 * @returns 
 */
const requestAid = (rurl) => {
  return new Promise((resolve) => {
    const requestId = nanoid();
    window.postMessage({ type: "select-identifier", requestId, rurl }, "*");
    pubsub.subscribe(requestId, (_event, data) => {
      resolve(data);
      pubsub.unsubscribe(requestId);
    });
  });
};

/**
 * 
 * @param {string} rurl resource url for which credential is requested
 * @returns 
 */
const requestCredential = (rurl) => {
  return new Promise((resolve) => {
    const requestId = nanoid();
    window.postMessage({ type: "select-credential", requestId, rurl }, "*");
    pubsub.subscribe(requestId, (_event, data) => {
      resolve(data);
      pubsub.unsubscribe(requestId);
    });
  });
};

/**
 * 
 * @param {string} rurl resource url for which AID or credential is requested
 * @returns 
 */
const requestAidORCred = (rurl) => {
  return new Promise((resolve) => {
    const requestId = nanoid();
    window.postMessage({ type: "select-aid-or-credential", requestId, rurl }, "*");
    pubsub.subscribe(requestId, (_event, data) => {
      resolve(data);
      pubsub.unsubscribe(requestId);
    });
  });
};

/**
 * 
 * @param {string} rurl resource url for which auto signin is requested
 * @returns 
 */
const requestAutoSignin = async (rurl) => {
  return new Promise(async (resolve, reject) => {
    /**
     * In chrome or brave, chrome.runtime is accessible in webpages but in other browsers
     * like firefox chrome.runtime can only be accesed by content script.
     * canCallAsync() means sendMessage api can be used otherwise we postMessage to content script that
     * communicates with service-worker.
     */
    const requestId = nanoid();
    if (canCallAsync()) {
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
          pubsub.subscribe(requestId, (_event, data) => {
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
          rurl
        },
        "*"
      );
      pubsub.subscribe(requestId, (_event, data) => {
        resolve(data);
        pubsub.unsubscribe(requestId);
      });
    }
  });
};

const signifyHeaders = async (rurl, req, aidName = "") => {
  if (aidName) {
    if (canCallAsync()) {
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

const isExtensionInstalled = () => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 1000);
    pubsub.subscribe("signify-extension-loaded", (_event, extensionId) => {
      resolve(extensionId);
      clearTimeout(timeout);
      pubsub.unsubscribe("signify-extension-loaded");
    });
  });
};

const trySettingVendorUrl = async (vendorUrl) => {
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

const subscribeToSignature = (func) => {
  pubsub.subscribe("signify-signature", (_event, data) => func(data));
};

const unsubscribeFromSignature = () => {
  pubsub.unsubscribe("signify-signature");
};

export {
  requestAid,
  requestCredential,
  requestAidORCred,
  requestAutoSignin,
  subscribeToSignature,
  unsubscribeFromSignature,
  isExtensionInstalled,
  trySettingVendorUrl,
  canCallAsync,
  signifyHeaders,
};
