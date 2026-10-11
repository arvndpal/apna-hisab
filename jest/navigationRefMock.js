// Jest-only stand-in for app/navigation/navigationRef.ts. createNavigationContainerRef() is meant
// to be called once, outside any component, by the real NavigationContainer — in tests nothing
// ever renders one, so callers (push.ts's notification-tap routing, resumeLock, …) should just see
// "not ready" and no-op, matching how they already behave before a real NavigationContainer mounts.
module.exports = {
  navigationRef: { isReady: () => false, navigate: () => {}, getRootState: () => undefined, getCurrentRoute: () => undefined },
  currentRouteName: () => undefined,
};
