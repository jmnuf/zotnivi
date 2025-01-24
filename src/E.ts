/**
 * Declaracion global de la funcion `E`
 * Recibiendo un el nombre de un elemento lo crea
 * Recibiendo el id de un elemento del documento lo busca
 * Recibiendo null o undefined regresa un fragmento
 * 
 */
export const E = <T extends DocumentFragment | Element = DocumentFragment | Element>(tag: string | null, props: Record<string, any> = {}): T => {
  const eventNameFromPropKey = (key: string) => {
    let prop = key.substring(2);
    return prop[0].toLowerCase() + prop.substring(1);
  };
  const elem = tag == null
    ? document.createDocumentFragment()
    : tag.startsWith("#") || tag.startsWith(".")
      ? document.querySelector(tag)
      : document.createElement(tag);
  if (elem == null) {
    throw new Error(`InvalidTag: ${tag}`);
  }
  const isFragment = elem instanceof DocumentFragment;
  for (const key of Object.keys(props)) {
    if (props[key] == null) continue;

    if (key == "children") {
      let children = props.children;
      if (!Array.isArray(children)) {
        children = [children];
      }
      for (const c of children.flat(Infinity)) {
        if (c == null) continue;
        elem.append(typeof c == "function" ? c() : c);
      }
      continue;
    }
    if (!isFragment) {
      if (key == "classes") {
        const classes = props.classes;
        if (typeof classes == "string") {
          elem.classList.add(...classes.split(" "));
          continue;
        }
        elem.classList.add(...classes);
        continue;
      }
      if (key.startsWith("on")) {
        const eventName = eventNameFromPropKey(key);
        const callback = props[key];
        if (typeof callback != "function") {
          console.error(`Attempting to set onto event ${eventName} callback to a non-function`);
          continue;
        }
        elem.addEventListener(eventName, props[key]);
        continue;
      }

      elem.setAttribute(key, props[key]);
    }
  }

  return elem as any;
};

E.createStore = <T extends Record<string | number, any>>(init: () => T) => {
  const data = init();
  const subscribed = {
    full: [],
    key: new Map(),
  };
  const store = {
    key: <K extends keyof T>(key: K): T[K] => {
      return data[key];
    },
    useKey: <K extends keyof T, V>(key: K, fn: (data: T[K]) => V) => {
      return fn(data[key]);
    },
    update: <K extends keyof T, V extends T[K]>(key: K, val: V): void => {
      data[key] = val;
      for (const cb of (subscribed.key.get(key) ?? [])) {
        cb(data[key]);
      }
    },
    // @ts-ignore
    subscribe: <K extends keyof T | undefined>(callback: (data: K extends undefined ? T : T[K]) => any, key: K = undefined) => {
      if (key == undefined) {
        // @ts-ignore
        subscribed.full.push(callback);
        return;
      }
      const list = subscribed.key.get(key) ?? [];
      list.push(callback);
      subscribed.key.set(key, list);
    },
    // @ts-ignore
    unsubscribe: <K extends keyof T | undefined>(callback: (data: K extends undefined ? T : T[K]) => any, key: K = undefined) => {
      if (key == undefined) {
        const list = subscribed.full;
        if (list.length == 0) {
          return;
        }
        // @ts-ignore
        const idx = list.indexOf(callback);
        if (idx < 0) {
          return;
        }
        list.slice(idx, 1);
        return;
      }
      const list = subscribed.key.get(key) ?? [];
      if (list.length == 0) {
        return;
      }
      const idx = list.indexOf(callback);
      if (idx < 0) {
        return;
      }
      list.slice(idx, 1);
    },
  };
  return store;
};

E.useSignal = <T>(initValue: T) => {
  let value = initValue;
  let subscribed: Array<(data: T) => any> = [];
  const signal = {
    get value() {
      return value;
    },
    set value(v) {
      value = v;
      for (const cb of subscribed) {
        cb(value);
      }
    },
    subscribe: (callback: (data: T) => any) => {
      subscribed.push(callback);
    },
    unsubscribe: (callback: (data: T) => any) => {
      if (subscribed.length == 0) {
        return;
      }
      const idx = subscribed.indexOf(callback);
      if (idx < 0) {
        return;
      }
      subscribed.slice(idx, 1);
    },
  };
  return signal;
};


