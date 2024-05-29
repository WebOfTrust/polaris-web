import { EventMap } from "./types";

/**
 * @internal
 */
export const pubsub = (() => {
  const events: EventMap = {};

  let subscribersId = -1;

  function publish(event: string, data: any) {
    if (!events[event]) {
      return false;
    }

    const subscribers = events[event];
    subscribers.forEach((subscriber) => {
      subscriber.func(event, data);
    });
    return true;
  }

  function subscribe(event: string, func: Function) {
    if (!events[event]) {
      events[event] = [];
    }

    subscribersId += 1;
    const token = subscribersId.toString();
    events[event].push({
      token,
      func,
    });
    return token;
  }

  function unsubscribe(token: string) {
    const found = Object.keys(events).some((event) =>
      events[event].some((subscriber, index) => {
        const areEqual = subscriber.token === token.toString();
        if (areEqual) {
          events[event].splice(index, 1);
        }
        return areEqual;
      })
    );

    return found ? token : null;
  }

  return {
    publish,
    subscribe,
    unsubscribe,
  };
})();
