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
export declare const canCallSendMessage: () => boolean;
