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

    if (event.data.type && event.data.type === "signify-extension") {
      console.log("Content script loaded from polaris-web");
      extensionId = event.data.data.extensionId;
      pubsub.publish("signify-extension-loaded", extensionId);
    }

    if (event.data.type && event.data.type === "signify-signature") {
      pubsub.publish("signify-signature", event.data.data);
    }
  },
  false
);

const requestAid = () => {
  window.postMessage({ type: "select-identifier" }, "*");
};

const requestCredential = () => {
  window.postMessage({ type: "select-credential" }, "*");
};

const requestAidORCred = () => {
  window.postMessage({ type: "select-aid-or-credential" }, "*");
};

const requestAutoSignin = async () => {
  /**
   * In chrome or brave, chrome.runtime is accessible in webpages but in other browsers
   * like firefox chrome.runtime can only be accesed by content script.
   * canCallAsync() means sendMessage api can be used otherwise we postMessage to content script that
   * communicates with service-worker.
   */
  if (canCallAsync()) {
    const { data, error } = await chrome.runtime.sendMessage(extensionId, {
      type: "fetch-resource",
      subtype: "auto-signin-signature",
    });
    if (error) {
      window.postMessage({ type: "select-auto-signin" }, "*");
    } else {
      return data;
    }
  } else {
    window.postMessage(
      {
        type: "fetch-resource",
        subtype: "auto-signin-signature",
      },
      "*"
    );
  }
};

const isExtensionInstalled = (func) => {
  const timeout = setTimeout(() => {
    func(false);
  }, 1000);
  pubsub.subscribe("signify-extension-loaded", (_event, data) => {
    func(data);
    clearTimeout(timeout);
    pubsub.unsubscribe("signify-extension-loaded");
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
};
