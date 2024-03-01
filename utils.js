const isBrave = () => {
  // in brave browser, a brave namespace exists with isBrave function that returns promise
  // instead of calling that method (because it returns promise), we are just checking if it exists.
  return window.navigator.brave?.isBrave.name === "isBrave";
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

export const canCallAsync = () => {
  const browser = getBrowser();
  return browser === "brave" || browser === "chrome";
};
