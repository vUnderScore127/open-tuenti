export const isDebugEnabled = (): boolean => {
  try {
    return import.meta.env.DEV && localStorage.getItem('debug') === '1';
  } catch {
    return false;
  }
};

export const dbg = (scope: string, ...args: any[]) => {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.debug(`[${scope}]`, ...args);
  }
};

export const group = {
  start(scope: string, ...args: any[]) {
    if (isDebugEnabled()) {
      // eslint-disable-next-line no-console
      console.group(`[${scope}]`, ...args);
    }
  },
  end() {
    if (isDebugEnabled()) {
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }
};

export const count = (label: string) => {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.count(label);
  }
};