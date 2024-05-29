"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canCallSendMessage = void 0;
const isBrave = () => {
    var _a;
    // in brave browser, a brave namespace exists with isBrave function that returns promise
    // instead of calling that method (because it returns promise), we are just checking if it exists.
    return ((_a = window.navigator.brave) === null || _a === void 0 ? void 0 : _a.isBrave.name) === "isBrave";
};
const getBrowser = () => {
    // Get the user-agent string
    let { userAgent } = navigator;
    if (userAgent.indexOf("Firefox") > -1) {
        return "firefox";
    }
    if (userAgent.indexOf("Edg") > -1) {
        return "edge";
    }
    if (userAgent.indexOf("Chrome") > -1) {
        return isBrave() ? "brave" : "chrome";
    }
    if (userAgent.indexOf("Safari") > -1) {
        return "safari";
    }
    if (userAgent.indexOf("OP") > -1) {
        return "opera";
    }
};
/**
 * @returns
 * @summary Checks if the current browser can call chrome.runtime.sendMessage
 * @example
 * ```ts
 * if(canCallSendMessage()){
 *    // use chrome.runtime.sendMessage
 *    const {data, error} = await chrome.runtime.sendMessage(extentionId, {data: "some data"});
 * }
 * else {
 *  // use window.postMessage
 *  window.postMessage();
 * }
 * ```
 * @see Implementation of [requestAutoSignin](./index.requestAutoSignin.html)
 * @remarks In chrome or brave, chrome.runtime is accessible in webpages but in other browsers
 * like firefox chrome.runtime can only be accesed by content script.
 * canCallSendMessage() means sendMessage api can be used otherwise we postMessage to content script that
 * communicates with service-worker.
 * @internal
 */
const canCallSendMessage = () => {
    const browser = getBrowser();
    return browser === "brave" || browser === "chrome";
};
exports.canCallSendMessage = canCallSendMessage;
