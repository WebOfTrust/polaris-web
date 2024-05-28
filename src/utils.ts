const isBrave = () => {
  // in brave browser, a brave namespace exists with isBrave function that returns promise
  // instead of calling that method (because it returns promise), we are just checking if it exists.
  if ("brave" in window.navigator && typeof window.navigator.brave === "object") {
    const brave = window.navigator.brave as { isBrave: { name: string } };
    return brave.isBrave.name === "isBrave";
  }

  return false;
};

const getBrowser = () => {
  // Get the user-agent string
  const { userAgent } = navigator;

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
