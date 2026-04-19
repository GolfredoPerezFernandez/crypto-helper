import 'dotenv/config';

// @builder.io/qwik/build
const isServer = true;

/**
 * @license
 * @builder.io/qwik 1.19.2
 * Copyright Builder.io, Inc. All Rights Reserved.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/QwikDev/qwik/blob/main/LICENSE
 */
const qDev$1 = true;
const qSerialize = true;
const qDynamicPlatform = globalThis.qDynamicPlatform !== false;
const qRuntimeQrl = globalThis.qRuntimeQrl === true;
const seal = (obj) => {
  {
    Object.seal(obj);
  }
};
const isNode$1 = (value) => {
  return value && typeof value.nodeType === "number";
};
const isDocument = (value) => {
  return value.nodeType === 9;
};
const isElement$1 = (value) => {
  return value.nodeType === 1;
};
const isQwikElement = (value) => {
  const nodeType = value.nodeType;
  return nodeType === 1 || nodeType === 111;
};
const isNodeElement = (value) => {
  const nodeType = value.nodeType;
  return nodeType === 1 || nodeType === 111 || nodeType === 3;
};
const isVirtualElement = (value) => {
  return value.nodeType === 111;
};
const isText = (value) => {
  return value.nodeType === 3;
};
const isComment = (value) => {
  return value.nodeType === 8;
};
const STYLE$1 = `background: #564CE0; color: white; padding: 2px 3px; border-radius: 2px; font-size: 0.8em;` ;
const logError = (message, ...optionalParams) => {
  return createAndLogError$1(false, message, ...optionalParams);
};
const throwErrorAndStop = (message, ...optionalParams) => {
  const error = createAndLogError$1(false, message, ...optionalParams);
  debugger;
  throw error;
};
const logErrorAndStop$1 = (message, ...optionalParams) => {
  const err = createAndLogError$1(qDev$1, message, ...optionalParams);
  debugger;
  return err;
};
const _printed = /* @__PURE__ */ new Set();
const logOnceWarn = (message, ...optionalParams) => {
  {
    const key = "warn" + String(message);
    if (!_printed.has(key)) {
      _printed.add(key);
      logWarn$1(message, ...optionalParams);
    }
  }
};
const logWarn$1 = (message, ...optionalParams) => {
  {
    console.warn("%cQWIK WARN", STYLE$1, message, ...printParams$1(optionalParams));
  }
};
const logDebug$1 = (message, ...optionalParams) => {
  {
    console.debug("%cQWIK", STYLE$1, message, ...printParams$1(optionalParams));
  }
};
const tryGetContext$1 = (element) => {
  return element["_qc_"];
};
const printParams$1 = (optionalParams) => {
  {
    return optionalParams.map((p2) => {
      if (isNode$1(p2) && isElement$1(p2)) {
        return printElement$1(p2);
      }
      return p2;
    });
  }
};
const printElement$1 = (el) => {
  const ctx = tryGetContext$1(el);
  const isServer3 = /* @__PURE__ */ (() => typeof process !== "undefined" && !!process.versions && !!process.versions.node)();
  return {
    tagName: el.tagName,
    renderQRL: ctx?.$componentQrl$?.getSymbol(),
    element: isServer3 ? void 0 : el,
    ctx: isServer3 ? void 0 : ctx
  };
};
const createAndLogError$1 = (asyncThrow, message, ...optionalParams) => {
  const err = message instanceof Error ? message : new Error(message);
  console.error("%cQWIK ERROR", STYLE$1, err.message, ...printParams$1(optionalParams), err.stack);
  asyncThrow && true && setTimeout(() => {
    throw err;
  }, 0);
  return err;
};
const ASSERT_DISCLAIMER = "Internal assert, this is likely caused by a bug in Qwik: ";
function assertDefined(value, text, ...parts) {
  {
    if (value != null) {
      return;
    }
    throwErrorAndStop(ASSERT_DISCLAIMER + text, ...parts);
  }
}
function assertEqual(value1, value2, text, ...parts) {
  {
    if (value1 === value2) {
      return;
    }
    throwErrorAndStop(ASSERT_DISCLAIMER + text, ...parts);
  }
}
function assertFail(text, ...parts) {
  {
    throwErrorAndStop(ASSERT_DISCLAIMER + text, ...parts);
  }
}
function assertTrue(value1, text, ...parts) {
  {
    if (value1 === true) {
      return;
    }
    throwErrorAndStop(ASSERT_DISCLAIMER + text, ...parts);
  }
}
function assertNumber(value1, text, ...parts) {
  {
    if (typeof value1 === "number") {
      return;
    }
    throwErrorAndStop(ASSERT_DISCLAIMER + text, ...parts);
  }
}
function assertString(value1, text, ...parts) {
  {
    if (typeof value1 === "string") {
      return;
    }
    throwErrorAndStop(ASSERT_DISCLAIMER + text, ...parts);
  }
}
function assertQwikElement(el) {
  {
    if (!isQwikElement(el)) {
      console.error("Not a Qwik Element, got", el);
      throwErrorAndStop(ASSERT_DISCLAIMER + "Not a Qwik Element");
    }
  }
}
function assertElement(el) {
  {
    if (!isElement$1(el)) {
      console.error("Not a Element, got", el);
      throwErrorAndStop(ASSERT_DISCLAIMER + "Not an Element");
    }
  }
}
const codeToText$1 = (code, ...parts) => {
  {
    const MAP = [
      "Error while serializing class or style attributes",
      // 0
      "Can not serialize a HTML Node that is not an Element",
      // 1
      "Runtime but no instance found on element.",
      // 2
      "Only primitive and object literals can be serialized",
      // 3
      "Crash while rendering",
      // 4
      "You can render over a existing q:container. Skipping render().",
      // 5
      "Set property {{0}}",
      // 6
      "Only function's and 'string's are supported.",
      // 7
      "Only objects can be wrapped in 'QObject'",
      // 8
      `Only objects literals can be wrapped in 'QObject'`,
      // 9
      "QRL is not a function",
      // 10
      "Dynamic import not found",
      // 11
      "Unknown type argument",
      // 12
      `Actual value for useContext({{0}}) can not be found, make sure some ancestor component has set a value using useContextProvider(). In the browser make sure that the context was used during SSR so its state was serialized.`,
      // 13
      "Invoking 'use*()' method outside of invocation context.",
      // 14
      "Cant access renderCtx for existing context",
      // 15
      "Cant access document for existing context",
      // 16
      "props are immutable",
      // 17
      "<div> component can only be used at the root of a Qwik component$()",
      // 18
      "Props are immutable by default.",
      // 19
      `Calling a 'use*()' method outside 'component$(() => { HERE })' is not allowed. 'use*()' methods provide hooks to the 'component$' state and lifecycle, ie 'use' hooks can only be called synchronously within the 'component$' function or another 'use' method.
See https://qwik.dev/docs/core/tasks/#use-method-rules`,
      // 20
      "Container is already paused. Skipping",
      // 21
      "",
      // 22 -- unused
      "When rendering directly on top of Document, the root node must be a <html>",
      // 23
      "A <html> node must have 2 children. The first one <head> and the second one a <body>",
      // 24
      'Invalid JSXNode type "{{0}}". It must be either a function or a string. Found:',
      // 25
      "Tracking value changes can only be done to useStore() objects and component props",
      // 26
      "Missing Object ID for captured object",
      // 27
      'The provided Context reference "{{0}}" is not a valid context created by createContextId()',
      // 28
      "<html> is the root container, it can not be rendered inside a component",
      // 29
      "QRLs can not be resolved because it does not have an attached container. This means that the QRL does not know where it belongs inside the DOM, so it cant dynamically import() from a relative path.",
      // 30
      "QRLs can not be dynamically resolved, because it does not have a chunk path",
      // 31
      "The JSX ref attribute must be a Signal"
      // 32
    ];
    let text = MAP[code] ?? "";
    if (parts.length) {
      text = text.replaceAll(/{{(\d+)}}/g, (_, index) => {
        let v = parts[index];
        if (v && typeof v === "object" && v.constructor === Object) {
          v = JSON.stringify(v).slice(0, 50);
        }
        return v;
      });
    }
    return `Code(${code}): ${text}`;
  }
};
const QError_stringifyClassOrStyle = 0;
const QError_verifySerializable = 3;
const QError_setProperty = 6;
const QError_qrlIsNotFunction = 10;
const QError_dynamicImportFailed$1 = 11;
const QError_notFoundContext = 13;
const QError_useMethodOutsideContext = 14;
const QError_immutableProps = 17;
const QError_useInvokeContext = 20;
const QError_containerAlreadyPaused = 21;
const QError_invalidJsxNodeType = 25;
const QError_trackUseStore = 26;
const QError_missingObjectId = 27;
const QError_invalidContext = 28;
const QError_canNotRenderHTML = 29;
const QError_qrlMissingChunk = 31;
const QError_invalidRefValue = 32;
const qError$1 = (code, ...parts) => {
  const text = codeToText$1(code, ...parts);
  return logErrorAndStop$1(text, ...parts);
};
const createPlatform$1 = () => {
  return {
    isServer,
    importSymbol(containerEl, url, symbolName) {
      {
        const hash2 = getSymbolHash$1(symbolName);
        const regSym = globalThis.__qwik_reg_symbols?.get(hash2);
        if (regSym) {
          return regSym;
        }
        throw qError$1(QError_dynamicImportFailed$1, symbolName);
      }
    },
    raf: (fn) => {
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          resolve(fn());
        });
      });
    },
    nextTick: (fn) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(fn());
        });
      });
    },
    chunkForSymbol(symbolName, chunk) {
      return [symbolName, chunk ?? "_"];
    }
  };
};
let _platform = /* @__PURE__ */ createPlatform$1();
const setPlatform = (plt) => _platform = plt;
const getPlatform = () => {
  return _platform;
};
const isServerPlatform = () => {
  if (qDynamicPlatform) {
    return _platform.isServer;
  }
  return false;
};
const isSerializableObject = (v) => {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};
const isObject = (v) => {
  return !!v && typeof v === "object";
};
const isArray = (v) => {
  return Array.isArray(v);
};
const isString = (v) => {
  return typeof v === "string";
};
const isFunction = (v) => {
  return typeof v === "function";
};
const isPromise$1 = (value) => {
  return value && typeof value.then === "function";
};
const safeCall = (call, thenFn, rejectFn) => {
  try {
    const promise = call();
    if (isPromise$1(promise)) {
      return promise.then(thenFn, rejectFn);
    } else {
      return thenFn(promise);
    }
  } catch (e) {
    return rejectFn(e);
  }
};
const maybeThen = (promise, thenFn) => {
  return isPromise$1(promise) ? promise.then(thenFn) : thenFn(promise);
};
const promiseAll = (promises) => {
  const hasPromise = promises.some(isPromise$1);
  if (hasPromise) {
    return Promise.all(promises);
  }
  return promises;
};
const promiseAllLazy = (promises) => {
  if (promises.length > 0) {
    return Promise.all(promises);
  }
  return promises;
};
const isNotNullable = (v) => {
  return v != null;
};
const delay = (timeout) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};
const EMPTY_ARRAY = [];
const EMPTY_OBJ = {};
{
  Object.freeze(EMPTY_ARRAY);
  Object.freeze(EMPTY_OBJ);
}
const getDocument = (node) => {
  if (!qDynamicPlatform) {
    return document;
  }
  if (typeof document !== "undefined") {
    return document;
  }
  if (node.nodeType === 9) {
    return node;
  }
  const doc = node.ownerDocument;
  assertDefined(doc, "doc must be defined");
  return doc;
};
const OnRenderProp = "q:renderFn";
const QSlot = "q:slot";
const QSlotRef = "q:sref";
const QSlotS = "q:s";
const QStyle = "q:style";
const QScopedStyle = "q:sstyle";
const QInstance$1 = "q:instance";
const QFuncsPrefix = "qFuncs_";
const getQFuncs = (document2, hash2) => {
  return document2[QFuncsPrefix + hash2] || [];
};
const QLocaleAttr = "q:locale";
const QContainerAttr = "q:container";
const QContainerSelector = "[q\\:container]";
const ResourceEvent = "qResource";
const ComputedEvent = "qComputed";
const RenderEvent = "qRender";
const TaskEvent = "qTask";
const ELEMENT_ID = "q:id";
const ELEMENT_ID_PREFIX = "#";
const QObjectRecursive = 1 << 0;
const QObjectImmutable = 1 << 1;
const QOjectTargetSymbol = /* @__PURE__ */ Symbol("proxy target");
const QObjectFlagsSymbol = /* @__PURE__ */ Symbol("proxy flags");
const QObjectManagerSymbol = /* @__PURE__ */ Symbol("proxy manager");
const _IMMUTABLE = /* @__PURE__ */ Symbol("IMMUTABLE");
const _IMMUTABLE_PREFIX = "$$";
const VIRTUAL_SYMBOL = "__virtual";
const Q_CTX = "_qc_";
const directSetAttribute = (el, prop, value) => {
  return el.setAttribute(prop, value);
};
const directGetAttribute = (el, prop) => {
  return el.getAttribute(prop);
};
const fromCamelToKebabCase = (text) => {
  return text.replace(/([A-Z])/g, "-$1").toLowerCase();
};
const fromKebabToCamelCase = (text) => {
  return text.replace(/-./g, (x) => x[1].toUpperCase());
};
const emitEvent$1 = (el, eventName, detail, bubbles) => {
  if ((typeof CustomEvent === "function")) {
    if (el) {
      el.dispatchEvent(new CustomEvent(eventName, {
        detail,
        bubbles,
        composed: bubbles
      }));
    }
  }
};
const getOrCreateProxy = (target, containerState, flags = 0) => {
  const proxy = containerState.$proxyMap$.get(target);
  if (proxy) {
    return proxy;
  }
  if (flags !== 0) {
    setObjectFlags(target, flags);
  }
  return createProxy(target, containerState, void 0);
};
const createProxy = (target, containerState, subs) => {
  assertEqual(unwrapProxy(target), target, "Unexpected proxy at this location", target);
  assertTrue(!containerState.$proxyMap$.has(target), "Proxy was already created", target);
  assertTrue(isObject(target), "Target must be an object");
  assertTrue(isSerializableObject(target) || isArray(target), "Target must be a serializable object");
  const manager = containerState.$subsManager$.$createManager$(subs);
  const proxy = new Proxy(target, new ReadWriteProxyHandler(containerState, manager));
  containerState.$proxyMap$.set(target, proxy);
  return proxy;
};
const createPropsState = () => {
  const props = {};
  setObjectFlags(props, QObjectImmutable);
  return props;
};
const setObjectFlags = (obj, flags) => {
  Object.defineProperty(obj, QObjectFlagsSymbol, { value: flags, enumerable: false });
};
class ReadWriteProxyHandler {
  $containerState$;
  $manager$;
  constructor($containerState$, $manager$) {
    this.$containerState$ = $containerState$;
    this.$manager$ = $manager$;
  }
  deleteProperty(target, prop) {
    if (target[QObjectFlagsSymbol] & QObjectImmutable) {
      throw qError$1(QError_immutableProps);
    }
    if (typeof prop != "string" || !delete target[prop]) {
      return false;
    }
    this.$manager$.$notifySubs$(isArray(target) ? void 0 : prop);
    return true;
  }
  get(target, prop) {
    if (typeof prop === "symbol") {
      if (prop === QOjectTargetSymbol) {
        return target;
      }
      if (prop === QObjectManagerSymbol) {
        return this.$manager$;
      }
      return target[prop];
    }
    const flags = target[QObjectFlagsSymbol] ?? 0;
    assertNumber(flags, "flags must be an number");
    const invokeCtx = tryGetInvokeContext();
    const recursive = (flags & QObjectRecursive) !== 0;
    const immutable = (flags & QObjectImmutable) !== 0;
    const hiddenSignal = target[_IMMUTABLE_PREFIX + prop];
    let subscriber;
    let value;
    if (invokeCtx) {
      subscriber = invokeCtx.$subscriber$;
    }
    if (immutable && (!(prop in target) || immutableValue(target[_IMMUTABLE]?.[prop]))) {
      subscriber = null;
    }
    if (hiddenSignal) {
      assertTrue(isSignal(hiddenSignal), "$$ prop must be a signal");
      value = hiddenSignal.value;
      subscriber = null;
    } else {
      value = target[prop];
    }
    if (subscriber) {
      const isA = isArray(target);
      this.$manager$.$addSub$(subscriber, isA ? void 0 : prop);
    }
    return recursive ? wrap(value, this.$containerState$) : value;
  }
  set(target, prop, newValue) {
    if (typeof prop === "symbol") {
      target[prop] = newValue;
      return true;
    }
    const flags = target[QObjectFlagsSymbol] ?? 0;
    assertNumber(flags, "flags must be an number");
    const immutable = (flags & QObjectImmutable) !== 0;
    if (immutable) {
      throw qError$1(QError_immutableProps);
    }
    const recursive = (flags & QObjectRecursive) !== 0;
    const unwrappedNewValue = recursive ? unwrapProxy(newValue) : newValue;
    {
      {
        verifySerializable(unwrappedNewValue);
      }
      const invokeCtx = tryGetInvokeContext();
      if (invokeCtx) {
        if (invokeCtx.$event$ === RenderEvent) {
          logError("State mutation inside render function. Move mutation to useTask$() or useVisibleTask$()", prop);
        } else if (invokeCtx.$event$ === ComputedEvent) {
          logWarn$1("State mutation inside useComputed$() is an antipattern. Use useTask$() instead", invokeCtx.$hostElement$);
        } else if (invokeCtx.$event$ === ResourceEvent) {
          logWarn$1("State mutation inside useResource$() is an antipattern. Use useTask$() instead", invokeCtx.$hostElement$);
        }
      }
    }
    const isA = isArray(target);
    if (isA) {
      target[prop] = unwrappedNewValue;
      this.$manager$.$notifySubs$();
      return true;
    }
    const oldValue = target[prop];
    target[prop] = unwrappedNewValue;
    if (oldValue !== unwrappedNewValue) {
      this.$manager$.$notifySubs$(prop);
    }
    return true;
  }
  has(target, prop) {
    if (prop === QOjectTargetSymbol) {
      return true;
    }
    const invokeCtx = tryGetInvokeContext();
    if (typeof prop === "string" && invokeCtx) {
      const subscriber = invokeCtx.$subscriber$;
      if (subscriber) {
        const isA = isArray(target);
        this.$manager$.$addSub$(subscriber, isA ? void 0 : prop);
      }
    }
    const hasOwnProperty = Object.prototype.hasOwnProperty;
    if (hasOwnProperty.call(target, prop)) {
      return true;
    }
    if (typeof prop === "string" && hasOwnProperty.call(target, _IMMUTABLE_PREFIX + prop)) {
      return true;
    }
    return false;
  }
  ownKeys(target) {
    const flags = target[QObjectFlagsSymbol] ?? 0;
    assertNumber(flags, "flags must be an number");
    const immutable = (flags & QObjectImmutable) !== 0;
    if (!immutable) {
      let subscriber = null;
      const invokeCtx = tryGetInvokeContext();
      if (invokeCtx) {
        subscriber = invokeCtx.$subscriber$;
      }
      if (subscriber) {
        this.$manager$.$addSub$(subscriber);
      }
    }
    if (isArray(target)) {
      return Reflect.ownKeys(target);
    }
    return Reflect.ownKeys(target).map((a2) => {
      return typeof a2 === "string" && a2.startsWith(_IMMUTABLE_PREFIX) ? a2.slice(_IMMUTABLE_PREFIX.length) : a2;
    });
  }
  getOwnPropertyDescriptor(target, prop) {
    const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
    if (isArray(target) || typeof prop === "symbol") {
      return descriptor;
    }
    if (descriptor && !descriptor.configurable) {
      return descriptor;
    }
    return {
      enumerable: true,
      configurable: true
    };
  }
}
const immutableValue = (value) => {
  return value === _IMMUTABLE || isSignal(value);
};
const wrap = (value, containerState) => {
  if (isObject(value)) {
    if (Object.isFrozen(value)) {
      return value;
    }
    const nakedValue = unwrapProxy(value);
    if (nakedValue !== value) {
      return value;
    }
    if (fastSkipSerialize(nakedValue)) {
      return value;
    }
    if (isSerializableObject(nakedValue) || isArray(nakedValue)) {
      const proxy = containerState.$proxyMap$.get(nakedValue);
      return proxy ? proxy : getOrCreateProxy(nakedValue, containerState, QObjectRecursive);
    }
  }
  return value;
};
const ON_PROP_REGEX = /^(on|window:|document:)/;
const PREVENT_DEFAULT = "preventdefault:";
const isOnProp = (prop) => {
  return prop.endsWith("$") && ON_PROP_REGEX.test(prop);
};
const groupListeners = (listeners) => {
  if (listeners.length === 0) {
    return EMPTY_ARRAY;
  }
  if (listeners.length === 1) {
    const listener = listeners[0];
    return [[listener[0], [listener[1]]]];
  }
  const keys = [];
  for (let i = 0; i < listeners.length; i++) {
    const eventName = listeners[i][0];
    if (!keys.includes(eventName)) {
      keys.push(eventName);
    }
  }
  return keys.map((eventName) => {
    return [eventName, listeners.filter((l) => l[0] === eventName).map((a2) => a2[1])];
  });
};
const setEvent = (existingListeners, prop, input, containerEl) => {
  assertTrue(prop.endsWith("$"), "render: event property does not end with $", prop);
  prop = normalizeOnProp(prop.slice(0, -1));
  if (input) {
    if (isArray(input)) {
      const processed = input.flat(Infinity).filter((q) => q != null).map((q) => [prop, ensureQrl(q, containerEl)]);
      existingListeners.push(...processed);
    } else {
      existingListeners.push([prop, ensureQrl(input, containerEl)]);
    }
  }
  return prop;
};
const PREFIXES = ["on", "window:on", "document:on"];
const SCOPED = ["on", "on-window", "on-document"];
const normalizeOnProp = (prop) => {
  let scope = "on";
  for (let i = 0; i < PREFIXES.length; i++) {
    const prefix = PREFIXES[i];
    if (prop.startsWith(prefix)) {
      scope = SCOPED[i];
      prop = prop.slice(prefix.length);
      break;
    }
  }
  if (prop.startsWith("-")) {
    prop = fromCamelToKebabCase(prop.slice(1));
  } else {
    prop = prop.toLowerCase();
  }
  return scope + ":" + prop;
};
const ensureQrl = (value, containerEl) => {
  if (!qRuntimeQrl) {
    assertQrl(value);
    value.$setContainer$(containerEl);
    return value;
  }
  const qrl2 = isQrl(value) ? value : $(value);
  qrl2.$setContainer$(containerEl);
  return qrl2;
};
const getDomListeners = (elCtx, containerEl) => {
  const attributes = elCtx.$element$.attributes;
  const listeners = [];
  for (let i = 0; i < attributes.length; i++) {
    const { name, value } = attributes.item(i);
    if (name.startsWith("on:") || name.startsWith("on-window:") || name.startsWith("on-document:")) {
      const urls = value.split("\n");
      for (const url of urls) {
        const qrl2 = parseQRL(url, containerEl);
        if (qrl2.$capture$) {
          inflateQrl(qrl2, elCtx);
        }
        listeners.push([name, qrl2]);
      }
    }
  }
  return listeners;
};
const hashCode = (text, hash2 = 0) => {
  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i);
    hash2 = (hash2 << 5) - hash2 + chr;
    hash2 |= 0;
  }
  return Number(Math.abs(hash2)).toString(36);
};
const styleKey = (qStyles, index) => {
  assertQrl(qStyles);
  return `${hashCode(qStyles.$hash$)}-${index}`;
};
const serializeSStyle = (scopeIds) => {
  const value = scopeIds.join("|");
  if (value.length > 0) {
    return value;
  }
  return void 0;
};
const version = "1.19.2";
const useSequentialScope = () => {
  const iCtx = useInvokeContext();
  const hostElement = iCtx.$hostElement$;
  const elCtx = getContext(hostElement, iCtx.$renderCtx$.$static$.$containerState$);
  const seq = elCtx.$seq$ ||= [];
  const i = iCtx.$i$++;
  const set = (value) => {
    {
      verifySerializable(value);
    }
    return seq[i] = value;
  };
  return {
    val: seq[i],
    set,
    i,
    iCtx,
    elCtx
  };
};
const createContextId = (name) => {
  assertTrue(/^[\w/.-]+$/.test(name), "Context name must only contain A-Z,a-z,0-9, _", name);
  return /* @__PURE__ */ Object.freeze({
    id: fromCamelToKebabCase(name)
  });
};
const useContextProvider = (context, newValue) => {
  const { val, set, elCtx } = useSequentialScope();
  if (val !== void 0) {
    return;
  }
  {
    validateContext(context);
  }
  const contexts = elCtx.$contexts$ ||= /* @__PURE__ */ new Map();
  {
    verifySerializable(newValue);
  }
  contexts.set(context.id, newValue);
  set(true);
};
const useContext = (context, defaultValue) => {
  const { val, set, iCtx, elCtx } = useSequentialScope();
  if (val !== void 0) {
    return val;
  }
  {
    validateContext(context);
  }
  const value = resolveContext(context, elCtx, iCtx.$renderCtx$.$static$.$containerState$);
  if (value !== void 0) {
    return set(value);
  }
  throw qError$1(QError_notFoundContext, context.id);
};
const findParentCtx = (el, containerState) => {
  let node = el;
  let stack = 1;
  while (node && !node.hasAttribute?.("q:container")) {
    while (node = node.previousSibling) {
      if (isComment(node)) {
        const virtual = node[VIRTUAL_SYMBOL];
        if (virtual) {
          const qtx = virtual[Q_CTX];
          if (node === virtual.open) {
            return qtx ?? getContext(virtual, containerState);
          }
          if (qtx?.$parentCtx$) {
            return qtx.$parentCtx$;
          }
          node = virtual;
          continue;
        }
        if (node.data === "/qv") {
          stack++;
        } else if (node.data.startsWith("qv ")) {
          stack--;
          if (stack === 0) {
            return getContext(getVirtualElement(node), containerState);
          }
        }
      }
    }
    node = el.parentElement;
    el = node;
  }
  return null;
};
const getParentProvider = (ctx, containerState) => {
  if (ctx.$parentCtx$ === void 0) {
    ctx.$parentCtx$ = findParentCtx(ctx.$element$, containerState);
  }
  return ctx.$parentCtx$;
};
const resolveContext = (context, hostCtx, containerState) => {
  const contextID = context.id;
  if (!hostCtx) {
    return;
  }
  let ctx = hostCtx;
  while (ctx) {
    const found = ctx.$contexts$?.get(contextID);
    if (found) {
      return found;
    }
    ctx = getParentProvider(ctx, containerState);
  }
};
const validateContext = (context) => {
  if (!isObject(context) || typeof context.id !== "string" || context.id.length === 0) {
    throw qError$1(QError_invalidContext, context);
  }
};
const ERROR_CONTEXT = /* @__PURE__ */ createContextId("qk-error");
const handleError = (err, hostElement, rCtx) => {
  const elCtx = tryGetContext$2(hostElement);
  {
    if (!isServerPlatform() && typeof document !== "undefined" && isVirtualElement(hostElement)) {
      elCtx.$vdom$ = null;
      const errorDiv = document.createElement("errored-host");
      if (err && err instanceof Error) {
        errorDiv.props = { error: err };
      }
      errorDiv.setAttribute("q:key", "_error_");
      errorDiv.append(...hostElement.childNodes);
      hostElement.appendChild(errorDiv);
    }
    if (err && err instanceof Error) {
      if (!("hostElement" in err)) {
        err["hostElement"] = hostElement;
      }
    }
    if (!isRecoverable(err)) {
      throw err;
    }
  }
  if (isServerPlatform()) {
    throw err;
  } else {
    const errorStore = resolveContext(ERROR_CONTEXT, elCtx, rCtx.$static$.$containerState$);
    if (errorStore === void 0) {
      throw err;
    }
    errorStore.error = err;
  }
};
const isRecoverable = (err) => {
  if (err && err instanceof Error) {
    if ("plugin" in err) {
      return false;
    }
  }
  return true;
};
const unitlessNumbers = /* @__PURE__ */ new Set([
  "animationIterationCount",
  "aspectRatio",
  "borderImageOutset",
  "borderImageSlice",
  "borderImageWidth",
  "boxFlex",
  "boxFlexGroup",
  "boxOrdinalGroup",
  "columnCount",
  "columns",
  "flex",
  "flexGrow",
  "flexShrink",
  "gridArea",
  "gridRow",
  "gridRowEnd",
  "gridRowStart",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnStart",
  "fontWeight",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
  "MozAnimationIterationCount",
  // Known Prefixed Properties
  "MozBoxFlex",
  // TODO: Remove these since they shouldn't be used in modern code
  "msFlex",
  "msFlexPositive",
  "WebkitAnimationIterationCount",
  "WebkitBoxFlex",
  "WebkitBoxOrdinalGroup",
  "WebkitColumnCount",
  "WebkitColumns",
  "WebkitFlex",
  "WebkitFlexGrow",
  "WebkitFlexShrink",
  "WebkitLineClamp"
]);
const isUnitlessNumber = (name) => {
  return unitlessNumbers.has(name);
};
const executeComponent = (rCtx, elCtx, attempt) => {
  elCtx.$flags$ &= ~HOST_FLAG_DIRTY;
  elCtx.$flags$ |= HOST_FLAG_MOUNTED;
  elCtx.$slots$ = [];
  elCtx.li.length = 0;
  const hostElement = elCtx.$element$;
  const componentQRL = elCtx.$componentQrl$;
  const props = elCtx.$props$;
  const iCtx = newInvokeContext(rCtx.$static$.$locale$, hostElement, void 0, RenderEvent);
  const waitOn = iCtx.$waitOn$ = [];
  assertDefined(componentQRL, `render: host element to render must have a $renderQrl$:`, elCtx);
  assertDefined(props, `render: host element to render must have defined props`, elCtx);
  const newCtx = pushRenderContext(rCtx);
  newCtx.$cmpCtx$ = elCtx;
  newCtx.$slotCtx$ = void 0;
  iCtx.$subscriber$ = [0, hostElement];
  iCtx.$renderCtx$ = rCtx;
  componentQRL.$setContainer$(rCtx.$static$.$containerState$.$containerEl$);
  const componentFn = componentQRL.getFn(iCtx);
  return safeCall(() => componentFn(props), (jsxNode) => {
    return maybeThen(isServerPlatform() ? maybeThen(promiseAllLazy(waitOn), () => (
      // Run dirty tasks before SSR output is generated.
      maybeThen(executeSSRTasks(rCtx.$static$.$containerState$, rCtx), () => promiseAllLazy(waitOn))
    )) : promiseAllLazy(waitOn), () => {
      if (elCtx.$flags$ & HOST_FLAG_DIRTY) {
        if (attempt && attempt > 100) {
          logWarn$1(`Infinite loop detected. Element: ${elCtx.$componentQrl$?.$symbol$}`);
        } else {
          return executeComponent(rCtx, elCtx, attempt ? attempt + 1 : 1);
        }
      }
      return {
        node: jsxNode,
        rCtx: newCtx
      };
    });
  }, (err) => {
    if (err === SignalUnassignedException) {
      if (attempt && attempt > 100) {
        logWarn$1(`Infinite loop detected. Element: ${elCtx.$componentQrl$?.$symbol$}`);
      } else {
        return maybeThen(promiseAllLazy(waitOn), () => {
          return executeComponent(rCtx, elCtx, attempt ? attempt + 1 : 1);
        });
      }
    }
    handleError(err, hostElement, rCtx);
    return {
      node: SkipRender,
      rCtx: newCtx
    };
  });
};
const createRenderContext = (doc, containerState) => {
  const ctx = {
    $static$: {
      $doc$: doc,
      $locale$: containerState.$serverData$.locale,
      $containerState$: containerState,
      $hostElements$: /* @__PURE__ */ new Set(),
      $operations$: [],
      $postOperations$: [],
      $roots$: [],
      $addSlots$: [],
      $rmSlots$: [],
      $visited$: []
    },
    $cmpCtx$: null,
    $slotCtx$: void 0
  };
  seal(ctx);
  seal(ctx.$static$);
  return ctx;
};
const pushRenderContext = (ctx) => {
  const newCtx = {
    $static$: ctx.$static$,
    $cmpCtx$: ctx.$cmpCtx$,
    $slotCtx$: ctx.$slotCtx$
  };
  return newCtx;
};
const serializeClassWithHost = (obj, hostCtx) => {
  if (hostCtx?.$scopeIds$?.length) {
    return hostCtx.$scopeIds$.join(" ") + " " + serializeClass(obj);
  }
  return serializeClass(obj);
};
const serializeClass = (obj) => {
  if (!obj) {
    return "";
  }
  if (isString(obj)) {
    return obj.trim();
  }
  const classes = [];
  if (isArray(obj)) {
    for (const o of obj) {
      const classList = serializeClass(o);
      if (classList) {
        classes.push(classList);
      }
    }
  } else {
    for (const [key, value] of Object.entries(obj)) {
      if (value) {
        classes.push(key.trim());
      }
    }
  }
  return classes.join(" ");
};
const stringifyStyle = (obj) => {
  if (obj == null) {
    return "";
  }
  if (typeof obj == "object") {
    if (isArray(obj)) {
      throw qError$1(QError_stringifyClassOrStyle, obj, "style");
    } else {
      const chunks = [];
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          if (value != null && typeof value !== "function") {
            if (key.startsWith("--")) {
              chunks.push(key + ":" + value);
            } else {
              chunks.push(fromCamelToKebabCase(key) + ":" + setValueForStyle(key, value));
            }
          }
        }
      }
      return chunks.join(";");
    }
  }
  return String(obj);
};
const setValueForStyle = (styleName, value) => {
  if (typeof value === "number" && value !== 0 && !isUnitlessNumber(styleName)) {
    return value + "px";
  }
  return value;
};
const getNextIndex = (ctx) => {
  return intToStr(ctx.$static$.$containerState$.$elementIndex$++);
};
const setQId = (rCtx, elCtx) => {
  const id = getNextIndex(rCtx);
  elCtx.$id$ = id;
};
const jsxToString = (data) => {
  if (isSignal(data)) {
    return jsxToString(data.value);
  }
  return data == null || typeof data === "boolean" ? "" : String(data);
};
function isAriaAttribute(prop) {
  return prop.startsWith("aria-");
}
const shouldWrapFunctional = (res, node) => {
  if (node.key) {
    return !isJSXNode(res) || !isFunction(res.type) && res.key != node.key;
  }
  return false;
};
const static_listeners = 1 << 0;
const static_subtree = 1 << 1;
const dangerouslySetInnerHTML = "dangerouslySetInnerHTML";
const FLUSH_COMMENT = "<!--qkssr-f-->";
const IS_HEAD$1 = 1 << 0;
const IS_HTML = 1 << 2;
const IS_TEXT = 1 << 3;
const IS_INVISIBLE = 1 << 4;
const IS_PHASING = 1 << 5;
const IS_ANCHOR = 1 << 6;
const IS_BUTTON = 1 << 7;
const IS_TABLE = 1 << 8;
const IS_PHRASING_CONTAINER = 1 << 9;
const IS_IMMUTABLE$1 = 1 << 10;
class MockElement {
  nodeType;
  [Q_CTX] = null;
  constructor(nodeType) {
    this.nodeType = nodeType;
    seal(this);
  }
}
const createDocument = () => {
  return new MockElement(9);
};
const _renderSSR = async (node, opts) => {
  const root = opts.containerTagName;
  const containerEl = createMockQContext(1).$element$;
  const containerState = createContainerState(containerEl, opts.base ?? "/");
  containerState.$serverData$.locale = opts.serverData?.locale;
  const doc = createDocument();
  const rCtx = createRenderContext(doc, containerState);
  const headNodes = opts.beforeContent ?? [];
  {
    if (root in phasingContent || root in emptyElements || root in tableContent || root in startPhasingContent || root in invisibleElements) {
      throw new Error(`The "containerTagName" can not be "${root}". Please choose a different tag name like: "div", "html", "custom-container".`);
    }
  }
  const ssrCtx = {
    $static$: {
      $contexts$: [],
      $headNodes$: root === "html" ? headNodes : [],
      $locale$: opts.serverData?.locale,
      $textNodes$: /* @__PURE__ */ new Map()
    },
    $projectedChildren$: void 0,
    $projectedCtxs$: void 0,
    $invocationContext$: void 0
  };
  seal(ssrCtx);
  const locale = opts.serverData?.locale;
  const containerAttributes = opts.containerAttributes;
  const qRender = containerAttributes["q:render"];
  containerAttributes["q:container"] = "paused";
  containerAttributes["q:version"] = version;
  containerAttributes["q:render"] = (qRender ? qRender + "-" : "") + ("ssr-dev" );
  containerAttributes["q:base"] = opts.base || "";
  containerAttributes["q:locale"] = locale;
  containerAttributes["q:manifest-hash"] = opts.manifestHash;
  containerAttributes["q:instance"] = hash$1();
  const children = root === "html" ? [node] : [headNodes, node];
  if (root !== "html") {
    containerAttributes.class = "qc📦" + (containerAttributes.class ? " " + containerAttributes.class : "");
  }
  const serverData = containerState.$serverData$ = {
    ...containerState.$serverData$,
    ...opts.serverData
  };
  serverData.containerAttributes = {
    ...serverData["containerAttributes"],
    ...containerAttributes
  };
  const invokeCtx = ssrCtx.$invocationContext$ = newInvokeContext(locale);
  invokeCtx.$renderCtx$ = rCtx;
  ssrCtx.$invocationContext$;
  const rootNode = _jsxQ(root, null, containerAttributes, children, HOST_FLAG_DIRTY | HOST_FLAG_NEED_ATTACH_LISTENER, null);
  containerState.$hostsRendering$ = /* @__PURE__ */ new Set();
  await Promise.resolve().then(() => renderRoot$1(rootNode, rCtx, ssrCtx, opts.stream, containerState, opts));
};
const hash$1 = () => Math.random().toString(36).slice(2);
const renderRoot$1 = async (node, rCtx, ssrCtx, stream, containerState, opts) => {
  const beforeClose = opts.beforeClose;
  await renderNode(node, rCtx, ssrCtx, stream, 0, beforeClose ? (stream2) => {
    const result = beforeClose(ssrCtx.$static$.$contexts$, containerState, false, ssrCtx.$static$.$textNodes$);
    return processData$1(result, rCtx, ssrCtx, stream2, 0, void 0);
  } : void 0);
  {
    if (ssrCtx.$static$.$headNodes$.length > 0) {
      logError("Missing <head>. Global styles could not be rendered. Please render a <head> element at the root of the app");
    }
  }
  return rCtx;
};
const renderGenerator = async (node, rCtx, ssrCtx, stream, flags) => {
  stream.write(FLUSH_COMMENT);
  const generator = node.props.children;
  let value;
  if (isFunction(generator)) {
    const v = generator({
      write(chunk) {
        stream.write(chunk);
        stream.write(FLUSH_COMMENT);
      }
    });
    if (isPromise$1(v)) {
      return v;
    }
    value = v;
  } else {
    value = generator;
  }
  for await (const chunk of value) {
    await processData$1(chunk, rCtx, ssrCtx, stream, flags, void 0);
    stream.write(FLUSH_COMMENT);
  }
};
const renderNodeVirtual = (node, elCtx, extraNodes, rCtx, ssrCtx, stream, flags, beforeClose) => {
  const props = node.props;
  const renderQrl = props[OnRenderProp];
  if (renderQrl) {
    elCtx.$componentQrl$ = renderQrl;
    return renderSSRComponent(rCtx, ssrCtx, stream, elCtx, node, flags, beforeClose);
  }
  let virtualComment = "<!--qv" + renderVirtualAttributes(props);
  const isSlot = QSlotS in props;
  const key = node.key != null ? escapeHtml(String(node.key)) : null;
  if (isSlot) {
    assertDefined(rCtx.$cmpCtx$?.$id$, "hostId must be defined for a slot");
    virtualComment += " q:sref=" + rCtx.$cmpCtx$.$id$;
  }
  if (key != null) {
    virtualComment += " q:key=" + key;
  }
  virtualComment += "-->";
  stream.write(virtualComment);
  const html = node.props[dangerouslySetInnerHTML];
  if (html) {
    stream.write(html);
    stream.write(CLOSE_VIRTUAL);
    return;
  }
  if (extraNodes) {
    for (const node2 of extraNodes) {
      renderNodeElementSync(node2.type, node2.props, stream);
    }
  }
  const promise = walkChildren(node.children, rCtx, ssrCtx, stream, flags);
  return maybeThen(promise, () => {
    if (!isSlot && !beforeClose) {
      stream.write(CLOSE_VIRTUAL);
      return;
    }
    let promise2;
    if (isSlot) {
      assertDefined(key, "key must be defined for a slot");
      const content = ssrCtx.$projectedChildren$?.[key];
      if (content) {
        const [rCtx2, sCtx] = ssrCtx.$projectedCtxs$;
        const newSlotRctx = pushRenderContext(rCtx2);
        newSlotRctx.$slotCtx$ = elCtx;
        ssrCtx.$projectedChildren$[key] = void 0;
        promise2 = processData$1(content, newSlotRctx, sCtx, stream, flags);
      }
    }
    if (beforeClose) {
      promise2 = maybeThen(promise2, () => beforeClose(stream));
    }
    return maybeThen(promise2, () => {
      stream.write(CLOSE_VIRTUAL);
    });
  });
};
const CLOSE_VIRTUAL = `<!--/qv-->`;
const renderAttributes = (attributes) => {
  let text = "";
  for (const prop in attributes) {
    if (prop === dangerouslySetInnerHTML) {
      continue;
    }
    const value = attributes[prop];
    if (value != null) {
      text += " " + (value === "" ? prop : prop + '="' + escapeValue(value) + '"');
    }
  }
  return text;
};
const renderVirtualAttributes = (attributes) => {
  let text = "";
  for (const prop in attributes) {
    if (prop === "children" || prop === dangerouslySetInnerHTML) {
      continue;
    }
    const value = attributes[prop];
    if (value != null) {
      text += " " + (value === "" ? prop : prop + "=" + escapeValue(value));
    }
  }
  return text;
};
const renderNodeElementSync = (tagName, attributes, stream) => {
  stream.write("<" + tagName + renderAttributes(attributes) + ">");
  const empty = !!emptyElements[tagName];
  if (empty) {
    return;
  }
  const innerHTML = attributes[dangerouslySetInnerHTML];
  if (innerHTML != null) {
    stream.write(innerHTML);
  }
  stream.write(`</${tagName}>`);
};
const renderSSRComponent = (rCtx, ssrCtx, stream, elCtx, node, flags, beforeClose) => {
  const props = node.props;
  setComponentProps$1(rCtx, elCtx, props.props);
  return maybeThen(executeComponent(rCtx, elCtx), (res) => {
    const hostElement = elCtx.$element$;
    const newRCtx = res.rCtx;
    const iCtx = newInvokeContext(ssrCtx.$static$.$locale$, hostElement, void 0);
    iCtx.$subscriber$ = [0, hostElement];
    iCtx.$renderCtx$ = newRCtx;
    const newSSrContext = {
      $static$: ssrCtx.$static$,
      $projectedChildren$: splitProjectedChildren(node.children, ssrCtx),
      $projectedCtxs$: [rCtx, ssrCtx],
      $invocationContext$: iCtx
    };
    const extraNodes = [];
    if (elCtx.$appendStyles$) {
      const isHTML = !!(flags & IS_HTML);
      const array = isHTML ? ssrCtx.$static$.$headNodes$ : extraNodes;
      for (const style of elCtx.$appendStyles$) {
        array.push(_jsxQ("style", {
          [QStyle]: style.styleId,
          [dangerouslySetInnerHTML]: style.content,
          hidden: ""
        }, null, null, 0, null));
      }
    }
    const newID = getNextIndex(rCtx);
    const scopeId = elCtx.$scopeIds$ ? serializeSStyle(elCtx.$scopeIds$) : void 0;
    const processedNode = _jsxC(node.type, {
      [QScopedStyle]: scopeId,
      [ELEMENT_ID]: newID,
      children: res.node
    }, 0, node.key);
    elCtx.$id$ = newID;
    ssrCtx.$static$.$contexts$.push(elCtx);
    return renderNodeVirtual(processedNode, elCtx, extraNodes, newRCtx, newSSrContext, stream, flags, (stream2) => {
      if (elCtx.$flags$ & HOST_FLAG_NEED_ATTACH_LISTENER) {
        const placeholderCtx = createMockQContext(1);
        const listeners = placeholderCtx.li;
        listeners.push(...elCtx.li);
        elCtx.$flags$ &= ~HOST_FLAG_NEED_ATTACH_LISTENER;
        placeholderCtx.$id$ = getNextIndex(rCtx);
        const attributes = {
          hidden: "",
          "q:id": placeholderCtx.$id$
        };
        ssrCtx.$static$.$contexts$.push(placeholderCtx);
        const groups = groupListeners(listeners);
        for (const listener of groups) {
          const eventName = normalizeInvisibleEvents(listener[0]);
          attributes[eventName] = serializeQRLs(listener[1], rCtx.$static$.$containerState$, placeholderCtx);
          registerQwikEvent$1(eventName, rCtx.$static$.$containerState$);
        }
        renderNodeElementSync("script", attributes, stream2);
      }
      const projectedChildren = newSSrContext.$projectedChildren$;
      let missingSlotsDone;
      if (projectedChildren) {
        const nodes = Object.keys(projectedChildren).map((slotName) => {
          const escapedSlotName = slotName ? escapeHtml(slotName) : slotName;
          const content = projectedChildren[escapedSlotName];
          if (content) {
            return _jsxQ("q:template", { [QSlot]: escapedSlotName || true, hidden: true, "aria-hidden": "true" }, null, content, 0, null);
          }
        });
        const [_rCtx, sCtx] = newSSrContext.$projectedCtxs$;
        const newSlotRctx = pushRenderContext(_rCtx);
        newSlotRctx.$slotCtx$ = elCtx;
        missingSlotsDone = processData$1(nodes, newSlotRctx, sCtx, stream2, 0, void 0);
      }
      return beforeClose ? maybeThen(missingSlotsDone, () => beforeClose(stream2)) : missingSlotsDone;
    });
  });
};
const splitProjectedChildren = (children, ssrCtx) => {
  const flatChildren = flatVirtualChildren(children, ssrCtx);
  if (flatChildren === null) {
    return void 0;
  }
  const slotMap = {};
  for (const child of flatChildren) {
    let slotName = "";
    if (isJSXNode(child)) {
      slotName = escapeHtml(child.props[QSlot] || "");
    }
    (slotMap[slotName] ||= []).push(child);
  }
  return slotMap;
};
const createMockQContext = (nodeType) => {
  const elm = new MockElement(nodeType);
  return createContext(elm);
};
const renderNode = (node, rCtx, ssrCtx, stream, flags, beforeClose) => {
  const tagName = node.type;
  const hostCtx = rCtx.$cmpCtx$;
  if (typeof tagName === "string") {
    const key = node.key;
    const props = node.props;
    const immutable = node.immutableProps || EMPTY_OBJ;
    const elCtx = createMockQContext(1);
    const elm = elCtx.$element$;
    const isHead = tagName === "head";
    let openingElement = "<" + tagName;
    let useSignal2 = false;
    let hasRef = false;
    let classStr = "";
    let htmlStr = null;
    const handleProp = (rawProp, value, isImmutable) => {
      if (rawProp === "ref") {
        if (value !== void 0) {
          setRef(value, elm);
          hasRef = true;
        }
        return;
      }
      if (isOnProp(rawProp)) {
        setEvent(elCtx.li, rawProp, value, void 0);
        return;
      }
      if (isSignal(value)) {
        assertDefined(hostCtx, "Signals can not be used outside the root");
        if (isImmutable) {
          value = trackSignal(value, [1, elm, value, hostCtx.$element$, rawProp]);
        } else {
          value = trackSignal(value, [2, hostCtx.$element$, value, elm, rawProp]);
        }
        useSignal2 = true;
      }
      if (rawProp === dangerouslySetInnerHTML) {
        htmlStr = value;
        return;
      }
      if (rawProp.startsWith(PREVENT_DEFAULT)) {
        registerQwikEvent$1(rawProp.slice(PREVENT_DEFAULT.length), rCtx.$static$.$containerState$);
      }
      let attrValue;
      const prop = rawProp === "htmlFor" ? "for" : rawProp;
      if (prop === "class" || prop === "className") {
        classStr = serializeClass(value);
      } else if (prop === "style") {
        attrValue = stringifyStyle(value);
      } else if (isAriaAttribute(prop) || prop === "draggable" || prop === "spellcheck") {
        attrValue = value != null ? String(value) : null;
        value = attrValue;
      } else if (value === false || value == null) {
        attrValue = null;
      } else {
        attrValue = String(value);
      }
      if (attrValue != null) {
        if (prop === "value" && tagName === "textarea") {
          htmlStr = escapeHtml(attrValue);
        } else if (isSSRUnsafeAttr(prop)) {
          {
            logError("Attribute value is unsafe for SSR");
          }
        } else {
          openingElement += " " + (value === true ? prop : prop + '="' + escapeHtml(attrValue) + '"');
        }
      }
    };
    for (const prop in props) {
      let isImmutable = false;
      let value;
      if (prop in immutable) {
        isImmutable = true;
        value = immutable[prop];
        if (value === _IMMUTABLE) {
          value = props[prop];
        }
      } else {
        value = props[prop];
      }
      handleProp(prop, value, isImmutable);
    }
    for (const prop in immutable) {
      if (prop in props) {
        continue;
      }
      const value = immutable[prop];
      if (value !== _IMMUTABLE) {
        handleProp(prop, value, true);
      }
    }
    const listeners = elCtx.li;
    if (hostCtx) {
      {
        if (tagName === "html") {
          throw qError$1(QError_canNotRenderHTML);
        }
      }
      if (hostCtx.$scopeIds$?.length) {
        const extra = hostCtx.$scopeIds$.join(" ");
        classStr = classStr ? `${extra} ${classStr}` : extra;
      }
      if (hostCtx.$flags$ & HOST_FLAG_NEED_ATTACH_LISTENER) {
        listeners.push(...hostCtx.li);
        hostCtx.$flags$ &= ~HOST_FLAG_NEED_ATTACH_LISTENER;
      }
    }
    {
      if (flags & IS_PHASING && !(flags & IS_PHRASING_CONTAINER)) {
        if (!(tagName in phasingContent)) {
          throw createJSXError(`<${tagName}> can not be rendered because one of its ancestor is a <p> or a <pre>.

This goes against the HTML spec: https://html.spec.whatwg.org/multipage/dom.html#phrasing-content-2`, node);
        }
      }
      if (tagName === "table") {
        flags |= IS_TABLE;
      } else {
        if (flags & IS_TABLE && !(tagName in tableContent)) {
          throw createJSXError(`The <table> element requires that its direct children to be '<tbody>', '<thead>', '<tfoot>' or '<caption>' instead, '<${tagName}>' was rendered.`, node);
        }
        flags &= ~IS_TABLE;
      }
      if (tagName === "button") {
        if (flags & IS_BUTTON) {
          throw createJSXError(`<${tagName}> can not be rendered because one of its ancestor is already a <button>.

This goes against the HTML spec: https://html.spec.whatwg.org/multipage/dom.html#interactive-content`, node);
        } else {
          flags |= IS_BUTTON;
        }
      }
      if (tagName === "a") {
        if (flags & IS_ANCHOR) {
          throw createJSXError(`<${tagName}> can not be rendered because one of its ancestor is already a <a>.

This goes against the HTML spec: https://html.spec.whatwg.org/multipage/dom.html#interactive-content`, node);
        } else {
          flags |= IS_ANCHOR;
        }
      }
      if (tagName === "svg" || tagName === "math") {
        flags |= IS_PHRASING_CONTAINER;
      }
      if (flags & IS_HEAD$1) {
        if (!(tagName in headContent)) {
          throw createJSXError(`<${tagName}> can not be rendered because it's not a valid children of the <head> element. https://html.spec.whatwg.org/multipage/dom.html#metadata-content`, node);
        }
      }
      if (flags & IS_HTML) {
        if (!(tagName in htmlContent)) {
          throw createJSXError(`<${tagName}> can not be rendered because it's not a valid direct children of the <html> element, only <head> and <body> are allowed.`, node);
        }
      } else if (tagName in htmlContent) {
        throw createJSXError(`<${tagName}> can not be rendered because its parent is not a <html> element. Make sure the 'containerTagName' is set to 'html' in entry.ssr.tsx`, node);
      }
      if (tagName in startPhasingContent) {
        flags |= IS_PHASING;
      }
    }
    if (isHead) {
      flags |= IS_HEAD$1;
    }
    if (tagName in invisibleElements) {
      flags |= IS_INVISIBLE;
    }
    if (tagName in textOnlyElements) {
      flags |= IS_TEXT;
    }
    if (classStr) {
      openingElement += ' class="' + escapeHtml(classStr) + '"';
    }
    if (listeners.length > 0) {
      const groups = groupListeners(listeners);
      const isInvisible = (flags & IS_INVISIBLE) !== 0;
      for (const listener of groups) {
        const eventName = isInvisible ? normalizeInvisibleEvents(listener[0]) : listener[0];
        openingElement += " " + eventName + '="' + serializeQRLs(listener[1], rCtx.$static$.$containerState$, elCtx) + '"';
        registerQwikEvent$1(eventName, rCtx.$static$.$containerState$);
      }
    }
    if (key != null) {
      openingElement += ' q:key="' + escapeHtml(key) + '"';
    }
    if (hasRef || useSignal2 || listeners.length > 0) {
      if (hasRef || useSignal2 || listenersNeedId(listeners)) {
        const newID = getNextIndex(rCtx);
        openingElement += ' q:id="' + newID + '"';
        elCtx.$id$ = newID;
      }
      ssrCtx.$static$.$contexts$.push(elCtx);
    }
    if (flags & IS_HEAD$1) {
      openingElement += " q:head";
    }
    if (node.dev && !(flags & IS_HEAD$1)) {
      const sanitizedFileName = node?.dev?.fileName?.replace(/\\/g, "/");
      if (sanitizedFileName && !/data-qwik-inspector/.test(openingElement)) {
        openingElement += ` data-qwik-inspector="${escapeHtml(`${sanitizedFileName}:${node.dev.lineNumber}:${node.dev.columnNumber}`)}"`;
      }
    }
    openingElement += ">";
    stream.write(openingElement);
    if (tagName in emptyElements) {
      return;
    }
    if (htmlStr != null) {
      stream.write(String(htmlStr));
      stream.write(`</${tagName}>`);
      return;
    }
    if (tagName === "html") {
      flags |= IS_HTML;
    } else {
      flags &= ~IS_HTML;
    }
    if (node.flags & static_subtree) {
      flags |= IS_IMMUTABLE$1;
    }
    const promise = processData$1(node.children, rCtx, ssrCtx, stream, flags);
    return maybeThen(promise, () => {
      if (isHead) {
        for (const node2 of ssrCtx.$static$.$headNodes$) {
          renderNodeElementSync(node2.type, node2.props, stream);
        }
        ssrCtx.$static$.$headNodes$.length = 0;
      }
      if (!beforeClose) {
        stream.write(`</${tagName}>`);
        return;
      }
      return maybeThen(beforeClose(stream), () => {
        stream.write(`</${tagName}>`);
      });
    });
  }
  if (tagName === Virtual) {
    const elCtx = createMockQContext(111);
    if (rCtx.$slotCtx$) {
      elCtx.$parentCtx$ = rCtx.$slotCtx$;
      elCtx.$realParentCtx$ = rCtx.$cmpCtx$;
    } else {
      elCtx.$parentCtx$ = rCtx.$cmpCtx$;
    }
    if (hostCtx && hostCtx.$flags$ & HOST_FLAG_DYNAMIC) {
      addDynamicSlot(hostCtx, elCtx);
    }
    return renderNodeVirtual(node, elCtx, void 0, rCtx, ssrCtx, stream, flags, beforeClose);
  }
  if (tagName === SSRRaw) {
    stream.write(node.props.data);
    return;
  }
  if (tagName === InternalSSRStream) {
    return renderGenerator(node, rCtx, ssrCtx, stream, flags);
  }
  const res = invoke(ssrCtx.$invocationContext$, tagName, node.props, node.key, node.flags, node.dev);
  if (!shouldWrapFunctional(res, node)) {
    return processData$1(res, rCtx, ssrCtx, stream, flags, beforeClose);
  }
  return renderNode(_jsxC(Virtual, { children: res }, 0, node.key), rCtx, ssrCtx, stream, flags, beforeClose);
};
const processData$1 = (node, rCtx, ssrCtx, stream, flags, beforeClose) => {
  if (node == null || typeof node === "boolean") {
    return;
  }
  if (isString(node) || typeof node === "number") {
    stream.write(escapeHtml(String(node)));
  } else if (isJSXNode(node)) {
    return renderNode(node, rCtx, ssrCtx, stream, flags, beforeClose);
  } else if (isArray(node)) {
    return walkChildren(node, rCtx, ssrCtx, stream, flags);
  } else if (isSignal(node)) {
    const insideText = flags & IS_TEXT;
    const hostEl = rCtx.$cmpCtx$?.$element$;
    let value;
    if (hostEl) {
      if (!insideText) {
        const id = getNextIndex(rCtx);
        const subs = flags & IS_IMMUTABLE$1 ? [3, "#" + id, node, "#" + id] : [4, hostEl, node, "#" + id];
        value = trackSignal(node, subs);
        if (isString(value)) {
          const str = jsxToString(value);
          ssrCtx.$static$.$textNodes$.set(str, id);
        }
        stream.write(`<!--t=${id}-->`);
        processData$1(value, rCtx, ssrCtx, stream, flags, beforeClose);
        stream.write(`<!---->`);
        return;
      } else {
        value = invoke(ssrCtx.$invocationContext$, () => node.value);
      }
    }
    stream.write(escapeHtml(jsxToString(value)));
    return;
  } else if (isPromise$1(node)) {
    stream.write(FLUSH_COMMENT);
    return node.then((node2) => processData$1(node2, rCtx, ssrCtx, stream, flags, beforeClose));
  } else {
    logWarn$1("A unsupported value was passed to the JSX, skipping render. Value:", node);
    return;
  }
};
const walkChildren = (children, rCtx, ssrContext, stream, flags) => {
  if (children == null) {
    return;
  }
  if (!isArray(children)) {
    return processData$1(children, rCtx, ssrContext, stream, flags);
  }
  const len = children.length;
  if (len === 1) {
    return processData$1(children[0], rCtx, ssrContext, stream, flags);
  }
  if (len === 0) {
    return;
  }
  let currentIndex = 0;
  const buffers = [];
  return children.reduce((prevPromise, child, index) => {
    const buffer = [];
    buffers.push(buffer);
    const localStream = prevPromise ? {
      write(chunk) {
        if (currentIndex === index) {
          stream.write(chunk);
        } else {
          buffer.push(chunk);
        }
      }
    } : stream;
    const rendered = processData$1(child, rCtx, ssrContext, localStream, flags);
    if (prevPromise || isPromise$1(rendered)) {
      const next = () => {
        currentIndex++;
        if (buffers.length > currentIndex) {
          buffers[currentIndex].forEach((chunk) => stream.write(chunk));
        }
      };
      if (isPromise$1(rendered)) {
        if (prevPromise) {
          return Promise.all([rendered, prevPromise]).then(next);
        } else {
          return rendered.then(next);
        }
      }
      return prevPromise.then(next);
    } else {
      currentIndex++;
      return void 0;
    }
  }, void 0);
};
const flatVirtualChildren = (children, ssrCtx) => {
  if (children == null) {
    return null;
  }
  const result = _flatVirtualChildren(children, ssrCtx);
  const nodes = isArray(result) ? result : [result];
  if (nodes.length === 0) {
    return null;
  }
  return nodes;
};
const _flatVirtualChildren = (children, ssrCtx) => {
  if (children == null) {
    return null;
  }
  if (isArray(children)) {
    return children.flatMap((c) => _flatVirtualChildren(c, ssrCtx));
  } else if (isJSXNode(children) && isFunction(children.type) && children.type !== SSRRaw && children.type !== InternalSSRStream && children.type !== Virtual) {
    const res = invoke(ssrCtx.$invocationContext$, children.type, children.props, children.key, children.flags);
    return flatVirtualChildren(res, ssrCtx);
  }
  return children;
};
const setComponentProps$1 = (rCtx, elCtx, expectProps) => {
  const keys = Object.keys(expectProps);
  const target = createPropsState();
  elCtx.$props$ = createProxy(target, rCtx.$static$.$containerState$);
  if (keys.length === 0) {
    return;
  }
  const immutableMeta = target[_IMMUTABLE] = expectProps[_IMMUTABLE] ?? EMPTY_OBJ;
  for (const prop of keys) {
    if (prop === "children" || prop === QSlot) {
      continue;
    }
    if (isSignal(immutableMeta[prop])) {
      target[_IMMUTABLE_PREFIX + prop] = immutableMeta[prop];
    } else {
      target[prop] = expectProps[prop];
    }
  }
};
const invisibleElements = {
  head: true,
  style: true,
  script: true,
  link: true,
  meta: true
};
const textOnlyElements = {
  title: true,
  style: true,
  script: true,
  noframes: true,
  textarea: true
};
const emptyElements = {
  area: true,
  base: true,
  basefont: true,
  bgsound: true,
  br: true,
  col: true,
  embed: true,
  frame: true,
  hr: true,
  img: true,
  input: true,
  keygen: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true
};
const startPhasingContent = {
  p: true,
  pre: true
};
const htmlContent = {
  head: true,
  body: true
};
const tableContent = {
  tbody: true,
  thead: true,
  tfoot: true,
  caption: true,
  colgroup: true
};
const headContent = {
  meta: true,
  title: true,
  link: true,
  style: true,
  script: true,
  noscript: true,
  template: true,
  base: true
};
const phasingContent = {
  a: true,
  abbr: true,
  area: true,
  audio: true,
  b: true,
  bdi: true,
  bdo: true,
  br: true,
  button: true,
  canvas: true,
  cite: true,
  code: true,
  command: true,
  data: true,
  datalist: true,
  del: true,
  dfn: true,
  em: true,
  embed: true,
  i: true,
  iframe: true,
  img: true,
  input: true,
  ins: true,
  itemprop: true,
  kbd: true,
  keygen: true,
  label: true,
  link: true,
  map: true,
  mark: true,
  math: true,
  meta: true,
  meter: true,
  noscript: true,
  object: true,
  option: true,
  output: true,
  picture: true,
  progress: true,
  q: true,
  ruby: true,
  s: true,
  samp: true,
  script: true,
  select: true,
  slot: true,
  small: true,
  span: true,
  strong: true,
  sub: true,
  sup: true,
  svg: true,
  template: true,
  textarea: true,
  time: true,
  u: true,
  var: true,
  video: true,
  wbr: true
};
const ESCAPE_HTML = /[&<>'"]/g;
const registerQwikEvent$1 = (prop, containerState) => {
  containerState.$events$.add(getEventName(prop));
};
const escapeValue = (value) => {
  if (typeof value === "string") {
    return escapeHtml(value);
  }
  return value;
};
const escapeHtml = (s) => {
  return s.replace(ESCAPE_HTML, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return "";
    }
  });
};
const unsafeAttrCharRE = /[>/="'\u0009\u000a\u000c\u0020]/;
const isSSRUnsafeAttr = (name) => {
  return unsafeAttrCharRE.test(name);
};
const listenersNeedId = (listeners) => {
  return listeners.some((l) => l[1].$captureRef$ && l[1].$captureRef$.length > 0);
};
const addDynamicSlot = (hostCtx, elCtx) => {
  const dynamicSlots = hostCtx.$dynamicSlots$ ||= [];
  if (!dynamicSlots.includes(elCtx)) {
    dynamicSlots.push(elCtx);
  }
};
const normalizeInvisibleEvents = (eventName) => {
  return eventName === "on:qvisible" ? "on-document:qinit" : eventName;
};
const _fnSignal = (fn, args, fnStr) => {
  return new SignalDerived(fn, args, fnStr);
};
const serializeDerivedSignalFunc = (signal) => {
  const fnBody = signal.$funcStr$ ;
  assertDefined(fnBody, "If qSerialize is true then fnStr must be provided.");
  let args = "";
  for (let i = 0; i < signal.$args$.length; i++) {
    args += `p${i},`;
  }
  return `(${args})=>(${fnBody})`;
};
const _jsxQ = (type, mutableProps, immutableProps, children, flags, key, dev) => {
  assertString(type, "jsx type must be a string");
  const processed = key == null ? null : String(key);
  const node = new JSXNodeImpl(type, mutableProps || EMPTY_OBJ, immutableProps, children, flags, processed);
  if (dev) {
    node.dev = {
      stack: new Error().stack,
      ...dev
    };
  }
  validateJSXNode(node);
  seal(node);
  return node;
};
const _jsxS = (type, mutableProps, immutableProps, flags, key, dev) => {
  let children = null;
  if (mutableProps && "children" in mutableProps) {
    children = mutableProps.children;
    delete mutableProps.children;
  }
  return _jsxQ(type, mutableProps, immutableProps, children, flags, key, dev);
};
const _jsxC = (type, mutableProps, flags, key, dev) => {
  const processed = key == null ? null : String(key);
  const props = mutableProps ?? {};
  if (typeof type === "string" && _IMMUTABLE in props) {
    const immutableProps = props[_IMMUTABLE];
    delete props[_IMMUTABLE];
    const children = props.children;
    delete props.children;
    for (const [k, v] of Object.entries(immutableProps)) {
      if (v !== _IMMUTABLE) {
        delete props[k];
        props[k] = v;
      }
    }
    return _jsxQ(type, null, props, children, flags, key, dev);
  }
  const node = new JSXNodeImpl(type, props, null, props.children, flags, processed);
  if (typeof type === "string" && mutableProps) {
    delete mutableProps.children;
  }
  if (dev) {
    node.dev = {
      stack: new Error().stack,
      ...dev
    };
  }
  validateJSXNode(node);
  seal(node);
  return node;
};
const jsx = (type, props, key) => {
  const processed = null ;
  const children = untrack(() => {
    const c = props.children;
    if (typeof type === "string") {
      delete props.children;
    }
    return c;
  });
  if (isString(type)) {
    if ("className" in props) {
      props.class = props.className;
      delete props.className;
      {
        logOnceWarn("jsx: `className` is deprecated. Use `class` instead.");
      }
    }
  }
  const node = new JSXNodeImpl(type, props, null, children, 0, processed);
  validateJSXNode(node);
  seal(node);
  return node;
};
const SKIP_RENDER_TYPE = ":skipRender";
class JSXNodeImpl {
  type;
  props;
  immutableProps;
  children;
  flags;
  key;
  dev;
  constructor(type, props, immutableProps, children, flags, key = null) {
    this.type = type;
    this.props = props;
    this.immutableProps = immutableProps;
    this.children = children;
    this.flags = flags;
    this.key = key;
  }
}
const Virtual = (props) => props.children;
const validateJSXNode = (node) => {
  {
    const { type, props, immutableProps, children } = node;
    invoke(void 0, () => {
      const isQwikC = isQwikComponent(type);
      if (!isString(type) && !isFunction(type)) {
        throw new Error(`The <Type> of the JSX element must be either a string or a function. Instead, it's a "${typeof type}": ${String(type)}.`);
      }
      if (children) {
        const flatChildren = isArray(children) ? children.flat() : [children];
        if (isString(type) || isQwikC) {
          flatChildren.forEach((child) => {
            if (!isValidJSXChild(child)) {
              const typeObj = typeof child;
              let explanation = "";
              if (typeObj === "object") {
                if (child?.constructor) {
                  explanation = `it's an instance of "${child?.constructor.name}".`;
                } else {
                  explanation = `it's a object literal: ${printObjectLiteral(child)} `;
                }
              } else if (typeObj === "function") {
                explanation += `it's a function named "${child.name}".`;
              } else {
                explanation = `it's a "${typeObj}": ${String(child)}.`;
              }
              throw new Error(`One of the children of <${type}> is not an accepted value. JSX children must be either: string, boolean, number, <element>, Array, undefined/null, or a Promise/Signal. Instead, ${explanation}
`);
            }
          });
        }
      }
      const allProps = [
        ...Object.entries(props),
        ...immutableProps ? Object.entries(immutableProps) : []
      ];
      if (!qRuntimeQrl) {
        for (const [prop, value] of allProps) {
          if (prop.endsWith("$") && value) {
            if (!isQrl(value) && !Array.isArray(value)) {
              throw new Error(`The value passed in ${prop}={...}> must be a QRL, instead you passed a "${typeof value}". Make sure your ${typeof value} is wrapped with $(...), so it can be serialized. Like this:
$(${String(value)})`);
            }
          }
          if (prop !== "children" && isQwikC && value) {
            verifySerializable(value, `The value of the JSX attribute "${prop}" can not be serialized`);
          }
        }
      }
      if (isString(type)) {
        const hasSetInnerHTML = allProps.some((a2) => a2[0] === "dangerouslySetInnerHTML");
        if (hasSetInnerHTML && children) {
          const err = createJSXError(`The JSX element <${type}> can not have both 'dangerouslySetInnerHTML' and children.`, node);
          logError(err);
        }
        if (allProps.some((a2) => a2[0] === "children")) {
          throw new Error(`The JSX element <${type}> can not have both 'children' as a property.`);
        }
        if (type === "style") {
          if (children) {
            logOnceWarn(`jsx: Using <style>{content}</style> will escape the content, effectively breaking the CSS.
In order to disable content escaping use '<style dangerouslySetInnerHTML={content}/>'

However, if the use case is to inject component styleContent, use 'useStyles$()' instead, it will be a lot more efficient.
See https://qwik.dev/docs/core/styles/#usestyles for more information.`);
          }
        }
        if (type === "script") {
          if (children) {
            logOnceWarn(`jsx: Using <script>{content}</script> will escape the content, effectively breaking the inlined JS.
In order to disable content escaping use '<script dangerouslySetInnerHTML={content}/>'`);
          }
        }
      }
    });
  }
};
const printObjectLiteral = (obj) => {
  return `{ ${Object.keys(obj).map((key) => `"${key}"`).join(", ")} }`;
};
const isJSXNode = (n) => {
  {
    if (n instanceof JSXNodeImpl) {
      return true;
    }
    if (isObject(n) && "key" in n && "props" in n && "type" in n) {
      logWarn$1(`Duplicate implementations of "JSXNode" found`);
      return true;
    }
    return false;
  }
};
const isValidJSXChild = (node) => {
  if (!node) {
    return true;
  } else if (node === SkipRender) {
    return true;
  } else if (isString(node) || typeof node === "number" || typeof node === "boolean") {
    return true;
  } else if (isJSXNode(node)) {
    return true;
  } else if (isArray(node)) {
    return node.every(isValidJSXChild);
  }
  if (isSignal(node)) {
    return isValidJSXChild(node.value);
  } else if (isPromise$1(node)) {
    return true;
  }
  return false;
};
const Fragment = (props) => props.children;
const createJSXError = (message, node) => {
  const error = new Error(message);
  if (!node.dev) {
    return error;
  }
  error.stack = `JSXError: ${message}
${filterStack(node.dev.stack, 1)}`;
  return error;
};
const filterStack = (stack, offset = 0) => {
  return stack.split("\n").slice(offset).join("\n");
};
const SkipRender = /* @__PURE__ */ Symbol("skip render");
const SSRRaw = (() => null);
const InternalSSRStream = () => null;
const renderComponent = (rCtx, elCtx, flags) => {
  const justMounted = !(elCtx.$flags$ & HOST_FLAG_MOUNTED);
  const hostElement = elCtx.$element$;
  const containerState = rCtx.$static$.$containerState$;
  containerState.$hostsStaging$.delete(elCtx);
  containerState.$subsManager$.$clearSub$(hostElement);
  return maybeThen(executeComponent(rCtx, elCtx), (res) => {
    const staticCtx = rCtx.$static$;
    const newCtx = res.rCtx;
    const iCtx = newInvokeContext(rCtx.$static$.$locale$, hostElement);
    staticCtx.$hostElements$.add(hostElement);
    iCtx.$subscriber$ = [0, hostElement];
    iCtx.$renderCtx$ = newCtx;
    if (justMounted) {
      if (elCtx.$appendStyles$) {
        for (const style of elCtx.$appendStyles$) {
          appendHeadStyle(staticCtx, style);
        }
      }
    }
    const processedJSXNode = processData(res.node, iCtx);
    return maybeThen(processedJSXNode, (processedJSXNode2) => {
      const newVdom = wrapJSX(hostElement, processedJSXNode2);
      const oldVdom = getVdom(elCtx);
      return maybeThen(smartUpdateChildren(newCtx, oldVdom, newVdom, flags), () => {
        elCtx.$vdom$ = newVdom;
      });
    });
  });
};
const getVdom = (elCtx) => {
  if (!elCtx.$vdom$) {
    elCtx.$vdom$ = domToVnode(elCtx.$element$);
  }
  return elCtx.$vdom$;
};
class ProcessedJSXNodeImpl {
  $type$;
  $props$;
  $immutableProps$;
  $children$;
  $flags$;
  $key$;
  $elm$ = null;
  $text$ = "";
  $signal$ = null;
  $id$;
  $dev$;
  constructor($type$, $props$, $immutableProps$, $children$, $flags$, $key$) {
    this.$type$ = $type$;
    this.$props$ = $props$;
    this.$immutableProps$ = $immutableProps$;
    this.$children$ = $children$;
    this.$flags$ = $flags$;
    this.$key$ = $key$;
    this.$id$ = $type$ + ($key$ ? ":" + $key$ : "");
    {
      this.$dev$ = void 0;
    }
    seal(this);
  }
}
const processNode = (node, invocationContext) => {
  const { key, type, props, children, flags, immutableProps } = node;
  let textType = "";
  if (isString(type)) {
    textType = type;
  } else if (type === Virtual) {
    textType = VIRTUAL;
  } else if (isFunction(type)) {
    const res = invoke(invocationContext, type, props, key, flags, node.dev);
    if (!shouldWrapFunctional(res, node)) {
      return processData(res, invocationContext);
    }
    return processNode(_jsxC(Virtual, { children: res }, 0, key), invocationContext);
  } else {
    throw qError$1(QError_invalidJsxNodeType, type);
  }
  let convertedChildren = EMPTY_ARRAY;
  if (children != null) {
    return maybeThen(processData(children, invocationContext), (result) => {
      if (result !== void 0) {
        convertedChildren = isArray(result) ? result : [result];
      }
      const vnode = new ProcessedJSXNodeImpl(textType, props, immutableProps, convertedChildren, flags, key);
      {
        vnode.$dev$ = node.dev;
      }
      return vnode;
    });
  } else {
    const vnode = new ProcessedJSXNodeImpl(textType, props, immutableProps, convertedChildren, flags, key);
    {
      vnode.$dev$ = node.dev;
    }
    return vnode;
  }
};
const wrapJSX = (element, input) => {
  const children = input === void 0 ? EMPTY_ARRAY : isArray(input) ? input : [input];
  const node = new ProcessedJSXNodeImpl(":virtual", {}, null, children, 0, null);
  node.$elm$ = element;
  return node;
};
const processData = (node, invocationContext) => {
  if (node == null || typeof node === "boolean") {
    return void 0;
  }
  if (isPrimitive(node)) {
    const newNode = new ProcessedJSXNodeImpl("#text", EMPTY_OBJ, null, EMPTY_ARRAY, 0, null);
    newNode.$text$ = String(node);
    return newNode;
  } else if (isJSXNode(node)) {
    return processNode(node, invocationContext);
  } else if (isSignal(node)) {
    const newNode = new ProcessedJSXNodeImpl("#signal", EMPTY_OBJ, null, EMPTY_ARRAY, 0, null);
    newNode.$signal$ = node;
    return newNode;
  } else if (isArray(node)) {
    const output = promiseAll(node.flatMap((n) => processData(n, invocationContext)));
    return maybeThen(output, (array) => array.flat(100).filter(isNotNullable));
  } else if (isPromise$1(node)) {
    return node.then((node2) => processData(node2, invocationContext));
  } else if (node === SkipRender) {
    return new ProcessedJSXNodeImpl(SKIP_RENDER_TYPE, EMPTY_OBJ, null, EMPTY_ARRAY, 0, null);
  } else {
    logWarn$1("A unsupported value was passed to the JSX, skipping render. Value:", node);
    return void 0;
  }
};
const isPrimitive = (obj) => {
  return isString(obj) || typeof obj === "number";
};
const resumeIfNeeded = (containerEl) => {
  const isResumed = directGetAttribute(containerEl, QContainerAttr);
  if (isResumed === "paused") {
    resumeContainer(containerEl);
    {
      appendQwikDevTools(containerEl);
    }
  }
};
const getPauseState = (containerEl) => {
  const doc = getDocument(containerEl);
  const isDocElement = containerEl === doc.documentElement;
  const parentJSON = isDocElement ? doc.body : containerEl;
  const script = getQwikJSON(parentJSON, "type");
  if (script) {
    const data = script.firstChild.data;
    return JSON.parse(unescapeText(data) || "{}");
  }
};
const resumeContainer = (containerEl) => {
  if (!isContainer$1(containerEl)) {
    logWarn$1("Skipping resuming because parent element is not q:container");
    return;
  }
  const pauseState = containerEl["_qwikjson_"] ?? getPauseState(containerEl);
  containerEl["_qwikjson_"] = null;
  if (!pauseState) {
    logWarn$1("Skipping resuming qwik/json metadata was not found.");
    return;
  }
  const doc = getDocument(containerEl);
  const hash2 = containerEl.getAttribute(QInstance$1);
  const isDocElement = containerEl === doc.documentElement;
  const parentJSON = isDocElement ? doc.body : containerEl;
  {
    const script = getQwikJSON(parentJSON, "type");
    if (!script) {
      logWarn$1("Skipping resuming qwik/json metadata was not found.");
      return;
    }
  }
  const inlinedFunctions = getQFuncs(doc, hash2);
  const containerState = _getContainerState(containerEl);
  const elements = /* @__PURE__ */ new Map();
  const text = /* @__PURE__ */ new Map();
  let node = null;
  let container = 0;
  const elementWalker = doc.createTreeWalker(containerEl, SHOW_COMMENT$1);
  while (node = elementWalker.nextNode()) {
    const data = node.data;
    if (container === 0) {
      if (data.startsWith("qv ")) {
        const id = getID(data);
        if (id >= 0) {
          elements.set(id, node);
        }
      } else if (data.startsWith("t=")) {
        const id = data.slice(2);
        const index = strToInt(id);
        const textNode = getTextNode(node);
        elements.set(index, textNode);
        text.set(index, textNode.data);
      }
    }
    if (data === "cq") {
      container++;
    } else if (data === "/cq") {
      container--;
    }
  }
  const slotPath = containerEl.getElementsByClassName("qc📦").length !== 0;
  containerEl.querySelectorAll("[q\\:id]").forEach((el) => {
    if (slotPath && el.closest("[q\\:container]") !== containerEl) {
      return;
    }
    const id = directGetAttribute(el, ELEMENT_ID);
    assertDefined(id, `resume: element missed q:id`, el);
    const index = strToInt(id);
    elements.set(index, el);
  });
  const parser = createParser(containerState, doc);
  const finalized = /* @__PURE__ */ new Map();
  const revived = /* @__PURE__ */ new Set();
  const getObject = (id) => {
    assertTrue(typeof id === "string" && id.length > 0, "resume: id must be an non-empty string, got:", id);
    if (finalized.has(id)) {
      return finalized.get(id);
    }
    return computeObject(id);
  };
  const computeObject = (id) => {
    if (id.startsWith("#")) {
      const elementId = id.slice(1);
      const index2 = strToInt(elementId);
      assertTrue(elements.has(index2), `missing element for id:`, elementId);
      const rawElement = elements.get(index2);
      assertDefined(rawElement, `missing element for id:`, elementId);
      if (isComment(rawElement)) {
        if (!rawElement.isConnected) {
          finalized.set(id, void 0);
          return void 0;
        }
        const virtual = getVirtualElement(rawElement);
        finalized.set(id, virtual);
        getContext(virtual, containerState);
        return virtual;
      } else if (isElement$1(rawElement)) {
        finalized.set(id, rawElement);
        getContext(rawElement, containerState);
        return rawElement;
      }
      finalized.set(id, rawElement);
      return rawElement;
    } else if (id.startsWith("@")) {
      const funcId = id.slice(1);
      const index2 = strToInt(funcId);
      const func = inlinedFunctions[index2];
      assertDefined(func, `missing inlined function for id:`, funcId);
      return func;
    } else if (id.startsWith("*")) {
      const elementId = id.slice(1);
      const index2 = strToInt(elementId);
      assertTrue(elements.has(index2), `missing element for id:`, elementId);
      const str = text.get(index2);
      assertDefined(str, `missing element for id:`, elementId);
      finalized.set(id, str);
      return str;
    }
    const index = strToInt(id);
    const objs = pauseState.objs;
    assertTrue(objs.length > index, "resume: index is out of bounds", id);
    let value = objs[index];
    if (isString(value)) {
      value = value === UNDEFINED_PREFIX ? void 0 : parser.prepare(value);
    }
    let obj = value;
    for (let i = id.length - 1; i >= 0; i--) {
      const code = id[i];
      const transform = OBJECT_TRANSFORMS[code];
      if (!transform) {
        break;
      }
      obj = transform(obj, containerState);
    }
    finalized.set(id, obj);
    if (!isPrimitive(value) && !revived.has(index)) {
      revived.add(index);
      reviveSubscriptions(value, index, pauseState.subs, getObject, containerState, parser);
      reviveNestedObjects(value, getObject, parser);
    }
    return obj;
  };
  containerState.$elementIndex$ = 1e5;
  containerState.$pauseCtx$ = {
    getObject,
    meta: pauseState.ctx,
    refs: pauseState.refs
  };
  directSetAttribute(containerEl, QContainerAttr, "resumed");
  logDebug$1("Container resumed");
  emitEvent$1(containerEl, "qresume", void 0, true);
};
const reviveSubscriptions = (value, i, objsSubs, getObject, containerState, parser) => {
  const subs = objsSubs[i];
  if (subs) {
    const converted = [];
    let flag = 0;
    for (const sub of subs) {
      if (sub.startsWith("_")) {
        flag = parseInt(sub.slice(1), 10);
      } else {
        const parsed = parseSubscription(sub, getObject);
        if (parsed) {
          converted.push(parsed);
        }
      }
    }
    if (flag > 0) {
      setObjectFlags(value, flag);
    }
    if (!parser.subs(value, converted)) {
      const proxy = containerState.$proxyMap$.get(value);
      if (proxy) {
        getSubscriptionManager(proxy).$addSubs$(converted);
      } else {
        createProxy(value, containerState, converted);
      }
    }
  }
};
const reviveNestedObjects = (obj, getObject, parser) => {
  if (parser.fill(obj, getObject)) {
    return;
  }
  if (obj && typeof obj == "object") {
    if (isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = getObject(obj[i]);
      }
    } else if (isSerializableObject(obj)) {
      for (const key in obj) {
        obj[key] = getObject(obj[key]);
      }
    }
  }
};
const unescapeText = (str) => {
  return str.replace(/\\x3C(\/?script)/gi, "<$1");
};
const getQwikJSON = (parentElm, attribute) => {
  let child = parentElm.lastElementChild;
  while (child) {
    if (child.tagName === "SCRIPT" && directGetAttribute(child, attribute) === "qwik/json") {
      return child;
    }
    child = child.previousElementSibling;
  }
  return void 0;
};
const getTextNode = (mark) => {
  const nextNode = mark.nextSibling;
  if (isText(nextNode)) {
    return nextNode;
  } else {
    const textNode = mark.ownerDocument.createTextNode("");
    mark.parentElement.insertBefore(textNode, mark);
    return textNode;
  }
};
const appendQwikDevTools = (containerEl) => {
  containerEl["qwik"] = {
    pause: () => pauseContainer(containerEl),
    state: _getContainerState(containerEl)
  };
};
const getID = (stuff) => {
  const index = stuff.indexOf("q:id=");
  if (index > 0) {
    return strToInt(stuff.slice(index + 5));
  }
  return -1;
};
const useLexicalScope = () => {
  const context = getInvokeContext();
  let qrl2 = context.$qrl$;
  if (!qrl2) {
    const el = context.$element$;
    assertDefined(el, "invoke: element must be defined inside useLexicalScope()", context);
    const container = getWrappingContainer(el);
    assertDefined(container, `invoke: cant find parent q:container of`, el);
    qrl2 = parseQRL(decodeURIComponent(String(context.$url$)), container);
    assertQrl(qrl2);
    resumeIfNeeded(container);
    const elCtx = getContext(el, _getContainerState(container));
    inflateQrl(qrl2, elCtx);
  } else {
    assertQrl(qrl2);
    assertDefined(qrl2.$captureRef$, "invoke: qrl $captureRef$ must be defined inside useLexicalScope()", qrl2);
  }
  return qrl2.$captureRef$;
};
const executeSignalOperation = (rCtx, operation) => {
  try {
    const type = operation[0];
    const staticCtx = rCtx.$static$;
    switch (type) {
      case 1:
      case 2: {
        let elm;
        let hostElm;
        if (type === 1) {
          elm = operation[1];
          hostElm = operation[3];
        } else {
          elm = operation[3];
          hostElm = operation[1];
        }
        const elCtx = tryGetContext$2(elm);
        if (elCtx == null) {
          return;
        }
        const prop = operation[4];
        const isSVG = elm.namespaceURI === SVG_NS;
        staticCtx.$containerState$.$subsManager$.$clearSignal$(operation);
        let value = trackSignal(operation[2], operation.slice(0, -1));
        if (prop === "class") {
          value = serializeClassWithHost(value, tryGetContext$2(hostElm));
        } else if (prop === "style") {
          value = stringifyStyle(value);
        }
        const vdom = getVdom(elCtx);
        if (prop in vdom.$props$ && vdom.$props$[prop] === value) {
          return;
        }
        vdom.$props$[prop] = value;
        return smartSetProperty(staticCtx, elm, prop, value, isSVG);
      }
      case 3:
      case 4: {
        const elm = operation[3];
        if (!staticCtx.$visited$.includes(elm)) {
          staticCtx.$containerState$.$subsManager$.$clearSignal$(operation);
          const invocationContext = void 0;
          let signalValue = trackSignal(operation[2], operation.slice(0, -1));
          const subscription = getLastSubscription();
          if (Array.isArray(signalValue)) {
            signalValue = new JSXNodeImpl(Virtual, {}, null, signalValue, 0, null);
          }
          let newVnode = processData(signalValue, invocationContext);
          if (isPromise$1(newVnode)) {
            logError("Rendering promises in JSX signals is not supported");
          } else {
            if (newVnode === void 0) {
              newVnode = processData("", invocationContext);
            }
            const oldVnode = getVnodeFromEl(elm);
            const element = getQwikElement(operation[1]);
            rCtx.$cmpCtx$ = getContext(element, rCtx.$static$.$containerState$);
            if (oldVnode.$type$ == newVnode.$type$ && oldVnode.$key$ == newVnode.$key$ && oldVnode.$id$ == newVnode.$id$) {
              diffVnode(rCtx, oldVnode, newVnode, 0);
            } else {
              const promises = [];
              const oldNode = oldVnode.$elm$;
              const newElm = createElm(rCtx, newVnode, 0, promises);
              if (promises.length) {
                logError("Rendering promises in JSX signals is not supported");
              }
              subscription[3] = newElm;
              insertBefore(rCtx.$static$, elm.parentElement, newElm, oldNode);
              oldNode && removeNode(staticCtx, oldNode);
            }
          }
        }
      }
    }
  } catch (e) {
  }
};
function getQwikElement(element) {
  while (element) {
    if (isQwikElement(element)) {
      return element;
    }
    element = element.parentElement;
  }
  throw new Error("Not found");
}
const notifyChange = (subAction, containerState) => {
  if (subAction[0] === 0) {
    const host = subAction[1];
    if (isSubscriberDescriptor(host)) {
      notifyTask(host, containerState);
    } else {
      notifyRender(host, containerState);
    }
  } else {
    notifySignalOperation(subAction, containerState);
  }
};
const notifyRender = (hostElement, containerState) => {
  const server = isServerPlatform();
  if (!server) {
    resumeIfNeeded(containerState.$containerEl$);
  }
  const elCtx = getContext(hostElement, containerState);
  assertDefined(elCtx.$componentQrl$, `render: notified host element must have a defined $renderQrl$`, elCtx);
  if (elCtx.$flags$ & HOST_FLAG_DIRTY) {
    return;
  }
  elCtx.$flags$ |= HOST_FLAG_DIRTY;
  const activeRendering = containerState.$hostsRendering$ !== void 0;
  if (activeRendering) {
    containerState.$hostsStaging$.add(elCtx);
  } else {
    if (server) {
      logWarn$1("Can not rerender in server platform");
      return void 0;
    }
    containerState.$hostsNext$.add(elCtx);
    scheduleFrame(containerState);
  }
};
const notifySignalOperation = (op, containerState) => {
  const activeRendering = containerState.$hostsRendering$ !== void 0;
  containerState.$opsNext$.add(op);
  if (!activeRendering) {
    scheduleFrame(containerState);
  }
};
const notifyTask = (task, containerState) => {
  if (task.$flags$ & TaskFlagsIsDirty) {
    return;
  }
  task.$flags$ |= TaskFlagsIsDirty;
  const activeRendering = containerState.$hostsRendering$ !== void 0;
  if (activeRendering) {
    containerState.$taskStaging$.add(task);
  } else {
    containerState.$taskNext$.add(task);
    scheduleFrame(containerState);
  }
};
const scheduleFrame = (containerState) => {
  if (containerState.$renderPromise$ === void 0) {
    containerState.$renderPromise$ = getPlatform().nextTick(() => renderMarked(containerState));
  }
  return containerState.$renderPromise$;
};
const _hW = () => {
  const [task] = useLexicalScope();
  notifyTask(task, _getContainerState(getWrappingContainer(task.$el$)));
};
const renderMarked = async (containerState) => {
  const containerEl = containerState.$containerEl$;
  const doc = getDocument(containerEl);
  try {
    const rCtx = createRenderContext(doc, containerState);
    const staticCtx = rCtx.$static$;
    const hostsRendering = containerState.$hostsRendering$ = new Set(containerState.$hostsNext$);
    containerState.$hostsNext$.clear();
    await executeTasksBefore(containerState, rCtx);
    containerState.$hostsStaging$.forEach((host) => {
      hostsRendering.add(host);
    });
    containerState.$hostsStaging$.clear();
    const signalOperations = Array.from(containerState.$opsNext$);
    containerState.$opsNext$.clear();
    const renderingQueue = Array.from(hostsRendering);
    sortNodes(renderingQueue);
    if (!containerState.$styleMoved$ && renderingQueue.length > 0) {
      containerState.$styleMoved$ = true;
      const parentJSON = containerEl === doc.documentElement ? doc.body : containerEl;
      parentJSON.querySelectorAll("style[q\\:style]").forEach((el) => {
        containerState.$styleIds$.add(directGetAttribute(el, QStyle));
        appendChild(staticCtx, doc.head, el);
      });
    }
    for (const elCtx of renderingQueue) {
      const el = elCtx.$element$;
      if (!staticCtx.$hostElements$.has(el)) {
        if (elCtx.$componentQrl$) {
          assertTrue(el.isConnected, "element must be connected to the dom");
          staticCtx.$roots$.push(elCtx);
          try {
            await renderComponent(rCtx, elCtx, getFlags(el.parentElement));
          } catch (err) {
            if (qDev$1) {
              throw err;
            }
          }
        }
      }
    }
    signalOperations.forEach((op) => {
      executeSignalOperation(rCtx, op);
    });
    staticCtx.$operations$.push(...staticCtx.$postOperations$);
    if (staticCtx.$operations$.length === 0) {
      printRenderStats(staticCtx);
      await postRendering(containerState, rCtx);
      return;
    }
    await executeContextWithScrollAndTransition(staticCtx);
    printRenderStats(staticCtx);
    return postRendering(containerState, rCtx);
  } catch (err) {
    logError(err);
  }
};
const getFlags = (el) => {
  let flags = 0;
  if (el) {
    if (el.namespaceURI === SVG_NS) {
      flags |= IS_SVG;
    }
    if (el.tagName === "HEAD") {
      flags |= IS_HEAD;
    }
  }
  return flags;
};
const postRendering = async (containerState, rCtx) => {
  const hostElements = rCtx.$static$.$hostElements$;
  await executeTasksAfter(containerState, rCtx, (task, stage) => {
    if ((task.$flags$ & TaskFlagsIsVisibleTask) === 0) {
      return false;
    }
    if (stage) {
      return hostElements.has(task.$el$);
    }
    return true;
  });
  containerState.$hostsStaging$.forEach((el) => {
    containerState.$hostsNext$.add(el);
  });
  containerState.$hostsStaging$.clear();
  containerState.$hostsRendering$ = void 0;
  containerState.$renderPromise$ = void 0;
  const pending = containerState.$hostsNext$.size + containerState.$taskNext$.size + containerState.$opsNext$.size;
  if (pending > 0) {
    containerState.$renderPromise$ = renderMarked(containerState);
  }
};
const isTask = (task) => (task.$flags$ & TaskFlagsIsTask) !== 0;
const isResourceTask$1 = (task) => (task.$flags$ & TaskFlagsIsResource) !== 0;
const executeTasksBefore = async (containerState, rCtx) => {
  const containerEl = containerState.$containerEl$;
  const resourcesPromises = [];
  const taskPromises = [];
  containerState.$taskNext$.forEach((task) => {
    if (isTask(task)) {
      taskPromises.push(maybeThen(task.$qrl$.$resolveLazy$(containerEl), () => task));
      containerState.$taskNext$.delete(task);
    }
    if (isResourceTask$1(task)) {
      resourcesPromises.push(maybeThen(task.$qrl$.$resolveLazy$(containerEl), () => task));
      containerState.$taskNext$.delete(task);
    }
  });
  do {
    containerState.$taskStaging$.forEach((task) => {
      if (isTask(task)) {
        taskPromises.push(maybeThen(task.$qrl$.$resolveLazy$(containerEl), () => task));
      } else if (isResourceTask$1(task)) {
        resourcesPromises.push(maybeThen(task.$qrl$.$resolveLazy$(containerEl), () => task));
      } else {
        containerState.$taskNext$.add(task);
      }
    });
    containerState.$taskStaging$.clear();
    if (taskPromises.length > 0) {
      const tasks = await Promise.all(taskPromises);
      sortTasks(tasks);
      await Promise.all(tasks.map((task) => {
        return runSubscriber(task, containerState, rCtx);
      }));
      taskPromises.length = 0;
    }
  } while (containerState.$taskStaging$.size > 0);
  if (resourcesPromises.length > 0) {
    const resources = await Promise.all(resourcesPromises);
    sortTasks(resources);
    for (const task of resources) {
      runSubscriber(task, containerState, rCtx);
    }
  }
};
const executeSSRTasks = (containerState, rCtx) => {
  const containerEl = containerState.$containerEl$;
  const staging = containerState.$taskStaging$;
  if (!staging.size) {
    return;
  }
  const taskPromises = [];
  let tries = 20;
  const runTasks = () => {
    staging.forEach((task) => {
      if (isTask(task)) {
        taskPromises.push(maybeThen(task.$qrl$.$resolveLazy$(containerEl), () => task));
      }
    });
    staging.clear();
    if (taskPromises.length > 0) {
      return Promise.all(taskPromises).then(async (tasks) => {
        sortTasks(tasks);
        await Promise.all(tasks.map((task) => {
          return runSubscriber(task, containerState, rCtx);
        }));
        taskPromises.length = 0;
        if (--tries && staging.size > 0) {
          return runTasks();
        }
        if (!tries) {
          logWarn$1(`Infinite task loop detected. Tasks:
${Array.from(staging).map((task) => `  ${task.$qrl$.$symbol$}`).join("\n")}`);
        }
      });
    }
  };
  return runTasks();
};
const executeTasksAfter = async (containerState, rCtx, taskPred) => {
  const taskPromises = [];
  const containerEl = containerState.$containerEl$;
  containerState.$taskNext$.forEach((task) => {
    if (taskPred(task, false)) {
      if (task.$el$.isConnected) {
        taskPromises.push(maybeThen(task.$qrl$.$resolveLazy$(containerEl), () => task));
      }
      containerState.$taskNext$.delete(task);
    }
  });
  do {
    containerState.$taskStaging$.forEach((task) => {
      if (task.$el$.isConnected) {
        if (taskPred(task, true)) {
          taskPromises.push(maybeThen(task.$qrl$.$resolveLazy$(containerEl), () => task));
        } else {
          containerState.$taskNext$.add(task);
        }
      }
    });
    containerState.$taskStaging$.clear();
    if (taskPromises.length > 0) {
      const tasks = await Promise.all(taskPromises);
      sortTasks(tasks);
      for (const task of tasks) {
        runSubscriber(task, containerState, rCtx);
      }
      taskPromises.length = 0;
    }
  } while (containerState.$taskStaging$.size > 0);
};
const sortNodes = (elements) => {
  elements.sort((a2, b) => a2.$element$.compareDocumentPosition(getRootNode(b.$element$)) & 2 ? 1 : -1);
};
const sortTasks = (tasks) => {
  const isServer3 = isServerPlatform();
  tasks.sort((a2, b) => {
    if (isServer3 || a2.$el$ === b.$el$) {
      return a2.$index$ < b.$index$ ? -1 : 1;
    }
    return (a2.$el$.compareDocumentPosition(getRootNode(b.$el$)) & 2) !== 0 ? 1 : -1;
  });
};
const useOn = (event, eventQrl2) => {
  _useOn(createEventName(event, void 0), eventQrl2);
};
const useOnDocument = (event, eventQrl2) => {
  _useOn(createEventName(event, "document"), eventQrl2);
};
const useOnWindow = (event, eventQrl2) => {
  _useOn(createEventName(event, "window"), eventQrl2);
};
const createEventName = (event, eventType) => {
  const formattedEventType = eventType !== void 0 ? eventType + ":" : "";
  const res = Array.isArray(event) ? event.map((e) => `${formattedEventType}on-${e}`) : `${formattedEventType}on-${event}`;
  return res;
};
const _useOn = (eventName, eventQrl2) => {
  if (eventQrl2) {
    const invokeCtx = useInvokeContext();
    const elCtx = getContext(invokeCtx.$hostElement$, invokeCtx.$renderCtx$.$static$.$containerState$);
    assertQrl(eventQrl2);
    if (typeof eventName === "string") {
      elCtx.li.push([normalizeOnProp(eventName), eventQrl2]);
    } else {
      elCtx.li.push(...eventName.map((name) => [normalizeOnProp(name), eventQrl2]));
    }
    elCtx.$flags$ |= HOST_FLAG_NEED_ATTACH_LISTENER;
  }
};
const createSignal = (initialState) => {
  const containerState = useContainerState();
  const value = isFunction(initialState) && !isQwikComponent(initialState) ? invoke(void 0, initialState) : initialState;
  return _createSignal(value, containerState, 0);
};
const useConstant = (value) => {
  const { val, set } = useSequentialScope();
  if (val != null) {
    return val;
  }
  value = isFunction(value) && !isQwikComponent(value) ? value() : value;
  return set(value);
};
const useSignal = (initialState) => {
  return useConstant(() => createSignal(initialState));
};
const TaskFlagsIsVisibleTask = 1 << 0;
const TaskFlagsIsTask = 1 << 1;
const TaskFlagsIsResource = 1 << 2;
const TaskFlagsIsComputed = 1 << 3;
const TaskFlagsIsDirty = 1 << 4;
const TaskFlagsIsCleanup = 1 << 5;
const useTaskQrl = (qrl2, opts) => {
  const { val, set, iCtx, i, elCtx } = useSequentialScope();
  if (val) {
    return;
  }
  assertQrl(qrl2);
  const containerState = iCtx.$renderCtx$.$static$.$containerState$;
  const task = new Task(TaskFlagsIsDirty | TaskFlagsIsTask, i, elCtx.$element$, qrl2, void 0);
  set(true);
  qrl2.$resolveLazy$(containerState.$containerEl$);
  if (!elCtx.$tasks$) {
    elCtx.$tasks$ = [];
  }
  elCtx.$tasks$.push(task);
  waitAndRun(iCtx, () => runTask(task, containerState, iCtx.$renderCtx$));
  if (isServerPlatform()) {
    useRunTask(task, opts?.eagerness);
  }
};
const isResourceTask = (task) => {
  return (task.$flags$ & TaskFlagsIsResource) !== 0;
};
const isComputedTask = (task) => {
  return (task.$flags$ & TaskFlagsIsComputed) !== 0;
};
const runSubscriber = async (task, containerState, rCtx) => {
  assertEqual(!!(task.$flags$ & TaskFlagsIsDirty), true, "Resource is not dirty", task);
  if (isResourceTask(task)) {
    return runResource(task, containerState, rCtx);
  } else if (isComputedTask(task)) {
    return runComputed(task, containerState, rCtx);
  } else {
    return runTask(task, containerState, rCtx);
  }
};
const runResource = (task, containerState, rCtx, waitOn) => {
  task.$flags$ &= ~TaskFlagsIsDirty;
  cleanupTask(task);
  const el = task.$el$;
  const iCtx = newInvokeContext(rCtx.$static$.$locale$, el, void 0, TaskEvent);
  const { $subsManager$: subsManager } = containerState;
  iCtx.$renderCtx$ = rCtx;
  const taskFn = task.$qrl$.getFn(iCtx, () => {
    subsManager.$clearSub$(task);
  });
  const cleanups = [];
  const resource = task.$state$;
  assertDefined(resource, 'useResource: when running a resource, "task.r" must be a defined.', task);
  const track = (obj, prop) => {
    if (isFunction(obj)) {
      const ctx = newInvokeContext();
      ctx.$renderCtx$ = rCtx;
      ctx.$subscriber$ = [0, task];
      return invoke(ctx, obj);
    }
    const manager = getSubscriptionManager(obj);
    if (manager) {
      manager.$addSub$([0, task], prop);
    } else {
      logErrorAndStop$1(codeToText$1(QError_trackUseStore), obj);
    }
    if (prop) {
      return obj[prop];
    } else if (isSignal(obj)) {
      return obj.value;
    } else {
      return obj;
    }
  };
  const resourceTarget = unwrapProxy(resource);
  const opts = {
    track,
    cleanup(callback) {
      cleanups.push(callback);
    },
    cache(policy) {
      let milliseconds = 0;
      if (policy === "immutable") {
        milliseconds = Infinity;
      } else {
        milliseconds = policy;
      }
      resource._cache = milliseconds;
    },
    previous: resourceTarget._resolved
  };
  let resolve;
  let reject;
  let done = false;
  const setState = (resolved, value) => {
    if (!done) {
      done = true;
      if (resolved) {
        done = true;
        resource.loading = false;
        resource._state = "resolved";
        resource._resolved = value;
        resource._error = void 0;
        resolve(value);
      } else {
        done = true;
        resource.loading = false;
        resource._state = "rejected";
        resource._error = value;
        reject(value);
      }
      return true;
    }
    return false;
  };
  invoke(iCtx, () => {
    resource._state = "pending";
    resource.loading = !isServerPlatform();
    resource.value = new Promise((r, re) => {
      resolve = r;
      reject = re;
    });
  });
  task.$destroy$ = noSerialize(() => {
    done = true;
    cleanups.forEach((fn) => fn());
  });
  const promise = safeCall(() => maybeThen(waitOn, () => taskFn(opts)), (value) => {
    setState(true, value);
  }, (reason) => {
    setState(false, reason);
  });
  const timeout = resourceTarget._timeout;
  if (timeout > 0) {
    return Promise.race([
      promise,
      delay(timeout).then(() => {
        if (setState(false, new Error("timeout"))) {
          cleanupTask(task);
        }
      })
    ]);
  }
  return promise;
};
const runTask = (task, containerState, rCtx) => {
  task.$flags$ &= ~TaskFlagsIsDirty;
  cleanupTask(task);
  const hostElement = task.$el$;
  const iCtx = newInvokeContext(rCtx.$static$.$locale$, hostElement, void 0, TaskEvent);
  iCtx.$renderCtx$ = rCtx;
  const { $subsManager$: subsManager } = containerState;
  const taskFn = task.$qrl$.getFn(iCtx, () => {
    subsManager.$clearSub$(task);
  });
  const track = (obj, prop) => {
    if (isFunction(obj)) {
      const ctx = newInvokeContext();
      ctx.$subscriber$ = [0, task];
      return invoke(ctx, obj);
    }
    const manager = getSubscriptionManager(obj);
    if (manager) {
      manager.$addSub$([0, task], prop);
    } else {
      logErrorAndStop$1(codeToText$1(QError_trackUseStore), obj);
    }
    if (prop) {
      return obj[prop];
    } else if (isSignal(obj)) {
      return obj.value;
    } else {
      return obj;
    }
  };
  const cleanups = [];
  task.$destroy$ = noSerialize(() => {
    cleanups.forEach((fn) => fn());
  });
  const opts = {
    track,
    cleanup(callback) {
      cleanups.push(callback);
    }
  };
  return safeCall(() => taskFn(opts), (returnValue) => {
    if (isFunction(returnValue)) {
      cleanups.push(returnValue);
    }
  }, (reason) => {
    handleError(reason, hostElement, rCtx);
  });
};
const runComputed = (task, containerState, rCtx) => {
  assertSignal(task.$state$);
  task.$flags$ &= ~TaskFlagsIsDirty;
  cleanupTask(task);
  const hostElement = task.$el$;
  const iCtx = newInvokeContext(rCtx.$static$.$locale$, hostElement, void 0, ComputedEvent);
  iCtx.$subscriber$ = [0, task];
  iCtx.$renderCtx$ = rCtx;
  const { $subsManager$: subsManager } = containerState;
  const taskFn = task.$qrl$.getFn(iCtx, () => {
    subsManager.$clearSub$(task);
  });
  const ok = (returnValue) => {
    untrack(() => {
      const signal = task.$state$;
      signal[QObjectSignalFlags] &= ~SIGNAL_UNASSIGNED;
      if (signal.untrackedValue !== returnValue) {
        signal.untrackedValue = returnValue;
        signal[QObjectManagerSymbol].$notifySubs$();
      }
    });
  };
  const fail = (reason) => {
    handleError(reason, hostElement, rCtx);
  };
  try {
    return maybeThen(task.$qrl$.$resolveLazy$(containerState.$containerEl$), () => {
      const result = taskFn();
      if (isPromise$1(result)) {
        const warningMessage = "useComputed$: Async functions in computed tasks are deprecated and will stop working in v2. Use useTask$ or useResource$ instead.";
        const stack = new Error(warningMessage).stack;
        if (!stack) {
          logOnceWarn(warningMessage);
        } else {
          const lessScaryStack = stack.replace(/^Error:\s*/, "");
          logOnceWarn(lessScaryStack);
        }
        return result.then(ok, fail);
      } else {
        ok(result);
      }
    });
  } catch (reason) {
    fail(reason);
  }
};
const cleanupTask = (task) => {
  const destroy = task.$destroy$;
  if (destroy) {
    task.$destroy$ = void 0;
    try {
      destroy();
    } catch (err) {
      logError(err);
    }
  }
};
const destroyTask = (task) => {
  if (task.$flags$ & TaskFlagsIsCleanup) {
    task.$flags$ &= ~TaskFlagsIsCleanup;
    const cleanup = task.$qrl$;
    cleanup();
  } else {
    cleanupTask(task);
  }
};
const useRunTask = (task, eagerness) => {
  if (eagerness === "visible" || eagerness === "intersection-observer") {
    useOn("qvisible", getTaskHandlerQrl(task));
  } else if (eagerness === "load" || eagerness === "document-ready") {
    useOnDocument("qinit", getTaskHandlerQrl(task));
  } else if (eagerness === "idle" || eagerness === "document-idle") {
    useOnDocument("qidle", getTaskHandlerQrl(task));
  }
};
const getTaskHandlerQrl = (task) => {
  const taskQrl = task.$qrl$;
  const taskHandler = createQRL(taskQrl.$chunk$, "_hW", _hW, null, null, [task], taskQrl.$symbol$);
  if (taskQrl.dev) {
    taskHandler.dev = taskQrl.dev;
  }
  return taskHandler;
};
const isSubscriberDescriptor = (obj) => {
  return isObject(obj) && obj instanceof Task;
};
const serializeTask = (task, getObjId) => {
  let value = `${intToStr(task.$flags$)} ${intToStr(task.$index$)} ${getObjId(task.$qrl$)} ${getObjId(task.$el$)}`;
  if (task.$state$) {
    value += ` ${getObjId(task.$state$)}`;
  }
  return value;
};
const parseTask = (data) => {
  const [flags, index, qrl2, el, resource] = data.split(" ");
  return new Task(strToInt(flags), strToInt(index), el, qrl2, resource);
};
class Task {
  $flags$;
  $index$;
  $el$;
  $qrl$;
  $state$;
  constructor($flags$, $index$, $el$, $qrl$, $state$) {
    this.$flags$ = $flags$;
    this.$index$ = $index$;
    this.$el$ = $el$;
    this.$qrl$ = $qrl$;
    this.$state$ = $state$;
  }
}
function isElement$2(value) {
  return isNode$2(value) && value.nodeType === 1;
}
function isNode$2(value) {
  return value && typeof value.nodeType === "number";
}
const HOST_FLAG_DIRTY = 1 << 0;
const HOST_FLAG_NEED_ATTACH_LISTENER = 1 << 1;
const HOST_FLAG_MOUNTED = 1 << 2;
const HOST_FLAG_DYNAMIC = 1 << 3;
const tryGetContext$2 = (element) => {
  return element[Q_CTX];
};
const getContext = (el, containerState) => {
  assertQwikElement(el);
  const ctx = tryGetContext$2(el);
  if (ctx) {
    return ctx;
  }
  const elCtx = createContext(el);
  const elementID = directGetAttribute(el, "q:id");
  if (elementID) {
    const pauseCtx = containerState.$pauseCtx$;
    elCtx.$id$ = elementID;
    if (pauseCtx) {
      const { getObject, meta, refs } = pauseCtx;
      if (isElement$2(el)) {
        const refMap = refs[elementID];
        if (refMap) {
          elCtx.$refMap$ = refMap.split(" ").map(getObject);
          elCtx.li = getDomListeners(elCtx, containerState.$containerEl$);
        }
      } else {
        const styleIds = el.getAttribute(QScopedStyle);
        elCtx.$scopeIds$ = styleIds ? styleIds.split("|") : null;
        const ctxMeta = meta[elementID];
        if (ctxMeta) {
          const seq = ctxMeta.s;
          const host = ctxMeta.h;
          const contexts = ctxMeta.c;
          const tasks = ctxMeta.w;
          if (seq) {
            elCtx.$seq$ = seq.split(" ").map(getObject);
          }
          if (tasks) {
            elCtx.$tasks$ = tasks.split(" ").map(getObject);
          }
          if (contexts) {
            elCtx.$contexts$ = /* @__PURE__ */ new Map();
            for (const part of contexts.split(" ")) {
              const [key, value] = part.split("=");
              elCtx.$contexts$.set(key, getObject(value));
            }
          }
          if (host) {
            const [renderQrl, props] = host.split(" ");
            elCtx.$flags$ = HOST_FLAG_MOUNTED;
            if (renderQrl) {
              elCtx.$componentQrl$ = getObject(renderQrl);
            }
            if (props) {
              const propsObj = getObject(props);
              elCtx.$props$ = propsObj;
              setObjectFlags(propsObj, QObjectImmutable);
              propsObj[_IMMUTABLE] = getImmutableFromProps(propsObj);
            } else {
              elCtx.$props$ = createProxy(createPropsState(), containerState);
            }
          }
        }
      }
    }
  }
  return elCtx;
};
const getImmutableFromProps = (props) => {
  const immutable = {};
  const target = getProxyTarget(props);
  for (const key in target) {
    if (key.startsWith(_IMMUTABLE_PREFIX)) {
      immutable[key.slice(_IMMUTABLE_PREFIX.length)] = target[key];
    }
  }
  return immutable;
};
const createContext = (element) => {
  const ctx = {
    $flags$: 0,
    $id$: "",
    $element$: element,
    $refMap$: [],
    li: [],
    $tasks$: null,
    $seq$: null,
    $slots$: null,
    $scopeIds$: null,
    $appendStyles$: null,
    $props$: null,
    $vdom$: null,
    $componentQrl$: null,
    $contexts$: null,
    $dynamicSlots$: null,
    $parentCtx$: void 0,
    $realParentCtx$: void 0
  };
  seal(ctx);
  element[Q_CTX] = ctx;
  return ctx;
};
const cleanupContext = (elCtx, subsManager) => {
  elCtx.$tasks$?.forEach((task) => {
    subsManager.$clearSub$(task);
    destroyTask(task);
  });
  elCtx.$componentQrl$ = null;
  elCtx.$seq$ = null;
  elCtx.$tasks$ = null;
};
let _locale = void 0;
function getLocale(defaultLocale) {
  if (_locale === void 0) {
    const ctx = tryGetInvokeContext();
    if (ctx && ctx.$locale$) {
      return ctx.$locale$;
    }
    {
      return defaultLocale;
    }
  }
  return _locale;
}
function withLocale(locale, fn) {
  const previousLang = _locale;
  try {
    _locale = locale;
    return fn();
  } finally {
    _locale = previousLang;
  }
}
function setLocale(locale) {
  _locale = locale;
}
let _context;
const tryGetInvokeContext = () => {
  if (!_context) {
    const context = typeof document !== "undefined" && document && document.__q_context__;
    if (!context) {
      return void 0;
    }
    if (isArray(context)) {
      return document.__q_context__ = newInvokeContextFromTuple(context);
    }
    return context;
  }
  return _context;
};
const getInvokeContext = () => {
  const ctx = tryGetInvokeContext();
  if (!ctx) {
    throw qError$1(QError_useMethodOutsideContext);
  }
  return ctx;
};
const useInvokeContext = () => {
  const ctx = tryGetInvokeContext();
  if (!ctx || ctx.$event$ !== RenderEvent) {
    throw qError$1(QError_useInvokeContext);
  }
  assertDefined(ctx.$hostElement$, `invoke: $hostElement$ must be defined`, ctx);
  assertDefined(ctx.$waitOn$, `invoke: $waitOn$ must be defined`, ctx);
  assertDefined(ctx.$renderCtx$, `invoke: $renderCtx$ must be defined`, ctx);
  assertDefined(ctx.$subscriber$, `invoke: $subscriber$ must be defined`, ctx);
  return ctx;
};
const useContainerState = () => {
  const ctx = useInvokeContext();
  return ctx.$renderCtx$.$static$.$containerState$;
};
function invoke(context, fn, ...args) {
  return invokeApply.call(this, context, fn, args);
}
function invokeApply(context, fn, args) {
  const previousContext = _context;
  let returnValue;
  try {
    _context = context;
    returnValue = fn.apply(this, args);
  } finally {
    _context = previousContext;
  }
  return returnValue;
}
const waitAndRun = (ctx, callback) => {
  const waitOn = ctx.$waitOn$;
  if (waitOn.length === 0) {
    const result = callback();
    if (isPromise$1(result)) {
      waitOn.push(result);
    }
  } else {
    waitOn.push(Promise.all(waitOn).then(callback));
  }
};
const newInvokeContextFromTuple = ([element, event, url]) => {
  const container = element.closest(QContainerSelector);
  const locale = container?.getAttribute(QLocaleAttr) || void 0;
  locale && setLocale(locale);
  return newInvokeContext(locale, void 0, element, event, url);
};
const newInvokeContext = (locale, hostElement, element, event, url) => {
  const $locale$ = locale || (typeof event === "object" && event && "locale" in event ? event.locale : void 0);
  const ctx = {
    $url$: url,
    $i$: 0,
    $hostElement$: hostElement,
    $element$: element,
    $event$: event,
    $qrl$: void 0,
    $waitOn$: void 0,
    $subscriber$: void 0,
    $renderCtx$: void 0,
    $locale$
  };
  seal(ctx);
  return ctx;
};
const getWrappingContainer = (el) => {
  return el.closest(QContainerSelector);
};
const untrack = (expr, ...args) => {
  if (typeof expr === "function") {
    return invoke(void 0, expr, ...args);
  }
  if (isSignal(expr)) {
    return expr.untrackedValue;
  }
  return unwrapProxy(expr);
};
const trackInvocation = /* @__PURE__ */ newInvokeContext(void 0, void 0, void 0, RenderEvent);
const trackSignal = (signal, sub) => {
  trackInvocation.$subscriber$ = sub;
  return invoke(trackInvocation, () => signal.value);
};
const _getContextElement = () => {
  const iCtx = tryGetInvokeContext();
  if (iCtx) {
    return iCtx.$element$ ?? iCtx.$hostElement$ ?? iCtx.$qrl$?.$setContainer$(void 0);
  }
};
const _getContextEvent = () => {
  const iCtx = tryGetInvokeContext();
  if (iCtx) {
    return iCtx.$event$;
  }
};
const _jsxBranch = (input) => {
  const iCtx = tryGetInvokeContext();
  if (iCtx && iCtx.$hostElement$ && iCtx.$renderCtx$) {
    const hostElement = iCtx.$hostElement$;
    const elCtx = getContext(hostElement, iCtx.$renderCtx$.$static$.$containerState$);
    elCtx.$flags$ |= HOST_FLAG_DYNAMIC;
  }
  return input;
};
const _createSignal = (value, containerState, flags, subscriptions) => {
  const manager = containerState.$subsManager$.$createManager$(subscriptions);
  const signal = new SignalImpl(value, manager, flags);
  return signal;
};
const QObjectSignalFlags = /* @__PURE__ */ Symbol("proxy manager");
const SIGNAL_IMMUTABLE = 1 << 0;
const SIGNAL_UNASSIGNED = 1 << 1;
const SignalUnassignedException = /* @__PURE__ */ Symbol("unassigned signal");
class SignalBase {
}
class SignalImpl extends SignalBase {
  untrackedValue;
  [QObjectManagerSymbol];
  [QObjectSignalFlags] = 0;
  constructor(v, manager, flags) {
    super();
    this.untrackedValue = v;
    this[QObjectManagerSymbol] = manager;
    this[QObjectSignalFlags] = flags;
  }
  // prevent accidental use as value
  valueOf() {
    {
      throw new TypeError("Cannot coerce a Signal, use `.value` instead");
    }
  }
  toString() {
    return `[Signal ${String(this.value)}]`;
  }
  toJSON() {
    return { value: this.value };
  }
  get value() {
    if (this[QObjectSignalFlags] & SIGNAL_UNASSIGNED) {
      throw SignalUnassignedException;
    }
    const sub = tryGetInvokeContext()?.$subscriber$;
    if (sub) {
      this[QObjectManagerSymbol].$addSub$(sub);
    }
    return this.untrackedValue;
  }
  set value(v) {
    {
      if (this[QObjectSignalFlags] & SIGNAL_IMMUTABLE) {
        throw new Error("Cannot mutate immutable signal");
      }
      {
        verifySerializable(v);
      }
      const invokeCtx = tryGetInvokeContext();
      if (invokeCtx) {
        if (invokeCtx.$event$ === RenderEvent) {
          logWarn$1("State mutation inside render function. Use useTask$() instead.", invokeCtx.$hostElement$);
        } else if (invokeCtx.$event$ === ComputedEvent) {
          logWarn$1("State mutation inside useComputed$() is an antipattern. Use useTask$() instead", invokeCtx.$hostElement$);
        } else if (invokeCtx.$event$ === ResourceEvent) {
          logWarn$1("State mutation inside useResource$() is an antipattern. Use useTask$() instead", invokeCtx.$hostElement$);
        }
      }
    }
    const manager = this[QObjectManagerSymbol];
    const oldValue = this.untrackedValue;
    if (manager && oldValue !== v) {
      this.untrackedValue = v;
      manager.$notifySubs$();
    }
  }
}
class SignalDerived extends SignalBase {
  $func$;
  $args$;
  $funcStr$;
  constructor($func$, $args$, $funcStr$) {
    super();
    this.$func$ = $func$;
    this.$args$ = $args$;
    this.$funcStr$ = $funcStr$;
  }
  get value() {
    return this.$func$.apply(void 0, this.$args$);
  }
}
class SignalWrapper extends SignalBase {
  ref;
  prop;
  constructor(ref, prop) {
    super();
    this.ref = ref;
    this.prop = prop;
  }
  get [QObjectManagerSymbol]() {
    return getSubscriptionManager(this.ref);
  }
  get value() {
    return this.ref[this.prop];
  }
  set value(value) {
    this.ref[this.prop] = value;
  }
}
const isSignal = (obj) => {
  return obj instanceof SignalBase;
};
const _wrapProp = (obj, prop) => {
  if (!isObject(obj)) {
    return obj[prop];
  }
  if (obj instanceof SignalBase) {
    assertEqual(prop, "value", "Left side is a signal, prop must be value");
    return obj;
  }
  const target = getProxyTarget(obj);
  if (target) {
    const signal = target[_IMMUTABLE_PREFIX + prop];
    if (signal) {
      assertTrue(isSignal(signal), `${_IMMUTABLE_PREFIX} has to be a signal kind`);
      return signal;
    }
    if (target[_IMMUTABLE]?.[prop] !== true) {
      return new SignalWrapper(obj, prop);
    }
  }
  const immutable = obj[_IMMUTABLE]?.[prop];
  if (isSignal(immutable)) {
    return immutable;
  }
  return _IMMUTABLE;
};
const _wrapSignal = (obj, prop) => {
  const r = _wrapProp(obj, prop);
  if (r === _IMMUTABLE) {
    return obj[prop];
  }
  return r;
};
const CONTAINER_STATE = /* @__PURE__ */ Symbol("ContainerState");
const _getContainerState = (containerEl) => {
  let state = containerEl[CONTAINER_STATE];
  if (!state) {
    containerEl[CONTAINER_STATE] = state = createContainerState(containerEl, directGetAttribute(containerEl, "q:base") ?? "/");
  }
  return state;
};
const createContainerState = (containerEl, base) => {
  const containerAttributes = {};
  if (containerEl) {
    const attrs = containerEl.attributes;
    if (attrs) {
      for (let index = 0; index < attrs.length; index++) {
        const attr = attrs[index];
        containerAttributes[attr.name] = attr.value;
      }
    }
  }
  const containerState = {
    $containerEl$: containerEl,
    $elementIndex$: 0,
    $styleMoved$: false,
    $proxyMap$: /* @__PURE__ */ new WeakMap(),
    $opsNext$: /* @__PURE__ */ new Set(),
    $taskNext$: /* @__PURE__ */ new Set(),
    $taskStaging$: /* @__PURE__ */ new Set(),
    $hostsNext$: /* @__PURE__ */ new Set(),
    $hostsStaging$: /* @__PURE__ */ new Set(),
    $styleIds$: /* @__PURE__ */ new Set(),
    $events$: /* @__PURE__ */ new Set(),
    $serverData$: { containerAttributes },
    $base$: base,
    $renderPromise$: void 0,
    $hostsRendering$: void 0,
    $pauseCtx$: void 0,
    $subsManager$: null,
    $inlineFns$: /* @__PURE__ */ new Map()
  };
  seal(containerState);
  containerState.$subsManager$ = createSubscriptionManager(containerState);
  return containerState;
};
const setRef = (value, elm) => {
  if (isFunction(value)) {
    return value(elm);
  } else if (isSignal(value)) {
    if (isServerPlatform()) {
      return value.untrackedValue = elm;
    } else {
      return value.value = elm;
    }
  }
  throw qError$1(QError_invalidRefValue, value);
};
const SHOW_ELEMENT = 1;
const SHOW_COMMENT$1 = 128;
const FILTER_REJECT$1 = 2;
const FILTER_SKIP = 3;
const isContainer$1 = (el) => {
  return isElement$1(el) && el.hasAttribute(QContainerAttr);
};
const intToStr = (nu) => {
  return nu.toString(36);
};
const strToInt = (nu) => {
  return parseInt(nu, 36);
};
const getEventName = (attribute) => {
  const colonPos = attribute.indexOf(":");
  if (attribute) {
    return fromKebabToCamelCase(attribute.slice(colonPos + 1));
  } else {
    return attribute;
  }
};
const SVG_NS = "http://www.w3.org/2000/svg";
const IS_SVG = 1 << 0;
const IS_HEAD = 1 << 1;
const IS_IMMUTABLE = 1 << 2;
const CHILDREN_PLACEHOLDER = [];
const smartUpdateChildren = (ctx, oldVnode, newVnode, flags) => {
  assertQwikElement(oldVnode.$elm$);
  const ch = newVnode.$children$;
  if (ch.length === 1 && ch[0].$type$ === SKIP_RENDER_TYPE) {
    newVnode.$children$ = oldVnode.$children$;
    return;
  }
  const elm = oldVnode.$elm$;
  const needsDOMRead = oldVnode.$children$ === CHILDREN_PLACEHOLDER;
  let filter = isChildComponent;
  if (needsDOMRead) {
    const isHead = elm.nodeName === "HEAD";
    if (isHead) {
      filter = isHeadChildren;
      flags |= IS_HEAD;
    }
  }
  const oldCh = getVnodeChildren(oldVnode, filter);
  if (oldCh.length > 0 && ch.length > 0) {
    return diffChildren(ctx, elm, oldCh, ch, flags);
  } else if (oldCh.length > 0 && ch.length === 0) {
    return removeChildren(ctx.$static$, oldCh, 0, oldCh.length - 1);
  } else if (ch.length > 0) {
    return addChildren(ctx, elm, null, ch, 0, ch.length - 1, flags);
  }
};
const getVnodeChildren = (oldVnode, filter) => {
  const oldCh = oldVnode.$children$;
  const elm = oldVnode.$elm$;
  if (oldCh === CHILDREN_PLACEHOLDER) {
    return oldVnode.$children$ = getChildrenVnodes(elm, filter);
  }
  return oldCh;
};
const diffChildren = (ctx, parentElm, oldCh, newCh, flags) => {
  let oldStartIdx = 0;
  let newStartIdx = 0;
  let oldEndIdx = oldCh.length - 1;
  let oldStartVnode = oldCh[0];
  let oldEndVnode = oldCh[oldEndIdx];
  let newEndIdx = newCh.length - 1;
  let newStartVnode = newCh[0];
  let newEndVnode = newCh[newEndIdx];
  let oldKeyToIdx;
  let idxInOld;
  let elmToMove;
  const results = [];
  const staticCtx = ctx.$static$;
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (oldStartVnode == null) {
      oldStartVnode = oldCh[++oldStartIdx];
    } else if (oldEndVnode == null) {
      oldEndVnode = oldCh[--oldEndIdx];
    } else if (newStartVnode == null) {
      newStartVnode = newCh[++newStartIdx];
    } else if (newEndVnode == null) {
      newEndVnode = newCh[--newEndIdx];
    } else if (oldStartVnode.$id$ === newStartVnode.$id$) {
      results.push(diffVnode(ctx, oldStartVnode, newStartVnode, flags));
      oldStartVnode = oldCh[++oldStartIdx];
      newStartVnode = newCh[++newStartIdx];
    } else if (oldEndVnode.$id$ === newEndVnode.$id$) {
      results.push(diffVnode(ctx, oldEndVnode, newEndVnode, flags));
      oldEndVnode = oldCh[--oldEndIdx];
      newEndVnode = newCh[--newEndIdx];
    } else if (oldStartVnode.$key$ && oldStartVnode.$id$ === newEndVnode.$id$) {
      assertDefined(oldStartVnode.$elm$, "oldStartVnode $elm$ must be defined");
      assertDefined(oldEndVnode.$elm$, "oldEndVnode $elm$ must be defined");
      results.push(diffVnode(ctx, oldStartVnode, newEndVnode, flags));
      insertAfter(staticCtx, parentElm, oldStartVnode.$elm$, oldEndVnode.$elm$);
      oldStartVnode = oldCh[++oldStartIdx];
      newEndVnode = newCh[--newEndIdx];
    } else if (oldEndVnode.$key$ && oldEndVnode.$id$ === newStartVnode.$id$) {
      assertDefined(oldStartVnode.$elm$, "oldStartVnode $elm$ must be defined");
      assertDefined(oldEndVnode.$elm$, "oldEndVnode $elm$ must be defined");
      results.push(diffVnode(ctx, oldEndVnode, newStartVnode, flags));
      insertBefore(staticCtx, parentElm, oldEndVnode.$elm$, oldStartVnode.$elm$);
      oldEndVnode = oldCh[--oldEndIdx];
      newStartVnode = newCh[++newStartIdx];
    } else {
      if (oldKeyToIdx === void 0) {
        oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
      }
      idxInOld = oldKeyToIdx[newStartVnode.$key$];
      if (idxInOld === void 0) {
        const newElm = createElm(ctx, newStartVnode, flags, results);
        insertBefore(staticCtx, parentElm, newElm, oldStartVnode?.$elm$);
      } else {
        elmToMove = oldCh[idxInOld];
        if (elmToMove.$type$ !== newStartVnode.$type$) {
          const newElm = createElm(ctx, newStartVnode, flags, results);
          maybeThen(newElm, (newElm2) => {
            insertBefore(staticCtx, parentElm, newElm2, oldStartVnode?.$elm$);
          });
        } else {
          results.push(diffVnode(ctx, elmToMove, newStartVnode, flags));
          oldCh[idxInOld] = void 0;
          assertDefined(elmToMove.$elm$, "elmToMove $elm$ must be defined");
          insertBefore(staticCtx, parentElm, elmToMove.$elm$, oldStartVnode.$elm$);
        }
      }
      newStartVnode = newCh[++newStartIdx];
    }
  }
  if (newStartIdx <= newEndIdx) {
    const before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].$elm$;
    results.push(addChildren(ctx, parentElm, before, newCh, newStartIdx, newEndIdx, flags));
  }
  let wait = promiseAll(results);
  if (oldStartIdx <= oldEndIdx) {
    wait = maybeThen(wait, () => {
      removeChildren(staticCtx, oldCh, oldStartIdx, oldEndIdx);
    });
  }
  return wait;
};
const getChildren = (elm, filter) => {
  const end = isVirtualElement(elm) ? elm.close : null;
  const nodes = [];
  let node = elm.firstChild;
  while (node = processVirtualNodes(node)) {
    if (filter(node)) {
      nodes.push(node);
    }
    node = node.nextSibling;
    if (node === end) {
      break;
    }
  }
  return nodes;
};
const getChildrenVnodes = (elm, filter) => {
  return getChildren(elm, filter).map(getVnodeFromEl);
};
const getVnodeFromEl = (el) => {
  if (isElement$1(el)) {
    return tryGetContext$2(el)?.$vdom$ ?? domToVnode(el);
  }
  return domToVnode(el);
};
const domToVnode = (node) => {
  if (isQwikElement(node)) {
    const t = new ProcessedJSXNodeImpl(node.localName, {}, null, CHILDREN_PLACEHOLDER, 0, getKey(node));
    t.$elm$ = node;
    return t;
  } else if (isText(node)) {
    const t = new ProcessedJSXNodeImpl(node.nodeName, EMPTY_OBJ, null, CHILDREN_PLACEHOLDER, 0, null);
    t.$text$ = node.data;
    t.$elm$ = node;
    return t;
  }
  assertFail("Invalid node type");
};
const isHeadChildren = (node) => {
  const type = node.nodeType;
  if (type === 1) {
    return node.hasAttribute("q:head");
  }
  return type === 111;
};
const isSlotTemplate = (node) => {
  return node.nodeName === "Q:TEMPLATE";
};
const isChildComponent = (node) => {
  const type = node.nodeType;
  if (type === 3 || type === 111) {
    return true;
  }
  if (type !== 1) {
    return false;
  }
  const nodeName = node.nodeName;
  if (nodeName === "Q:TEMPLATE") {
    return false;
  }
  if (nodeName === "HEAD") {
    return node.hasAttribute("q:head");
  }
  if (nodeName === "STYLE") {
    return !node.hasAttribute(QStyle);
  }
  return true;
};
const splitChildren = (input) => {
  const output = {};
  for (const item of input) {
    const key = getSlotName(item);
    const node = output[key] ?? (output[key] = new ProcessedJSXNodeImpl(VIRTUAL, {
      [QSlotS]: ""
    }, null, [], 0, key));
    node.$children$.push(item);
  }
  return output;
};
const diffVnode = (rCtx, oldVnode, newVnode, flags) => {
  assertEqual(oldVnode.$type$, newVnode.$type$, "old and new vnodes type must be the same");
  assertEqual(oldVnode.$key$, newVnode.$key$, "old and new vnodes key must be the same");
  assertEqual(oldVnode.$id$, newVnode.$id$, "old and new vnodes key must be the same");
  const elm = oldVnode.$elm$;
  const tag = newVnode.$type$;
  const staticCtx = rCtx.$static$;
  const containerState = staticCtx.$containerState$;
  const currentComponent = rCtx.$cmpCtx$;
  assertDefined(elm, "while patching element must be defined");
  assertDefined(currentComponent, "while patching current component must be defined");
  newVnode.$elm$ = elm;
  if (tag === "#text") {
    staticCtx.$visited$.push(elm);
    const signal = newVnode.$signal$;
    if (signal) {
      newVnode.$text$ = jsxToString(trackSignal(signal, [4, currentComponent.$element$, signal, elm]));
    }
    setProperty(staticCtx, elm, "data", newVnode.$text$);
    return;
  } else if (tag === "#signal") {
    return;
  }
  assertQwikElement(elm);
  const props = newVnode.$props$;
  const vnodeFlags = newVnode.$flags$;
  const elCtx = getContext(elm, containerState);
  if (tag !== VIRTUAL) {
    let isSvg = (flags & IS_SVG) !== 0;
    if (!isSvg && tag === "svg") {
      flags |= IS_SVG;
      isSvg = true;
    }
    if (props !== EMPTY_OBJ) {
      if ((vnodeFlags & static_listeners) === 0) {
        elCtx.li.length = 0;
      }
      const values = oldVnode.$props$;
      newVnode.$props$ = values;
      for (const prop in props) {
        let newValue = props[prop];
        if (prop === "ref") {
          assertElement(elm);
          if (newValue !== void 0) {
            setRef(newValue, elm);
          }
          continue;
        }
        if (isOnProp(prop)) {
          const normalized = setEvent(elCtx.li, prop, newValue, containerState.$containerEl$);
          addQwikEvent(staticCtx, elm, normalized);
          continue;
        }
        if (isSignal(newValue)) {
          newValue = trackSignal(newValue, [1, currentComponent.$element$, newValue, elm, prop]);
        }
        if (prop === "class") {
          newValue = serializeClassWithHost(newValue, currentComponent);
        } else if (prop === "style") {
          newValue = stringifyStyle(newValue);
        }
        if (values[prop] !== newValue) {
          values[prop] = newValue;
          smartSetProperty(staticCtx, elm, prop, newValue, isSvg);
        }
      }
    }
    if (vnodeFlags & static_subtree) {
      return;
    }
    if (isSvg && tag === "foreignObject") {
      flags &= ~IS_SVG;
    }
    const setsInnerHTML = props[dangerouslySetInnerHTML] !== void 0;
    if (setsInnerHTML) {
      if (newVnode.$children$.length > 0) {
        logWarn$1("Node can not have children when innerHTML is set");
      }
      return;
    }
    if (tag === "textarea") {
      return;
    }
    return smartUpdateChildren(rCtx, oldVnode, newVnode, flags);
  } else if (OnRenderProp in props) {
    const cmpProps = props.props;
    setComponentProps(containerState, elCtx, cmpProps);
    let needsRender = !!(elCtx.$flags$ & HOST_FLAG_DIRTY);
    if (!needsRender && !elCtx.$componentQrl$ && !elCtx.$element$.hasAttribute(ELEMENT_ID)) {
      setQId(rCtx, elCtx);
      elCtx.$componentQrl$ = cmpProps[OnRenderProp];
      assertQrl(elCtx.$componentQrl$);
      needsRender = true;
    }
    if (needsRender) {
      return maybeThen(renderComponent(rCtx, elCtx, flags), () => renderContentProjection(rCtx, elCtx, newVnode, flags));
    }
    return renderContentProjection(rCtx, elCtx, newVnode, flags);
  } else if (QSlotS in props) {
    assertDefined(currentComponent.$slots$, "current component slots must be a defined array");
    currentComponent.$slots$.push(newVnode);
    return;
  } else if (dangerouslySetInnerHTML in props) {
    setProperty(staticCtx, elm, "innerHTML", props[dangerouslySetInnerHTML]);
    return;
  }
  if (vnodeFlags & static_subtree) {
    return;
  }
  return smartUpdateChildren(rCtx, oldVnode, newVnode, flags);
};
const renderContentProjection = (rCtx, hostCtx, vnode, flags) => {
  if (vnode.$flags$ & static_subtree) {
    return;
  }
  const newChildren = vnode.$children$;
  const staticCtx = rCtx.$static$;
  const splittedNewChildren = splitChildren(newChildren);
  const slotMaps = getSlotMap(hostCtx);
  for (const key in slotMaps.slots) {
    if (!splittedNewChildren[key]) {
      const slotEl = slotMaps.slots[key];
      const oldCh = getChildrenVnodes(slotEl, isChildComponent);
      if (oldCh.length > 0) {
        const slotCtx = tryGetContext$2(slotEl);
        if (slotCtx && slotCtx.$vdom$) {
          slotCtx.$vdom$.$children$ = [];
        }
        removeChildren(staticCtx, oldCh, 0, oldCh.length - 1);
      }
    }
  }
  for (const key in slotMaps.templates) {
    const templateEl = slotMaps.templates[key];
    if (templateEl && !splittedNewChildren[key]) {
      slotMaps.templates[key] = void 0;
      removeNode(staticCtx, templateEl);
    }
  }
  return promiseAll(Object.keys(splittedNewChildren).map((slotName) => {
    const newVdom = splittedNewChildren[slotName];
    const slotCtx = getSlotCtx(staticCtx, slotMaps, hostCtx, slotName, rCtx.$static$.$containerState$);
    const oldVdom = getVdom(slotCtx);
    const slotRctx = pushRenderContext(rCtx);
    const slotEl = slotCtx.$element$;
    slotRctx.$slotCtx$ = slotCtx;
    slotCtx.$vdom$ = newVdom;
    newVdom.$elm$ = slotEl;
    let newFlags = flags & ~IS_SVG;
    if (slotEl.isSvg) {
      newFlags |= IS_SVG;
    }
    const index = staticCtx.$addSlots$.findIndex((slot) => slot[0] === slotEl);
    if (index >= 0) {
      staticCtx.$addSlots$.splice(index, 1);
    }
    return smartUpdateChildren(slotRctx, oldVdom, newVdom, newFlags);
  }));
};
const addChildren = (ctx, parentElm, before, vnodes, startIdx, endIdx, flags) => {
  const promises = [];
  for (; startIdx <= endIdx; ++startIdx) {
    const ch = vnodes[startIdx];
    assertDefined(ch, "render: node must be defined at index", startIdx, vnodes);
    const elm = createElm(ctx, ch, flags, promises);
    insertBefore(ctx.$static$, parentElm, elm, before);
  }
  return promiseAllLazy(promises);
};
const removeChildren = (staticCtx, nodes, startIdx, endIdx) => {
  for (; startIdx <= endIdx; ++startIdx) {
    const ch = nodes[startIdx];
    if (ch) {
      assertDefined(ch.$elm$, "vnode elm must be defined");
      removeNode(staticCtx, ch.$elm$);
    }
  }
};
const getSlotCtx = (staticCtx, slotMaps, hostCtx, slotName, containerState) => {
  const slotEl = slotMaps.slots[slotName];
  if (slotEl) {
    return getContext(slotEl, containerState);
  }
  const templateEl = slotMaps.templates[slotName];
  if (templateEl) {
    return getContext(templateEl, containerState);
  }
  const template = createTemplate(staticCtx.$doc$, slotName);
  const elCtx = createContext(template);
  elCtx.$parentCtx$ = hostCtx;
  prepend(staticCtx, hostCtx.$element$, template);
  slotMaps.templates[slotName] = template;
  return elCtx;
};
const getSlotName = (node) => {
  return node.$props$[QSlot] ?? "";
};
const createElm = (rCtx, vnode, flags, promises) => {
  const tag = vnode.$type$;
  const doc = rCtx.$static$.$doc$;
  const currentComponent = rCtx.$cmpCtx$;
  if (tag === "#text") {
    return vnode.$elm$ = doc.createTextNode(vnode.$text$);
  }
  if (tag === "#signal") {
    const signal = vnode.$signal$;
    assertDefined(signal, "expecting signal here");
    assertDefined(currentComponent, "signals can not be used outside components");
    const signalValue = signal.value;
    if (isJSXNode(signalValue)) {
      const processedSignal = processData(signalValue);
      if (isSignal(processedSignal)) {
        throw new Error("NOT IMPLEMENTED: Promise");
      } else if (Array.isArray(processedSignal)) {
        throw new Error("NOT IMPLEMENTED: Array");
      } else {
        const elm2 = createElm(rCtx, processedSignal, flags, promises);
        trackSignal(signal, flags & IS_IMMUTABLE ? [3, elm2, signal, elm2] : [4, currentComponent.$element$, signal, elm2]);
        return vnode.$elm$ = elm2;
      }
    } else {
      const elm2 = doc.createTextNode(vnode.$text$);
      elm2.data = vnode.$text$ = jsxToString(signalValue);
      trackSignal(signal, flags & IS_IMMUTABLE ? [3, elm2, signal, elm2] : [4, currentComponent.$element$, signal, elm2]);
      return vnode.$elm$ = elm2;
    }
  }
  let elm;
  let isSvg = !!(flags & IS_SVG);
  if (!isSvg && tag === "svg") {
    flags |= IS_SVG;
    isSvg = true;
  }
  const isVirtual = tag === VIRTUAL;
  const props = vnode.$props$;
  const staticCtx = rCtx.$static$;
  const containerState = staticCtx.$containerState$;
  if (isVirtual) {
    elm = newVirtualElement(doc, isSvg);
  } else if (tag === "head") {
    elm = doc.head;
    flags |= IS_HEAD;
  } else {
    elm = createElement(doc, tag, isSvg);
    flags &= ~IS_HEAD;
  }
  if (vnode.$flags$ & static_subtree) {
    flags |= IS_IMMUTABLE;
  }
  vnode.$elm$ = elm;
  const elCtx = createContext(elm);
  if (rCtx.$slotCtx$) {
    elCtx.$parentCtx$ = rCtx.$slotCtx$;
    elCtx.$realParentCtx$ = rCtx.$cmpCtx$;
  } else {
    elCtx.$parentCtx$ = rCtx.$cmpCtx$;
  }
  if (!isVirtual) {
    {
      const dev = vnode.$dev$;
      if (dev) {
        directSetAttribute(elm, "data-qwik-inspector", `${dev.fileName}:${dev.lineNumber}:${dev.columnNumber}`);
      }
    }
    if (vnode.$immutableProps$) {
      const immProps = props !== EMPTY_OBJ ? Object.fromEntries(Object.entries(vnode.$immutableProps$).map(([k, v]) => [
        k,
        v === _IMMUTABLE ? props[k] : v
      ])) : vnode.$immutableProps$;
      setProperties(staticCtx, elCtx, currentComponent, immProps, isSvg, true);
    }
    if (props !== EMPTY_OBJ) {
      elCtx.$vdom$ = vnode;
      const p2 = vnode.$immutableProps$ ? Object.fromEntries(Object.entries(props).filter(([k]) => !(k in vnode.$immutableProps$))) : props;
      vnode.$props$ = setProperties(staticCtx, elCtx, currentComponent, p2, isSvg, false);
    }
    if (isSvg && tag === "foreignObject") {
      isSvg = false;
      flags &= ~IS_SVG;
    }
    if (currentComponent) {
      const scopedIds = currentComponent.$scopeIds$;
      if (scopedIds) {
        scopedIds.forEach((styleId) => {
          elm.classList.add(styleId);
        });
      }
      if (currentComponent.$flags$ & HOST_FLAG_NEED_ATTACH_LISTENER) {
        elCtx.li.push(...currentComponent.li);
        currentComponent.$flags$ &= ~HOST_FLAG_NEED_ATTACH_LISTENER;
      }
    }
    for (const listener of elCtx.li) {
      addQwikEvent(staticCtx, elm, listener[0]);
    }
    const setsInnerHTML = props[dangerouslySetInnerHTML] !== void 0;
    if (setsInnerHTML) {
      if (vnode.$children$.length > 0) {
        logWarn$1("Node can not have children when innerHTML is set");
      }
      return elm;
    }
    if (isSvg && tag === "foreignObject") {
      isSvg = false;
      flags &= ~IS_SVG;
    }
  } else if (OnRenderProp in props) {
    const renderQRL = props[OnRenderProp];
    assertQrl(renderQRL);
    const target = createPropsState();
    const manager = containerState.$subsManager$.$createManager$();
    const proxy = new Proxy(target, new ReadWriteProxyHandler(containerState, manager));
    const expectProps = props.props;
    containerState.$proxyMap$.set(target, proxy);
    elCtx.$props$ = proxy;
    if (expectProps !== EMPTY_OBJ) {
      const immutableMeta = target[_IMMUTABLE] = expectProps[_IMMUTABLE] ?? EMPTY_OBJ;
      for (const prop in expectProps) {
        if (prop !== "children" && prop !== QSlot) {
          const immutableValue2 = immutableMeta[prop];
          if (isSignal(immutableValue2)) {
            target[_IMMUTABLE_PREFIX + prop] = immutableValue2;
          } else {
            target[prop] = expectProps[prop];
          }
        }
      }
    }
    setQId(rCtx, elCtx);
    elCtx.$componentQrl$ = renderQRL;
    const wait = maybeThen(renderComponent(rCtx, elCtx, flags), () => {
      let children2 = vnode.$children$;
      if (children2.length === 0) {
        return;
      }
      if (children2.length === 1 && children2[0].$type$ === SKIP_RENDER_TYPE) {
        children2 = children2[0].$children$;
      }
      const slotMap = getSlotMap(elCtx);
      const p2 = [];
      const splittedNewChildren = splitChildren(children2);
      for (const slotName in splittedNewChildren) {
        const newVnode = splittedNewChildren[slotName];
        const slotCtx = getSlotCtx(staticCtx, slotMap, elCtx, slotName, staticCtx.$containerState$);
        const slotRctx = pushRenderContext(rCtx);
        const slotEl = slotCtx.$element$;
        slotRctx.$slotCtx$ = slotCtx;
        slotCtx.$vdom$ = newVnode;
        newVnode.$elm$ = slotEl;
        let newFlags = flags & ~IS_SVG;
        if (slotEl.isSvg) {
          newFlags |= IS_SVG;
        }
        for (const node of newVnode.$children$) {
          const nodeElm = createElm(slotRctx, node, newFlags, p2);
          assertDefined(node.$elm$, "vnode elm must be defined");
          assertEqual(nodeElm, node.$elm$, "vnode elm must be defined");
          appendChild(staticCtx, slotEl, nodeElm);
        }
      }
      return promiseAllLazy(p2);
    });
    if (isPromise$1(wait)) {
      promises.push(wait);
    }
    return elm;
  } else if (QSlotS in props) {
    assertDefined(currentComponent, "slot can only be used inside component");
    assertDefined(currentComponent.$slots$, "current component slots must be a defined array");
    setKey(elm, vnode.$key$);
    directSetAttribute(elm, QSlotRef, currentComponent.$id$);
    directSetAttribute(elm, QSlotS, "");
    currentComponent.$slots$.push(vnode);
    staticCtx.$addSlots$.push([elm, currentComponent.$element$]);
  } else if (dangerouslySetInnerHTML in props) {
    setProperty(staticCtx, elm, "innerHTML", props[dangerouslySetInnerHTML]);
    return elm;
  }
  let children = vnode.$children$;
  if (children.length === 0) {
    return elm;
  }
  if (children.length === 1 && children[0].$type$ === SKIP_RENDER_TYPE) {
    children = children[0].$children$;
  }
  const nodes = children.map((ch) => createElm(rCtx, ch, flags, promises));
  for (const node of nodes) {
    directAppendChild(elm, node);
  }
  return elm;
};
const getSlots = (elCtx) => {
  const slots = elCtx.$slots$;
  if (!slots) {
    const parent = elCtx.$element$.parentElement;
    assertDefined(parent, "component should be already attached to the dom");
    return elCtx.$slots$ = readDOMSlots(elCtx);
  }
  return slots;
};
const getSlotMap = (elCtx) => {
  const slotsArray = getSlots(elCtx);
  const slots = {};
  const templates = {};
  const t = Array.from(elCtx.$element$.childNodes).filter(isSlotTemplate);
  for (const vnode of slotsArray) {
    assertQwikElement(vnode.$elm$);
    slots[vnode.$key$ ?? ""] = vnode.$elm$;
  }
  for (const elm of t) {
    templates[directGetAttribute(elm, QSlot) ?? ""] = elm;
  }
  return { slots, templates };
};
const readDOMSlots = (elCtx) => {
  const parent = elCtx.$element$.parentElement;
  assertDefined(parent, "component should be already attached to the dom");
  return queryAllVirtualByAttribute(parent, QSlotRef, elCtx.$id$).map(domToVnode);
};
const handleStyle = (ctx, elm, newValue) => {
  setProperty(ctx, elm.style, "cssText", newValue);
  return true;
};
const handleClass = (ctx, elm, newValue) => {
  assertTrue(newValue == null || typeof newValue === "string", "class newValue must be either nullish or string", newValue);
  if (elm.namespaceURI === SVG_NS) {
    setAttribute(ctx, elm, "class", newValue);
  } else {
    setProperty(ctx, elm, "className", newValue);
  }
  return true;
};
const checkBeforeAssign = (ctx, elm, newValue, prop) => {
  if (prop in elm) {
    if (elm[prop] !== newValue || prop === "value" && !elm.hasAttribute(prop)) {
      if (
        // we must set value last so that it adheres to min,max,step
        prop === "value" && // but we must also set options first so they are present before updating select
        elm.tagName !== "OPTION"
      ) {
        setPropertyPost(ctx, elm, prop, newValue);
      } else {
        setProperty(ctx, elm, prop, newValue);
      }
    }
    return true;
  }
  return false;
};
const forceAttribute = (ctx, elm, newValue, prop) => {
  setAttribute(ctx, elm, prop.toLowerCase(), newValue);
  return true;
};
const setInnerHTML = (ctx, elm, newValue) => {
  setProperty(ctx, elm, "innerHTML", newValue);
  return true;
};
const noop = () => {
  return true;
};
const PROP_HANDLER_MAP = {
  style: handleStyle,
  class: handleClass,
  className: handleClass,
  value: checkBeforeAssign,
  checked: checkBeforeAssign,
  href: forceAttribute,
  list: forceAttribute,
  form: forceAttribute,
  tabIndex: forceAttribute,
  download: forceAttribute,
  innerHTML: noop,
  [dangerouslySetInnerHTML]: setInnerHTML
};
const smartSetProperty = (staticCtx, elm, prop, newValue, isSvg) => {
  if (isAriaAttribute(prop)) {
    setAttribute(staticCtx, elm, prop, newValue != null ? String(newValue) : newValue);
    return;
  }
  const exception = PROP_HANDLER_MAP[prop];
  if (exception) {
    if (exception(staticCtx, elm, newValue, prop)) {
      return;
    }
  }
  if (!isSvg && prop in elm) {
    setProperty(staticCtx, elm, prop, newValue);
    return;
  }
  if (prop.startsWith(PREVENT_DEFAULT)) {
    registerQwikEvent(prop.slice(PREVENT_DEFAULT.length));
  }
  setAttribute(staticCtx, elm, prop, newValue);
};
const setProperties = (staticCtx, elCtx, hostCtx, newProps, isSvg, immutable) => {
  const values = {};
  const elm = elCtx.$element$;
  for (const prop in newProps) {
    let newValue = newProps[prop];
    if (prop === "ref") {
      assertElement(elm);
      if (newValue !== void 0) {
        setRef(newValue, elm);
      }
      continue;
    }
    if (isOnProp(prop)) {
      setEvent(elCtx.li, prop, newValue, staticCtx.$containerState$.$containerEl$);
      continue;
    }
    if (isSignal(newValue)) {
      assertDefined(hostCtx, "Signals can only be used in components");
      newValue = trackSignal(newValue, immutable ? [1, elm, newValue, hostCtx.$element$, prop] : [2, hostCtx.$element$, newValue, elm, prop]);
    }
    if (prop === "class") {
      if (values.class) {
        throw new TypeError("Can only provide one of class or className");
      }
      newValue = serializeClassWithHost(newValue, hostCtx);
      if (!newValue) {
        continue;
      }
    } else if (prop === "style") {
      newValue = stringifyStyle(newValue);
    }
    values[prop] = newValue;
    smartSetProperty(staticCtx, elm, prop, newValue, isSvg);
  }
  return values;
};
const setComponentProps = (containerState, elCtx, expectProps) => {
  let props = elCtx.$props$;
  if (!props) {
    elCtx.$props$ = props = createProxy(createPropsState(), containerState);
  }
  if (expectProps === EMPTY_OBJ) {
    return;
  }
  const manager = getSubscriptionManager(props);
  assertDefined(manager, `props have to be a proxy, but it is not`, props);
  const target = getProxyTarget(props);
  assertDefined(target, `props have to be a proxy, but it is not`, props);
  const immutableMeta = target[_IMMUTABLE] = expectProps[_IMMUTABLE] ?? EMPTY_OBJ;
  for (const prop in expectProps) {
    if (prop !== "children" && prop !== QSlot && !immutableMeta[prop]) {
      const value = expectProps[prop];
      if (target[prop] !== value) {
        target[prop] = value;
        manager.$notifySubs$(prop);
      }
    }
  }
};
const cleanupTree = (elm, staticCtx, subsManager, stopSlots, dispose = false) => {
  subsManager.$clearSub$(elm);
  if (isQwikElement(elm)) {
    if (!dispose && stopSlots && elm.hasAttribute(QSlotS)) {
      staticCtx.$rmSlots$.push(elm);
      return;
    }
    const ctx = tryGetContext$2(elm);
    if (ctx) {
      cleanupContext(ctx, subsManager);
    }
    const end = isVirtualElement(elm) ? elm.close : null;
    let node = elm.firstChild;
    while (node = processVirtualNodes(node)) {
      cleanupTree(node, staticCtx, subsManager, true, dispose);
      node = node.nextSibling;
      if (node === end) {
        break;
      }
    }
  }
};
const executeContextWithScrollAndTransition = async (ctx) => {
  executeDOMRender(ctx);
};
const directAppendChild = (parent, child) => {
  if (isVirtualElement(child)) {
    child.appendTo(parent);
  } else {
    parent.appendChild(child);
  }
};
const directRemoveChild = (parent, child) => {
  if (isVirtualElement(child)) {
    child.remove();
  } else {
    parent.removeChild(child);
  }
};
const directInsertAfter = (parent, child, ref) => {
  if (isVirtualElement(child)) {
    child.insertBeforeTo(parent, ref?.nextSibling ?? null);
  } else {
    parent.insertBefore(child, ref?.nextSibling ?? null);
  }
};
const directInsertBefore = (parent, child, ref) => {
  if (isVirtualElement(child)) {
    child.insertBeforeTo(parent, getRootNode(ref));
  } else {
    parent.insertBefore(child, getRootNode(ref));
  }
};
const createKeyToOldIdx = (children, beginIdx, endIdx) => {
  const map = {};
  for (let i = beginIdx; i <= endIdx; ++i) {
    const child = children[i];
    const key = child.$key$;
    if (key != null) {
      map[key] = i;
    }
  }
  return map;
};
const addQwikEvent = (staticCtx, elm, prop) => {
  if (!prop.startsWith("on:")) {
    setAttribute(staticCtx, elm, prop, "");
  }
  registerQwikEvent(prop);
};
const registerQwikEvent = (prop) => {
  {
    const eventName = getEventName(prop);
    try {
      (globalThis.qwikevents ||= []).push(eventName);
    } catch (err) {
      logWarn$1(err);
    }
  }
};
const setAttribute = (staticCtx, el, prop, value) => {
  staticCtx.$operations$.push({
    $operation$: _setAttribute,
    $args$: [el, prop, value]
  });
};
const _setAttribute = (el, prop, value) => {
  if (value == null || value === false) {
    el.removeAttribute(prop);
  } else {
    const str = value === true ? "" : String(value);
    directSetAttribute(el, prop, str);
  }
};
const setProperty = (staticCtx, node, key, value) => {
  staticCtx.$operations$.push({
    $operation$: _setProperty,
    $args$: [node, key, value]
  });
};
const setPropertyPost = (staticCtx, node, key, value) => {
  staticCtx.$postOperations$.push({
    $operation$: _setProperty,
    $args$: [node, key, value]
  });
};
const _setProperty = (node, key, value) => {
  try {
    node[key] = value == null ? "" : value;
    if (value == null && isNode$1(node) && isElement$1(node)) {
      node.removeAttribute(key);
    }
  } catch (err) {
    logError(codeToText$1(QError_setProperty), key, { node, value }, err);
  }
};
const createElement = (doc, expectTag, isSvg) => {
  const el = isSvg ? doc.createElementNS(SVG_NS, expectTag) : doc.createElement(expectTag);
  return el;
};
const insertBefore = (staticCtx, parent, newChild, refChild) => {
  staticCtx.$operations$.push({
    $operation$: directInsertBefore,
    $args$: [parent, newChild, refChild ? refChild : null]
  });
  return newChild;
};
const insertAfter = (staticCtx, parent, newChild, refChild) => {
  staticCtx.$operations$.push({
    $operation$: directInsertAfter,
    $args$: [parent, newChild, refChild ? refChild : null]
  });
  return newChild;
};
const appendChild = (staticCtx, parent, newChild) => {
  staticCtx.$operations$.push({
    $operation$: directAppendChild,
    $args$: [parent, newChild]
  });
  return newChild;
};
const appendHeadStyle = (staticCtx, styleTask) => {
  staticCtx.$containerState$.$styleIds$.add(styleTask.styleId);
  staticCtx.$postOperations$.push({
    $operation$: _appendHeadStyle,
    $args$: [staticCtx.$containerState$, styleTask]
  });
};
const _appendHeadStyle = (containerState, styleTask) => {
  const containerEl = containerState.$containerEl$;
  const doc = getDocument(containerEl);
  const isDoc = doc.documentElement === containerEl;
  const headEl = doc.head;
  const style = doc.createElement("style");
  if (isDoc && !headEl) {
    logWarn$1("document.head is undefined");
  }
  directSetAttribute(style, QStyle, styleTask.styleId);
  directSetAttribute(style, "hidden", "");
  style.textContent = styleTask.content;
  if (isDoc && headEl) {
    directAppendChild(headEl, style);
  } else {
    directInsertBefore(containerEl, style, containerEl.firstChild);
  }
};
const prepend = (staticCtx, parent, newChild) => {
  staticCtx.$operations$.push({
    $operation$: directPrepend,
    $args$: [parent, newChild]
  });
};
const directPrepend = (parent, newChild) => {
  directInsertBefore(parent, newChild, parent.firstChild);
};
const removeNode = (staticCtx, el) => {
  if (isQwikElement(el)) {
    const subsManager = staticCtx.$containerState$.$subsManager$;
    cleanupTree(el, staticCtx, subsManager, true);
  }
  staticCtx.$operations$.push({
    $operation$: _removeNode,
    $args$: [el, staticCtx]
  });
};
const _removeNode = (el, staticCtx) => {
  const parent = el.parentElement;
  if (parent) {
    directRemoveChild(parent, el);
  } else {
    logWarn$1("Trying to remove component already removed", el);
  }
};
const createTemplate = (doc, slotName) => {
  const template = createElement(doc, "q:template", false);
  directSetAttribute(template, QSlot, slotName);
  directSetAttribute(template, "hidden", "");
  directSetAttribute(template, "aria-hidden", "true");
  return template;
};
const executeDOMRender = (staticCtx) => {
  for (const op of staticCtx.$operations$) {
    op.$operation$.apply(void 0, op.$args$);
  }
  resolveSlotProjection(staticCtx);
};
const getKey = (el) => {
  return directGetAttribute(el, "q:key");
};
const setKey = (el, key) => {
  if (key !== null) {
    directSetAttribute(el, "q:key", key);
  }
};
const resolveSlotProjection = (staticCtx) => {
  const subsManager = staticCtx.$containerState$.$subsManager$;
  for (const slotEl of staticCtx.$rmSlots$) {
    const key = getKey(slotEl);
    assertDefined(key, "slots must have a key");
    const slotChildren = getChildren(slotEl, isChildComponent);
    if (slotChildren.length > 0) {
      const sref = slotEl.getAttribute(QSlotRef);
      const hostCtx = staticCtx.$roots$.find((r) => r.$id$ === sref);
      if (hostCtx) {
        const hostElm = hostCtx.$element$;
        if (hostElm.isConnected) {
          const hasTemplate = getChildren(hostElm, isSlotTemplate).some((node) => directGetAttribute(node, QSlot) === key);
          if (!hasTemplate) {
            const template = createTemplate(staticCtx.$doc$, key);
            for (const child of slotChildren) {
              directAppendChild(template, child);
            }
            directInsertBefore(hostElm, template, hostElm.firstChild);
          } else {
            cleanupTree(slotEl, staticCtx, subsManager, false);
          }
        } else {
          cleanupTree(slotEl, staticCtx, subsManager, false);
        }
      } else {
        cleanupTree(slotEl, staticCtx, subsManager, false);
      }
    }
  }
  for (const [slotEl, hostElm] of staticCtx.$addSlots$) {
    const key = getKey(slotEl);
    assertDefined(key, "slots must have a key");
    const template = getChildren(hostElm, isSlotTemplate).find((node) => {
      return node.getAttribute(QSlot) === key;
    });
    if (template) {
      getChildren(template, isChildComponent).forEach((child) => {
        directAppendChild(slotEl, child);
      });
      template.remove();
    }
  }
};
const printRenderStats = (staticCtx) => {
  {
    if (typeof window !== "undefined" && window.document != null) {
      const byOp = {};
      for (const op of staticCtx.$operations$) {
        byOp[op.$operation$.name] = (byOp[op.$operation$.name] ?? 0) + 1;
      }
      const stats = {
        byOp,
        roots: staticCtx.$roots$.map((ctx) => ctx.$element$),
        hostElements: Array.from(staticCtx.$hostElements$),
        operations: staticCtx.$operations$.map((v) => [v.$operation$.name, ...v.$args$])
      };
      const noOps = staticCtx.$operations$.length === 0;
      logDebug$1("Render stats.", noOps ? "No operations" : "", stats);
    }
  }
};
const newVirtualElement = (doc, isSvg) => {
  const open = doc.createComment("qv ");
  const close = doc.createComment("/qv");
  return new VirtualElementImpl(open, close, isSvg);
};
const parseVirtualAttributes = (str) => {
  if (!str) {
    return {};
  }
  const attributes = str.split(" ");
  return Object.fromEntries(attributes.map((attr) => {
    const index = attr.indexOf("=");
    if (index >= 0) {
      return [attr.slice(0, index), unescape(attr.slice(index + 1))];
    } else {
      return [attr, ""];
    }
  }));
};
const serializeVirtualAttributes = (map) => {
  const attributes = [];
  Object.entries(map).forEach(([key, value]) => {
    if (!value) {
      attributes.push(`${key}`);
    } else {
      attributes.push(`${key}=${escape(value)}`);
    }
  });
  return attributes.join(" ");
};
const SHOW_COMMENT = 128;
const FILTER_ACCEPT = 1;
const FILTER_REJECT = 2;
const walkerVirtualByAttribute = (el, prop, value) => {
  return el.ownerDocument.createTreeWalker(el, SHOW_COMMENT, {
    acceptNode(c) {
      const virtual = getVirtualElement(c);
      if (virtual) {
        return directGetAttribute(virtual, prop) === value ? FILTER_ACCEPT : FILTER_REJECT;
      }
      return FILTER_REJECT;
    }
  });
};
const queryAllVirtualByAttribute = (el, prop, value) => {
  const walker = walkerVirtualByAttribute(el, prop, value);
  const pars = [];
  let currentNode = null;
  while (currentNode = walker.nextNode()) {
    pars.push(getVirtualElement(currentNode));
  }
  return pars;
};
const escape = (s) => {
  return s.replace(/ /g, "+");
};
const unescape = (s) => {
  return s.replace(/\+/g, " ");
};
const VIRTUAL = ":virtual";
class VirtualElementImpl {
  open;
  close;
  isSvg;
  ownerDocument;
  _qc_ = null;
  nodeType = 111;
  localName = VIRTUAL;
  nodeName = VIRTUAL;
  $attributes$;
  $template$;
  constructor(open, close, isSvg) {
    this.open = open;
    this.close = close;
    this.isSvg = isSvg;
    const doc = this.ownerDocument = open.ownerDocument;
    this.$template$ = createElement(doc, "template", false);
    this.$attributes$ = parseVirtualAttributes(open.data.slice(3));
    assertTrue(open.data.startsWith("qv "), "comment is not a qv");
    open[VIRTUAL_SYMBOL] = this;
    close[VIRTUAL_SYMBOL] = this;
    seal(this);
  }
  insertBefore(node, ref) {
    const parent = this.parentElement;
    if (parent) {
      const ref2 = ref ? ref : this.close;
      parent.insertBefore(node, ref2);
    } else {
      this.$template$.insertBefore(node, ref);
    }
    return node;
  }
  remove() {
    const parent = this.parentElement;
    if (parent) {
      const ch = this.childNodes;
      assertEqual(this.$template$.childElementCount, 0, "children should be empty");
      parent.removeChild(this.open);
      for (let i = 0; i < ch.length; i++) {
        this.$template$.appendChild(ch[i]);
      }
      parent.removeChild(this.close);
    }
  }
  appendChild(node) {
    return this.insertBefore(node, null);
  }
  insertBeforeTo(newParent, child) {
    const ch = this.childNodes;
    newParent.insertBefore(this.open, child);
    for (const c of ch) {
      newParent.insertBefore(c, child);
    }
    newParent.insertBefore(this.close, child);
    assertEqual(this.$template$.childElementCount, 0, "children should be empty");
  }
  appendTo(newParent) {
    this.insertBeforeTo(newParent, null);
  }
  get namespaceURI() {
    return this.parentElement?.namespaceURI ?? "";
  }
  removeChild(child) {
    if (this.parentElement) {
      this.parentElement.removeChild(child);
    } else {
      this.$template$.removeChild(child);
    }
  }
  getAttribute(prop) {
    return this.$attributes$[prop] ?? null;
  }
  hasAttribute(prop) {
    return prop in this.$attributes$;
  }
  setAttribute(prop, value) {
    this.$attributes$[prop] = value;
    {
      this.open.data = updateComment(this.$attributes$);
    }
  }
  removeAttribute(prop) {
    delete this.$attributes$[prop];
    {
      this.open.data = updateComment(this.$attributes$);
    }
  }
  matches(_) {
    return false;
  }
  compareDocumentPosition(other) {
    return this.open.compareDocumentPosition(other);
  }
  closest(query) {
    const parent = this.parentElement;
    if (parent) {
      return parent.closest(query);
    }
    return null;
  }
  querySelectorAll(query) {
    const result = [];
    const ch = getChildren(this, isNodeElement);
    ch.forEach((el) => {
      if (isQwikElement(el)) {
        if (el.matches(query)) {
          result.push(el);
        }
        result.concat(Array.from(el.querySelectorAll(query)));
      }
    });
    return result;
  }
  querySelector(query) {
    for (const el of this.childNodes) {
      if (isElement$1(el)) {
        if (el.matches(query)) {
          return el;
        }
        const v = el.querySelector(query);
        if (v !== null) {
          return v;
        }
      }
    }
    return null;
  }
  get innerHTML() {
    return "";
  }
  set innerHTML(html) {
    const parent = this.parentElement;
    if (parent) {
      this.childNodes.forEach((a2) => this.removeChild(a2));
      this.$template$.innerHTML = html;
      parent.insertBefore(this.$template$.content, this.close);
    } else {
      this.$template$.innerHTML = html;
    }
  }
  get firstChild() {
    if (this.parentElement) {
      const first = this.open.nextSibling;
      if (first === this.close) {
        return null;
      }
      return first;
    } else {
      return this.$template$.firstChild;
    }
  }
  get nextSibling() {
    return this.close.nextSibling;
  }
  get previousSibling() {
    return this.open.previousSibling;
  }
  get childNodes() {
    if (!this.parentElement) {
      return Array.from(this.$template$.childNodes);
    }
    const nodes = [];
    let node = this.open;
    while (node = node.nextSibling) {
      if (node === this.close) {
        break;
      }
      nodes.push(node);
    }
    return nodes;
  }
  get isConnected() {
    return this.open.isConnected;
  }
  /** The DOM parent element (not the vDOM parent, use findVirtual for that) */
  get parentElement() {
    return this.open.parentElement;
  }
}
const updateComment = (attributes) => {
  return `qv ${serializeVirtualAttributes(attributes)}`;
};
const processVirtualNodes = (node) => {
  if (node == null) {
    return null;
  }
  if (isComment(node)) {
    const virtual = getVirtualElement(node);
    if (virtual) {
      return virtual;
    }
  }
  return node;
};
const findClose = (open) => {
  let node = open;
  let stack = 1;
  while (node = node.nextSibling) {
    if (isComment(node)) {
      const virtual = node[VIRTUAL_SYMBOL];
      if (virtual) {
        node = virtual;
      } else if (node.data.startsWith("qv ")) {
        stack++;
      } else if (node.data === "/qv") {
        stack--;
        if (stack === 0) {
          return node;
        }
      }
    }
  }
  assertFail("close not found");
};
const getVirtualElement = (open) => {
  const virtual = open[VIRTUAL_SYMBOL];
  if (virtual) {
    return virtual;
  }
  if (open.data.startsWith("qv ")) {
    const close = findClose(open);
    return new VirtualElementImpl(open, close, open.parentElement?.namespaceURI === SVG_NS);
  }
  return null;
};
const getRootNode = (node) => {
  if (node == null) {
    return null;
  }
  if (isVirtualElement(node)) {
    return node.open;
  } else {
    return node;
  }
};
const pauseContainer = async (elmOrDoc, defaultParentJSON) => {
  const doc = getDocument(elmOrDoc);
  const documentElement = doc.documentElement;
  const containerEl = isDocument(elmOrDoc) ? documentElement : elmOrDoc;
  if (directGetAttribute(containerEl, QContainerAttr) === "paused") {
    throw qError$1(QError_containerAlreadyPaused);
  }
  const parentJSON = containerEl === doc.documentElement ? doc.body : containerEl;
  const containerState = _getContainerState(containerEl);
  const contexts = getNodesInScope(containerEl, hasContext);
  directSetAttribute(containerEl, QContainerAttr, "paused");
  for (const elCtx of contexts) {
    const elm = elCtx.$element$;
    const listeners = elCtx.li;
    if (elCtx.$scopeIds$) {
      const value = serializeSStyle(elCtx.$scopeIds$);
      if (value) {
        elm.setAttribute(QScopedStyle, value);
      }
    }
    if (elCtx.$id$) {
      elm.setAttribute(ELEMENT_ID, elCtx.$id$);
    }
    if (isElement$1(elm) && listeners.length > 0) {
      const groups = groupListeners(listeners);
      for (const listener of groups) {
        elm.setAttribute(listener[0], serializeQRLs(listener[1], containerState, elCtx));
      }
    }
  }
  const data = await _pauseFromContexts(contexts, containerState, (el) => {
    if (isNode$1(el) && isText(el)) {
      return getTextID(el, containerState);
    }
    return null;
  });
  const qwikJson = doc.createElement("script");
  directSetAttribute(qwikJson, "type", "qwik/json");
  qwikJson.textContent = escapeText$1(JSON.stringify(data.state, void 0, "  " ));
  parentJSON.appendChild(qwikJson);
  const extraListeners = Array.from(containerState.$events$, (s) => JSON.stringify(s));
  const eventsScript = doc.createElement("script");
  eventsScript.textContent = `(window.qwikevents||=[]).push(${extraListeners.join(", ")})`;
  parentJSON.appendChild(eventsScript);
  return data;
};
const _pauseFromContexts = async (allContexts, containerState, fallbackGetObjId, textNodes) => {
  const collector = createCollector(containerState);
  textNodes?.forEach((_, key) => {
    collector.$seen$.add(key);
  });
  let hasListeners = false;
  for (const ctx of allContexts) {
    if (ctx.$tasks$) {
      for (const task of ctx.$tasks$) {
        {
          if (task.$flags$ & TaskFlagsIsDirty) {
            logWarn$1(`Serializing dirty task. Looks like an internal error. 
Task Symbol: ${task.$qrl$.$symbol$}
`);
          }
          if (!isConnected(task)) {
            logWarn$1("Serializing disconnected task. Looks like an internal error.");
          }
        }
        if (isResourceTask(task)) {
          collector.$resources$.push(task.$state$);
        }
        destroyTask(task);
      }
    }
  }
  for (const ctx of allContexts) {
    const el = ctx.$element$;
    const ctxListeners = ctx.li;
    for (const listener of ctxListeners) {
      if (isElement$1(el)) {
        const qrl2 = listener[1];
        const captured = qrl2.$captureRef$;
        if (captured) {
          for (const obj of captured) {
            collectValue(obj, collector, true);
          }
        }
        collector.$qrls$.push(qrl2);
        hasListeners = true;
      }
    }
  }
  if (!hasListeners) {
    return {
      state: {
        refs: {},
        ctx: {},
        objs: [],
        subs: []
      },
      objs: [],
      funcs: [],
      qrls: [],
      resources: collector.$resources$,
      mode: "static"
    };
  }
  let promises;
  while ((promises = collector.$promises$).length > 0) {
    collector.$promises$ = [];
    await Promise.all(promises);
  }
  const canRender = collector.$elements$.length > 0;
  if (canRender) {
    for (const elCtx of collector.$deferElements$) {
      collectElementData(elCtx, collector, elCtx.$element$);
    }
    for (const ctx of allContexts) {
      collectProps(ctx, collector);
    }
  }
  while ((promises = collector.$promises$).length > 0) {
    collector.$promises$ = [];
    await Promise.all(promises);
  }
  const elementToIndex = /* @__PURE__ */ new Map();
  const objs = Array.from(collector.$objSet$.keys());
  const objToId = /* @__PURE__ */ new Map();
  const getElementID = (el) => {
    let id = elementToIndex.get(el);
    if (id === void 0) {
      id = getQId(el);
      if (!id) {
        console.warn("Missing ID", el);
      }
      elementToIndex.set(el, id);
    }
    return id;
  };
  const getObjId = (obj) => {
    let suffix = "";
    if (isPromise$1(obj)) {
      const promiseValue = getPromiseValue(obj);
      if (!promiseValue) {
        return null;
      }
      obj = promiseValue.value;
      if (promiseValue.resolved) {
        suffix += "~";
      } else {
        suffix += "_";
      }
    }
    if (isObject(obj)) {
      const target = getProxyTarget(obj);
      if (target) {
        suffix += "!";
        obj = target;
      } else if (isQwikElement(obj)) {
        const elID = getElementID(obj);
        if (elID) {
          return ELEMENT_ID_PREFIX + elID + suffix;
        }
        return null;
      }
    }
    const id = objToId.get(obj);
    if (id) {
      return id + suffix;
    }
    const textId = textNodes?.get(obj);
    if (textId) {
      return "*" + textId;
    }
    if (fallbackGetObjId) {
      return fallbackGetObjId(obj);
    }
    return null;
  };
  const mustGetObjId = (obj) => {
    const key = getObjId(obj);
    if (key === null) {
      if (isQrl(obj)) {
        const id = intToStr(objToId.size);
        objToId.set(obj, id);
        return id;
      } else {
        throw qError$1(QError_missingObjectId, obj);
      }
    }
    return key;
  };
  const subsMap = /* @__PURE__ */ new Map();
  for (const obj of objs) {
    const subs2 = getManager(obj, containerState)?.$subs$;
    if (!subs2) {
      continue;
    }
    const flags = getProxyFlags(obj) ?? 0;
    const converted = [];
    if (flags & QObjectRecursive) {
      converted.push(flags);
    }
    for (const sub of subs2) {
      const host = sub[1];
      if (sub[0] === 0 && isNode$1(host) && isVirtualElement(host)) {
        if (!collector.$elements$.includes(tryGetContext$2(host))) {
          continue;
        }
      }
      converted.push(sub);
    }
    if (converted.length > 0) {
      subsMap.set(obj, converted);
    }
  }
  objs.sort((a2, b) => {
    const isProxyA = subsMap.has(a2) ? 0 : 1;
    const isProxyB = subsMap.has(b) ? 0 : 1;
    return isProxyA - isProxyB;
  });
  let count = 0;
  for (const obj of objs) {
    objToId.set(obj, intToStr(count));
    count++;
  }
  if (collector.$noSerialize$.length > 0) {
    const undefinedID = objToId.get(void 0);
    assertDefined(undefinedID, "undefined ID must be defined");
    for (const obj of collector.$noSerialize$) {
      objToId.set(obj, undefinedID);
    }
  }
  const subs = [];
  for (const obj of objs) {
    const value = subsMap.get(obj);
    if (value == null) {
      break;
    }
    subs.push(value.map((s) => {
      if (typeof s === "number") {
        return `_${s}`;
      }
      return serializeSubscription(s, getObjId);
    }).filter(isNotNullable));
  }
  assertEqual(subs.length, subsMap.size, "missing subscriptions to serialize", subs, subsMap);
  const convertedObjs = serializeObjects(objs, mustGetObjId, getObjId, collector, containerState);
  const meta = {};
  const refs = {};
  for (const ctx of allContexts) {
    const node = ctx.$element$;
    const elementID = ctx.$id$;
    const ref = ctx.$refMap$;
    const props = ctx.$props$;
    const contexts = ctx.$contexts$;
    const tasks = ctx.$tasks$;
    const renderQrl = ctx.$componentQrl$;
    const seq = ctx.$seq$;
    const metaValue = {};
    const elementCaptured = isVirtualElement(node) && collector.$elements$.includes(ctx);
    assertDefined(elementID, `pause: can not generate ID for dom node`, node);
    if (ref.length > 0) {
      assertElement(node);
      const value = mapJoin(ref, mustGetObjId, " ");
      if (value) {
        refs[elementID] = value;
      }
    } else if (canRender) {
      let add = false;
      if (elementCaptured) {
        assertDefined(renderQrl, "renderQrl must be defined");
        const propsId = getObjId(props);
        metaValue.h = mustGetObjId(renderQrl) + (propsId ? " " + propsId : "");
        add = true;
      } else {
        const propsId = getObjId(props);
        if (propsId) {
          metaValue.h = " " + propsId;
          add = true;
        }
      }
      if (tasks && tasks.length > 0) {
        const value = mapJoin(tasks, getObjId, " ");
        if (value) {
          metaValue.w = value;
          add = true;
        }
      }
      if (elementCaptured && seq && seq.length > 0) {
        const value = mapJoin(seq, mustGetObjId, " ");
        metaValue.s = value;
        add = true;
      }
      if (contexts) {
        const serializedContexts = [];
        contexts.forEach((value2, key) => {
          const id = getObjId(value2);
          if (id) {
            serializedContexts.push(`${key}=${id}`);
          }
        });
        const value = serializedContexts.join(" ");
        if (value) {
          metaValue.c = value;
          add = true;
        }
      }
      if (add) {
        meta[elementID] = metaValue;
      }
    }
  }
  {
    elementToIndex.forEach((value, el) => {
      if (!value) {
        logWarn$1("unconnected element", el.nodeName, "\n");
      }
    });
  }
  return {
    state: {
      refs,
      ctx: meta,
      objs: convertedObjs,
      subs
    },
    objs,
    funcs: collector.$inlinedFunctions$,
    resources: collector.$resources$,
    qrls: collector.$qrls$,
    mode: canRender ? "render" : "listeners"
  };
};
const mapJoin = (objects, getObjectId, sep) => {
  let output = "";
  for (const obj of objects) {
    const id = getObjectId(obj);
    if (id !== null) {
      if (output !== "") {
        output += sep;
      }
      output += id;
    }
  }
  return output;
};
const getNodesInScope = (parent, predicate) => {
  const results = [];
  const v = predicate(parent);
  if (v !== void 0) {
    results.push(v);
  }
  const walker = parent.ownerDocument.createTreeWalker(parent, SHOW_ELEMENT | SHOW_COMMENT$1, {
    acceptNode(node) {
      if (isContainer(node)) {
        return FILTER_REJECT$1;
      }
      const v2 = predicate(node);
      if (v2 !== void 0) {
        results.push(v2);
      }
      return FILTER_SKIP;
    }
  });
  while (walker.nextNode()) {
  }
  return results;
};
const collectProps = (elCtx, collector) => {
  const parentCtx = elCtx.$realParentCtx$ || elCtx.$parentCtx$;
  const props = elCtx.$props$;
  if (parentCtx && props && !isEmptyObj(props) && collector.$elements$.includes(parentCtx)) {
    const subs = getSubscriptionManager(props)?.$subs$;
    const el = elCtx.$element$;
    if (subs) {
      for (const [type, host] of subs) {
        if (type === 0) {
          if (host !== el) {
            collectSubscriptions(getSubscriptionManager(props), collector, false);
          }
          if (isNode$1(host)) {
            collectElement(host, collector);
          } else {
            collectValue(host, collector, true);
          }
        } else {
          collectValue(props, collector, false);
          collectSubscriptions(getSubscriptionManager(props), collector, false);
        }
      }
    }
  }
};
const createCollector = (containerState) => {
  const inlinedFunctions = [];
  containerState.$inlineFns$.forEach((id, fnStr) => {
    while (inlinedFunctions.length <= id) {
      inlinedFunctions.push("");
    }
    inlinedFunctions[id] = fnStr;
  });
  return {
    $containerState$: containerState,
    $seen$: /* @__PURE__ */ new Set(),
    $objSet$: /* @__PURE__ */ new Set(),
    $prefetch$: 0,
    $noSerialize$: [],
    $inlinedFunctions$: inlinedFunctions,
    $resources$: [],
    $elements$: [],
    $qrls$: [],
    $deferElements$: [],
    $promises$: []
  };
};
const collectDeferElement = (el, collector) => {
  const ctx = tryGetContext$2(el);
  if (collector.$elements$.includes(ctx)) {
    return;
  }
  collector.$elements$.push(ctx);
  if (ctx.$flags$ & HOST_FLAG_DYNAMIC) {
    collector.$prefetch$++;
    collectElementData(ctx, collector, true);
    collector.$prefetch$--;
  } else {
    collector.$deferElements$.push(ctx);
  }
};
const collectElement = (el, collector) => {
  const ctx = tryGetContext$2(el);
  if (ctx) {
    if (collector.$elements$.includes(ctx)) {
      return;
    }
    collector.$elements$.push(ctx);
    collectElementData(ctx, collector, el);
  }
};
const collectElementData = (elCtx, collector, dynamicCtx) => {
  if (elCtx.$props$ && !isEmptyObj(elCtx.$props$)) {
    collectValue(elCtx.$props$, collector, dynamicCtx);
    collectSubscriptions(getSubscriptionManager(elCtx.$props$), collector, dynamicCtx);
  }
  if (elCtx.$componentQrl$) {
    collectValue(elCtx.$componentQrl$, collector, dynamicCtx);
  }
  if (elCtx.$seq$) {
    for (const obj of elCtx.$seq$) {
      collectValue(obj, collector, dynamicCtx);
    }
  }
  if (elCtx.$tasks$) {
    const map = collector.$containerState$.$subsManager$.$groupToManagers$;
    for (const obj of elCtx.$tasks$) {
      if (map.has(obj)) {
        collectValue(obj, collector, dynamicCtx);
      }
    }
  }
  if (dynamicCtx === true) {
    collectContext(elCtx, collector);
    if (elCtx.$dynamicSlots$) {
      for (const slotCtx of elCtx.$dynamicSlots$) {
        collectContext(slotCtx, collector);
      }
    }
  }
};
const collectContext = (elCtx, collector) => {
  while (elCtx) {
    if (elCtx.$contexts$) {
      for (const obj of elCtx.$contexts$.values()) {
        collectValue(obj, collector, true);
      }
    }
    elCtx = elCtx.$parentCtx$;
  }
};
const escapeText$1 = (str) => {
  return str.replace(/<(\/?script)/gi, "\\x3C$1");
};
const collectSubscriptions = (manager, collector, leaks) => {
  if (collector.$seen$.has(manager)) {
    return;
  }
  collector.$seen$.add(manager);
  const subs = manager.$subs$;
  assertDefined(subs, "subs must be defined");
  for (const sub of subs) {
    const type = sub[0];
    if (type > 0) {
      collectValue(sub[2], collector, leaks);
    }
    if (leaks === true) {
      const host = sub[1];
      if (isNode$1(host) && isVirtualElement(host)) {
        if (sub[0] === 0) {
          collectDeferElement(host, collector);
        }
      } else {
        collectValue(host, collector, true);
      }
    }
  }
};
const PROMISE_VALUE = /* @__PURE__ */ Symbol();
const resolvePromise = (promise) => {
  return promise.then((value) => {
    const v = {
      resolved: true,
      value
    };
    promise[PROMISE_VALUE] = v;
    return value;
  }, (value) => {
    const v = {
      resolved: false,
      value
    };
    promise[PROMISE_VALUE] = v;
    return value;
  });
};
const getPromiseValue = (promise) => {
  return promise[PROMISE_VALUE];
};
const collectValue = (obj, collector, leaks) => {
  if (obj != null) {
    const objType = typeof obj;
    switch (objType) {
      case "function":
      case "object": {
        if (collector.$seen$.has(obj)) {
          return;
        }
        collector.$seen$.add(obj);
        if (fastSkipSerialize(obj)) {
          collector.$objSet$.add(void 0);
          collector.$noSerialize$.push(obj);
          return;
        }
        const input = obj;
        const target = getProxyTarget(obj);
        if (target) {
          obj = target;
          const mutable = (getProxyFlags(obj) & QObjectImmutable) === 0;
          if (leaks && mutable) {
            collectSubscriptions(getSubscriptionManager(input), collector, leaks);
          }
          if (fastWeakSerialize(input)) {
            collector.$objSet$.add(obj);
            return;
          }
        }
        const collected = collectDeps(obj, collector, leaks);
        if (collected) {
          collector.$objSet$.add(obj);
          return;
        }
        if (isPromise$1(obj)) {
          collector.$promises$.push(resolvePromise(obj).then((value) => {
            collectValue(value, collector, leaks);
          }));
          return;
        }
        if (objType === "object") {
          if (isNode$1(obj)) {
            return;
          }
          if (isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
              collectValue(input[i], collector, leaks);
            }
          } else if (isSerializableObject(obj)) {
            for (const key in obj) {
              collectValue(input[key], collector, leaks);
            }
          }
        }
        break;
      }
    }
  }
  collector.$objSet$.add(obj);
};
const isContainer = (el) => {
  return isElement$1(el) && el.hasAttribute(QContainerAttr);
};
const hasContext = (el) => {
  const node = processVirtualNodes(el);
  if (isQwikElement(node)) {
    const ctx = tryGetContext$2(node);
    if (ctx && ctx.$id$) {
      return ctx;
    }
  }
  return void 0;
};
const getManager = (obj, containerState) => {
  if (!isObject(obj)) {
    return void 0;
  }
  if (obj instanceof SignalImpl) {
    return getSubscriptionManager(obj);
  }
  const proxy = containerState.$proxyMap$.get(obj);
  if (proxy) {
    return getSubscriptionManager(proxy);
  }
  return void 0;
};
const getQId = (el) => {
  const ctx = tryGetContext$2(el);
  if (ctx) {
    return ctx.$id$;
  }
  return null;
};
const getTextID = (node, containerState) => {
  const prev = node.previousSibling;
  if (prev && isComment(prev)) {
    if (prev.data.startsWith("t=")) {
      return ELEMENT_ID_PREFIX + prev.data.slice(2);
    }
  }
  const doc = node.ownerDocument;
  const id = intToStr(containerState.$elementIndex$++);
  const open = doc.createComment(`t=${id}`);
  const close = doc.createComment("");
  const parent = node.parentElement;
  parent.insertBefore(open, node);
  parent.insertBefore(close, node.nextSibling);
  return ELEMENT_ID_PREFIX + id;
};
const isEmptyObj = (obj) => {
  return Object.keys(obj).length === 0;
};
function serializeObjects(objs, mustGetObjId, getObjId, collector, containerState) {
  return objs.map((obj) => {
    if (obj === null) {
      return null;
    }
    const typeObj = typeof obj;
    switch (typeObj) {
      case "undefined":
        return UNDEFINED_PREFIX;
      case "number":
        if (!Number.isFinite(obj)) {
          break;
        }
        return obj;
      case "string":
        if (obj.charCodeAt(0) < 32) {
          break;
        } else {
          return obj;
        }
      case "boolean":
        return obj;
    }
    const value = serializeValue(obj, mustGetObjId, collector, containerState);
    if (value !== void 0) {
      return value;
    }
    if (typeObj === "object") {
      if (isArray(obj)) {
        return obj.map(mustGetObjId);
      }
      if (isSerializableObject(obj)) {
        const output = {};
        for (const key in obj) {
          if (getObjId) {
            const id = getObjId(obj[key]);
            if (id !== null) {
              output[key] = id;
            }
          } else {
            output[key] = mustGetObjId(obj[key]);
          }
        }
        return output;
      }
    }
    throw qError$1(QError_verifySerializable, obj);
  });
}
const inlinedQrl = (symbol, symbolName, lexicalScopeCapture = EMPTY_ARRAY) => {
  return createQRL(null, symbolName, symbol, null, null, lexicalScopeCapture, null);
};
const _noopQrl = (symbolName, lexicalScopeCapture = EMPTY_ARRAY) => {
  return createQRL(null, symbolName, null, null, null, lexicalScopeCapture, null);
};
const _noopQrlDEV = (symbolName, opts, lexicalScopeCapture = EMPTY_ARRAY) => {
  const newQrl = _noopQrl(symbolName, lexicalScopeCapture);
  newQrl.dev = opts;
  return newQrl;
};
const inlinedQrlDEV = (symbol, symbolName, opts, lexicalScopeCapture = EMPTY_ARRAY) => {
  const qrl2 = inlinedQrl(symbol, symbolName, lexicalScopeCapture);
  qrl2.dev = opts;
  return qrl2;
};
const serializeQRL = (qrl2, opts = {}) => {
  assertTrue(qSerialize, "In order to serialize a QRL, qSerialize must be true");
  assertQrl(qrl2);
  let symbol = qrl2.$symbol$;
  let chunk = qrl2.$chunk$;
  const refSymbol = qrl2.$refSymbol$ ?? symbol;
  const platform = getPlatform();
  if (platform) {
    const result = platform.chunkForSymbol(refSymbol, chunk, qrl2.dev?.file);
    if (result) {
      chunk = result[1];
      if (!qrl2.$refSymbol$) {
        symbol = result[0];
      }
    } else {
      console.error("serializeQRL: Cannot resolve symbol", symbol, "in", chunk, qrl2.dev?.file);
    }
  }
  if (qRuntimeQrl && chunk == null) {
    chunk = "/runtimeQRL";
    symbol = "_";
  }
  if (chunk == null) {
    throw qError$1(QError_qrlMissingChunk, qrl2.$symbol$);
  }
  if (chunk.startsWith("./")) {
    chunk = chunk.slice(2);
  }
  if (isSyncQrl(qrl2)) {
    if (opts.$containerState$) {
      const fn = qrl2.resolved;
      const containerState = opts.$containerState$;
      const fnStrKey = fn.serialized || fn.toString();
      let id = containerState.$inlineFns$.get(fnStrKey);
      if (id === void 0) {
        id = containerState.$inlineFns$.size;
        containerState.$inlineFns$.set(fnStrKey, id);
      }
      symbol = String(id);
    } else {
      throwErrorAndStop("Sync QRL without containerState");
    }
  }
  let output = `${chunk}#${symbol}`;
  const capture = qrl2.$capture$;
  const captureRef = qrl2.$captureRef$;
  if (captureRef && captureRef.length) {
    if (opts.$getObjId$) {
      output += `[${mapJoin(captureRef, opts.$getObjId$, " ")}]`;
    } else if (opts.$addRefMap$) {
      output += `[${mapJoin(captureRef, opts.$addRefMap$, " ")}]`;
    }
  } else if (capture && capture.length > 0) {
    output += `[${capture.join(" ")}]`;
  }
  return output;
};
const serializeQRLs = (existingQRLs, containerState, elCtx) => {
  assertElement(elCtx.$element$);
  const opts = {
    $containerState$: containerState,
    $addRefMap$: (obj) => addToArray(elCtx.$refMap$, obj)
  };
  return mapJoin(existingQRLs, (qrl2) => serializeQRL(qrl2, opts), "\n");
};
const parseQRL = (qrl2, containerEl) => {
  const endIdx = qrl2.length;
  const hashIdx = indexOf(qrl2, 0, "#");
  const captureIdx = indexOf(qrl2, hashIdx, "[");
  const chunkEndIdx = Math.min(hashIdx, captureIdx);
  const chunk = qrl2.substring(0, chunkEndIdx);
  const symbolStartIdx = hashIdx == endIdx ? hashIdx : hashIdx + 1;
  const symbolEndIdx = captureIdx;
  const symbol = symbolStartIdx == symbolEndIdx ? "default" : qrl2.substring(symbolStartIdx, symbolEndIdx);
  const captureStartIdx = captureIdx;
  const captureEndIdx = endIdx;
  const capture = captureStartIdx === captureEndIdx ? EMPTY_ARRAY : qrl2.substring(captureStartIdx + 1, captureEndIdx - 1).split(" ");
  const iQrl = createQRL(chunk, symbol, null, null, capture, null, null);
  if (containerEl) {
    iQrl.$setContainer$(containerEl);
  }
  return iQrl;
};
const indexOf = (text, startIdx, char) => {
  const endIdx = text.length;
  const charIdx = text.indexOf(char, startIdx == endIdx ? 0 : startIdx);
  return charIdx == -1 ? endIdx : charIdx;
};
const addToArray = (array, obj) => {
  const index = array.indexOf(obj);
  if (index === -1) {
    array.push(obj);
    return String(array.length - 1);
  }
  return String(index);
};
const inflateQrl = (qrl2, elCtx) => {
  assertDefined(qrl2.$capture$, "invoke: qrl capture must be defined inside useLexicalScope()", qrl2);
  return qrl2.$captureRef$ = qrl2.$capture$.map((idx) => {
    const int = parseInt(idx, 10);
    const obj = elCtx.$refMap$[int];
    assertTrue(elCtx.$refMap$.length > int, "out of bounds inflate access", idx);
    return obj;
  });
};
const _regSymbol = (symbol, hash2) => {
  if (typeof globalThis.__qwik_reg_symbols === "undefined") {
    globalThis.__qwik_reg_symbols = /* @__PURE__ */ new Map();
  }
  globalThis.__qwik_reg_symbols.set(hash2, symbol);
  return symbol;
};
const _createResourceReturn = (opts) => {
  const resource = {
    __brand: "resource",
    value: void 0,
    loading: isServerPlatform() ? false : true,
    _resolved: void 0,
    _error: void 0,
    _state: "pending",
    _timeout: opts?.timeout ?? -1,
    _cache: 0
  };
  return resource;
};
const isResourceReturn = (obj) => {
  return isObject(obj) && obj.__brand === "resource";
};
const serializeResource = (resource, getObjId) => {
  const state = resource._state;
  if (state === "resolved") {
    return `0 ${getObjId(resource._resolved)}`;
  } else if (state === "pending") {
    return `1`;
  } else {
    return `2 ${getObjId(resource._error)}`;
  }
};
const parseResourceReturn = (data) => {
  const [first, id] = data.split(" ");
  const result = _createResourceReturn(void 0);
  result.value = Promise.resolve();
  if (first === "0") {
    result._state = "resolved";
    result._resolved = id;
    result.loading = false;
  } else if (first === "1") {
    result._state = "pending";
    result.value = new Promise(() => {
    });
    result.loading = true;
  } else if (first === "2") {
    result._state = "rejected";
    result._error = id;
    result.loading = false;
  }
  return result;
};
const Slot = (props) => {
  return _jsxC(Virtual, {
    [QSlotS]: ""
  }, 0, props.name ?? "");
};
const UNDEFINED_PREFIX = "";
function serializer(serializer2) {
  return {
    $prefixCode$: serializer2.$prefix$.charCodeAt(0),
    $prefixChar$: serializer2.$prefix$,
    $test$: serializer2.$test$,
    $serialize$: serializer2.$serialize$,
    $prepare$: serializer2.$prepare$,
    $fill$: serializer2.$fill$,
    $collect$: serializer2.$collect$,
    $subs$: serializer2.$subs$
  };
}
const QRLSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => isQrl(v),
  $collect$: (v, collector, leaks) => {
    if (v.$captureRef$) {
      for (const item of v.$captureRef$) {
        collectValue(item, collector, leaks);
      }
    }
    if (collector.$prefetch$ === 0) {
      collector.$qrls$.push(v);
    }
  },
  $serialize$: (obj, getObjId) => {
    return serializeQRL(obj, {
      $getObjId$: getObjId
    });
  },
  $prepare$: (data, containerState) => {
    return parseQRL(data, containerState.$containerEl$);
  },
  $fill$: (qrl2, getObject) => {
    if (qrl2.$capture$ && qrl2.$capture$.length > 0) {
      qrl2.$captureRef$ = qrl2.$capture$.map(getObject);
      qrl2.$capture$ = null;
    }
  }
});
const TaskSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => isSubscriberDescriptor(v),
  $collect$: (v, collector, leaks) => {
    collectValue(v.$qrl$, collector, leaks);
    if (v.$state$) {
      collectValue(v.$state$, collector, leaks);
      if (leaks === true && v.$state$ instanceof SignalImpl) {
        collectSubscriptions(v.$state$[QObjectManagerSymbol], collector, true);
      }
    }
  },
  $serialize$: (obj, getObjId) => serializeTask(obj, getObjId),
  $prepare$: (data) => parseTask(data),
  $fill$: (task, getObject) => {
    task.$el$ = getObject(task.$el$);
    task.$qrl$ = getObject(task.$qrl$);
    if (task.$state$) {
      task.$state$ = getObject(task.$state$);
    }
  }
});
const ResourceSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => isResourceReturn(v),
  $collect$: (obj, collector, leaks) => {
    collectValue(obj.value, collector, leaks);
    collectValue(obj._resolved, collector, leaks);
  },
  $serialize$: (obj, getObjId) => {
    return serializeResource(obj, getObjId);
  },
  $prepare$: (data) => {
    return parseResourceReturn(data);
  },
  $fill$: (resource, getObject) => {
    if (resource._state === "resolved") {
      resource._resolved = getObject(resource._resolved);
      resource.value = Promise.resolve(resource._resolved);
    } else if (resource._state === "rejected") {
      const p2 = Promise.reject(resource._error);
      p2.catch(() => null);
      resource._error = getObject(resource._error);
      resource.value = p2;
    }
  }
});
const URLSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => v instanceof URL,
  $serialize$: (obj) => obj.href,
  $prepare$: (data) => new URL(data)
});
const DateSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => v instanceof Date,
  $serialize$: (obj) => obj.toISOString(),
  $prepare$: (data) => new Date(data)
});
const RegexSerializer = /* @__PURE__ */ serializer({
  $prefix$: "\x07",
  $test$: (v) => v instanceof RegExp,
  $serialize$: (obj) => `${obj.flags} ${obj.source}`,
  $prepare$: (data) => {
    const space = data.indexOf(" ");
    const source = data.slice(space + 1);
    const flags = data.slice(0, space);
    return new RegExp(source, flags);
  }
});
const ErrorSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => v instanceof Error,
  $serialize$: (obj) => {
    return obj.message;
  },
  $prepare$: (text) => {
    const err = new Error(text);
    err.stack = void 0;
    return err;
  }
});
const DocumentSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => !!v && typeof v === "object" && isDocument(v),
  $prepare$: (_, _c, doc) => {
    return doc;
  }
});
const SERIALIZABLE_STATE = /* @__PURE__ */ Symbol("serializable-data");
const ComponentSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (obj) => isQwikComponent(obj),
  $serialize$: (obj, getObjId) => {
    const [qrl2] = obj[SERIALIZABLE_STATE];
    return serializeQRL(qrl2, {
      $getObjId$: getObjId
    });
  },
  $prepare$: (data, containerState) => {
    const qrl2 = parseQRL(data, containerState.$containerEl$);
    return componentQrl(qrl2);
  },
  $fill$: (component, getObject) => {
    const [qrl2] = component[SERIALIZABLE_STATE];
    if (qrl2.$capture$?.length) {
      qrl2.$captureRef$ = qrl2.$capture$.map(getObject);
      qrl2.$capture$ = null;
    }
  }
});
const DerivedSignalSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (obj) => obj instanceof SignalDerived,
  $collect$: (obj, collector, leaks) => {
    if (obj.$args$) {
      for (const arg of obj.$args$) {
        collectValue(arg, collector, leaks);
      }
    }
  },
  $serialize$: (signal, getObjID, collector) => {
    const serialized = serializeDerivedSignalFunc(signal);
    let index = collector.$inlinedFunctions$.indexOf(serialized);
    if (index < 0) {
      index = collector.$inlinedFunctions$.length;
      collector.$inlinedFunctions$.push(serialized);
    }
    return mapJoin(signal.$args$, getObjID, " ") + " @" + intToStr(index);
  },
  $prepare$: (data) => {
    const ids = data.split(" ");
    const args = ids.slice(0, -1);
    const fn = ids[ids.length - 1];
    return new SignalDerived(fn, args, fn);
  },
  $fill$: (fn, getObject) => {
    assertString(fn.$func$, "fn.$func$ should be a string");
    fn.$func$ = getObject(fn.$func$);
    fn.$args$ = fn.$args$.map(getObject);
  }
});
const SignalSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => v instanceof SignalImpl,
  $collect$: (obj, collector, leaks) => {
    collectValue(obj.untrackedValue, collector, leaks);
    const mutable = (obj[QObjectSignalFlags] & SIGNAL_IMMUTABLE) === 0;
    if (leaks === true && mutable) {
      collectSubscriptions(obj[QObjectManagerSymbol], collector, true);
    }
    return obj;
  },
  $serialize$: (obj, getObjId) => {
    return getObjId(obj.untrackedValue);
  },
  $prepare$: (data, containerState) => {
    return new SignalImpl(data, containerState?.$subsManager$?.$createManager$(), 0);
  },
  $subs$: (signal, subs) => {
    signal[QObjectManagerSymbol].$addSubs$(subs);
  },
  $fill$: (signal, getObject) => {
    signal.untrackedValue = getObject(signal.untrackedValue);
  }
});
const SignalWrapperSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => v instanceof SignalWrapper,
  $collect$(obj, collector, leaks) {
    collectValue(obj.ref, collector, leaks);
    if (fastWeakSerialize(obj.ref)) {
      const localManager = getSubscriptionManager(obj.ref);
      if (isTreeShakeable(collector.$containerState$.$subsManager$, localManager, leaks)) {
        collectValue(obj.ref[obj.prop], collector, leaks);
      }
    }
    return obj;
  },
  $serialize$: (obj, getObjId) => {
    return `${getObjId(obj.ref)} ${obj.prop}`;
  },
  $prepare$: (data) => {
    const [id, prop] = data.split(" ");
    return new SignalWrapper(id, prop);
  },
  $fill$: (signal, getObject) => {
    signal.ref = getObject(signal.ref);
  }
});
const NoFiniteNumberSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => typeof v === "number",
  $serialize$: (v) => {
    return String(v);
  },
  $prepare$: (data) => {
    return Number(data);
  }
});
const URLSearchParamsSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => v instanceof URLSearchParams,
  $serialize$: (obj) => obj.toString(),
  $prepare$: (data) => new URLSearchParams(data)
});
const FormDataSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => typeof FormData !== "undefined" && v instanceof globalThis.FormData,
  $serialize$: (formData) => {
    const array = [];
    formData.forEach((value, key) => {
      if (typeof value === "string") {
        array.push([key, value]);
      } else {
        array.push([key, value.name]);
      }
    });
    return JSON.stringify(array);
  },
  $prepare$: (data) => {
    const array = JSON.parse(data);
    const formData = new FormData();
    for (const [key, value] of array) {
      formData.append(key, value);
    }
    return formData;
  }
});
const JSXNodeSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => isJSXNode(v),
  $collect$: (node, collector, leaks) => {
    collectValue(node.children, collector, leaks);
    collectValue(node.props, collector, leaks);
    collectValue(node.immutableProps, collector, leaks);
    collectValue(node.key, collector, leaks);
    let type = node.type;
    if (type === Slot) {
      type = ":slot";
    } else if (type === Fragment) {
      type = ":fragment";
    }
    collectValue(type, collector, leaks);
  },
  $serialize$: (node, getObjID) => {
    let type = node.type;
    if (type === Slot) {
      type = ":slot";
    } else if (type === Fragment) {
      type = ":fragment";
    }
    return `${getObjID(type)} ${getObjID(node.props)} ${getObjID(node.immutableProps)} ${getObjID(node.key)} ${getObjID(node.children)} ${node.flags}`;
  },
  $prepare$: (data) => {
    const [type, props, immutableProps, key, children, flags] = data.split(" ");
    const node = new JSXNodeImpl(type, props, immutableProps, children, parseInt(flags, 10), key);
    return node;
  },
  $fill$: (node, getObject) => {
    node.type = getResolveJSXType(getObject(node.type));
    node.props = getObject(node.props);
    node.immutableProps = getObject(node.immutableProps);
    node.key = getObject(node.key);
    node.children = getObject(node.children);
  }
});
const BigIntSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => typeof v === "bigint",
  $serialize$: (v) => {
    return v.toString();
  },
  $prepare$: (data) => {
    return BigInt(data);
  }
});
const Uint8ArraySerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => v instanceof Uint8Array,
  $serialize$: (v) => {
    let buf = "";
    for (const c of v) {
      buf += String.fromCharCode(c);
    }
    return btoa(buf).replace(/=+$/, "");
  },
  $prepare$: (data) => {
    const buf = atob(data);
    const bytes = new Uint8Array(buf.length);
    let i = 0;
    for (const s of buf) {
      bytes[i++] = s.charCodeAt(0);
    }
    return bytes;
  },
  $fill$: void 0
});
const DATA = /* @__PURE__ */ Symbol();
const SetSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => v instanceof Set,
  $collect$: (set, collector, leaks) => {
    set.forEach((value) => collectValue(value, collector, leaks));
  },
  $serialize$: (v, getObjID) => {
    return Array.from(v).map(getObjID).join(" ");
  },
  $prepare$: (data) => {
    const set = /* @__PURE__ */ new Set();
    set[DATA] = data;
    return set;
  },
  $fill$: (set, getObject) => {
    const data = set[DATA];
    set[DATA] = void 0;
    assertString(data, "SetSerializer should be defined");
    const items = data.length === 0 ? [] : data.split(" ");
    for (const id of items) {
      set.add(getObject(id));
    }
  }
});
const MapSerializer = /* @__PURE__ */ serializer({
  $prefix$: "",
  $test$: (v) => v instanceof Map,
  $collect$: (map, collector, leaks) => {
    map.forEach((value, key) => {
      collectValue(value, collector, leaks);
      collectValue(key, collector, leaks);
    });
  },
  $serialize$: (map, getObjID) => {
    const result = [];
    map.forEach((value, key) => {
      result.push(getObjID(key) + " " + getObjID(value));
    });
    return result.join(" ");
  },
  $prepare$: (data) => {
    const set = /* @__PURE__ */ new Map();
    set[DATA] = data;
    return set;
  },
  $fill$: (set, getObject) => {
    const data = set[DATA];
    set[DATA] = void 0;
    assertString(data, "SetSerializer should be defined");
    const items = data.length === 0 ? [] : data.split(" ");
    assertTrue(items.length % 2 === 0, "MapSerializer should have even number of items");
    for (let i = 0; i < items.length; i += 2) {
      set.set(getObject(items[i]), getObject(items[i + 1]));
    }
  }
});
const StringSerializer = /* @__PURE__ */ serializer({
  $prefix$: "\x1B",
  $test$: (v) => !!getSerializer(v) || v === UNDEFINED_PREFIX,
  $serialize$: (v) => v,
  $prepare$: (data) => data
});
const serializers = [
  // NULL                       \u0000
  // UNDEFINED_PREFIX           \u0001
  QRLSerializer,
  ////////////// \u0002
  TaskSerializer,
  ///////////// \u0003
  ResourceSerializer,
  ///////// \u0004
  URLSerializer,
  ////////////// \u0005
  DateSerializer,
  ///////////// \u0006
  RegexSerializer,
  //////////// \u0007
  // BACKSPACE                  \u0008
  // HORIZONTAL TAB             \u0009
  // NEW LINE                   \u000A
  // VERTICAL TAB               \u000B
  // FORM FEED                  \u000C
  // CARRIAGE RETURN            \u000D
  ErrorSerializer,
  //////////// \u000E
  DocumentSerializer,
  ///////// \u000F
  ComponentSerializer,
  //////// \u0010
  DerivedSignalSerializer,
  //// \u0011
  SignalSerializer,
  /////////// \u0012
  SignalWrapperSerializer,
  //// \u0013
  NoFiniteNumberSerializer,
  /// \u0014
  URLSearchParamsSerializer,
  // \u0015
  FormDataSerializer,
  ///////// \u0016
  JSXNodeSerializer,
  ////////// \u0017
  BigIntSerializer,
  /////////// \u0018
  SetSerializer,
  ////////////// \u0019
  MapSerializer,
  ////////////// \u001a
  StringSerializer,
  /////////// \u001b
  Uint8ArraySerializer
  /////// \u001c
];
const serializerByPrefix = /* @__PURE__ */ (() => {
  const serializerByPrefix2 = [];
  serializers.forEach((s) => {
    const prefix = s.$prefixCode$;
    while (serializerByPrefix2.length < prefix) {
      serializerByPrefix2.push(void 0);
    }
    serializerByPrefix2.push(s);
  });
  return serializerByPrefix2;
})();
function getSerializer(obj) {
  if (typeof obj === "string") {
    const prefix = obj.charCodeAt(0);
    if (prefix < serializerByPrefix.length) {
      return serializerByPrefix[prefix];
    }
  }
  return void 0;
}
const collectorSerializers = /* @__PURE__ */ serializers.filter((a2) => a2.$collect$);
const canSerialize = (obj) => {
  for (const s of serializers) {
    if (s.$test$(obj)) {
      return true;
    }
  }
  return false;
};
const collectDeps = (obj, collector, leaks) => {
  for (const s of collectorSerializers) {
    if (s.$test$(obj)) {
      s.$collect$(obj, collector, leaks);
      return true;
    }
  }
  return false;
};
const serializeValue = (obj, getObjID, collector, containerState) => {
  for (const s of serializers) {
    if (s.$test$(obj)) {
      let value = s.$prefixChar$;
      if (s.$serialize$) {
        value += s.$serialize$(obj, getObjID, collector, containerState);
      }
      return value;
    }
  }
  if (typeof obj === "string") {
    return obj;
  }
  return void 0;
};
const createParser = (containerState, doc) => {
  const fillMap = /* @__PURE__ */ new Map();
  const subsMap = /* @__PURE__ */ new Map();
  return {
    prepare(data) {
      const serializer2 = getSerializer(data);
      if (serializer2) {
        const value = serializer2.$prepare$(data.slice(1), containerState, doc);
        if (serializer2.$fill$) {
          fillMap.set(value, serializer2);
        }
        if (serializer2.$subs$) {
          subsMap.set(value, serializer2);
        }
        return value;
      }
      return data;
    },
    subs(obj, subs) {
      const serializer2 = subsMap.get(obj);
      if (serializer2) {
        serializer2.$subs$(obj, subs, containerState);
        return true;
      }
      return false;
    },
    fill(obj, getObject) {
      const serializer2 = fillMap.get(obj);
      if (serializer2) {
        serializer2.$fill$(obj, getObject, containerState);
        return true;
      }
      return false;
    }
  };
};
const OBJECT_TRANSFORMS = {
  "!": (obj, containerState) => {
    return containerState.$proxyMap$.get(obj) ?? getOrCreateProxy(obj, containerState);
  },
  "~": (obj) => {
    return Promise.resolve(obj);
  },
  _: (obj) => {
    return Promise.reject(obj);
  }
};
const isTreeShakeable = (manager, target, leaks) => {
  if (typeof leaks === "boolean") {
    return leaks;
  }
  const localManager = manager.$groupToManagers$.get(leaks);
  if (localManager && localManager.length > 0) {
    if (localManager.length === 1) {
      return localManager[0] !== target;
    }
    return true;
  }
  return false;
};
const getResolveJSXType = (type) => {
  if (type === ":slot") {
    return Slot;
  }
  if (type === ":fragment") {
    return Fragment;
  }
  return type;
};
const verifySerializable = (value, preMessage) => {
  const seen = /* @__PURE__ */ new Set();
  return _verifySerializable(value, seen, "_", preMessage);
};
const _verifySerializable = (value, seen, ctx, preMessage) => {
  const unwrapped = unwrapProxy(value);
  if (unwrapped == null) {
    return value;
  }
  if (shouldSerialize(unwrapped)) {
    if (seen.has(unwrapped)) {
      return value;
    }
    seen.add(unwrapped);
    if (canSerialize(unwrapped)) {
      return value;
    }
    const typeObj = typeof unwrapped;
    switch (typeObj) {
      case "object":
        if (isPromise$1(unwrapped)) {
          return value;
        }
        if (isNode$1(unwrapped)) {
          return value;
        }
        if (isArray(unwrapped)) {
          let expectIndex = 0;
          unwrapped.forEach((v, i) => {
            if (i !== expectIndex) {
              throw qError$1(QError_verifySerializable, unwrapped);
            }
            _verifySerializable(v, seen, ctx + "[" + i + "]");
            expectIndex = i + 1;
          });
          return value;
        }
        if (isSerializableObject(unwrapped)) {
          for (const [key, item] of Object.entries(unwrapped)) {
            _verifySerializable(item, seen, ctx + "." + key);
          }
          return value;
        }
        break;
      case "boolean":
      case "string":
      case "number":
        return value;
    }
    let message = "";
    if (preMessage) {
      message = preMessage;
    } else {
      message = "Value cannot be serialized";
    }
    if (ctx !== "_") {
      message += ` in ${ctx},`;
    }
    if (typeObj === "object") {
      message += ` because it's an instance of "${value?.constructor.name}". You might need to use 'noSerialize()' or use an object literal instead. Check out https://qwik.dev/docs/advanced/dollar/`;
    } else if (typeObj === "function") {
      const fnName = value.name;
      message += ` because it's a function named "${fnName}". You might need to convert it to a QRL using $(fn):

const ${fnName} = $(${String(value)});

Please check out https://qwik.dev/docs/advanced/qrl/ for more information.`;
    }
    console.error("Trying to serialize", value);
    throwErrorAndStop(message);
  }
  return value;
};
const noSerializeSet = /* @__PURE__ */ new WeakSet();
const weakSerializeSet = /* @__PURE__ */ new WeakSet();
const shouldSerialize = (obj) => {
  if (isObject(obj) || isFunction(obj)) {
    return !noSerializeSet.has(obj);
  }
  return true;
};
const fastSkipSerialize = (obj) => {
  return noSerializeSet.has(obj);
};
const fastWeakSerialize = (obj) => {
  return weakSerializeSet.has(obj);
};
const noSerialize = (input) => {
  if (typeof input === "object" && input !== null || typeof input === "function") {
    noSerializeSet.add(input);
  }
  return input;
};
const _weakSerialize = (input) => {
  weakSerializeSet.add(input);
  return input;
};
const isConnected = (sub) => {
  if (isSubscriberDescriptor(sub)) {
    return isConnected(sub.$el$);
  } else {
    return !!tryGetContext$2(sub) || sub.isConnected;
  }
};
const unwrapProxy = (proxy) => {
  return isObject(proxy) ? getProxyTarget(proxy) ?? proxy : proxy;
};
const getProxyTarget = (obj) => {
  return obj[QOjectTargetSymbol];
};
const getSubscriptionManager = (obj) => {
  return obj[QObjectManagerSymbol];
};
const getProxyFlags = (obj) => {
  return obj[QObjectFlagsSymbol];
};
const serializeSubscription = (sub, getObjId) => {
  const type = sub[0];
  const host = typeof sub[1] === "string" ? sub[1] : getObjId(sub[1]);
  if (!host) {
    return void 0;
  }
  let base = type + " " + host;
  let key;
  if (type === 0) {
    key = sub[2];
  } else {
    const signalID = getObjId(sub[2]);
    if (!signalID) {
      return void 0;
    }
    if (type <= 2) {
      key = sub[5];
      base += ` ${signalID} ${must(getObjId(sub[3]))} ${sub[4]}`;
    } else if (type <= 4) {
      key = sub[4];
      const nodeID = typeof sub[3] === "string" ? sub[3] : must(getObjId(sub[3]));
      base += ` ${signalID} ${nodeID}`;
    } else {
      assertFail("Should not get here");
    }
  }
  if (key) {
    base += ` ${encodeURI(key)}`;
  }
  return base;
};
const parseSubscription = (sub, getObject) => {
  const parts = sub.split(" ");
  const type = parseInt(parts[0], 10);
  assertTrue(parts.length >= 2, "At least 2 parts");
  const host = getObject(parts[1]);
  if (!host) {
    return void 0;
  }
  if (isSubscriberDescriptor(host) && !host.$el$) {
    return void 0;
  }
  const subscription = [type, host];
  if (type === 0) {
    assertTrue(parts.length <= 3, "Max 3 parts");
    subscription.push(safeDecode(parts[2]));
  } else if (type <= 2) {
    assertTrue(parts.length === 5 || parts.length === 6, "Type 1 has 5");
    subscription.push(getObject(parts[2]), getObject(parts[3]), parts[4], safeDecode(parts[5]));
  } else if (type <= 4) {
    assertTrue(parts.length === 4 || parts.length === 5, "Type 2 has 4");
    subscription.push(getObject(parts[2]), getObject(parts[3]), safeDecode(parts[4]));
  }
  return subscription;
};
const safeDecode = (str) => {
  if (str !== void 0) {
    return decodeURI(str);
  }
  return void 0;
};
const createSubscriptionManager = (containerState) => {
  const groupToManagers = /* @__PURE__ */ new Map();
  const manager = {
    $groupToManagers$: groupToManagers,
    $createManager$: (initialMap) => {
      return new LocalSubscriptionManager(groupToManagers, containerState, initialMap);
    },
    $clearSub$: (group) => {
      const managers = groupToManagers.get(group);
      if (managers) {
        for (const manager2 of managers) {
          manager2.$unsubGroup$(group);
        }
        groupToManagers.delete(group);
        managers.length = 0;
      }
    },
    $clearSignal$: (signal) => {
      const managers = groupToManagers.get(signal[1]);
      if (managers) {
        for (const manager2 of managers) {
          manager2.$unsubEntry$(signal);
        }
      }
    }
  };
  seal(manager);
  return manager;
};
class LocalSubscriptionManager {
  $groupToManagers$;
  $containerState$;
  $subs$;
  constructor($groupToManagers$, $containerState$, initialMap) {
    this.$groupToManagers$ = $groupToManagers$;
    this.$containerState$ = $containerState$;
    this.$subs$ = [];
    if (initialMap) {
      this.$addSubs$(initialMap);
    }
    seal(this);
  }
  $addSubs$(subs) {
    this.$subs$.push(...subs);
    for (const sub of this.$subs$) {
      this.$addToGroup$(sub[1], this);
    }
  }
  $addToGroup$(group, manager) {
    let managers = this.$groupToManagers$.get(group);
    if (!managers) {
      this.$groupToManagers$.set(group, managers = []);
    }
    if (!managers.includes(manager)) {
      managers.push(manager);
    }
  }
  $unsubGroup$(group) {
    const subs = this.$subs$;
    for (let i = 0; i < subs.length; i++) {
      const found = subs[i][1] === group;
      if (found) {
        subs.splice(i, 1);
        i--;
      }
    }
  }
  $unsubEntry$(entry) {
    const [type, group, signal, elm] = entry;
    const subs = this.$subs$;
    if (type === 1 || type === 2) {
      const prop = entry[4];
      for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        const match = sub[0] === type && sub[1] === group && sub[2] === signal && sub[3] === elm && sub[4] === prop;
        if (match) {
          subs.splice(i, 1);
          i--;
        }
      }
    } else if (type === 3 || type === 4) {
      for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        const match = sub[0] === type && sub[1] === group && sub[2] === signal && sub[3] === elm;
        if (match) {
          subs.splice(i, 1);
          i--;
        }
      }
    }
  }
  $addSub$(sub, key) {
    const subs = this.$subs$;
    const group = sub[1];
    if (sub[0] === 0 && subs.some(([_type, _group, _key]) => _type === 0 && _group === group && _key === key)) {
      return;
    }
    subs.push(__lastSubscription = [...sub, key]);
    this.$addToGroup$(group, this);
  }
  $notifySubs$(key) {
    const subs = this.$subs$;
    for (const sub of subs) {
      const compare = sub[sub.length - 1];
      if (key && compare && compare !== key) {
        continue;
      }
      notifyChange(sub, this.$containerState$);
    }
  }
}
let __lastSubscription;
function getLastSubscription() {
  return __lastSubscription;
}
const must = (a2) => {
  if (a2 == null) {
    throw logError("must be non null", a2);
  }
  return a2;
};
const isQrl = (value) => {
  return typeof value === "function" && typeof value.getSymbol === "function";
};
const SYNC_QRL$1 = "<sync>";
const isSyncQrl = (value) => {
  return isQrl(value) && value.$symbol$ == SYNC_QRL$1;
};
const createQRL = (chunk, symbol, symbolRef, symbolFn, capture, captureRef, refSymbol) => {
  {
    if (captureRef) {
      for (const item of captureRef) {
        verifySerializable(item, "Captured variable in the closure can not be serialized");
      }
    }
  }
  let _containerEl;
  const qrl2 = async function(...args) {
    const fn = invokeFn.call(this, tryGetInvokeContext());
    const result = await fn(...args);
    return result;
  };
  const setContainer = (el) => {
    if (!_containerEl) {
      _containerEl = el;
    }
    return _containerEl;
  };
  const wrapFn = (fn) => {
    if (typeof fn !== "function" || !capture?.length && !captureRef?.length) {
      return fn;
    }
    return function(...args) {
      let context = tryGetInvokeContext();
      if (context) {
        const prevQrl = context.$qrl$;
        context.$qrl$ = qrl2;
        const prevEvent = context.$event$;
        if (context.$event$ === void 0) {
          context.$event$ = this;
        }
        try {
          return fn.apply(this, args);
        } finally {
          context.$qrl$ = prevQrl;
          context.$event$ = prevEvent;
        }
      }
      context = newInvokeContext();
      context.$qrl$ = qrl2;
      context.$event$ = this;
      return invoke.call(this, context, fn, ...args);
    };
  };
  const resolve = async (containerEl) => {
    if (symbolRef !== null) {
      return symbolRef;
    }
    if (containerEl) {
      setContainer(containerEl);
    }
    if (chunk === "") {
      assertDefined(_containerEl, "Sync QRL must have container element");
      const hash3 = _containerEl.getAttribute(QInstance$1);
      const doc = _containerEl.ownerDocument;
      const qFuncs = getQFuncs(doc, hash3);
      return qrl2.resolved = symbolRef = qFuncs[Number(symbol)];
    }
    const start = now();
    const ctx = tryGetInvokeContext();
    {
      const imported = getPlatform().importSymbol(_containerEl, chunk, symbol);
      symbolRef = maybeThen(imported, (ref) => qrl2.resolved = symbolRef = wrapFn(ref));
    }
    if (typeof symbolRef === "object" && isPromise$1(symbolRef)) {
      symbolRef.then(() => emitUsedSymbol(symbol, ctx?.$element$, start), (err) => {
        console.error(`qrl ${symbol} failed to load`, err);
        symbolRef = null;
      });
    }
    return symbolRef;
  };
  const resolveLazy = (containerEl) => {
    return symbolRef !== null ? symbolRef : resolve(containerEl);
  };
  function invokeFn(currentCtx, beforeFn) {
    return (...args) => maybeThen(resolveLazy(), (f) => {
      if (!isFunction(f)) {
        throw qError$1(QError_qrlIsNotFunction);
      }
      if (beforeFn && beforeFn() === false) {
        return;
      }
      const context = createOrReuseInvocationContext(currentCtx);
      return invoke.call(this, context, f, ...args);
    });
  }
  const createOrReuseInvocationContext = (invoke2) => {
    if (invoke2 == null) {
      return newInvokeContext();
    } else if (isArray(invoke2)) {
      return newInvokeContextFromTuple(invoke2);
    } else {
      return invoke2;
    }
  };
  const resolvedSymbol = refSymbol ?? symbol;
  const hash2 = getSymbolHash$1(resolvedSymbol);
  Object.assign(qrl2, {
    getSymbol: () => resolvedSymbol,
    getHash: () => hash2,
    getCaptured: () => captureRef,
    resolve,
    $resolveLazy$: resolveLazy,
    $setContainer$: setContainer,
    $chunk$: chunk,
    $symbol$: symbol,
    $refSymbol$: refSymbol,
    $hash$: hash2,
    getFn: invokeFn,
    $capture$: capture,
    $captureRef$: captureRef,
    dev: null,
    resolved: void 0
  });
  if (symbolRef) {
    symbolRef = maybeThen(symbolRef, (resolved) => qrl2.resolved = symbolRef = wrapFn(resolved));
  }
  {
    seal(qrl2);
  }
  return qrl2;
};
const getSymbolHash$1 = (symbolName) => {
  const index = symbolName.lastIndexOf("_");
  if (index > -1) {
    return symbolName.slice(index + 1);
  }
  return symbolName;
};
function assertQrl(qrl2) {
  {
    if (!isQrl(qrl2)) {
      throw new Error("Not a QRL");
    }
  }
}
function assertSignal(obj) {
  {
    if (!isSignal(obj)) {
      throw new Error("Not a Signal");
    }
  }
}
const EMITTED = /* @__PURE__ */ new Set();
const emitUsedSymbol = (symbol, element, reqTime) => {
  if (!EMITTED.has(symbol)) {
    EMITTED.add(symbol);
    emitEvent("qsymbol", {
      symbol,
      element,
      reqTime
    });
  }
};
const emitEvent = (eventName, detail) => {
  if (!isServerPlatform() && typeof document === "object") {
    document.dispatchEvent(new CustomEvent(eventName, {
      bubbles: false,
      detail
    }));
  }
};
const now = () => {
  if (isServerPlatform()) {
    return 0;
  }
  if (typeof performance === "object") {
    return performance.now();
  }
  return 0;
};
let runtimeSymbolId = 0;
const $ = (expression) => {
  if (!qRuntimeQrl && qDev$1) {
    throw new Error("Optimizer should replace all usages of $() with some special syntax. If you need to create a QRL manually, use inlinedQrl() instead.");
  }
  return createQRL(null, "s" + runtimeSymbolId++, expression, null, null, null, null);
};
const eventQrl = (qrl2) => {
  return qrl2;
};
const _qrlSync = function(fn, serializedFn) {
  fn.serialized = serializedFn;
  return createQRL("", SYNC_QRL$1, fn, null, null, null, null);
};
const componentQrl = (componentQrl2) => {
  function QwikComponent(props, key, flags) {
    assertQrl(componentQrl2);
    assertNumber(flags, "The Qwik Component was not invoked correctly");
    const hash2 = componentQrl2.$hash$.slice(0, 4);
    const finalKey = hash2 + ":" + (key ? key : "");
    return _jsxC(Virtual, {
      [OnRenderProp]: componentQrl2,
      [QSlot]: props[QSlot],
      [_IMMUTABLE]: props[_IMMUTABLE],
      children: props.children,
      props
    }, flags, finalKey);
  }
  QwikComponent[SERIALIZABLE_STATE] = [componentQrl2];
  return QwikComponent;
};
const isQwikComponent = (component) => {
  return typeof component == "function" && component[SERIALIZABLE_STATE] !== void 0;
};
const useStore = (initialState, opts) => {
  const { val, set, iCtx } = useSequentialScope();
  if (val != null) {
    return val;
  }
  const value = isFunction(initialState) ? invoke(void 0, initialState) : initialState;
  if (opts?.reactive === false) {
    set(value);
    return value;
  } else {
    const containerState = iCtx.$renderCtx$.$static$.$containerState$;
    const recursive = opts?.deep ?? true;
    const flags = recursive ? QObjectRecursive : 0;
    const newStore = getOrCreateProxy(value, containerState, flags);
    set(newStore);
    return newStore;
  }
};
function useServerData(key, defaultValue) {
  const ctx = tryGetInvokeContext();
  return ctx?.$renderCtx$?.$static$.$containerState$.$serverData$[key] ?? defaultValue;
}
const useStylesQrl = (styles) => {
  _useStyles(styles, (str) => str);
};
const _useStyles = (styleQrl, transform, scoped) => {
  assertQrl(styleQrl);
  const { val, set, iCtx, i, elCtx } = useSequentialScope();
  if (val) {
    return val;
  }
  const styleId = styleKey(styleQrl, i);
  const containerState = iCtx.$renderCtx$.$static$.$containerState$;
  set(styleId);
  if (!elCtx.$appendStyles$) {
    elCtx.$appendStyles$ = [];
  }
  if (!elCtx.$scopeIds$) {
    elCtx.$scopeIds$ = [];
  }
  if (containerState.$styleIds$.has(styleId)) {
    return styleId;
  }
  containerState.$styleIds$.add(styleId);
  const value = styleQrl.$resolveLazy$(containerState.$containerEl$);
  const appendStyle = (styleText) => {
    assertDefined(elCtx.$appendStyles$, "appendStyles must be defined");
    elCtx.$appendStyles$.push({
      styleId,
      content: transform(styleText, styleId)
    });
  };
  if (isPromise$1(value)) {
    iCtx.$waitOn$.push(value.then(appendStyle));
  } else {
    appendStyle(value);
  }
  return styleId;
};

// @qwik-client-manifest
const manifest = {"manifestHash":"vq3e6m","core":"q-68H4j4H5.js","preloader":"q-BKZ00VYc.js","qwikLoader":"q-naDMFAHy.js","bundleGraphAsset":"assets/BXSCJMcV-bundle-graph.json","injections":[{"tag":"link","location":"head","attributes":{"rel":"stylesheet","href":"/assets/DliLWpXm-style.css"}}],"mapping":{"s_0HdfKyinStA":"q-CDOFezx3.js","s_2QZ1v9ApQ9U":"q-Dsk_ZbvQ.js","s_31W9wytcCOk":"q-90j2IUyC.js","s_3UVXRHIOut8":"q-CG89b8De.js","s_3mpGsfvFFCA":"q-aAVWbMW7.js","s_471FE2kizUk":"q-DFhlKFLH.js","s_4E0UeyzwsCA":"q-CE2_3Rga.js","s_4M09CgXxgaY":"q-DFhlKFLH.js","s_5cSLFxVbjg8":"q-k7mb50_-.js","s_601dCDwH0Ck":"q-D2bF-jto.js","s_7b78W1TPc2Q":"q-CE2_3Rga.js","s_7pplE0CVvb8":"q-B9zXRgfy.js","s_8XuOKQui4R4":"q-CE2_3Rga.js","s_8YCSsGCIudM":"q-CG89b8De.js","s_BO4GcCJB9ls":"q-BXqWma5E.js","s_CefwfYo5TFg":"q-CDOFezx3.js","s_D3bzVK7ui7o":"q-CG89b8De.js","s_DZjrO005Nyo":"q-B9zXRgfy.js","s_IVOaliQExWo":"q-k7mb50_-.js","s_IcGf2ek0gEI":"q-Dsk_ZbvQ.js","s_Ik0EgC70PwM":"q-CG89b8De.js","s_IvuNTQgggoc":"q-DFhlKFLH.js","s_JHlY0GUSTmk":"q-DrjGUzwu.js","s_JvxwffsUyT0":"q-B2VAFujF.js","s_KEMSmEzW9Ns":"q-DFhlKFLH.js","s_KS942cyj9sA":"q-CE2_3Rga.js","s_KZOGVVO5CZk":"q-CDOFezx3.js","s_KbIlgw8fik8":"q-CG89b8De.js","s_Kfayoi7K5ss":"q-CE2_3Rga.js","s_KvgvNiJuEoo":"q-DKm4lode.js","s_L0MEHC8mPhI":"q-aAVWbMW7.js","s_LiKGPEJDTcc":"q-Cmujyvsw.js","s_MdWtpdYXD3k":"q-CE2_3Rga.js","s_MyUm64zf0B8":"q-DFhlKFLH.js","s_N3vWcslZrHo":"q-Dsk_ZbvQ.js","s_ND95MAlz0E4":"q-Dsk_ZbvQ.js","s_NPjYhG1E8oY":"q-k7mb50_-.js","s_OJtaR8hYvZk":"q-h4dOvZkE.js","s_ON4bUCrvmAQ":"q-BXqWma5E.js","s_OoSBimNJstc":"q-Dy7gee7n.js","s_Pe31vmgxtSo":"q-90j2IUyC.js","s_R0s83RqUFM0":"q-DFhlKFLH.js","s_RCqYz7Ckytg":"q-Dsk_ZbvQ.js","s_RZZEdVgJNdo":"q-DdylH-E2.js","s_RcHWY5yTLoU":"q-iax4m1Bb.js","s_SfrBS8NdIew":"q-Dsk_ZbvQ.js","s_SkFCpDem00Q":"q-Dsk_ZbvQ.js","s_SuQYk8iuYTY":"q-Cmujyvsw.js","s_Uvwtk1F9PHc":"q-Cgdq6SNw.js","s_VEyLM1A11BM":"q-aAVWbMW7.js","s_VM0xGhddw3s":"q-CG89b8De.js","s_VVxbqSGMIJE":"q-k7mb50_-.js","s_YMxufIAKMZs":"q-Cmujyvsw.js","s_YsT0Y0IuHjg":"q-aAVWbMW7.js","s_YvFPtEvaV5Y":"q-aAVWbMW7.js","s_ZGS7UQRAfi0":"q-CdQNykBP.js","s_Zlk9TW1bKHM":"q-DrjGUzwu.js","s_aMj0YZcXNMc":"q-CG89b8De.js","s_arwKIUZFk0k":"q-h4dOvZkE.js","s_b0Kze000ELg":"q-DpfDAeQ6.js","s_bUSNgZKIt3Y":"q-BXqWma5E.js","s_d2XMjvqIsd4":"q-Cmujyvsw.js","s_dhF530pcBuM":"q-iax4m1Bb.js","s_gplZBkDRV10":"q-DpfDAeQ6.js","s_h4hnxyRl0vo":"q-Dsk_ZbvQ.js","s_j0tjWrogPCI":"q-DFhlKFLH.js","s_j8XMHE8GMcU":"q-D2bF-jto.js","s_l1x5hd0UwsY":"q-CE2_3Rga.js","s_lUCW0IfKcX0":"q-Dsk_ZbvQ.js","s_nCAdBbplBPE":"q-DrjGUzwu.js","s_ozbxvPP1A0o":"q-Dsk_ZbvQ.js","s_p7hB7BYqOb4":"q-CG89b8De.js","s_qw0xqkjVBco":"q-aAVWbMW7.js","s_rz19jFBdJjc":"q-Dsk_ZbvQ.js","s_tFXvqf0P0i4":"q-CE2_3Rga.js","s_tLANbxcAL9M":"q-90j2IUyC.js","s_tTbjJJEpJYs":"q-Dsk_ZbvQ.js","s_toBRmP08Y0g":"q-CBW68qfq.js","s_tsgXR06h7bo":"q-D2bF-jto.js","s_u5jToyg3Cbw":"q-CDOFezx3.js","s_uJBRkTSAhXo":"q-Dsk_ZbvQ.js","s_uK2SgQTPkNA":"q-Dsk_ZbvQ.js","s_vWd0PGnWMYg":"q-h4dOvZkE.js","s_vo88R3IhYgM":"q-BXqWma5E.js","s_vqIh0ILxfMs":"q-DXKdyo2j.js","s_wIUGXhcyqT0":"q-DFhlKFLH.js","s_E2AYSA5aKXE":"q-DFhlKFLH.js","s_SJ92cb1w6a0":"q-DFhlKFLH.js","s_Z0r0fxJaG6Y":"q-Dsk_ZbvQ.js","s_0B09iJurEH4":"q-BvrWU5Wl.js","s_0HHyXNsyNG4":"q-BvrWU5Wl.js","s_0M6aM8TuuCs":"q-DFhlKFLH.js","s_0ZQAJwnll1k":"q-CDOFezx3.js","s_1jp4niRBAks":"q-CE2_3Rga.js","s_1n2PcFGOMWk":"q-BvrWU5Wl.js","s_1rFBNNDMhSA":"q-BpOA4l5J.js","s_2pMlUWhshIQ":"q-DFhlKFLH.js","s_4DNuTc4qeAM":"q-Dsk_ZbvQ.js","s_5HzQ5YTPlbQ":"q-BvrWU5Wl.js","s_670LKoggseQ":"q-BvrWU5Wl.js","s_6cl0cYlJ83Y":"q-DFhlKFLH.js","s_85ExGjyTa3E":"q-Cyd86gKH.js","s_8LUxCm2lMY0":"q-BvrWU5Wl.js","s_8nUHVYo4FfA":"q-DFhlKFLH.js","s_8y2j1UbC0fU":"q-DdylH-E2.js","s_9mpPWh90rKo":"q-CDOFezx3.js","s_BdDbYcus01A":"q-DFhlKFLH.js","s_DjBCMMrDen0":"q-CDOFezx3.js","s_E0Ja90KRK4s":"q-DpfDAeQ6.js","s_F6EtE7cvsL4":"q-DXKdyo2j.js","s_FMWbwviN20M":"q-BpOA4l5J.js","s_FTLjnnLzVfE":"q-DXKdyo2j.js","s_HQWaPg60dmQ":"q-ZyslySpg.js","s_HQqkJq5zeNM":"q-Cyd86gKH.js","s_Mx5XtxYv4CU":"q-BvrWU5Wl.js","s_NF3PmYKOjJ0":"q-BvrWU5Wl.js","s_Q0KFeCzvWhY":"q-Dsk_ZbvQ.js","s_Q60Gx0Z0lr8":"q-DGprSyrv.js","s_QuOOlL6tKqE":"q-Ck1DKpyW.js","s_RRlYNhgwyhs":"q-Dsk_ZbvQ.js","s_ReVs0muQcNc":"q-BvrWU5Wl.js","s_SDY5Z4snGJI":"q-DbngKG3V.js","s_Sy0GRft7PqA":"q-BvrWU5Wl.js","s_Tm66rgWXpkg":"q-DzVnwl-O.js","s_UFISC5yWqrI":"q-Dsk_ZbvQ.js","s_UJ5zjUcBra4":"q-DCNkJWTN.js","s_Ucs5HMhPuNM":"q-BpMzBaUC.js","s_Ui7bkelJxvU":"q-BpOA4l5J.js","s_VHM38dGgH9w":"q-DkpoaqTc.js","s_Wym7l7jvvIA":"q-Dsk_ZbvQ.js","s_XOihyk7Y39E":"q-YWeCaVLl.js","s_XzgfrqeM7EA":"q-DedEJlNS.js","s_Z7loWDNZ7s8":"q-DFhlKFLH.js","s_cALSmvzjIHw":"q-DFhlKFLH.js","s_d4Bgq5oDNJM":"q-DFhlKFLH.js","s_dVWTaa6l5so":"q-DFhlKFLH.js","s_eFe5MLg0MUQ":"q-CE2_3Rga.js","s_fgeY0DBqTV0":"q-BpOA4l5J.js","s_fk8wq7e9FLQ":"q-CE2_3Rga.js","s_h00I0CALhLo":"q-BvrWU5Wl.js","s_h2Z4aCUraiA":"q-DdylH-E2.js","s_i0L8z0Q6yTA":"q-BpOA4l5J.js","s_iiKWh1az7Bg":"q-ClX35-gc.js","s_jAMK9W28LvA":"q-DFhlKFLH.js","s_jBo8Atz2MpI":"q-DMM-3gx7.js","s_knNvNluaHSM":"q-DFhlKFLH.js","s_l3cr0c5SYNs":"q-DFhlKFLH.js","s_lU0wUqjQ99E":"q-BpOA4l5J.js","s_lyEOSIdaX1U":"q-DKm4lode.js","s_mcG26jukQdQ":"q-Dsk_ZbvQ.js","s_n4Z4yGOJIt4":"q-B2VAFujF.js","s_pKTI2dXzAIc":"q-DXKdyo2j.js","s_pgIfNjeuEpM":"q-BvrWU5Wl.js","s_qNUrmGMgwvY":"q-BpOA4l5J.js","s_qXzn6e905Ug":"q-Dsk_ZbvQ.js","s_qbuw3J8Ur0k":"q-Dsk_ZbvQ.js","s_rNOndqARIR8":"q-BpOA4l5J.js","s_sxUo2kxdzOI":"q-BpOA4l5J.js","s_u0h1rdnJ5RA":"q-BvrWU5Wl.js","s_uAWBtGMZZFY":"q-BpOA4l5J.js","s_uRxPfO8qH8A":"q-DFhlKFLH.js","s_v0mQi0pgLVU":"q-Dsk_ZbvQ.js","s_vD0E03apopo":"q-BpOA4l5J.js","s_vHNO0MdWtUc":"q-DdylH-E2.js","s_xM60xBG3TOU":"q-DFhlKFLH.js","s_z7HtnVeJuqM":"q-BvrWU5Wl.js","s_0jFw9Q74g3w":"q-DbngKG3V.js","s_6jGYBHi1Tnk":"q-ClX35-gc.js","s_7qDgWBpeyRo":"q-Dsk_ZbvQ.js","s_8AbpdhtZwys":"q-CwZrIYM5.js","s_KBp86rIqKcI":"q-DFhlKFLH.js","s_KUu0Za2ZTzM":"q-BpOA4l5J.js","s_NcQLlkHD52U":"q-DGprSyrv.js","s_OtFt9Smlt50":"q-DkpoaqTc.js","s_QHq1lbRQTfA":"q-Dsk_ZbvQ.js","s_Xl17EMFuHOA":"q-Dsk_ZbvQ.js","s_Z3PqDA8zXrI":"q-YWeCaVLl.js","s_Zul71hReGIo":"q-DFhlKFLH.js","s_aTYuWTvR7cY":"q-Dsk_ZbvQ.js","s_g65oOmgcgHs":"q-DCNkJWTN.js","s_iJDVthmm0tM":"q-DGprSyrv.js","s_jG8DJRYHrC4":"q-DFhlKFLH.js","s_jNbZoDSw4JQ":"q-BpOA4l5J.js","s_tSgFK9xqWcw":"q-DGprSyrv.js","s_ty0O9bbu06Q":"q-Dsk_ZbvQ.js","s_yaR8s80iFqw":"q-DFhlKFLH.js","s_iDUK9yImJGg":"q-D7ZzhyT4.js","s_rUmthBlcfhA":"q-DFpHlo8F.js","s_K0zBObahqa4":"q-Dsk_ZbvQ.js","s_lGWGpFKUnVg":"q-BMg6Bsc1.js","s_0AHXVBUgYTs":"q-Djf_YH56.js","s_0fwIeNJbECQ":"q-BRR2m8Qh.js","s_3ViHzm0oQjw":"q--nuxvEj3.js","s_4ezxbKZkUbU":"q-JhVNlspU.js","s_5oLZWebv2gc":"q-C_WjhkvA.js","s_FUo60ux0whE":"q-9YT9KPJ2.js","s_KWyogAjNPYc":"q-C-OksdW7.js","s_YPrNzN3xxgc":"q-pNrVjLs8.js","s_hSai2MXWyvc":"q-9YT9KPJ2.js","s_jvu0vC7xtoE":"q-Bu9eFqr2.js","s_u0d0pQVtAoo":"q-Djf_YH56.js","s_0WoBHtgw7T4":"q-45GXGudD.js","s_0XB2dWv4GGU":"q-h4dOvZkE.js","s_0eOz05v4yM0":"q-BvEZWH8o.js","s_0qx7cZkVPpY":"q-BCQsNJYw.js","s_1IEr6u63BxM":"q-BPBD7TmP.js","s_1wqkpxaL3gI":"q-CUVOi3qt.js","s_2WW05yt2Ccg":"q-sVCLogmg.js","s_3qh0SMcm0MA":"q-CewltLFz.js","s_3wA06ZK3au8":"q-rQ8DQeqs.js","s_4Fl0Tl6tsyg":"q-BvrWU5Wl.js","s_4MQPFAzrh4c":"q-BftfzR7V.js","s_53PTRs8eOx8":"q-BvrWU5Wl.js","s_54dR0oTuuug":"q-Dsk_ZbvQ.js","s_5GC0DI1eTw0":"q-UT_pL_Ok.js","s_5H0s7W3IptI":"q-BoJL_wEa.js","s_5vUB0X7Q52I":"q-BPBD7TmP.js","s_6SEupqedmiU":"q-KQ5aYqEd.js","s_75WCzQSaPOQ":"q-BoJL_wEa.js","s_7aDt0EzaPkY":"q-CihEVY3J.js","s_9XKJ7fwAR04":"q-b7trX2AQ.js","s_BZtLXIh1Xrc":"q-BFirq5jW.js","s_CnuKLDoCwc0":"q-jmlBeS9A.js","s_DtfbGOX0VFY":"q-b7trX2AQ.js","s_FA2AwaTTx5A":"q-BPBD7TmP.js","s_GZ1jU0QaDas":"q-BPBD7TmP.js","s_HBufMj6QBN4":"q-jmlBeS9A.js","s_HkIbXxljegY":"q-CUVOi3qt.js","s_Ipw13cfdEU0":"q-BA8K63ZL.js","s_LwlmIP0MoQw":"q-BFirq5jW.js","s_MSCzDvb60qI":"q-CBW68qfq.js","s_N550v01hTDw":"q-DILuZErS.js","s_NwrJR8kfDGI":"q-AkEhIpgc.js","s_O9asBL50mrg":"q-b7trX2AQ.js","s_OFxbDLPwGQU":"q-AkEhIpgc.js","s_P5iwepU4R24":"q-CUVOi3qt.js","s_PEb2Wh02Qnc":"q-DZuLTOtk.js","s_Ppx0HiD71To":"q-DZuLTOtk.js","s_RQCH239VOTE":"q-rQ8DQeqs.js","s_Sly9CEXxajg":"q-DUvgyKp_.js","s_TemNwGwBLFY":"q-DUvgyKp_.js","s_TiqGBNUP028":"q-DILuZErS.js","s_TpR80bOFL8g":"q-DUvgyKp_.js","s_ULeiE0D0hB4":"q-D-C-9Dou.js","s_UOiC96b6054":"q-C71PnQXy.js","s_UrY0N2Kz6KE":"q-C4mWAc0L.js","s_V13eGN0omfY":"q-CUVOi3qt.js","s_VXQkC1gJKuU":"q-BftfzR7V.js","s_VdFsaQ87KTI":"q-C71PnQXy.js","s_WN99UaemzgI":"q-DSqiz-Kk.js","s_XCbv029YAgQ":"q-CUVOi3qt.js","s_Y2cu816ezOQ":"q-DILuZErS.js","s_Y3tOKYsheJ0":"q-sVCLogmg.js","s_YgY0BfjqJfw":"q-CewltLFz.js","s_ZQ7Z040CnqI":"q-BZ5Vqb4r.js","s_aosYF34KajQ":"q-CUVOi3qt.js","s_c9qeE4vyXJQ":"q-DILuZErS.js","s_cBuNjls0gBY":"q-CixlvfQu.js","s_e0iiUQ88VQE":"q-UT_pL_Ok.js","s_fbcsUkt7ZS8":"q-GTd6U0eN.js","s_gECjPikEE0k":"q-BZ5Vqb4r.js","s_ieB0EDARzIU":"q-C4mWAc0L.js","s_j6dX3zE1vdU":"q-BoJL_wEa.js","s_j8DbIgkua04":"q-C4mWAc0L.js","s_j9I4wu8bJ9k":"q-BMg6Bsc1.js","s_jPS0BadSijI":"q-D-C-9Dou.js","s_kVSbEMj1gaE":"q-D-C-9Dou.js","s_kZGvCA9MC58":"q-B-A08puv.js","s_mbs8uFl4SL4":"q-BFirq5jW.js","s_o7xN2tQ67qs":"q-BPBD7TmP.js","s_ohm2m8c0rcM":"q-BPBD7TmP.js","s_oi01t8gliKY":"q-CBW68qfq.js","s_p3R4x0yg0oU":"q-C71PnQXy.js","s_pyUXMEdWO1A":"q-DILuZErS.js","s_qG9m7SWPJE8":"q-BpOA4l5J.js","s_qYW7l0sfVuo":"q-DbUnR_zc.js","s_spok8JfZFSM":"q-Bb5ppy9Q.js","s_tMr6JkeRRqU":"q-DILuZErS.js","s_u20t34noh04":"q-DILuZErS.js","s_u5CU9Z8sGXw":"q-BCojvZqb.js","s_u8vtyneiWq8":"q-BYxwMNBw.js","s_wVDDa69C2SI":"q-CewltLFz.js","s_xa50Cbd9X90":"q-rQ8DQeqs.js","s_yKzYP0kidl0":"q-DUvgyKp_.js","s_z4l7PJvz1wg":"q-oRFkAEJP.js","s_ziHjPMLk0o4":"q-ClKFo7kI.js","s_zvLmu8bi7JU":"q-BpOA4l5J.js","s_yHGB5aKI6C8":"q-BsXY5OQD.js","s_5z90abfW5TQ":"q-R59_-t8H.js","s_iXW3YwlVmZw":"q-B7yAYIXd.js","s_lNkr0CiVoSQ":"q-Cy7lyIkQ.js","s_oMHPs0wPrPs":"q-CKFyrcQF.js","s_tvlZ0BbPzM4":"q-BuNryhUG.js","s_00fH9jPkt0M":"q-hTmxLbql.js","s_03rVNQrq6A8":"q-NthklJHx.js","s_041O4lWqrio":"q-Db07MXNb.js","s_0DQa4abp08o":"q-Dmv3giuz.js","s_0FcyYvtb5ds":"q-CMHLFVv6.js","s_0l9mOOaOMF0":"q-DxtdJHGj.js","s_0rFf09EPPO8":"q-BKep02t3.js","s_0tvNdLeQ0Jk":"q-BVF9Q6Af.js","s_1M7iiUdHceQ":"q-ClKFo7kI.js","s_1uLhIJfYwTg":"q-DB4oSXak.js","s_2K0ER6d50oA":"q-D8H_MKHJ.js","s_2y4oQ56nwHo":"q-XQ9gNTtb.js","s_3zyHeEBqo0A":"q-CBW68qfq.js","s_4KXfnqlLfXs":"q-DOvIDNKC.js","s_5RxvvuIxdjM":"q-D7Pj0del.js","s_5av94V1yTs0":"q-jmlBeS9A.js","s_6FyOZtiQj9Y":"q-D2_sBcVo.js","s_6suVKFCsGXw":"q-BB2aqzc5.js","s_73nmEoX0ZNM":"q-cfIv3ltR.js","s_8HO2W3J0znc":"q-BCojvZqb.js","s_8Jos09MUuMQ":"q-akTuhTbl.js","s_8MYeciEkYCY":"q-Cud6-IAq.js","s_8cfo8bYqo7I":"q-DUvgyKp_.js","s_901600Q6wK0":"q-CHb6SVG4.js","s_9Yy2aRPSdS0":"q-CPTNEKUg.js","s_AQ2EzbO57SA":"q-BpOA4l5J.js","s_B6A1ZqNncwM":"q-UT_pL_Ok.js","s_BMMOYU0uBlQ":"q-ryeJUr0A.js","s_Bp78ekePQtc":"q-C-ZUPwEI.js","s_CQswRI1kKCI":"q-6pxMtX5K.js","s_Cxp3KnO40KE":"q-CUVOi3qt.js","s_DfoG0bZtmwk":"q-DfcOsRh2.js","s_EAHm0OM4a0I":"q-Scaf0puu.js","s_Fe664Fukzm0":"q-h4dOvZkE.js","s_FjEU7zy0FoI":"q-DeaPLIDw.js","s_FjrWjDEQuvk":"q-GTd6U0eN.js","s_GcWzx1GSSX0":"q-AkEhIpgc.js","s_GnFoq1lXktM":"q-udGp--P3.js","s_H7Ja6hcpK5E":"q-IfLS6VtF.js","s_Ig5dVpAVqIc":"q-CktYJkXG.js","s_Je5G70oOBfg":"q-sVCLogmg.js","s_K12UK9rqTTI":"q-BCQsNJYw.js","s_KGTMmR68NeY":"q-DZuLTOtk.js","s_KIV94qonf14":"q-DILuZErS.js","s_KT0IZplh9Qw":"q-BHKiO52o.js","s_KUagoXoLunY":"q-CcpdD2tG.js","s_MCJgczuyelw":"q-_HsIxX0G.js","s_MZvWZIDLbJc":"q-oRFkAEJP.js","s_MnUYBIeRy3A":"q-BMg6Bsc1.js","s_MxOTZ1AfghI":"q-cD9hMRp5.js","s_NHK2mybT9Ck":"q-iax4m1Bb.js","s_NhmbVhvXjmg":"q-DbUnR_zc.js","s_NnhlFU05f64":"q-Bygdiwjn.js","s_OIjWXuhGO6U":"q-D3ydKSLO.js","s_OOxXOQVnD2A":"q-CwZrIYM5.js","s_OVe0OxY1ZQQ":"q-DpfDAeQ6.js","s_OdBeAaMDiNE":"q-Bq8MMvXa.js","s_Qg2EH1NTlLI":"q-DCNkJWTN.js","s_QgFyTWqgiag":"q-C4mWAc0L.js","s_SdBEHo8imLE":"q-C30_ZZ5y.js","s_SoZkzW76C1Q":"q-KQ5aYqEd.js","s_T59By5obLVA":"q-45GXGudD.js","s_U1ecLHDb3q8":"q-j6HcnllA.js","s_UJKhcckiqsE":"q-Dx589uxz.js","s_UYqS1MVgeP0":"q-DOY_IYO2.js","s_Uc0E0LU0xLo":"q-BftfzR7V.js","s_Uhd14K95oaM":"q-DSXcIuS_.js","s_Vp0Os49b05g":"q-S-rJqaKR.js","s_VzFb6fRQ0v0":"q-CZcWhUr5.js","s_W0VWGNUgQrI":"q-BFirq5jW.js","s_W0oaQAraMgc":"q-BA8K63ZL.js","s_WNrdmHvYl58":"q-CnbiYwki.js","s_WdcsNmXtIoA":"q-C7pqtrXc.js","s_XCtjWD0jqvc":"q-BzZ2y8np.js","s_Y01tuDmEuAI":"q-D2bF-jto.js","s_Y0GWxIFxdgI":"q-CosAZCqv.js","s_YbhniybtgT4":"q-C71PnQXy.js","s_as10IErhB2A":"q-B0V0w2KM.js","s_bXgvcEPJ0zc":"q-Byar5b9G.js","s_cR7A4yE0Bkk":"q-B8jsqvyW.js","s_dc1Xi0oOL5Y":"q-wjBG7FXb.js","s_deIJ6Bz4Mc0":"q-BZ5Vqb4r.js","s_fAfH8e7SULI":"q-sWAy11ob.js","s_fAndMxXqvfQ":"q-Cd47vvFs.js","s_gHam0YOuT5w":"q-D-C-9Dou.js","s_gYmJFhmcUoo":"q-DY_b7_Hh.js","s_hPDhFq79VXE":"q-BoJL_wEa.js","s_hc0AjDFj5NM":"q-BZemCYRd.js","s_hiS4iNUKDBY":"q-BYxwMNBw.js","s_ibeOX0mwm9Q":"q-CY6cq00z.js","s_imVSLRpRuNU":"q-DgPEmEwr.js","s_jLA3zYosSLc":"q-rQ8DQeqs.js","s_jZ0XBY1zzE0":"q-DvPXES34.js","s_jec9qYtskxM":"q-4nmBKIeO.js","s_lg330aCUx0g":"q-DSqiz-Kk.js","s_mM9FkgbBBSk":"q-D7ZzhyT4.js","s_nh59dL8k9JY":"q-COq_02-r.js","s_oEWl8So7GJ0":"q-b7trX2AQ.js","s_oUZgFMzawkY":"q-BeU-WFDQ.js","s_ocWDLkwUHeg":"q-C5P__alW.js","s_p0O3u9pxtg8":"q-B9f4zqmc.js","s_q1xfnofo2AY":"q-CKi3PYys.js","s_qEKa4PJK7UI":"q-DFpHlo8F.js","s_qI1NEwwVOZU":"q-CixlvfQu.js","s_qT0ARd9088E":"q-Cn13U434.js","s_qgwfQPkCLo8":"q-oq0J5_CM.js","s_rsLix8PZ1rc":"q-B2hIPw7z.js","s_ru1xzLHzL5Y":"q-BBHcx92z.js","s_tLOCKOX9nac":"q-CaxHW7x-.js","s_tgzIZd1gEvw":"q-B-A08puv.js","s_tv9054VBDzE":"q-DCuTDRH4.js","s_ua0iDwO6kxI":"q-DkICizvw.js","s_v0t3HzDoO80":"q-CewltLFz.js","s_v2KaRhEuwYQ":"q-DCQ4sr0P.js","s_vKaToXGWp4g":"q-BQZQF9Sy.js","s_vPters0GT6w":"q-BPBD7TmP.js","s_wUFxm0iPsDU":"q-CjZ3gxHy.js","s_wdoFMnEiY7g":"q-D4-I75fD.js","s_wqrxD0zipJU":"q-D669xyeT.js","s_wvIbuqleFxc":"q-Bb5ppy9Q.js","s_x78GssfRnwg":"q-D8l_TpZi.js","s_xNKb6b6gKwI":"q-ChN8UEkI.js","s_yCzH9X90zVQ":"q-CGwPQYIT.js","s_yaGCPHuxDZU":"q-CTHnnmFo.js","s_ydjjJjnMRFA":"q-Bxr_ocIX.js","s_yzKEw1BvAIo":"q-Oc0LfrOk.js","s_2729ixMnrwo":"q-D-C-9Dou.js","s_4QuGEjMyAfM":"q-BCojvZqb.js","s_8NI61ms82oI":"q-CUVOi3qt.js","s_8OYPHwsqOqo":"q-CewltLFz.js","s_AY2DRqtFKLo":"q-CBW68qfq.js","s_F01Ok0JlkG0":"q-BMg6Bsc1.js","s_FEqmEEhKPu0":"q-C30_ZZ5y.js","s_njdNFIHdZN4":"q-BYxwMNBw.js","s_PqrNL6TPY04":"q-BHKiO52o.js","s_00QXXpfUHVM":"q-C-OksdW7.js","s_0D2KxfTkJkU":"q-C-OksdW7.js","s_0Liu0iM7MCs":"q-BgK8EGpv.js","s_0dsyrWEYUbo":"q-C-OksdW7.js","s_0gfsfGezxBE":"q-C-OksdW7.js","s_0j0D72ziBBI":"q-C-OksdW7.js","s_110icFH89TY":"q-C-OksdW7.js","s_1HM5GghGBVQ":"q-C-OksdW7.js","s_1HkmB0ivLyQ":"q-C-OksdW7.js","s_1K3nzhrsy7s":"q-DlaSKwW8.js","s_1cC0ARR5Efw":"q-BgK8EGpv.js","s_1jYNxnlYC1U":"q-C-OksdW7.js","s_220FGRRDaKQ":"q-DYEgxmGz.js","s_27jTIT3fHbk":"q-C-OksdW7.js","s_2LGzVLxSP1s":"q-C-OksdW7.js","s_2V6IEz8JI3E":"q-C-OksdW7.js","s_2Y58EBE2RE0":"q-C-OksdW7.js","s_2gCHjiGJY94":"q-kGGiI-Z9.js","s_3AxR0A5odFU":"q-C-OksdW7.js","s_3Q1NUbIcpAI":"q-C-OksdW7.js","s_3YEH0Emk0VE":"q-C-OksdW7.js","s_3jLea0GfGnE":"q-9YT9KPJ2.js","s_40xsW9SLLHg":"q-kGGiI-Z9.js","s_4HnSmyouRlU":"q-BqZZJz5p.js","s_4SSjMXIK9ac":"q-C-OksdW7.js","s_4hm3aFDtetc":"q-pNrVjLs8.js","s_4mgvwKYNbTQ":"q-C-OksdW7.js","s_59qxQH9euQc":"q-C-OksdW7.js","s_5PCYMOXN3f0":"q-C-OksdW7.js","s_5U0n5GHcFf0":"q-C-OksdW7.js","s_6RsZRt4cwMQ":"q-C-OksdW7.js","s_6hEAbsTtKWU":"q-C-OksdW7.js","s_75TcxmmchZ4":"q-C-OksdW7.js","s_7D9m2U9CMjo":"q-C-OksdW7.js","s_7a1qdNuUh9Q":"q-C-OksdW7.js","s_7e3xEOtxdII":"q-C-OksdW7.js","s_8hP9RY1ZA6M":"q-C-OksdW7.js","s_9bnyD34d8iA":"q-CjULBFAk.js","s_9lsbFeu0yJA":"q-C-OksdW7.js","s_9uittotZqKE":"q-C-OksdW7.js","s_AC1thpW0UAI":"q-C85eObv6.js","s_Ab71SucuWNU":"q-kGGiI-Z9.js","s_ApeB36FS6XU":"q-C-OksdW7.js","s_AqsJRiUviRo":"q-kGGiI-Z9.js","s_BWrwZBCJwJ0":"q-C-OksdW7.js","s_C0Dw0S7hU0k":"q-C-OksdW7.js","s_CdUrUO0YaiI":"q-C-OksdW7.js","s_CiGdwB7DUwY":"q-C-OksdW7.js","s_CvCMyRwbwSQ":"q-C-OksdW7.js","s_CyFifEnuYLc":"q-C-OksdW7.js","s_ERaMfEnJUmM":"q-B-ceQVpj.js","s_FLd2QzcAhes":"q-C-OksdW7.js","s_FYOC3oj0fUI":"q-C-OksdW7.js","s_FhAFHfYUASU":"q-C-OksdW7.js","s_GARdNUZ4gNE":"q-C_WjhkvA.js","s_Gaks7zn05Yc":"q-C-OksdW7.js","s_H0y0Ne4l5xU":"q-C-OksdW7.js","s_H8UTHxKMWIs":"q-C-OksdW7.js","s_HNUgJRF9UvI":"q-C-OksdW7.js","s_HsPH0t6vHdM":"q-C-OksdW7.js","s_I1sO7d2E6mk":"q-kGGiI-Z9.js","s_I2LCEFVkKIc":"q-C-OksdW7.js","s_IGC8fS9k4SA":"q-C-OksdW7.js","s_Iaux00gCOoA":"q-C-OksdW7.js","s_It0wISXwLgw":"q-C-OksdW7.js","s_JBv8p6w89Hk":"q-C-OksdW7.js","s_KC6nKgqSmq8":"q-C-OksdW7.js","s_KLuaPB4ZKpM":"q-C-OksdW7.js","s_KTJ41PwBhsA":"q-9YT9KPJ2.js","s_KlbVEJg5XxA":"q-BgK8EGpv.js","s_L2mgGUFB6xQ":"q-JhVNlspU.js","s_LBgkLbdaR4c":"q-kGGiI-Z9.js","s_LIvKM1sJN6I":"q-BSgH6lr7.js","s_LNFECn4ww6E":"q-B-ceQVpj.js","s_LqfgEEb19Vs":"q-C_WjhkvA.js","s_Ly0Trg0GNyk":"q-C-OksdW7.js","s_MN8DyGpYeLs":"q-C-OksdW7.js","s_N0CCJg7iAzo":"q-C-OksdW7.js","s_N2oss6RqTvo":"q-C-OksdW7.js","s_NGp0LV7gpfE":"q-C-OksdW7.js","s_NIiVQO4P6IY":"q-C-OksdW7.js","s_NltFzCGXCpI":"q-C-OksdW7.js","s_NxMp2b0VYMg":"q-C_WjhkvA.js","s_OETXkPqJ1vk":"q-C-OksdW7.js","s_ObsaMjPdeB0":"q-C-OksdW7.js","s_OdSFBhCRQes":"q-axGVeNxB.js","s_OoZcqvQsjZw":"q-C-OksdW7.js","s_P0FZf401L7k":"q-DYEgxmGz.js","s_PDMs8UcLKMo":"q-C-OksdW7.js","s_PIFfJzPby3k":"q-C-OksdW7.js","s_PyM1cwperF8":"q-DWcNcR2a.js","s_QCuv2MdUgMs":"q-C-OksdW7.js","s_QmWDzegJOgw":"q-C-OksdW7.js","s_REMw9buazq0":"q-C-OksdW7.js","s_RjVU6UTd0VM":"q-C-OksdW7.js","s_RrdEz2s5PnM":"q-C-OksdW7.js","s_RxwpXOG9ZZI":"q-C-OksdW7.js","s_SGc0Jt3TTa0":"q-C-OksdW7.js","s_SjV6Fl0L5KM":"q-C-OksdW7.js","s_SjfkNeR5c5o":"q-C-OksdW7.js","s_SmPljY8aCFU":"q-C-OksdW7.js","s_TVZhI8t6wCU":"q-C-OksdW7.js","s_Tn5Dbr0Qc0I":"q-C-OksdW7.js","s_TpsWXxzS414":"q-C-OksdW7.js","s_UT800qd9bwg":"q-C-OksdW7.js","s_UVJsrYtN0f0":"q-C-OksdW7.js","s_Uez2keHaVrU":"q-C-OksdW7.js","s_V0BCw3jZETg":"q-C-OksdW7.js","s_V4PMzYlldX8":"q-JhVNlspU.js","s_V4urrL8whTE":"q-bgcTsEuR.js","s_VQw4Ty0tG4E":"q-DYEgxmGz.js","s_VSFJER7gE0k":"q-C-OksdW7.js","s_VU4iqF5lP0g":"q-C-OksdW7.js","s_Vhx5AqWJxwc":"q-C-OksdW7.js","s_VlEb1Gtx8xg":"q-kGGiI-Z9.js","s_W3uUpZ05qbo":"q-C-OksdW7.js","s_WEfU7lW73Bo":"q-BgK8EGpv.js","s_WHpyl51UPds":"q-Djf_YH56.js","s_WNfyMoODZwg":"q-C-OksdW7.js","s_WiYIxXvKU3s":"q-C-OksdW7.js","s_Wx0VsF6n5U8":"q-9YT9KPJ2.js","s_X6740FTvyNQ":"q-9YT9KPJ2.js","s_X6KpftNZe1Q":"q-C-OksdW7.js","s_X825tvcJfw0":"q-C-OksdW7.js","s_XVPuj0erQ5o":"q-C-OksdW7.js","s_XZf5JdGxl9U":"q-B-ceQVpj.js","s_YIbZHOiGnSM":"q-C-OksdW7.js","s_YJtOjzao6dA":"q-kGGiI-Z9.js","s_ZQ2V0SDDVEw":"q-CMO43NXo.js","s_ZYRfGqBFDJE":"q-JhVNlspU.js","s_a1z1J8MlQxQ":"q-C-OksdW7.js","s_aDhDJtymUyY":"q-C-OksdW7.js","s_aKkGIeY6ZEg":"q-C-OksdW7.js","s_aegduI9Vyjo":"q-C-OksdW7.js","s_awbrT0mM1OY":"q-kGGiI-Z9.js","s_b15c8p2UOxg":"q-C-OksdW7.js","s_b1wVm9qRvXI":"q-C-OksdW7.js","s_bRoPhKX0LA0":"q-C-OksdW7.js","s_c4m4XQgyGt0":"q-C85eObv6.js","s_cJnzoEIG1T8":"q-C-OksdW7.js","s_cNGG5xwZizE":"q-C-OksdW7.js","s_cYtWCbJF1WY":"q-C-OksdW7.js","s_d00B06Yq84c":"q-C-OksdW7.js","s_dGvf0vq10cM":"q-bgcTsEuR.js","s_ddlrQ3tlxdM":"q-kGGiI-Z9.js","s_dns18af6oxM":"q-C-OksdW7.js","s_dxnbdZ0aJzM":"q-C-OksdW7.js","s_eFVyqnhsgs8":"q-C-OksdW7.js","s_eMHA38aDaDM":"q-C-OksdW7.js","s_ebzn4sdNH9k":"q-C-OksdW7.js","s_f1NeIZJoTB8":"q-C-OksdW7.js","s_fPxd60hyCSM":"q-C-OksdW7.js","s_fnIoUjobj2M":"q-CMO43NXo.js","s_g0pWD3ZCPJg":"q-JhVNlspU.js","s_gvALlY0RGok":"q-C-OksdW7.js","s_gxKftfZZgKQ":"q-C-OksdW7.js","s_gxYo5boqsow":"q-C-OksdW7.js","s_h055EIC4eBQ":"q-C-OksdW7.js","s_h5Xe0vv63po":"q-axGVeNxB.js","s_hLFw62vHBsQ":"q-C-OksdW7.js","s_hXGCTV9B2bs":"q-C-OksdW7.js","s_hbTyqzCjrV0":"q-C-OksdW7.js","s_hy0V0GWkOhU":"q-C-OksdW7.js","s_i0jg0a4yf7g":"q-C-OksdW7.js","s_iCug7lRFUNs":"q-C-OksdW7.js","s_iQ1ZZgwFBds":"q-C-OksdW7.js","s_iZkp5x6sfQU":"q-C-OksdW7.js","s_ivWnLhU0nN0":"q-C-OksdW7.js","s_jmgBnWCKwyU":"q-kGGiI-Z9.js","s_k7SyDZrkfh4":"q-9YT9KPJ2.js","s_ke68sey4p4g":"q-C-OksdW7.js","s_kfCB1kUcOaY":"q-axGVeNxB.js","s_kvP2cnuXUHA":"q-C-OksdW7.js","s_l0Wmc5E9R68":"q-C2z0DFbJ.js","s_l5vZd0f6nbY":"q-C-OksdW7.js","s_lDiuhwzVwuM":"q-C_WjhkvA.js","s_lnn48JJMdhc":"q-JhVNlspU.js","s_lpKoYJiOFg8":"q-C-OksdW7.js","s_lqa0WeKlQcU":"q-C-OksdW7.js","s_m02nuqG6zL4":"q-C-OksdW7.js","s_mIkj0zqFC60":"q-C-OksdW7.js","s_mSI0NbERMuw":"q-C-OksdW7.js","s_n11u2WlhrHs":"q-C-OksdW7.js","s_nfsS0XJWYeQ":"q-C-OksdW7.js","s_ngL1XPOttEs":"q-C-OksdW7.js","s_o6nHdjCuZVk":"q-C-OksdW7.js","s_oE0kg2QVQzg":"q-C-OksdW7.js","s_oa7oYQ0W8e0":"q-C-OksdW7.js","s_ocEaH6XyAxs":"q-C-OksdW7.js","s_omeHGpo2QrI":"q-C-OksdW7.js","s_opCBMNvOTPk":"q-C-OksdW7.js","s_p4d65Gf86IE":"q-C-OksdW7.js","s_pEZlAs8Mh5Q":"q-kGGiI-Z9.js","s_pGwuEr0KOsk":"q-C-OksdW7.js","s_pT3QNwWI7tU":"q-DWcNcR2a.js","s_qA0hJYu7NPU":"q-C-OksdW7.js","s_qZowmwTn0pU":"q-C-OksdW7.js","s_qp60fHb34WY":"q-kGGiI-Z9.js","s_rLoRg2qhafo":"q-C-OksdW7.js","s_rSzkXChLfSY":"q-C-OksdW7.js","s_rioPG8tuQ0o":"q-C-OksdW7.js","s_sQJGCfE03Yo":"q-C-OksdW7.js","s_sUG3R78Ys8Y":"q-C-OksdW7.js","s_sVhDVm493tY":"q-C-OksdW7.js","s_sjPZ3Z3Snd0":"q-BgK8EGpv.js","s_suAdoVluTG0":"q-C-OksdW7.js","s_t0Mab3axeHE":"q-C-OksdW7.js","s_t80oUJtcTl0":"q-BgK8EGpv.js","s_tL4kYN0AJWM":"q-C-OksdW7.js","s_tP930IOxaqU":"q-CMO43NXo.js","s_tkvSpv35D7k":"q-bgcTsEuR.js","s_tnKSfcahCeU":"q-C-OksdW7.js","s_u42ZgOp3tjY":"q-C-OksdW7.js","s_uv1EvbvxqrU":"q-C-OksdW7.js","s_vGpGlWD2rgw":"q-C-OksdW7.js","s_w7YiJOKdiaI":"q-bgcTsEuR.js","s_w9C008yE0qE":"q-C-OksdW7.js","s_wlGPqYE2qiI":"q-C-OksdW7.js","s_wmoHCQSJdjE":"q-C-OksdW7.js","s_wrDEGhOFnKs":"q-C-OksdW7.js","s_x7f800u4ebg":"q-C-OksdW7.js","s_xLcRbIW8FrY":"q-C-OksdW7.js","s_xNE1JACQ0FI":"q-C-OksdW7.js","s_xY0MKnCu0sU":"q-C-OksdW7.js","s_xjgfuNvoOKc":"q-C-OksdW7.js","s_xoOcRRKwcDo":"q-JhVNlspU.js","s_xpy4ufRCje0":"q-C-OksdW7.js","s_xzOxiFw0GmQ":"q-C-OksdW7.js","s_xziHqPVj43s":"q-C-OksdW7.js","s_yA0nff8PFE4":"q-C_WjhkvA.js","s_yELgmd3rDDc":"q-C-OksdW7.js","s_yG1uLI7qhRw":"q-BSgH6lr7.js","s_ytcPMyrFKYU":"q-BgK8EGpv.js","s_yvmqJ6GzhAM":"q-C-OksdW7.js","s_zX0rlCMjsSc":"q-C-OksdW7.js","s_04eOX0mBM3Y":"q-BftfzR7V.js","s_0UaJutGi3G8":"q-DvPXES34.js","s_0nJYBUT7lYU":"q-BoJL_wEa.js","s_0rPh7qcIdjA":"q-Db07MXNb.js","s_0rxFWhY7c6o":"q-BpOA4l5J.js","s_16GV39y0dlw":"q-DOY_IYO2.js","s_19BvfDccloQ":"q-C4mWAc0L.js","s_1f0Z0K00F4o":"q-CUVOi3qt.js","s_1vw05NQ9bFA":"q-BpOA4l5J.js","s_1w33Eabhozs":"q-Dmv3giuz.js","s_2A0LcKUn1dE":"q-BpOA4l5J.js","s_2PvCTd4kfxU":"q-BFirq5jW.js","s_2rWvXv33o08":"q-B-A08puv.js","s_3DIl72gBt0w":"q-Db07MXNb.js","s_3DRNSg0SF4E":"q-B-A08puv.js","s_3QWPGwaW6eg":"q-B-A08puv.js","s_3mR2j98EHaM":"q-BYxwMNBw.js","s_4J5p1Dk44LI":"q-Bb5ppy9Q.js","s_5JDDABM7VRQ":"q-CwZrIYM5.js","s_9yT3x7U2Ys4":"q-Dsk_ZbvQ.js","s_B10Q6trlbOY":"q-Dsk_ZbvQ.js","s_BIGedPuli6E":"q-BvrWU5Wl.js","s_Bpj0aEL7jPU":"q-CxSOEVqE.js","s_CFaQ0P7aNmo":"q-CDOFezx3.js","s_EmrtYUavQf4":"q-CG89b8De.js","s_TwNCkNXys6w":"q-CG89b8De.js","s_ct0eYiJ3SUg":"q-BnWZuu0C.js","s_roe6m4Ma7Kk":"q-Cmujyvsw.js","s_y2ZGWpAgSzg":"q-CG89b8De.js","s_SpWW0Krm2sI":"q-DZuoV214.js","s_BA5yklui0Dg":"q-CwoG4WmC.js","s_RK0sp4ZQwac":"q-sE3WnxkE.js","s_Tt0y0dvbG3c":"q-Bhu3iRZn.js","s_Uoxr7nWCwGQ":"q-BAjAN82X.js","s_gV3IccrV10c":"q-y9f6PcQw.js","s_rHsotxx9sxM":"q-0VUBwC1Z.js","s_tKXtuPoC4w8":"q-CmT5BDxx.js","s_x2z1RmVuc0E":"q-BudX-Aw2.js","s_07IAH8ld3rg":"q-BvkXh2Ts.js","s_0D8rvTG6PEE":"q-CG89b8De.js","s_0E9t3Bl6Gc0":"q-DKm4lode.js","s_0O2hmBbRQyE":"q-CqmLw000.js","s_2tL4agXHCNM":"q-DFFAMa6B.js","s_9JBlu2M2idk":"q-xUrFbtbl.js","s_BQNqHvlQ7Hs":"q-BwLkgJCf.js","s_GbP60DWQnM4":"q-DtchO4F2.js","s_H2oYqlB1WIg":"q-DI91dasK.js","s_IjQoWoKkDX0":"q-Ck1DKpyW.js","s_J8crW3VQ0TQ":"q-pBMPKAUl.js","s_JY001mBY9b0":"q-C4NxrAKe.js","s_Lg6T0Lp0QHU":"q-BV37cTXF.js","s_LnlbTqehuoQ":"q-BgkbE6_D.js","s_MIGPAzZX7uM":"q-DzVnwl-O.js","s_N9As4egzbqc":"q-T_f_oBm6.js","s_NIjRPUFc5Do":"q-DJ6pJDTj.js","s_PDVslP3bfeE":"q-k9c2Ejwc.js","s_QboOQflk0Ug":"q-CsgeXwIi.js","s_S5lc5j8SmxE":"q-BXbMDYdX.js","s_TEDnQThJjt0":"q-9HcuCK2f.js","s_V0Vp0hDPxl4":"q-fCu7-a6l.js","s_XsJ0lqcPlpw":"q-_4TKFRok.js","s_ZDLkR9fAJzA":"q-CE2_3Rga.js","s_cVQdHOTioT8":"q-KfJkkGjh.js","s_cfFWW5IfO5g":"q-CihEVY3J.js","s_flTG3exOk0A":"q-9D9pB4fL.js","s_gRBwixDOEGA":"q-XWuHgTlU.js","s_guKjhkTSwkM":"q-ClX35-gc.js","s_gvJ10zx22pI":"q-YWeCaVLl.js","s_jDUkEA8Hz0I":"q-90j2IUyC.js","s_l0NInTEIdwY":"q-DwgSBfSB.js","s_lHhYR5rag9Y":"q-D1peU0kp.js","s_lxhCtQ2EDi8":"q-BpMzBaUC.js","s_nmhqTQ46rmY":"q-DrjGUzwu.js","s_oQZuab0BdiA":"q-DIEPj-RX.js","s_pA1oHDtRF9g":"q-Cyd86gKH.js","s_pAiKSkZKJv0":"q-CxSOEVqE.js","s_poWJTKL0lzY":"q-DbstGquG.js","s_posZlrdaoqM":"q-BnWZuu0C.js","s_qER0LdzUQeA":"q-aXtztqzq.js","s_rpgQg0RjdgE":"q-D0zszgqD.js","s_rtzk5m6wHeg":"q-68H4j4H5.js","s_tJAi0yhYCsQ":"q-DMM-3gx7.js","s_teRw2VdydBQ":"q-Cmujyvsw.js","s_ttEg4XClosM":"q-BgoBbYuF.js","s_wya0JggMIOY":"q-D8pYGUxp.js","s_x6p0MrEuVxI":"q-V1Dxrt1n.js","s_xcg64HbB90E":"q-DFCPNNWF.js","s_zQJA0JbOhj0":"q-BvEZWH8o.js","s_Sn77fDxAExQ":"q-Cmujyvsw.js","s_VznOHZdEk8Q":"q-CxSOEVqE.js","s_CA4qk1nTAyE":"q-CE2_3Rga.js","s_6bH92HveK8o":"q-BRR2m8Qh.js","s_8mZOKSamNzU":"q-BKJKPL_b.js","s_PyMPJ9Q3Zvc":"q-BlYBlclZ.js","s_T9Fy9UxepgA":"q-BRR2m8Qh.js","s_jXa5Mn7GQJw":"q-DLMKwmk4.js","s_w8isji1T4PM":"q-CvwWbXKk.js","s_00UC3vTox9s":"q-DMM-3gx7.js","s_083vtnG1mdE":"q-Cmujyvsw.js","s_0CxxBXVwsdI":"q-Cyd86gKH.js","s_0FRf6dXKNQw":"q-XWuHgTlU.js","s_0Whlii0uXJM":"q-k9c2Ejwc.js","s_0u6OC0YXZX4":"q-Cmujyvsw.js","s_1THGXPGNdDc":"q-Cmujyvsw.js","s_1e7j9B7i660":"q-Cmujyvsw.js","s_1oAUEd5t6Ig":"q-Cmujyvsw.js","s_2drsownILNY":"q-XWuHgTlU.js","s_2gbDWYKdwi8":"q-Cmujyvsw.js","s_2uKKEMF9BSI":"q-DrjGUzwu.js","s_4YGu7vDRDxM":"q-BnWZuu0C.js","s_4p5P0pO4SXI":"q-CG89b8De.js","s_4rn07Pv3IB4":"q-Cmujyvsw.js","s_4upJI0wbLAQ":"q-CG89b8De.js","s_4w6js2Ax10M":"q-90j2IUyC.js","s_55yP0Rk7JvY":"q-BnWZuu0C.js","s_63PLcbSHLew":"q-Cmujyvsw.js","s_7IL600bSqo0":"q-BnWZuu0C.js","s_83GXtwNOpBY":"q-Cmujyvsw.js","s_AHEI0Sjf3qE":"q-CG89b8De.js","s_Atg4I9hsLtQ":"q-90j2IUyC.js","s_BOTP88wKYa0":"q-BnWZuu0C.js","s_BxtAv4iaRgk":"q-DMM-3gx7.js","s_CaPkQg6Jo6g":"q-YWeCaVLl.js","s_D0I7ULOW34I":"q-Cmujyvsw.js","s_DvjPvJKTkpw":"q-CG89b8De.js","s_GSizLumgD4Q":"q-Dsk_ZbvQ.js","s_NF2Ny1S4SPA":"q-CDOFezx3.js","s_TcgwA5Ad9sM":"q-ZyslySpg.js","s_chxA06JuhR4":"q-Dsk_ZbvQ.js","s_jM7aUj8hO8I":"q-CG89b8De.js","s_nYOjJmmZztg":"q-Dsk_ZbvQ.js","s_xXQi0ymWAeU":"q-ZyslySpg.js","s_RHaM1jaEcR0":"q-wb5RTr2T.js","s_00r2PdVPtB8":"q-D2-H7BPZ.js","s_0r06SN1h41U":"q-B_zGLH9y.js","s_2gNuzIG8q88":"q-DAqViSoE.js","s_76TbWkU2x7g":"q-nQgmACDc.js","s_A0utpm0sGhE":"q-CMhGo2lU.js","s_BQIsfoHHMus":"q-DXyr9Xgx.js","s_UAXtwpEASlI":"q-LDN9_WuG.js","s_UpI6x0WEbKw":"q-CKvECa06.js","s_WYpcLLObEr0":"q-6WraDq0b.js","s_XO7SLUNiKHs":"q-C8vMjdCE.js","s_aLbQSc0LYWU":"q-DbvzbXAk.js","s_ckQjfl8bvj0":"q-BsyuEqaf.js","s_jdMF8B7aN9M":"q-C3J8g2H4.js","s_n29pZ4QywTI":"q-CZ_jBY1q.js","s_0BDYGgCJhBo":"q-D5VxrpBS.js","s_1tGQo4qovA0":"q-DdylH-E2.js","s_40q741g9KdM":"q-Dsk_ZbvQ.js","s_5enkrcNraXo":"q-aAVWbMW7.js","s_8zLc1QvwcoA":"q-BwOtqgBh.js","s_CWskN5rFzts":"q-CSHeVa7c.js","s_CmFyXiCiSBk":"q-DGprSyrv.js","s_FTK3mCX0bqg":"q-DbngKG3V.js","s_FyqH01IUkt4":"q-DedEJlNS.js","s_HWg01aQBwEI":"q-Byp85Yb-.js","s_IO9BEeEtZng":"q-CV_buSP4.js","s_IodXsnTe9Po":"q-DXKdyo2j.js","s_MVBhRqnHoFQ":"q-BnqvIzQ1.js","s_Nc0i6UBKUiw":"q-D82Whkbi.js","s_PqgJBIYa0rQ":"q-DE8qTub_.js","s_Ps5WT3KNnqw":"q-B2VAFujF.js","s_QjKMrYYWliU":"q-1yTbF9UH.js","s_R0W0ir8dJ0E":"q-CMOO2Ilq.js","s_SLl5RZXRiLQ":"q-MYDbjivk.js","s_Z1TLZYNuxic":"q-CDOFezx3.js","s_bCjNg82G0wI":"q-ZyslySpg.js","s_daxaIXIm5p8":"q-B9zXRgfy.js","s_fEN0bqdB1Ro":"q-DphrvHLR.js","s_hprfE245DYI":"q-DkpoaqTc.js","s_mqI1f0KWe0Q":"q-3N05NfDm.js","s_o80jyBBzdLQ":"q-k7mb50_-.js","s_pYT5EfjbaUg":"q-BvrWU5Wl.js","s_q1gkskdqxus":"q-BXqWma5E.js","s_qAdHz8eG1jY":"q-BWAcuFV6.js","s_qRkLCqG2scs":"q-D2xgPYH-.js","s_qenNzphibHk":"q-DFhlKFLH.js","s_9GGWUWcZNWo":"q-DFhlKFLH.js","s_XrxW62aAEUM":"q-DE8qTub_.js","s_u6h4AAX6cB0":"q-BwOtqgBh.js","s_0Iwb30Sdbyw":"q-D-38EUOg.js","s_7tH9pqh4jmQ":"q-Bu9eFqr2.js","s_85mV1HnI0m8":"q-Bu9eFqr2.js","s_GXkiZGzOS8M":"q-Bu9eFqr2.js","s_IESAsQk9BlU":"q-D-38EUOg.js","s_JBB3MRTPOfU":"q-Bu9eFqr2.js","s_PPw9M0hT1Sk":"q-Bu9eFqr2.js","s_R0i20q7BRz8":"q-Bu9eFqr2.js","s_V53dqFHGEEc":"q-Bu9eFqr2.js","s_XP0O88rGpbA":"q-Bu9eFqr2.js","s_Xo90gGdTi3g":"q-D-38EUOg.js","s_Yl7HvIp3m90":"q-Bu9eFqr2.js","s_ZmhBtwF5GG4":"q-Bu9eFqr2.js","s_c0JV5dLIOdc":"q-D-38EUOg.js","s_hQLnQb7vrqI":"q-Bu9eFqr2.js","s_i6Q7LSVINog":"q-Bu9eFqr2.js","s_jwe0G6svd0M":"q-Bu9eFqr2.js","s_mSGnv0vZOzc":"q-Bu9eFqr2.js","s_nITDFqdKWhA":"q-D-38EUOg.js","s_oKPqhf4CZRU":"q-Bu9eFqr2.js","s_vQcSzU8Y5eA":"q-Bu9eFqr2.js","s_xG4hJMmzPT0":"q-Bu9eFqr2.js","s_00T1lvxFHEI":"q-CDOFezx3.js","s_08OedSE6ID0":"q-Dsk_ZbvQ.js","s_0IzRRUuLOYs":"q-Dsk_ZbvQ.js","s_0KQ0pqxRkW0":"q-DFhlKFLH.js","s_0MQNX30xQpk":"q-DFhlKFLH.js","s_0NiSQr0vktA":"q-Dsk_ZbvQ.js","s_0RGwylH6VdE":"q-B9zXRgfy.js","s_0Uyl7K0r09w":"q-CG89b8De.js","s_0V8wewyGgA4":"q-B9zXRgfy.js","s_0n8zdolIsQE":"q-CSHeVa7c.js","s_0nHl8isUWh0":"q-DGprSyrv.js","s_0wCjg04H8HU":"q-DXKdyo2j.js","s_0wj5qV0boKs":"q-DGprSyrv.js","s_1Kn2rvbLCHc":"q-Dsk_ZbvQ.js","s_1RVgw7IUtxQ":"q-DrjGUzwu.js","s_1d9sftYc0YU":"q-Dsk_ZbvQ.js","s_23zUWGQLXp8":"q-CV_buSP4.js","s_2NQYyC2t61Q":"q-DFhlKFLH.js","s_2OBpD2abVYw":"q-B9zXRgfy.js","s_2TjHJpedp3s":"q-DFhlKFLH.js","s_2iI2PMRoM1Y":"q-DdylH-E2.js","s_2oiMsG0rgnY":"q-DFhlKFLH.js","s_3HxMj0BlHY4":"q-DbngKG3V.js","s_3L1fDeWBIzs":"q-B9zXRgfy.js","s_4EzyGhqxDF0":"q-Dsk_ZbvQ.js","s_4SK6u0wv4ZM":"q-Dsk_ZbvQ.js","s_57XLTxJIAIU":"q-DFhlKFLH.js","s_5a8SkBD1d0A":"q-DvPXES34.js","s_5fwNRGyWxgo":"q-DFhlKFLH.js","s_5l4LFrCPtuA":"q-CG89b8De.js","s_64Eci0qNnQc":"q-B-A08puv.js","s_6Bs9bKUOspQ":"q-DrjGUzwu.js","s_6KvOwMZRkbY":"q-Dsk_ZbvQ.js","s_6MbYjI25Zjg":"q-Dsk_ZbvQ.js","s_6rfT90FfM80":"q-BBHcx92z.js","s_6vpdNTXlPco":"q-B9zXRgfy.js","s_7DBldo29xQ0":"q-BFirq5jW.js","s_8P0f6iy05RM":"q-Dsk_ZbvQ.js","s_8riU1nbYfj4":"q-CewltLFz.js","s_8xgHGviODLw":"q-B9zXRgfy.js","s_8yJmcr9ATHU":"q-CTHnnmFo.js","s_98VHPQXKWS0":"q-D-C-9Dou.js","s_9JK5s5rRep8":"q-DrjGUzwu.js","s_9bq2RdeZcNU":"q-oRFkAEJP.js","s_9dV0xkZ0j8U":"q-DSqiz-Kk.js","s_9hDBS7IBghU":"q-Dsk_ZbvQ.js","s_A00WSh8vz2E":"q-AkEhIpgc.js","s_AZzLWFlDcqY":"q-DkpoaqTc.js","s_AsonalxZKiM":"q-CewltLFz.js","s_Axvttjc2vOE":"q-DCuTDRH4.js","s_B4EKr1JHdOg":"q-CDOFezx3.js","s_BFHjTd5a8eY":"q-UT_pL_Ok.js","s_BYGQE4nogRw":"q-B-A08puv.js","s_BZLAUk7FWD0":"q-B9zXRgfy.js","s_BkHT0XMoZnU":"q-DOY_IYO2.js","s_C0elixFaJEM":"q-CewltLFz.js","s_C1kxVlprnzg":"q-CBW68qfq.js","s_C5837LK9vck":"q-CwZrIYM5.js","s_CGfx0qPAfxI":"q-DGprSyrv.js","s_CGnhNrS0Kuo":"q-CjZ3gxHy.js","s_COS0P5JmKo8":"q-BFirq5jW.js","s_CUX9tRbfT6I":"q-BvrWU5Wl.js","s_Cav28bc0CAk":"q-IfLS6VtF.js","s_CezcCCO5uPE":"q-DFhlKFLH.js","s_CleGDw3DOSo":"q-B9zXRgfy.js","s_D0r64EKUan4":"q-DFhlKFLH.js","s_DJ9xVFr0NmY":"q-C71PnQXy.js","s_EGgrY70KNWY":"q-CBW68qfq.js","s_EHxv242eqsk":"q-AkEhIpgc.js","s_FIDAsWq80nE":"q-h4dOvZkE.js","s_FINlghoSh1g":"q-CxSOEVqE.js","s_FXrswr0j4Mc":"q-YWeCaVLl.js","s_FlixauiGC3k":"q-DZuLTOtk.js","s_FnTFLDEVVA8":"q-ClX35-gc.js","s_FyfJRateiCk":"q-DMM-3gx7.js","s_Fz2j5fkmVYg":"q-BZ5Vqb4r.js","s_FzBho1c54mY":"q-Dsk_ZbvQ.js","s_G8OpcBkE3y4":"q-B-A08puv.js","s_GCpiRzJcMFU":"q-Cmujyvsw.js","s_GIpDMNh9seI":"q-BMg6Bsc1.js","s_GOuMstdoTFk":"q-CDOFezx3.js","s_GQ8am6e3aKo":"q-aAVWbMW7.js","s_GVy4AlqPuIM":"q-BFirq5jW.js","s_GlVas00lydg":"q-B-A08puv.js","s_H1ljHG37M80":"q-DFhlKFLH.js","s_HDahwwIX0Mg":"q-CewltLFz.js","s_HIv0pURnbKM":"q-CwZrIYM5.js","s_HZPZiZOoX4M":"q-Cmujyvsw.js","s_HaHOuDogCT0":"q-DedEJlNS.js","s_HhgzndeKJe0":"q-Bb5ppy9Q.js","s_HrVQIH5F6Hk":"q-CwZrIYM5.js","s_I2pUI8k3DoE":"q-ClX35-gc.js","s_I5Bo47u9s6A":"q-IfLS6VtF.js","s_IIjCNUE00KA":"q-DeaPLIDw.js","s_IIvgghdFMPE":"q-D-C-9Dou.js","s_IJm0URG1cvc":"q-CcpdD2tG.js","s_IT1GimcAO28":"q-DOY_IYO2.js","s_IcnGQCPdjWc":"q-CwZrIYM5.js","s_IirWgA3GFFs":"q-Dsk_ZbvQ.js","s_IlRv7oxQSgY":"q-DFhlKFLH.js","s_IrAzOXWgkCg":"q-CG89b8De.js","s_IwNNh1UnHFM":"q-CUVOi3qt.js","s_IxjiTVFMa5o":"q-DrjGUzwu.js","s_JKfS1Bw0Kww":"q-Dsk_ZbvQ.js","s_JT0T28p0VRY":"q-GTd6U0eN.js","s_JXVo0it0YnU":"q-BFirq5jW.js","s_JePexDsuzHo":"q-CwZrIYM5.js","s_JhD577jRfMU":"q-DkpoaqTc.js","s_JknJoEoZrq0":"q-90j2IUyC.js","s_JoDoasT90xU":"q-DbngKG3V.js","s_JoaJJyQcbuI":"q-GTd6U0eN.js","s_Jq1kD0gdBSU":"q-Dsk_ZbvQ.js","s_JrLO8ude8wY":"q-CV_buSP4.js","s_Js360jGL09I":"q-BpOA4l5J.js","s_K0PmBHW68sU":"q-BzZ2y8np.js","s_K1V1i1HtuBk":"q-wjBG7FXb.js","s_KHVBhL27CfE":"q-AkEhIpgc.js","s_KLkSXYWpTFw":"q-BZ5Vqb4r.js","s_KhisTvpEZl4":"q-CV_buSP4.js","s_Kmu8zJZ9dLY":"q-B9zXRgfy.js","s_L1qpm06j8PM":"q-BMg6Bsc1.js","s_LH5dHzedwg0":"q-DFhlKFLH.js","s_LPXphjIFtZg":"q-ClX35-gc.js","s_LREkl7OcBrg":"q-DFhlKFLH.js","s_LRPoIhJImSM":"q-DFhlKFLH.js","s_LcMfWU7bQ00":"q-CewltLFz.js","s_LhEdX1q8hkI":"q-CDOFezx3.js","s_LmeOe1FPGwg":"q-j6HcnllA.js","s_Ln94E19j0h8":"q-BpMzBaUC.js","s_LpfA1axHnlA":"q-Cmujyvsw.js","s_MI5TUgzg45I":"q-Dsk_ZbvQ.js","s_MhGSoz0IVRA":"q-Cyd86gKH.js","s_Mph4QSzzlWI":"q-DILuZErS.js","s_N47uq4W0pgM":"q-DFhlKFLH.js","s_N6FQhBQDO6Y":"q-B-A08puv.js","s_N7uA9moDzZc":"q-D3ydKSLO.js","s_N814jUs9BP8":"q-DFhlKFLH.js","s_NDfcLxkCU0s":"q-DkpoaqTc.js","s_NkDl2dNU0fA":"q-IfLS6VtF.js","s_NlNIfy16Qrg":"q-CwZrIYM5.js","s_O00aYyxeHSo":"q-Dsk_ZbvQ.js","s_O5qCS58nG0c":"q-BYxwMNBw.js","s_OAgNFIlNIUY":"q-DFhlKFLH.js","s_OEHx6g4uG0E":"q-Byar5b9G.js","s_OKg0PN9QZhg":"q-DpfDAeQ6.js","s_OXikjd8QwLs":"q-Cmujyvsw.js","s_Ole8NnJ06c8":"q-Dsk_ZbvQ.js","s_OmZhyJvCZtU":"q-DFhlKFLH.js","s_Ou8EeoWlf0w":"q-CE2_3Rga.js","s_P2HS09JqeOI":"q-IfLS6VtF.js","s_P97fuv5e8vs":"q-D-C-9Dou.js","s_PLv5j4AKG14":"q-UT_pL_Ok.js","s_PTUlNSjmFg0":"q-b7trX2AQ.js","s_PUf8iTahDbQ":"q-UT_pL_Ok.js","s_Pio0UIU2xOY":"q-AkEhIpgc.js","s_Pq2lK0PNBGk":"q-CjZ3gxHy.js","s_PqzaX70ijco":"q-Dsk_ZbvQ.js","s_PvIDm7xIt6I":"q-BFirq5jW.js","s_QOo1TaH0HRs":"q-DFhlKFLH.js","s_QPpTews0mPU":"q-B9zXRgfy.js","s_QRa6gNQ1A04":"q-DrjGUzwu.js","s_QX6ZcePwxu4":"q-B9zXRgfy.js","s_QbJe3Vh72gU":"q-k9c2Ejwc.js","s_QiUWdQN0vjE":"q-DbngKG3V.js","s_QzNhhnarDv4":"q-CG89b8De.js","s_R5k0cDvcaFY":"q-DCNkJWTN.js","s_REpGdJ9lscM":"q-Dsk_ZbvQ.js","s_RTi3tPdZtz0":"q-BvrWU5Wl.js","s_RdJg6Pk8eZQ":"q-DGprSyrv.js","s_Rt0KDiR00kI":"q-DZuLTOtk.js","s_S2PDWDAZLLY":"q-D3ydKSLO.js","s_SD0cU2J2IfY":"q-GTd6U0eN.js","s_SNu2tMqCgUc":"q-h4dOvZkE.js","s_SWWqls7BTHk":"q-CV_buSP4.js","s_SgdCeuD6xaM":"q-CDOFezx3.js","s_Sz0dT0lb0T0":"q-DFhlKFLH.js","s_T5mAik30hQ8":"q-DrzHFa1m.js","s_T7WHQuQzKJo":"q-BZ5Vqb4r.js","s_TLgxEBWRk1M":"q-Dsk_ZbvQ.js","s_TPkl8cnyHGM":"q-BnWZuu0C.js","s_TdFcd3bPkG4":"q-BVF9Q6Af.js","s_Tjtr0vFdjEc":"q-DdylH-E2.js","s_U8Ag3VV3oaU":"q-Dsk_ZbvQ.js","s_UVlunDYpA0g":"q-DFhlKFLH.js","s_UerH5GhNm08":"q-Cmujyvsw.js","s_UsWSNnZFS9o":"q-IfLS6VtF.js","s_V0i2fmUMr0U":"q-DzVnwl-O.js","s_V3PZvuj2LLY":"q-ZyslySpg.js","s_VEJ2FQvF5L4":"q-D669xyeT.js","s_VFCHXl26N2Q":"q-DpfDAeQ6.js","s_VJQdufENjsM":"q-Dsk_ZbvQ.js","s_VSJeHtHyHrM":"q-DFhlKFLH.js","s_VUJ2BcGxw8g":"q-CG89b8De.js","s_VZ5vxKOFKzg":"q-ZyslySpg.js","s_VcmJj0FAdzo":"q-AkEhIpgc.js","s_VeRc00rk61I":"q-90j2IUyC.js","s_VilCwaEUx94":"q-DFhlKFLH.js","s_VsVqMr0hhOc":"q-CixlvfQu.js","s_WEa0CHSPACI":"q-ChN8UEkI.js","s_WQn7lpD1LpE":"q-DFhlKFLH.js","s_X2fx0HzEAd8":"q-DCuTDRH4.js","s_X5JPUjdzSpY":"q-BPBD7TmP.js","s_XPek2MJWY3o":"q-C85eObv6.js","s_Y2EqyPNkzGU":"q-DFhlKFLH.js","s_Y56sB1e6my8":"q-Dsk_ZbvQ.js","s_Y9127C7jXOI":"q-ClX35-gc.js","s_YDTShJXy8jQ":"q-Cmujyvsw.js","s_YEvgT5D2U0E":"q-iax4m1Bb.js","s_YKkwBnSLH1w":"q-DFhlKFLH.js","s_YioV9CULE7g":"q-B-A08puv.js","s_YwiQgpMrq74":"q-CG89b8De.js","s_YxZ6Wqs94x8":"q-DFhlKFLH.js","s_YzgfbB0kLJw":"q-ClX35-gc.js","s_Z7O0seyp8dY":"q-BzZ2y8np.js","s_ZJzIenTl42M":"q-ClX35-gc.js","s_ZLkJIo24nqU":"q-D7Pj0del.js","s_ZS9X0z3CzN0":"q-DvPXES34.js","s_ZVSYciY64u8":"q-BCQsNJYw.js","s_ZWS5YKLS3Xw":"q-k7mb50_-.js","s_ZsP90V4h3mY":"q-C4mWAc0L.js","s_ZtkonSgB4JU":"q-BFirq5jW.js","s_Zwni7j0K8BY":"q-D-C-9Dou.js","s_aBmqA4vyra0":"q-BXbMDYdX.js","s_aCF7y0PRt4U":"q-Dmv3giuz.js","s_aERvX0YY7xE":"q-Dsk_ZbvQ.js","s_aOSQ00KYdkc":"q-BvEZWH8o.js","s_aSs74K8NnAM":"q-3N05NfDm.js","s_aURrQvBELLA":"q-DrjGUzwu.js","s_b1W2ehqIGtQ":"q-DFhlKFLH.js","s_b4Odu5dlxfI":"q-DbUnR_zc.js","s_bGzdlTc1yao":"q-CwZrIYM5.js","s_bY2j79uAwZs":"q-B2VAFujF.js","s_beI1UPP6ejE":"q-Cmujyvsw.js","s_bs8WFGOQ00Y":"q-Cmujyvsw.js","s_btjDK3TWrtw":"q-CV_buSP4.js","s_c1QXkOI0QGU":"q-Cmujyvsw.js","s_cF0HAFU4K1Y":"q-B-A08puv.js","s_cPaUppiiS1k":"q-CjZ3gxHy.js","s_cc1j3YOM20c":"q-CjZ3gxHy.js","s_cpwpR5e1F8s":"q-Cmujyvsw.js","s_cuorWneRayw":"q-BZ5Vqb4r.js","s_d5HhOf09eA4":"q-Dsk_ZbvQ.js","s_d9Cd90PvvlU":"q-DbngKG3V.js","s_dE6pP9p8YQk":"q-Dsk_ZbvQ.js","s_e6LW1M0dB0Y":"q-Ck1DKpyW.js","s_e8tLR4gIrYM":"q-D-C-9Dou.js","s_ePNhekQzsHo":"q-Dsk_ZbvQ.js","s_eaevg0sbN4o":"q-KQ5aYqEd.js","s_ed2CFvkskGI":"q-C71PnQXy.js","s_edVp46nXlY4":"q-sVCLogmg.js","s_ehEElRI7Wkc":"q-CUVOi3qt.js","s_eqp7S0dO0hc":"q-ZyslySpg.js","s_exjUHnGok0Q":"q-DdylH-E2.js","s_eyrS2imQt0c":"q-CwZrIYM5.js","s_f1fja2fCXSI":"q-sVCLogmg.js","s_fJilYkWtpfQ":"q-D-C-9Dou.js","s_fs0QMCB1dHo":"q-90j2IUyC.js","s_fsCxngMziJE":"q-Oc0LfrOk.js","s_gAi6yMrKDDg":"q-DpfDAeQ6.js","s_gIHhiTgss2k":"q-DFhlKFLH.js","s_gbI7LsAPr9A":"q-Bb5ppy9Q.js","s_gjEEhWBY0xU":"q-Dsk_ZbvQ.js","s_gzJX0SsvM0Y":"q-Cmujyvsw.js","s_h0LjZvdXmyI":"q-BvrWU5Wl.js","s_hDbASvSjyTY":"q-CwZrIYM5.js","s_hG9xfefUuis":"q-CE2_3Rga.js","s_hkfFJc6E1XM":"q-Dsk_ZbvQ.js","s_hoWJ01PoCcM":"q-Cmujyvsw.js","s_husClZqlgE8":"q-Dsk_ZbvQ.js","s_hvdxsxyOKkw":"q-DFhlKFLH.js","s_i87WCbx00PI":"q-Dsk_ZbvQ.js","s_iCSYnaV9i8k":"q-CwZrIYM5.js","s_iE34ko8CX6o":"q-Cmujyvsw.js","s_iEwCNcWSWA4":"q-B9zXRgfy.js","s_iJNjLMIUfL0":"q-DFhlKFLH.js","s_iNsjZQ6B4rQ":"q-Dsk_ZbvQ.js","s_iQL1gomwcuw":"q-DkpoaqTc.js","s_iTb06dXB8t0":"q-B2VAFujF.js","s_j2Ccntuq30s":"q-BoJL_wEa.js","s_j4D0OHe5OzQ":"q-CV_buSP4.js","s_j927UWglEQE":"q-Dsk_ZbvQ.js","s_jYRASl47aAo":"q-DFhlKFLH.js","s_jZxVxQUYndE":"q-Cmujyvsw.js","s_jxfk6o7V2T4":"q-CwZrIYM5.js","s_k0twlT0qxA0":"q-BpMzBaUC.js","s_kFCzK1k1Jz8":"q-ZyslySpg.js","s_kKDsAGb037I":"q-DFhlKFLH.js","s_kNghDn8uYSY":"q-CjZ3gxHy.js","s_kXgPG1H00nI":"q-Cmujyvsw.js","s_kkQ4crmjTQI":"q-b7trX2AQ.js","s_l4Rjzmj8OTI":"q-DedEJlNS.js","s_lIDomECnJf4":"q-BnqvIzQ1.js","s_lIkhfAw65gU":"q-CUVOi3qt.js","s_lLmGuFv9tVQ":"q-DFhlKFLH.js","s_lQWbCncwjgw":"q-DrjGUzwu.js","s_lj8oRZzbmlM":"q-BpMzBaUC.js","s_lm4y5b10U0U":"q-BZ5Vqb4r.js","s_lvy8vIur1Mc":"q-DKm4lode.js","s_m2jyKZrUB34":"q-Cyd86gKH.js","s_mIAH36PX0w0":"q-Dsk_ZbvQ.js","s_mXN0GUHh4tY":"q-CihEVY3J.js","s_mbjn8uw4aik":"q-DMM-3gx7.js","s_mjzmVR7LB0o":"q-DFhlKFLH.js","s_mox60Ar01KE":"q-Dsk_ZbvQ.js","s_n44jsiFxzvo":"q-BnWZuu0C.js","s_n48ppy71HLE":"q-DZuLTOtk.js","s_nBviA50s170":"q-Dsk_ZbvQ.js","s_nUijBqPndUY":"q-CV_buSP4.js","s_nXSqdDwEogM":"q-sVCLogmg.js","s_nYAWmZ0KfYY":"q-UT_pL_Ok.js","s_nbP5aN7EF4o":"q-90j2IUyC.js","s_ngPijONk8yk":"q-CjZ3gxHy.js","s_nicQTI3MUoc":"q-Dsk_ZbvQ.js","s_njjY184VFkc":"q-BnWZuu0C.js","s_nk0UmypepTo":"q-CDOFezx3.js","s_nwQ3tlo9w1c":"q-DFhlKFLH.js","s_o66nZSfFOpk":"q-Cmujyvsw.js","s_oD0rWVgWqlc":"q-BZ5Vqb4r.js","s_oOkCOzl7Rfs":"q-DFhlKFLH.js","s_ocNgKxVSQbk":"q-BPBD7TmP.js","s_p0gRglLsE34":"q-DGprSyrv.js","s_pK9HrDhzrSk":"q-CUVOi3qt.js","s_pLST0Tm8d5g":"q-BpMzBaUC.js","s_pdM9Br9u09M":"q-CV_buSP4.js","s_pnPZ2YrY0n4":"q-ClX35-gc.js","s_pvp0dBM88r8":"q-CewltLFz.js","s_pzXrF01DihI":"q-DFhlKFLH.js","s_q0ksziaYzSA":"q-B-A08puv.js","s_q1LWl4VnSHM":"q-DFhlKFLH.js","s_qBcRV4j4lNw":"q-Dsk_ZbvQ.js","s_qCHoXb2aesw":"q-C71PnQXy.js","s_qCOAL0AJ0Ck":"q-DFhlKFLH.js","s_qEOaQiaBmpU":"q-BpOA4l5J.js","s_qEbVCHbbGpU":"q-Cyd86gKH.js","s_qNI8V3ByD1M":"q-CDOFezx3.js","s_qWImVFI5XSI":"q-Dsk_ZbvQ.js","s_qXrnHhhV4QM":"q-BpOA4l5J.js","s_qY1KaY779pU":"q-k9c2Ejwc.js","s_qbG0V939I08":"q-DFhlKFLH.js","s_quOALA0goRE":"q-DGprSyrv.js","s_r0rstiAGcFY":"q-BPBD7TmP.js","s_r2BjJB70hsE":"q-Cyd86gKH.js","s_r6F2nzKN6cE":"q-Cmujyvsw.js","s_rEKcJY2EdKs":"q-UT_pL_Ok.js","s_rKi4jzVWRV4":"q-BzZ2y8np.js","s_rPlcsD4dvVU":"q-DZuLTOtk.js","s_rWNaj7CHXDo":"q-Cmujyvsw.js","s_rmFZoPbdcuE":"q-BzZ2y8np.js","s_rmXypxaBQRQ":"q-Cmujyvsw.js","s_rxl6RTgxAI8":"q-CDOFezx3.js","s_s02ftHqPiFI":"q-DFhlKFLH.js","s_s38FHpF3zNY":"q-S-rJqaKR.js","s_s7bK2xIcugY":"q-Cmujyvsw.js","s_s9ypj7unyFU":"q-AkEhIpgc.js","s_sEq3xheN3hg":"q-DKm4lode.js","s_sK8NN4Nn0n0":"q-Cmujyvsw.js","s_sUUKfO6xwI8":"q-CxSOEVqE.js","s_sWBQ2gbKWzI":"q-Cmujyvsw.js","s_sjzFI4UniJU":"q-DFhlKFLH.js","s_ss3G2qNCy4w":"q-DdylH-E2.js","s_t56oyyy0lFI":"q-68H4j4H5.js","s_tFlSr5iugQg":"q-BMg6Bsc1.js","s_tKXi8PRDFUc":"q-Bb5ppy9Q.js","s_tKfVXRDYzeg":"q-D3ydKSLO.js","s_tRwjFVSPw04":"q-Cmujyvsw.js","s_tdvrs2DXry0":"q-sVCLogmg.js","s_tf6MX2ZbCas":"q-Cmujyvsw.js","s_tjXMMBMneHg":"q-BFirq5jW.js","s_tm1SUztPIRw":"q-Cmujyvsw.js","s_tpyBzbu0xM0":"q-BoJL_wEa.js","s_trUSoXBp8mY":"q-DUvgyKp_.js","s_twRg2t01CP4":"q-AkEhIpgc.js","s_twc6ukZYAGc":"q-DCNkJWTN.js","s_u0HdBRtZkLs":"q-DFhlKFLH.js","s_u0iuSfqnU9o":"q-Db07MXNb.js","s_u8fVTQDh0wc":"q-Bb5ppy9Q.js","s_uMfY32RaGKQ":"q-Dsk_ZbvQ.js","s_unMF0atlJnU":"q-YWeCaVLl.js","s_v0MRuRAdsy4":"q-ClX35-gc.js","s_v0qWebPWu8s":"q-DCNkJWTN.js","s_vP18CC0icUU":"q-Cmujyvsw.js","s_vTLHL96CObA":"q-90j2IUyC.js","s_vf603vYzO7w":"q-Dsk_ZbvQ.js","s_vkpztOJjiKk":"q-B9zXRgfy.js","s_wAp5c8yeooQ":"q-D-C-9Dou.js","s_wE0I74pkX3E":"q-udGp--P3.js","s_wE0o8Bvf334":"q-ZyslySpg.js","s_wESTZ1ELYbM":"q-CwZrIYM5.js","s_wET00ZW2tcg":"q-ZyslySpg.js","s_wKh0InGWyIA":"q-UT_pL_Ok.js","s_waV0k4L4ehE":"q-BnWZuu0C.js","s_wubOM8AQHfc":"q-Dsk_ZbvQ.js","s_wzwQZHNdXl8":"q-DFhlKFLH.js","s_x0Rvk10T1As":"q-Dsk_ZbvQ.js","s_x8WbTeE95ag":"q-C85eObv6.js","s_xHtEEGxcpXM":"q-Cmujyvsw.js","s_xPCp0P2iMHA":"q-DFhlKFLH.js","s_xWXWD1AfV9w":"q-BXbMDYdX.js","s_xkTsS7KMXA8":"q-DFhlKFLH.js","s_y0RcQ7N2U0Y":"q-GTd6U0eN.js","s_y5kk2l9H01k":"q-B-A08puv.js","s_yZUGOw02cz8":"q-DCuTDRH4.js","s_yiVTpd2c3Q4":"q-B-A08puv.js","s_yy3vgGcPuLo":"q-CSHeVa7c.js","s_z7aUArh0lck":"q-90j2IUyC.js","s_zBGQvb0JLFs":"q-Cmujyvsw.js","s_zLzF02BkGqM":"q-Byar5b9G.js","s_ziSt4L3sH6g":"q-Dsk_ZbvQ.js","s_zm1zK36gDMc":"q-D8H_MKHJ.js","s_zpUASKSsRhY":"q-Djf_YH56.js"}};

/**
 * @license
 * @builder.io/qwik/server 1.19.2
 * Copyright Builder.io, Inc. All Rights Reserved.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/QwikDev/qwik/blob/main/LICENSE
 */
var isNode = (value) => {
  return value && typeof value.nodeType === "number";
};
var isElement = (value) => {
  return value.nodeType === 1;
};
var qDev = true;
var STYLE = `background: #564CE0; color: white; padding: 2px 3px; border-radius: 2px; font-size: 0.8em;` ;
var logErrorAndStop = (message, ...optionalParams) => {
  const err = createAndLogError(qDev, message, ...optionalParams);
  debugger;
  return err;
};
var tryGetContext = (element) => {
  return element["_qc_"];
};
var printParams = (optionalParams) => {
  {
    return optionalParams.map((p) => {
      if (isNode(p) && isElement(p)) {
        return printElement(p);
      }
      return p;
    });
  }
};
var printElement = (el) => {
  const ctx = tryGetContext(el);
  const isServer = /* @__PURE__ */ (() => typeof process !== "undefined" && !!process.versions && !!process.versions.node)();
  return {
    tagName: el.tagName,
    renderQRL: ctx?.$componentQrl$?.getSymbol(),
    element: isServer ? void 0 : el,
    ctx: isServer ? void 0 : ctx
  };
};
var createAndLogError = (asyncThrow, message, ...optionalParams) => {
  const err = message instanceof Error ? message : new Error(message);
  console.error("%cQWIK ERROR", STYLE, err.message, ...printParams(optionalParams), err.stack);
  setTimeout(() => {
    throw err;
  }, 0);
  return err;
};
var codeToText = (code, ...parts) => {
  {
    const MAP = [
      "Error while serializing class or style attributes",
      // 0
      "Can not serialize a HTML Node that is not an Element",
      // 1
      "Runtime but no instance found on element.",
      // 2
      "Only primitive and object literals can be serialized",
      // 3
      "Crash while rendering",
      // 4
      "You can render over a existing q:container. Skipping render().",
      // 5
      "Set property {{0}}",
      // 6
      "Only function's and 'string's are supported.",
      // 7
      "Only objects can be wrapped in 'QObject'",
      // 8
      `Only objects literals can be wrapped in 'QObject'`,
      // 9
      "QRL is not a function",
      // 10
      "Dynamic import not found",
      // 11
      "Unknown type argument",
      // 12
      `Actual value for useContext({{0}}) can not be found, make sure some ancestor component has set a value using useContextProvider(). In the browser make sure that the context was used during SSR so its state was serialized.`,
      // 13
      "Invoking 'use*()' method outside of invocation context.",
      // 14
      "Cant access renderCtx for existing context",
      // 15
      "Cant access document for existing context",
      // 16
      "props are immutable",
      // 17
      "<div> component can only be used at the root of a Qwik component$()",
      // 18
      "Props are immutable by default.",
      // 19
      `Calling a 'use*()' method outside 'component$(() => { HERE })' is not allowed. 'use*()' methods provide hooks to the 'component$' state and lifecycle, ie 'use' hooks can only be called synchronously within the 'component$' function or another 'use' method.
See https://qwik.dev/docs/core/tasks/#use-method-rules`,
      // 20
      "Container is already paused. Skipping",
      // 21
      "",
      // 22 -- unused
      "When rendering directly on top of Document, the root node must be a <html>",
      // 23
      "A <html> node must have 2 children. The first one <head> and the second one a <body>",
      // 24
      'Invalid JSXNode type "{{0}}". It must be either a function or a string. Found:',
      // 25
      "Tracking value changes can only be done to useStore() objects and component props",
      // 26
      "Missing Object ID for captured object",
      // 27
      'The provided Context reference "{{0}}" is not a valid context created by createContextId()',
      // 28
      "<html> is the root container, it can not be rendered inside a component",
      // 29
      "QRLs can not be resolved because it does not have an attached container. This means that the QRL does not know where it belongs inside the DOM, so it cant dynamically import() from a relative path.",
      // 30
      "QRLs can not be dynamically resolved, because it does not have a chunk path",
      // 31
      "The JSX ref attribute must be a Signal"
      // 32
    ];
    let text = MAP[code];
    if (parts.length) {
      text = text.replaceAll(/{{(\d+)}}/g, (_, index) => {
        let v = parts[index];
        if (v && typeof v === "object" && v.constructor === Object) {
          v = JSON.stringify(v).slice(0, 50);
        }
        return v;
      });
    }
    return `Code(${code}): ${text}`;
  }
};
var QError_dynamicImportFailed = 11;
var qError = (code, ...parts) => {
  const text = codeToText(code, ...parts);
  return logErrorAndStop(text, ...parts);
};
var SYNC_QRL = "<sync>";
function createPlatform(opts, resolvedManifest) {
  const mapper = resolvedManifest?.mapper;
  const mapperFn = opts.symbolMapper ? opts.symbolMapper : (symbolName, _chunk, parent) => {
    if (mapper) {
      const hash2 = getSymbolHash(symbolName);
      const result = mapper[hash2];
      if (!result) {
        if (hash2 === SYNC_QRL) {
          return [hash2, ""];
        }
        const isRegistered = globalThis.__qwik_reg_symbols?.has(hash2);
        if (isRegistered) {
          return [symbolName, "_"];
        }
        if (parent) {
          return [symbolName, `${parent}?qrl=${symbolName}`];
        }
        console.error("Cannot resolve symbol", symbolName, "in", mapper, parent);
      }
      return result;
    }
  };
  const serverPlatform = {
    isServer: true,
    async importSymbol(_containerEl, url, symbolName) {
      const hash2 = getSymbolHash(symbolName);
      const regSym = globalThis.__qwik_reg_symbols?.get(hash2);
      if (regSym) {
        return regSym;
      }
      throw qError(QError_dynamicImportFailed, symbolName);
    },
    raf: () => {
      console.error("server can not rerender");
      return Promise.resolve();
    },
    nextTick: (fn) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(fn());
        });
      });
    },
    chunkForSymbol(symbolName, _chunk, parent) {
      return mapperFn(symbolName, mapper, parent);
    }
  };
  return serverPlatform;
}
async function setServerPlatform(opts, manifest) {
  const platform = createPlatform(opts, manifest);
  setPlatform(platform);
}
var getSymbolHash = (symbolName) => {
  const index = symbolName.lastIndexOf("_");
  if (index > -1) {
    return symbolName.slice(index + 1);
  }
  return symbolName;
};
var QInstance = "q:instance";
var config$1 = {
  $DEBUG$: false,
  $invPreloadProbability$: 0.65
};
var loadStart = Date.now();
var isJSRegex = /\.[mc]?js$/;
var BundleImportState_None = 0;
var BundleImportState_Queued = 1;
var BundleImportState_Preload = 2;
var BundleImportState_Alias = 3;
var base;
var graph;
var makeBundle = (name, deps) => {
  return {
    $name$: name,
    $state$: isJSRegex.test(name) ? BundleImportState_None : BundleImportState_Alias,
    $deps$: shouldResetFactor ? deps?.map((d) => ({ ...d, $factor$: 1 })) : deps,
    $inverseProbability$: 1,
    $createdTs$: Date.now(),
    $waitedMs$: 0,
    $loadedMs$: 0
  };
};
var parseBundleGraph = (serialized) => {
  const graph2 = /* @__PURE__ */ new Map();
  let i = 0;
  while (i < serialized.length) {
    const name = serialized[i++];
    const deps = [];
    let idx;
    let probability = 1;
    while (idx = serialized[i], typeof idx === "number") {
      if (idx < 0) {
        probability = -idx / 10;
      } else {
        deps.push({
          $name$: serialized[idx],
          $importProbability$: probability,
          $factor$: 1
        });
      }
      i++;
    }
    graph2.set(name, deps);
  }
  return graph2;
};
var getBundle = (name) => {
  let bundle = bundles.get(name);
  if (!bundle) {
    let deps;
    if (graph) {
      deps = graph.get(name);
      if (!deps) {
        return;
      }
      if (!deps.length) {
        deps = void 0;
      }
    }
    bundle = makeBundle(name, deps);
    bundles.set(name, bundle);
  }
  return bundle;
};
var initPreloader = (serializedBundleGraph, opts) => {
  if (opts) {
    if ("debug" in opts) {
      config$1.$DEBUG$ = !!opts.debug;
    }
    if (typeof opts.preloadProbability === "number") {
      config$1.$invPreloadProbability$ = 1 - opts.preloadProbability;
    }
  }
  if (base != null || !serializedBundleGraph) {
    return;
  }
  base = "";
  graph = parseBundleGraph(serializedBundleGraph);
};
var bundles = /* @__PURE__ */ new Map();
var shouldResetFactor;
var queueDirty;
var preloadCount = 0;
var queue = [];
var log = (...args) => {
  console.log(
    `Preloader ${Date.now() - loadStart}ms ${preloadCount}/${queue.length} queued>`,
    ...args
  );
};
var resetQueue = () => {
  bundles.clear();
  queueDirty = false;
  shouldResetFactor = true;
  preloadCount = 0;
  queue.length = 0;
};
var sortQueue = () => {
  if (queueDirty) {
    queue.sort((a, b) => a.$inverseProbability$ - b.$inverseProbability$);
    queueDirty = false;
  }
};
var getQueue = () => {
  sortQueue();
  let probability = 0.4;
  const result = [];
  for (const b of queue) {
    const nextProbability = Math.round((1 - b.$inverseProbability$) * 10);
    if (nextProbability !== probability) {
      probability = nextProbability;
      result.push(probability);
    }
    result.push(b.$name$);
  }
  return result;
};
var adjustProbabilities = (bundle, newInverseProbability, seen) => {
  if (seen?.has(bundle)) {
    return;
  }
  const previousInverseProbability = bundle.$inverseProbability$;
  bundle.$inverseProbability$ = newInverseProbability;
  if (previousInverseProbability - bundle.$inverseProbability$ < 0.01) {
    return;
  }
  if (
    // don't queue until we have initialized the preloader
    base != null && bundle.$state$ < BundleImportState_Preload
  ) {
    if (bundle.$state$ === BundleImportState_None) {
      bundle.$state$ = BundleImportState_Queued;
      queue.push(bundle);
      config$1.$DEBUG$ && log(`queued ${Math.round((1 - bundle.$inverseProbability$) * 100)}%`, bundle.$name$);
    }
    queueDirty = true;
  }
  if (bundle.$deps$) {
    seen || (seen = /* @__PURE__ */ new Set());
    seen.add(bundle);
    const probability = 1 - bundle.$inverseProbability$;
    for (const dep of bundle.$deps$) {
      const depBundle = getBundle(dep.$name$);
      if (depBundle.$inverseProbability$ === 0) {
        continue;
      }
      let newInverseProbability2;
      if (probability === 1 || probability >= 0.99 && depsCount < 100) {
        depsCount++;
        newInverseProbability2 = Math.min(0.01, 1 - dep.$importProbability$);
      } else {
        const newInverseImportProbability = 1 - dep.$importProbability$ * probability;
        const prevAdjust = dep.$factor$;
        const factor = newInverseImportProbability / prevAdjust;
        newInverseProbability2 = Math.max(0.02, depBundle.$inverseProbability$ * factor);
        dep.$factor$ = factor;
      }
      adjustProbabilities(depBundle, newInverseProbability2, seen);
    }
  }
};
var handleBundle = (name, inverseProbability) => {
  const bundle = getBundle(name);
  if (bundle && bundle.$inverseProbability$ > inverseProbability) {
    adjustProbabilities(bundle, inverseProbability);
  }
};
var depsCount;
var preload = (name, probability) => {
  if (!name?.length) {
    return;
  }
  depsCount = 0;
  let inverseProbability = probability ? 1 - probability : 0.4;
  if (Array.isArray(name)) {
    for (let i = name.length - 1; i >= 0; i--) {
      const item = name[i];
      if (typeof item === "number") {
        inverseProbability = 1 - item / 10;
      } else {
        handleBundle(item, inverseProbability);
      }
    }
  } else {
    handleBundle(name, inverseProbability);
  }
};
function flattenPrefetchResources(prefetchResources) {
  const urls = [];
  const addPrefetchResource = (prefetchResources2) => {
    if (prefetchResources2) {
      for (const prefetchResource of prefetchResources2) {
        if (!urls.includes(prefetchResource.url)) {
          urls.push(prefetchResource.url);
          if (prefetchResource.imports) {
            addPrefetchResource(prefetchResource.imports);
          }
        }
      }
    }
  };
  addPrefetchResource(prefetchResources);
  return urls;
}
var getBundles = (snapshotResult) => {
  const platform = getPlatform();
  const bundles2 = snapshotResult?.qrls?.map((qrl) => {
    const symbol = qrl.$refSymbol$ || qrl.$symbol$;
    const chunk = qrl.$chunk$;
    const result = platform.chunkForSymbol(symbol, chunk, qrl.dev?.file);
    if (result) {
      return result[1];
    }
    return chunk;
  }).filter(Boolean);
  return [...new Set(bundles2)];
};
function getPreloadPaths(snapshotResult, opts, resolvedManifest) {
  const prefetchStrategy = opts.prefetchStrategy;
  if (prefetchStrategy === null) {
    return [];
  }
  if (!resolvedManifest?.manifest.bundleGraph) {
    return getBundles(snapshotResult);
  }
  if (typeof prefetchStrategy?.symbolsToPrefetch === "function") {
    try {
      const prefetchResources = prefetchStrategy.symbolsToPrefetch({
        manifest: resolvedManifest.manifest
      });
      return flattenPrefetchResources(prefetchResources);
    } catch (e) {
      console.error("getPrefetchUrls, symbolsToPrefetch()", e);
    }
  }
  const symbols = /* @__PURE__ */ new Set();
  for (const qrl of snapshotResult?.qrls || []) {
    const symbol = getSymbolHash(qrl.$refSymbol$ || qrl.$symbol$);
    if (symbol && symbol.length >= 10) {
      symbols.add(symbol);
    }
  }
  return [...symbols];
}
var expandBundles = (names, resolvedManifest) => {
  if (!resolvedManifest?.manifest.bundleGraph) {
    return [...new Set(names)];
  }
  resetQueue();
  let probability = 0.99;
  for (const name of names.slice(0, 15)) {
    preload(name, probability);
    probability *= 0.85;
  }
  return getQueue();
};
var simplifyPath = (base2, path) => {
  if (path == null) {
    return null;
  }
  const segments = `${base2}${path}`.split("/");
  const simplified = [];
  for (const segment of segments) {
    if (segment === ".." && simplified.length > 0) {
      simplified.pop();
    } else {
      simplified.push(segment);
    }
  }
  return simplified.join("/");
};
var preloaderPre = (base2, resolvedManifest, options, beforeContent, nonce) => {
  const preloaderPath = simplifyPath(base2, resolvedManifest?.manifest?.preloader);
  const bundleGraphPath = "/" + resolvedManifest?.manifest.bundleGraphAsset;
  if (preloaderPath && bundleGraphPath && options !== false) {
    const preloaderOpts = typeof options === "object" ? {
      debug: options.debug,
      preloadProbability: options.ssrPreloadProbability
    } : void 0;
    initPreloader(resolvedManifest?.manifest.bundleGraph, preloaderOpts);
    const opts = [];
    if (options?.debug) {
      opts.push("d:1");
    }
    if (options?.maxIdlePreloads) {
      opts.push(`P:${options.maxIdlePreloads}`);
    }
    if (options?.preloadProbability) {
      opts.push(`Q:${options.preloadProbability}`);
    }
    const optsStr = opts.length ? `,{${opts.join(",")}}` : "";
    const script = `let b=fetch("${bundleGraphPath}");import("${preloaderPath}").then(({l})=>l(${JSON.stringify(base2)},b${optsStr}));`;
    beforeContent.push(
      /**
       * We add modulepreloads even when the script is at the top because they already fire during
       * html download
       */
      jsx("link", { rel: "modulepreload", href: preloaderPath, nonce, crossorigin: "anonymous" }),
      jsx("link", {
        rel: "preload",
        href: bundleGraphPath,
        as: "fetch",
        crossorigin: "anonymous",
        nonce
      }),
      jsx("script", {
        type: "module",
        async: true,
        dangerouslySetInnerHTML: script,
        nonce
      })
    );
  }
  const corePath = simplifyPath(base2, resolvedManifest?.manifest.core);
  if (corePath) {
    beforeContent.push(jsx("link", { rel: "modulepreload", href: corePath, nonce }));
  }
};
var includePreloader = (base2, resolvedManifest, options, referencedBundles, nonce) => {
  if (referencedBundles.length === 0 || options === false) {
    return null;
  }
  const { ssrPreloads, ssrPreloadProbability } = normalizePreLoaderOptions(
    typeof options === "boolean" ? void 0 : options
  );
  let allowed = ssrPreloads;
  const nodes = [];
  {
    base2 = "/";
    if (base2.endsWith("/")) {
      base2 = base2.slice(0, -1);
    }
  }
  const links = [];
  const manifestHash = resolvedManifest?.manifest.manifestHash;
  if (allowed) {
    const preloaderBundle = resolvedManifest?.manifest.preloader;
    const coreBundle = resolvedManifest?.manifest.core;
    const expandedBundles = expandBundles(referencedBundles, resolvedManifest);
    let probability = 4;
    const tenXMinProbability = ssrPreloadProbability * 10;
    for (const hrefOrProbability of expandedBundles) {
      if (typeof hrefOrProbability === "string") {
        if (probability < tenXMinProbability) {
          break;
        }
        if (hrefOrProbability === preloaderBundle || hrefOrProbability === coreBundle) {
          continue;
        }
        links.push(hrefOrProbability);
        if (--allowed === 0) {
          break;
        }
      } else {
        probability = hrefOrProbability;
      }
    }
  }
  const preloaderPath = simplifyPath(base2, manifestHash && resolvedManifest?.manifest.preloader);
  const insertLinks = links.length ? (
    /**
     * We only use modulepreload links because they behave best. Older browsers can rely on the
     * preloader which does feature detection and which will be available soon after inserting these
     * links.
     */
    `${JSON.stringify(links)}.map((l,e)=>{e=document.createElement('link');e.rel='modulepreload';e.href=${JSON.stringify(base2)}+l;document.head.appendChild(e)});`
  ) : "";
  let script = insertLinks;
  if (preloaderPath) {
    script += `window.addEventListener('load',f=>{f=_=>import("${preloaderPath}").then(({p})=>p(${JSON.stringify(referencedBundles)}));try{requestIdleCallback(f,{timeout:2000})}catch(e){setTimeout(f,200)}})`;
  }
  if (script) {
    nodes.push(
      jsx("script", {
        type: "module",
        "q:type": "preload",
        /**
         * This async allows the preloader to be executed before the DOM is fully parsed even though
         * it's at the bottom of the body
         */
        async: true,
        dangerouslySetInnerHTML: script,
        nonce
      })
    );
  }
  if (nodes.length > 0) {
    return jsx(Fragment, { children: nodes });
  }
  return null;
};
var preloaderPost = (base2, snapshotResult, opts, resolvedManifest, output) => {
  if (opts.preloader !== false) {
    const preloadBundles = getPreloadPaths(snapshotResult, opts, resolvedManifest);
    if (preloadBundles.length > 0) {
      const result = includePreloader(
        base2,
        resolvedManifest,
        opts.preloader,
        preloadBundles,
        opts.serverData?.nonce
      );
      if (result) {
        output.push(result);
      }
    }
  }
};
function normalizePreLoaderOptions(input) {
  return { ...PreLoaderOptionsDefault, ...input };
}
var PreLoaderOptionsDefault = {
  ssrPreloads: 7,
  ssrPreloadProbability: 0.5,
  debug: false,
  maxIdlePreloads: 25,
  preloadProbability: 0.35
  // deprecated
};
var QWIK_LOADER_DEFAULT_MINIFIED = 'const t=document,e=window,n=new Set,o=new Set([t]);let r;const s=(t,e)=>Array.from(t.querySelectorAll(e)),a=t=>{const e=[];return o.forEach(n=>e.push(...s(n,t))),e},i=t=>{w(t),s(t,"[q\\\\:shadowroot]").forEach(t=>{const e=t.shadowRoot;e&&i(e)})},c=t=>t&&"function"==typeof t.then,l=(t,e,n=e.type)=>{a("[on"+t+"\\\\:"+n+"]").forEach(o=>{b(o,t,e,n)})},f=e=>{if(void 0===e._qwikjson_){let n=(e===t.documentElement?t.body:e).lastElementChild;for(;n;){if("SCRIPT"===n.tagName&&"qwik/json"===n.getAttribute("type")){e._qwikjson_=JSON.parse(n.textContent.replace(/\\\\x3C(\\/?script)/gi,"<$1"));break}n=n.previousElementSibling}}},p=(t,e)=>new CustomEvent(t,{detail:e}),b=async(e,n,o,r=o.type)=>{const s="on"+n+":"+r;e.hasAttribute("preventdefault:"+r)&&o.preventDefault(),e.hasAttribute("stoppropagation:"+r)&&o.stopPropagation();const a=e._qc_,i=a&&a.li.filter(t=>t[0]===s);if(i&&i.length>0){for(const t of i){const n=t[1].getFn([e,o],()=>e.isConnected)(o,e),r=o.cancelBubble;c(n)&&await n,r&&o.stopPropagation()}return}const l=e.getAttribute(s);if(l){const n=e.closest("[q\\\\:container]"),r=n.getAttribute("q:base"),s=n.getAttribute("q:version")||"unknown",a=n.getAttribute("q:manifest-hash")||"dev",i=new URL(r,t.baseURI);for(const p of l.split("\\n")){const l=new URL(p,i),b=l.href,h=l.hash.replace(/^#?([^?[|]*).*$/,"$1")||"default",q=performance.now();let _,d,y;const w=p.startsWith("#"),g={qBase:r,qManifest:a,qVersion:s,href:b,symbol:h,element:e,reqTime:q};if(w){const e=n.getAttribute("q:instance");_=(t["qFuncs_"+e]||[])[Number.parseInt(h)],_||(d="sync",y=Error("sym:"+h))}else{u("qsymbol",g);const t=l.href.split("#")[0];try{const e=import(t);f(n),_=(await e)[h],_||(d="no-symbol",y=Error(`${h} not in ${t}`))}catch(t){d||(d="async"),y=t}}if(!_){u("qerror",{importError:d,error:y,...g}),console.error(y);break}const m=t.__q_context__;if(e.isConnected)try{t.__q_context__=[e,o,l];const n=_(o,e);c(n)&&await n}catch(t){u("qerror",{error:t,...g})}finally{t.__q_context__=m}}}},u=(e,n)=>{t.dispatchEvent(p(e,n))},h=t=>t.replace(/([A-Z])/g,t=>"-"+t.toLowerCase()),q=async t=>{let e=h(t.type),n=t.target;for(l("-document",t,e);n&&n.getAttribute;){const o=b(n,"",t,e);let r=t.cancelBubble;c(o)&&await o,r||(r=r||t.cancelBubble||n.hasAttribute("stoppropagation:"+t.type)),n=t.bubbles&&!0!==r?n.parentElement:null}},_=t=>{l("-window",t,h(t.type))},d=()=>{const s=t.readyState;if(!r&&("interactive"==s||"complete"==s)&&(o.forEach(i),r=1,u("qinit"),(e.requestIdleCallback??e.setTimeout).bind(e)(()=>u("qidle")),n.has("qvisible"))){const t=a("[on\\\\:qvisible]"),e=new IntersectionObserver(t=>{for(const n of t)n.isIntersecting&&(e.unobserve(n.target),b(n.target,"",p("qvisible",n)))});t.forEach(t=>e.observe(t))}},y=(t,e,n,o=!1)=>{t.addEventListener(e,n,{capture:o,passive:!1})},w=(...t)=>{for(const r of t)"string"==typeof r?n.has(r)||(o.forEach(t=>y(t,r,q,!0)),y(e,r,_,!0),n.add(r)):o.has(r)||(n.forEach(t=>y(r,t,q,!0)),o.add(r))};if(!("__q_context__"in t)){t.__q_context__=0;const r=e.qwikevents;r&&(Array.isArray(r)?w(...r):w("click","input")),e.qwikevents={events:n,roots:o,push:w},y(t,"readystatechange",d),d()}';
var QWIK_LOADER_DEFAULT_DEBUG = 'const doc = document;\nconst win = window;\nconst events = /* @__PURE__ */ new Set();\nconst roots = /* @__PURE__ */ new Set([doc]);\nlet hasInitialized;\nconst nativeQuerySelectorAll = (root, selector) => Array.from(root.querySelectorAll(selector));\nconst querySelectorAll = (query) => {\n  const elements = [];\n  roots.forEach((root) => elements.push(...nativeQuerySelectorAll(root, query)));\n  return elements;\n};\nconst findShadowRoots = (fragment) => {\n  processEventOrNode(fragment);\n  nativeQuerySelectorAll(fragment, "[q\\\\:shadowroot]").forEach((parent) => {\n    const shadowRoot = parent.shadowRoot;\n    shadowRoot && findShadowRoots(shadowRoot);\n  });\n};\nconst isPromise = (promise) => promise && typeof promise.then === "function";\nconst broadcast = (infix, ev, type = ev.type) => {\n  querySelectorAll("[on" + infix + "\\\\:" + type + "]").forEach((el) => {\n    dispatch(el, infix, ev, type);\n  });\n};\nconst resolveContainer = (containerEl) => {\n  if (containerEl._qwikjson_ === void 0) {\n    const parentJSON = containerEl === doc.documentElement ? doc.body : containerEl;\n    let script = parentJSON.lastElementChild;\n    while (script) {\n      if (script.tagName === "SCRIPT" && script.getAttribute("type") === "qwik/json") {\n        containerEl._qwikjson_ = JSON.parse(\n          script.textContent.replace(/\\\\x3C(\\/?script)/gi, "<$1")\n        );\n        break;\n      }\n      script = script.previousElementSibling;\n    }\n  }\n};\nconst createEvent = (eventName, detail) => new CustomEvent(eventName, {\n  detail\n});\nconst dispatch = async (element, onPrefix, ev, eventName = ev.type) => {\n  const attrName = "on" + onPrefix + ":" + eventName;\n  if (element.hasAttribute("preventdefault:" + eventName)) {\n    ev.preventDefault();\n  }\n  if (element.hasAttribute("stoppropagation:" + eventName)) {\n    ev.stopPropagation();\n  }\n  const ctx = element._qc_;\n  const relevantListeners = ctx && ctx.li.filter((li) => li[0] === attrName);\n  if (relevantListeners && relevantListeners.length > 0) {\n    for (const listener of relevantListeners) {\n      const results = listener[1].getFn([element, ev], () => element.isConnected)(ev, element);\n      const cancelBubble = ev.cancelBubble;\n      if (isPromise(results)) {\n        await results;\n      }\n      if (cancelBubble) {\n        ev.stopPropagation();\n      }\n    }\n    return;\n  }\n  const attrValue = element.getAttribute(attrName);\n  if (attrValue) {\n    const container = element.closest("[q\\\\:container]");\n    const qBase = container.getAttribute("q:base");\n    const qVersion = container.getAttribute("q:version") || "unknown";\n    const qManifest = container.getAttribute("q:manifest-hash") || "dev";\n    const base = new URL(qBase, doc.baseURI);\n    for (const qrl of attrValue.split("\\n")) {\n      const url = new URL(qrl, base);\n      const href = url.href;\n      const symbol = url.hash.replace(/^#?([^?[|]*).*$/, "$1") || "default";\n      const reqTime = performance.now();\n      let handler;\n      let importError;\n      let error;\n      const isSync = qrl.startsWith("#");\n      const eventData = {\n        qBase,\n        qManifest,\n        qVersion,\n        href,\n        symbol,\n        element,\n        reqTime\n      };\n      if (isSync) {\n        const hash = container.getAttribute("q:instance");\n        handler = (doc["qFuncs_" + hash] || [])[Number.parseInt(symbol)];\n        if (!handler) {\n          importError = "sync";\n          error = new Error("sym:" + symbol);\n        }\n      } else {\n        emitEvent("qsymbol", eventData);\n        const uri = url.href.split("#")[0];\n        try {\n          const module = import(\n                        uri\n          );\n          resolveContainer(container);\n          handler = (await module)[symbol];\n          if (!handler) {\n            importError = "no-symbol";\n            error = new Error(`${symbol} not in ${uri}`);\n          }\n        } catch (err) {\n          importError || (importError = "async");\n          error = err;\n        }\n      }\n      if (!handler) {\n        emitEvent("qerror", {\n          importError,\n          error,\n          ...eventData\n        });\n        console.error(error);\n        break;\n      }\n      const previousCtx = doc.__q_context__;\n      if (element.isConnected) {\n        try {\n          doc.__q_context__ = [element, ev, url];\n          const results = handler(ev, element);\n          if (isPromise(results)) {\n            await results;\n          }\n        } catch (error2) {\n          emitEvent("qerror", { error: error2, ...eventData });\n        } finally {\n          doc.__q_context__ = previousCtx;\n        }\n      }\n    }\n  }\n};\nconst emitEvent = (eventName, detail) => {\n  doc.dispatchEvent(createEvent(eventName, detail));\n};\nconst camelToKebab = (str) => str.replace(/([A-Z])/g, (a) => "-" + a.toLowerCase());\nconst processDocumentEvent = async (ev) => {\n  let type = camelToKebab(ev.type);\n  let element = ev.target;\n  broadcast("-document", ev, type);\n  while (element && element.getAttribute) {\n    const results = dispatch(element, "", ev, type);\n    let cancelBubble = ev.cancelBubble;\n    if (isPromise(results)) {\n      await results;\n    }\n    cancelBubble || (cancelBubble = cancelBubble || ev.cancelBubble || element.hasAttribute("stoppropagation:" + ev.type));\n    element = ev.bubbles && cancelBubble !== true ? element.parentElement : null;\n  }\n};\nconst processWindowEvent = (ev) => {\n  broadcast("-window", ev, camelToKebab(ev.type));\n};\nconst processReadyStateChange = () => {\n  const readyState = doc.readyState;\n  if (!hasInitialized && (readyState == "interactive" || readyState == "complete")) {\n    roots.forEach(findShadowRoots);\n    hasInitialized = 1;\n    emitEvent("qinit");\n    const riC = win.requestIdleCallback ?? win.setTimeout;\n    riC.bind(win)(() => emitEvent("qidle"));\n    if (events.has("qvisible")) {\n      const results = querySelectorAll("[on\\\\:qvisible]");\n      const observer = new IntersectionObserver((entries) => {\n        for (const entry of entries) {\n          if (entry.isIntersecting) {\n            observer.unobserve(entry.target);\n            dispatch(entry.target, "", createEvent("qvisible", entry));\n          }\n        }\n      });\n      results.forEach((el) => observer.observe(el));\n    }\n  }\n};\nconst addEventListener = (el, eventName, handler, capture = false) => {\n  el.addEventListener(eventName, handler, { capture, passive: false });\n};\nconst processEventOrNode = (...eventNames) => {\n  for (const eventNameOrNode of eventNames) {\n    if (typeof eventNameOrNode === "string") {\n      if (!events.has(eventNameOrNode)) {\n        roots.forEach(\n          (root) => addEventListener(root, eventNameOrNode, processDocumentEvent, true)\n        );\n        addEventListener(win, eventNameOrNode, processWindowEvent, true);\n        events.add(eventNameOrNode);\n      }\n    } else {\n      if (!roots.has(eventNameOrNode)) {\n        events.forEach(\n          (eventName) => addEventListener(eventNameOrNode, eventName, processDocumentEvent, true)\n        );\n        roots.add(eventNameOrNode);\n      }\n    }\n  }\n};\nif (!("__q_context__" in doc)) {\n  doc.__q_context__ = 0;\n  const qwikevents = win.qwikevents;\n  if (qwikevents) {\n    if (Array.isArray(qwikevents)) {\n      processEventOrNode(...qwikevents);\n    } else {\n      processEventOrNode("click", "input");\n    }\n  }\n  win.qwikevents = {\n    events,\n    roots,\n    push: processEventOrNode\n  };\n  addEventListener(doc, "readystatechange", processReadyStateChange);\n  processReadyStateChange();\n}';
function getQwikLoaderScript(opts = {}) {
  return opts.debug ? QWIK_LOADER_DEFAULT_DEBUG : QWIK_LOADER_DEFAULT_MINIFIED;
}
function createTimer() {
  if (typeof performance === "undefined") {
    return () => 0;
  }
  const start = performance.now();
  return () => {
    const end = performance.now();
    const delta = end - start;
    return delta / 1e6;
  };
}
function getBuildBase(opts) {
  let base2 = opts.base;
  if (typeof opts.base === "function") {
    base2 = opts.base(opts);
  }
  if (typeof base2 === "string") {
    if (!base2.endsWith("/")) {
      base2 += "/";
    }
    return base2;
  }
  return `${"/"}build/`;
}
var DOCTYPE = "<!DOCTYPE html>";
async function renderToStream(rootNode, opts) {
  let stream = opts.stream;
  let bufferSize = 0;
  let totalSize = 0;
  let networkFlushes = 0;
  let firstFlushTime = 0;
  let buffer = "";
  let snapshotResult;
  const inOrderStreaming = opts.streaming?.inOrder ?? {
    strategy: "auto",
    maximunInitialChunk: 5e4,
    maximunChunk: 3e4
  };
  const containerTagName = opts.containerTagName ?? "html";
  const containerAttributes = opts.containerAttributes ?? {};
  const nativeStream = stream;
  const firstFlushTimer = createTimer();
  const buildBase = getBuildBase(opts);
  const resolvedManifest = resolveManifest(opts.manifest);
  const nonce = opts.serverData?.nonce;
  function flush() {
    if (buffer) {
      nativeStream.write(buffer);
      buffer = "";
      bufferSize = 0;
      networkFlushes++;
      if (networkFlushes === 1) {
        firstFlushTime = firstFlushTimer();
      }
    }
  }
  function enqueue(chunk) {
    const len = chunk.length;
    bufferSize += len;
    totalSize += len;
    buffer += chunk;
  }
  switch (inOrderStreaming.strategy) {
    case "disabled":
      stream = {
        write: enqueue
      };
      break;
    case "direct":
      stream = nativeStream;
      break;
    case "auto":
      let count = 0;
      let forceFlush = false;
      const minimunChunkSize = inOrderStreaming.maximunChunk ?? 0;
      const initialChunkSize = inOrderStreaming.maximunInitialChunk ?? 0;
      stream = {
        write(chunk) {
          if (chunk === "<!--qkssr-f-->") {
            forceFlush || (forceFlush = true);
          } else if (chunk === "<!--qkssr-pu-->") {
            count++;
          } else if (chunk === "<!--qkssr-po-->") {
            count--;
          } else {
            enqueue(chunk);
          }
          const chunkSize = networkFlushes === 0 ? initialChunkSize : minimunChunkSize;
          if (count === 0 && (forceFlush || bufferSize >= chunkSize)) {
            forceFlush = false;
            flush();
          }
        }
      };
      break;
  }
  if (containerTagName === "html") {
    stream.write(DOCTYPE);
  } else {
    stream.write("<!--cq-->");
  }
  await setServerPlatform(opts, resolvedManifest);
  const injections = resolvedManifest?.manifest.injections;
  const beforeContent = injections ? injections.map((injection) => jsx(injection.tag, injection.attributes ?? {})) : [];
  let includeMode = opts.qwikLoader ? typeof opts.qwikLoader === "object" ? opts.qwikLoader.include === "never" ? 2 : 0 : opts.qwikLoader === "inline" ? 1 : opts.qwikLoader === "never" ? 2 : 0 : 0;
  const qwikLoaderChunk = resolvedManifest?.manifest.qwikLoader;
  if (includeMode === 0 && !qwikLoaderChunk) {
    includeMode = 1;
  }
  if (includeMode === 0) {
    beforeContent.unshift(
      jsx("link", {
        rel: "modulepreload",
        href: `${buildBase}${qwikLoaderChunk}`,
        nonce
      }),
      jsx("script", {
        type: "module",
        async: true,
        src: `${buildBase}${qwikLoaderChunk}`,
        nonce
      })
    );
  } else if (includeMode === 1) {
    const qwikLoaderScript = getQwikLoaderScript({
      debug: opts.debug
    });
    beforeContent.unshift(
      jsx("script", {
        id: "qwikloader",
        // Qwik only works when modules work
        type: "module",
        // Execute asap, don't wait for domcontentloaded
        async: true,
        nonce,
        dangerouslySetInnerHTML: qwikLoaderScript
      })
    );
  }
  preloaderPre(buildBase, resolvedManifest, opts.preloader, beforeContent, nonce);
  const renderTimer = createTimer();
  const renderSymbols = [];
  let renderTime = 0;
  let snapshotTime = 0;
  await _renderSSR(rootNode, {
    stream,
    containerTagName,
    containerAttributes,
    serverData: opts.serverData,
    base: buildBase,
    beforeContent,
    beforeClose: async (contexts, containerState, _dynamic, textNodes) => {
      renderTime = renderTimer();
      const snapshotTimer = createTimer();
      snapshotResult = await _pauseFromContexts(contexts, containerState, void 0, textNodes);
      const children = [];
      preloaderPost(buildBase, snapshotResult, opts, resolvedManifest, children);
      const jsonData = JSON.stringify(snapshotResult.state, void 0, "  " );
      children.push(
        jsx("script", {
          type: "qwik/json",
          dangerouslySetInnerHTML: escapeText(jsonData),
          nonce
        })
      );
      if (snapshotResult.funcs.length > 0) {
        const hash2 = containerAttributes[QInstance];
        children.push(
          jsx("script", {
            "q:func": "qwik/json",
            dangerouslySetInnerHTML: serializeFunctions(hash2, snapshotResult.funcs),
            nonce
          })
        );
      }
      const extraListeners = Array.from(containerState.$events$, (s) => JSON.stringify(s));
      if (extraListeners.length > 0) {
        const content = `(window.qwikevents||(window.qwikevents=[])).push(${extraListeners.join(",")})`;
        children.push(
          jsx("script", {
            dangerouslySetInnerHTML: content,
            nonce
          })
        );
      }
      collectRenderSymbols(renderSymbols, contexts);
      snapshotTime = snapshotTimer();
      return jsx(Fragment, { children });
    },
    manifestHash: resolvedManifest?.manifest.manifestHash || "dev" + hash()
  });
  if (containerTagName !== "html") {
    stream.write("<!--/cq-->");
  }
  flush();
  const isDynamic = snapshotResult.resources.some((r) => r._cache !== Infinity);
  const result = {
    prefetchResources: void 0,
    snapshotResult,
    flushes: networkFlushes,
    manifest: resolvedManifest?.manifest,
    size: totalSize,
    isStatic: !isDynamic,
    timing: {
      render: renderTime,
      snapshot: snapshotTime,
      firstFlush: firstFlushTime
    }
  };
  return result;
}
function hash() {
  return Math.random().toString(36).slice(2);
}
function resolveManifest(manifest$1) {
  const mergedManifest = manifest$1 ? { ...manifest, ...manifest$1 } : manifest;
  if (!mergedManifest || "mapper" in mergedManifest) {
    return mergedManifest;
  }
  if (mergedManifest.mapping) {
    const mapper = {};
    Object.entries(mergedManifest.mapping).forEach(([symbol, bundleFilename]) => {
      mapper[getSymbolHash(symbol)] = [symbol, bundleFilename];
    });
    return {
      mapper,
      manifest: mergedManifest,
      injections: mergedManifest.injections || []
    };
  }
  return void 0;
}
var escapeText = (str) => {
  return str.replace(/<(\/?script)/gi, "\\x3C$1");
};
function collectRenderSymbols(renderSymbols, elements) {
  for (const ctx of elements) {
    const symbol = ctx.$componentQrl$?.getSymbol();
    if (symbol && !renderSymbols.includes(symbol)) {
      renderSymbols.push(symbol);
    }
  }
}
var Q_FUNCS_PREFIX = 'document["qFuncs_HASH"]=';
function serializeFunctions(hash2, funcs) {
  return Q_FUNCS_PREFIX.replace("HASH", hash2) + `[${funcs.join(",\n")}]`;
}

const swRegister = "\"serviceWorker\"in navigator?(navigator.serviceWorker.register(\"/service-worker.js\").catch(e=>console.error(e)),\"caches\"in window&&caches.keys().then(e=>{const r=e.find(c=>c.startsWith(\"QwikBuild\"));r&&caches.delete(r).catch(console.error)}).catch(console.error)):console.log(\"Service worker not supported in this browser.\")";

const RouteStateContext = /* @__PURE__ */ createContextId("qc-s");
const ContentContext = /* @__PURE__ */ createContextId("qc-c");
const ContentInternalContext = /* @__PURE__ */ createContextId("qc-ic");
const DocumentHeadContext = /* @__PURE__ */ createContextId("qc-h");
const RouteLocationContext = /* @__PURE__ */ createContextId("qc-l");
const RouteNavigateContext = /* @__PURE__ */ createContextId("qc-n");
const RouteActionContext = /* @__PURE__ */ createContextId("qc-a");
const RoutePreventNavigateContext = /* @__PURE__ */ createContextId("qc-p");
const spaInit = eventQrl(/*#__PURE__*/ _noopQrlDEV("spaInit_event_w8isji1T4PM", {
    file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
    lo: 0,
    hi: 0,
    displayName: "index.qwik.mjs_spaInit_event"
}));
const RouterOutlet_component_poWJTKL0lzY = ()=>{
    const serverData = useServerData("containerAttributes");
    if (!serverData) throw new Error("PrefetchServiceWorker component must be rendered on the server.");
    _jsxBranch();
    const context = useContext(ContentInternalContext);
    if (context.value && context.value.length > 0) {
        const contentsLen = context.value.length;
        let cmp = null;
        for(let i = contentsLen - 1; i >= 0; i--)if (context.value[i].default) cmp = _jsxC(context.value[i].default, {
            children: cmp
        }, 1, "3H_0", {
            fileName: "../node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
            lineNumber: 186,
            columnNumber: 15
        });
        return /* @__PURE__ */ _jsxC(Fragment, {
            children: [
                cmp,
                /* @__PURE__ */ _jsxQ("script", {
                    "document:onQCInit$": spaInit,
                    "document:onQInit$": _qrlSync(()=>{
                        ((w, h)=>{
                            if (!w._qcs && h.scrollRestoration === "manual") {
                                w._qcs = true;
                                const s = h.state?._qCityScroll;
                                if (s) w.scrollTo(s.x, s.y);
                                document.dispatchEvent(new Event("qcinit"));
                            }
                        })(window, history);
                    }, '()=>{((w,h)=>{if(!w._qcs&&h.scrollRestoration==="manual"){w._qcs=true;const s=h.state?._qCityScroll;if(s){w.scrollTo(s.x,s.y);}document.dispatchEvent(new Event("qcinit"));}})(window,history);}')
                }, null, null, 2, "3H_1", {
                    fileName: "../node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
                    lineNumber: 194,
                    columnNumber: 35
                })
            ]
        }, 1, "3H_2", {
            fileName: "../node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
            lineNumber: 191,
            columnNumber: 28
        });
    }
    return SkipRender;
};
const RouterOutlet = /*#__PURE__*/ componentQrl(/*#__PURE__*/ inlinedQrlDEV(RouterOutlet_component_poWJTKL0lzY, "RouterOutlet_component_poWJTKL0lzY", {
    file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
    lo: 7025,
    hi: 8179,
    displayName: "index.qwik.mjs_RouterOutlet_component"
}));
const toUrl = (url, baseUrl)=>new URL(url, baseUrl.href);
const isSameOrigin = (a, b)=>a.origin === b.origin;
const withSlash = (path)=>path.endsWith("/") ? path : path + "/";
const isSamePathname = ({ pathname: a }, { pathname: b })=>{
    const lDiff = Math.abs(a.length - b.length);
    return lDiff === 0 ? a === b : lDiff === 1 && withSlash(a) === withSlash(b);
};
const isSameSearchQuery = (a, b)=>a.search === b.search;
const isSamePath = (a, b)=>isSameSearchQuery(a, b) && isSamePathname(a, b);
const isPromise = (value)=>{
    return value && typeof value.then === "function";
};
const resolveHead = (endpoint, routeLocation, contentModules, locale)=>{
    const head = createDocumentHead();
    const getData = (loaderOrAction)=>{
        const id = loaderOrAction.__id;
        if (loaderOrAction.__brand === "server_loader") {
            if (!(id in endpoint.loaders)) throw new Error("You can not get the returned data of a loader that has not been executed for this request.");
        }
        const data = endpoint.loaders[id];
        if (isPromise(data)) throw new Error("Loaders returning a promise can not be resolved for the head function.");
        return data;
    };
    const headProps = {
        head,
        withLocale: (fn)=>withLocale(locale, fn),
        resolveValue: getData,
        ...routeLocation
    };
    for(let i = contentModules.length - 1; i >= 0; i--){
        const contentModuleHead = contentModules[i] && contentModules[i].head;
        if (contentModuleHead) {
            if (typeof contentModuleHead === "function") resolveDocumentHead(head, withLocale(locale, ()=>contentModuleHead(headProps)));
            else if (typeof contentModuleHead === "object") resolveDocumentHead(head, contentModuleHead);
        }
    }
    return headProps.head;
};
const resolveDocumentHead = (resolvedHead, updatedHead)=>{
    if (typeof updatedHead.title === "string") resolvedHead.title = updatedHead.title;
    mergeArray(resolvedHead.meta, updatedHead.meta);
    mergeArray(resolvedHead.links, updatedHead.links);
    mergeArray(resolvedHead.styles, updatedHead.styles);
    mergeArray(resolvedHead.scripts, updatedHead.scripts);
    Object.assign(resolvedHead.frontmatter, updatedHead.frontmatter);
};
const mergeArray = (existingArr, newArr)=>{
    if (Array.isArray(newArr)) for (const newItem of newArr){
        if (typeof newItem.key === "string") {
            const existingIndex = existingArr.findIndex((i)=>i.key === newItem.key);
            if (existingIndex > -1) {
                existingArr[existingIndex] = newItem;
                continue;
            }
        }
        existingArr.push(newItem);
    }
};
const createDocumentHead = ()=>({
        title: "",
        meta: [],
        links: [],
        styles: [],
        scripts: [],
        frontmatter: {}
    });
const useDocumentHead = ()=>useContext(DocumentHeadContext);
const useLocation = ()=>useContext(RouteLocationContext);
const useQwikCityEnv = ()=>noSerialize(useServerData("qwikcity"));
const preventNav = {};
const internalState = {
    navCount: 0
};
const QwikCityProvider_component_useStyles_VznOHZdEk8Q = `:root{view-transition-name:none}`;
const QwikCityProvider_component_registerPreventNav_FINlghoSh1g = (fn$)=>{
    return;
};
const QwikCityProvider_component_goto_sUUKfO6xwI8 = async (path, opt)=>{
    const [actionState, navResolver, routeInternal, routeLocation] = useLexicalScope();
    const { type = "link", forceReload = path === void 0, replaceState = false, scroll = true } = typeof opt === "object" ? opt : {
        forceReload: opt
    };
    internalState.navCount++;
    const lastDest = routeInternal.value.dest;
    const dest = path === void 0 ? lastDest : typeof path === "number" ? path : toUrl(path, routeLocation.url);
    if (preventNav.$cbs$ && (forceReload || typeof dest === "number" || !isSamePath(dest, lastDest) || !isSameOrigin(dest, lastDest))) {
        const ourNavId = internalState.navCount;
        const prevents = await Promise.all([
            ...preventNav.$cbs$.values()
        ].map((cb)=>cb(dest)));
        if (ourNavId !== internalState.navCount || prevents.some(Boolean)) {
            if (ourNavId === internalState.navCount && type === "popstate") history.pushState(null, "", lastDest);
            return;
        }
    }
    if (typeof dest === "number") return;
    if (!isSameOrigin(dest, lastDest)) return;
    if (!forceReload && isSamePath(dest, lastDest)) {
        if (dest.href !== routeLocation.url.href) {
            const newUrl = new URL(dest.href);
            routeInternal.value.dest = newUrl;
            routeLocation.url = newUrl;
        }
        return;
    }
    routeInternal.value = {
        type,
        dest,
        forceReload,
        replaceState,
        scroll
    };
    actionState.value = void 0;
    routeLocation.isNavigating = true;
    return new Promise((resolve)=>{
        navResolver.r = resolve;
    });
};
const QwikCityProvider_component_useTask_Bpj0aEL7jPU = ({ track })=>{
    const [actionState, content, contentInternal, documentHead, env, goto, loaderState, navResolver, props, routeInternal, routeLocation] = useLexicalScope();
    async function run() {
        const navigation = track(routeInternal);
        const action = track(actionState);
        const locale = getLocale("");
        const prevUrl = routeLocation.url;
        const navType = action ? "form" : navigation.type;
        navigation.replaceState;
        let trackUrl;
        let clientPageData;
        let loadedRoute = null;
        trackUrl = new URL(navigation.dest, routeLocation.url);
        loadedRoute = env.loadedRoute;
        clientPageData = env.response;
        if (loadedRoute) {
            const [routeName, params, mods, menu] = loadedRoute;
            const contentModules = mods;
            const pageModule = contentModules[contentModules.length - 1];
            if (navigation.dest.search && !!isSamePath(trackUrl, prevUrl)) trackUrl.search = navigation.dest.search;
            if (!isSamePath(trackUrl, prevUrl)) routeLocation.prevUrl = prevUrl;
            routeLocation.url = trackUrl;
            routeLocation.params = {
                ...params
            };
            routeInternal.untrackedValue = {
                type: navType,
                dest: trackUrl
            };
            const resolvedHead = resolveHead(clientPageData, routeLocation, contentModules, locale);
            content.headings = pageModule.headings;
            content.menu = menu;
            contentInternal.value = noSerialize(contentModules);
            documentHead.links = resolvedHead.links;
            documentHead.meta = resolvedHead.meta;
            documentHead.styles = resolvedHead.styles;
            documentHead.scripts = resolvedHead.scripts;
            documentHead.title = resolvedHead.title;
            documentHead.frontmatter = resolvedHead.frontmatter;
        }
    }
    const promise = run();
    return promise;
};
const QwikCityProvider_component_pAiKSkZKJv0 = (props)=>{
    useStylesQrl(/*#__PURE__*/ inlinedQrlDEV(QwikCityProvider_component_useStyles_VznOHZdEk8Q, "QwikCityProvider_component_useStyles_VznOHZdEk8Q", {
        file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
        lo: 23879,
        hi: 23913,
        displayName: "index.qwik.mjs_QwikCityProvider_component_useStyles"
    }));
    const env = useQwikCityEnv();
    if (!env?.params) throw new Error(`Missing Qwik City Env Data for help visit https://github.com/QwikDev/qwik/issues/6237`);
    const urlEnv = useServerData("url");
    if (!urlEnv) throw new Error(`Missing Qwik URL Env Data`);
    if (env.ev.originalUrl.pathname !== env.ev.url.pathname && true) throw new Error(`enableRequestRewrite is an experimental feature and is not enabled. Please enable the feature flag by adding \`experimental: ["enableRequestRewrite"]\` to your qwikVite plugin options.`);
    const url = new URL(urlEnv);
    const routeLocation = useStore({
        url,
        params: env.params,
        isNavigating: false,
        prevUrl: void 0
    }, {
        deep: false
    });
    const navResolver = {};
    const loaderState = _weakSerialize(useStore(env.response.loaders, {
        deep: false
    }));
    const routeInternal = useSignal({
        type: "initial",
        dest: url,
        forceReload: false,
        replaceState: false,
        scroll: true
    });
    const documentHead = useStore(createDocumentHead);
    const content = useStore({
        headings: void 0,
        menu: void 0
    });
    const contentInternal = useSignal();
    const currentActionId = env.response.action;
    const currentAction = currentActionId ? env.response.loaders[currentActionId] : void 0;
    const actionState = useSignal(currentAction ? {
        id: currentActionId,
        data: env.response.formData,
        output: {
            result: currentAction,
            status: env.response.status
        }
    } : void 0);
    const registerPreventNav = /*#__PURE__*/ inlinedQrlDEV(QwikCityProvider_component_registerPreventNav_FINlghoSh1g, "QwikCityProvider_component_registerPreventNav_FINlghoSh1g", {
        file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
        lo: 25482,
        hi: 26359,
        displayName: "index.qwik.mjs_QwikCityProvider_component_registerPreventNav"
    });
    const goto = /*#__PURE__*/ inlinedQrlDEV(QwikCityProvider_component_goto_sUUKfO6xwI8, "QwikCityProvider_component_goto_sUUKfO6xwI8", {
        file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
        lo: 26379,
        hi: 28842,
        displayName: "index.qwik.mjs_QwikCityProvider_component_goto"
    }, [
        actionState,
        navResolver,
        routeInternal,
        routeLocation
    ]);
    useContextProvider(ContentContext, content);
    useContextProvider(ContentInternalContext, contentInternal);
    useContextProvider(DocumentHeadContext, documentHead);
    useContextProvider(RouteLocationContext, routeLocation);
    useContextProvider(RouteNavigateContext, goto);
    useContextProvider(RouteStateContext, loaderState);
    useContextProvider(RouteActionContext, actionState);
    useContextProvider(RoutePreventNavigateContext, registerPreventNav);
    useTaskQrl(/*#__PURE__*/ inlinedQrlDEV(QwikCityProvider_component_useTask_Bpj0aEL7jPU, "QwikCityProvider_component_useTask_Bpj0aEL7jPU", {
        file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
        lo: 29312,
        hi: 38816,
        displayName: "index.qwik.mjs_QwikCityProvider_component_useTask"
    }, [
        actionState,
        content,
        contentInternal,
        documentHead,
        env,
        goto,
        loaderState,
        navResolver,
        props,
        routeInternal,
        routeLocation
    ]));
    return /* @__PURE__ */ _jsxC(Slot, null, 3, "3H_3", {
        fileName: "../node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
        lineNumber: 1085,
        columnNumber: 26
    });
};
const QwikCityProvider = /*#__PURE__*/ componentQrl(/*#__PURE__*/ inlinedQrlDEV(QwikCityProvider_component_pAiKSkZKJv0, "QwikCityProvider_component_pAiKSkZKJv0", {
    file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
    lo: 23853,
    hi: 38862,
    displayName: "index.qwik.mjs_QwikCityProvider_component"
}));
const ServiceWorkerRegister = (props)=>/* @__PURE__ */ _jsxQ("script", {
        nonce: _wrapSignal(props, "nonce")
    }, {
        type: "module",
        dangerouslySetInnerHTML: swRegister
    }, null, 3, "3H_7", {
        fileName: "../node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
        lineNumber: 1242,
        columnNumber: 58
    });
const deepFreeze = (obj)=>{
    Object.getOwnPropertyNames(obj).forEach((prop)=>{
        const value = obj[prop];
        if (value && typeof value === "object" && !Object.isFrozen(value)) deepFreeze(value);
    });
    return Object.freeze(obj);
};
const serverQrl_rpc_8mZOKSamNzU = async function(...args) {
    const [fetchOptions, headers, method, origin, qrl] = useLexicalScope();
    args.length > 0 && args[0] instanceof AbortSignal && args.shift();
    {
        let requestEvent = globalThis.qcAsyncRequestStore?.getStore();
        if (!requestEvent) {
            const contexts = [
                useQwikCityEnv()?.ev,
                this,
                _getContextEvent()
            ];
            requestEvent = contexts.find((v2)=>v2 && Object.prototype.hasOwnProperty.call(v2, "sharedMap") && Object.prototype.hasOwnProperty.call(v2, "cookie"));
        }
        return qrl.apply(requestEvent, deepFreeze(args));
    }
};
const serverQrl = (qrl, options)=>{
    {
        const captured = qrl.getCaptured();
        if (captured && captured.length > 0 && !_getContextElement()) throw new Error("For security reasons, we cannot serialize QRLs that capture lexical scope.");
    }
    const method = options?.method?.toUpperCase?.() || "POST";
    const headers = options?.headers || {};
    const origin = options?.origin || "";
    const fetchOptions = options?.fetchOptions || {};
    function rpc() {
        return /*#__PURE__*/ inlinedQrlDEV(serverQrl_rpc_8mZOKSamNzU, "serverQrl_rpc_8mZOKSamNzU", {
            file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/node_modules/@builder.io/qwik-city/lib/index.qwik.mjs",
            lo: 54345,
            hi: 57419,
            displayName: "index.qwik.mjs_serverQrl_rpc"
        }, [
            fetchOptions,
            headers,
            method,
            origin,
            qrl
        ]);
    }
    return rpc();
};

const links$1 = [{"key":"/favicon.ico","rel":"icon","href":"/favicon.ico","sizes":"48x48"},{"key":"/favicon.svg","rel":"icon","href":"/favicon.svg","sizes":"any","type":"image/svg+xml"},{"key":"/apple-touch-icon-180x180.png","rel":"apple-touch-icon","href":"/apple-touch-icon-180x180.png"}];
const meta$1 = [{"key":"theme-color","content":"#04E6E6","name":"theme-color"}];

const meta = meta$1;
const links = links$1;

const RouterHead_component_BQNqHvlQ7Hs = () => {
  const head = useDocumentHead();
  const loc = useLocation();
  return /* @__PURE__ */ _jsxC(Fragment, {
    children: [
      /* @__PURE__ */ _jsxQ("title", null, null, head.title, 1, null, {
        fileName: "components/router-head/router-head.tsx",
        lineNumber: 15,
        columnNumber: 7
      }),
      /* @__PURE__ */ _jsxQ("link", null, {
        rel: "canonical",
        href: _fnSignal((p0) => p0.url.href, [
          loc
        ], "p0.url.href")
      }, null, 3, null, {
        fileName: "components/router-head/router-head.tsx",
        lineNumber: 16,
        columnNumber: 7
      }),
      /* @__PURE__ */ _jsxQ("meta", null, {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0"
      }, null, 3, null, {
        fileName: "components/router-head/router-head.tsx",
        lineNumber: 17,
        columnNumber: 7
      }),
      head.meta.map((m) => /* @__PURE__ */ _jsxS("meta", {
        ...m
      }, null, 0, m.key, {
        fileName: "components/router-head/router-head.tsx",
        lineNumber: 19,
        columnNumber: 9
      })),
      meta.map((m) => /* @__PURE__ */ _jsxS("meta", {
        ...m
      }, null, 0, m.key, {
        fileName: "components/router-head/router-head.tsx",
        lineNumber: 22,
        columnNumber: 9
      })),
      links.map((l) => /* @__PURE__ */ _jsxS("link", {
        ...l
      }, null, 0, l.key, {
        fileName: "components/router-head/router-head.tsx",
        lineNumber: 25,
        columnNumber: 9
      })),
      head.links.map((l) => /* @__PURE__ */ _jsxS("link", {
        ...l
      }, null, 0, l.key, {
        fileName: "components/router-head/router-head.tsx",
        lineNumber: 28,
        columnNumber: 9
      })),
      head.styles.map((s) => {
        const { dangerouslySetInnerHTML: _ignoreStyle, ...rest } = s.props || {};
        return /* @__PURE__ */ _jsxS("style", {
          ...rest,
          get dangerouslySetInnerHTML() {
            return s.style;
          },
          dangerouslySetInnerHTML: _wrapSignal(s, "style")
        }, null, 0, s.key, {
          fileName: "components/router-head/router-head.tsx",
          lineNumber: 32,
          columnNumber: 16
        });
      }),
      head.scripts.map((s) => {
        const { dangerouslySetInnerHTML: _ignoreScript, ...rest } = s.props || {};
        return /* @__PURE__ */ _jsxS("script", {
          ...rest,
          get dangerouslySetInnerHTML() {
            return s.script;
          },
          dangerouslySetInnerHTML: _wrapSignal(s, "script")
        }, null, 0, s.key, {
          fileName: "components/router-head/router-head.tsx",
          lineNumber: 36,
          columnNumber: 16
        });
      })
    ]
  }, 1, "Hm_0", {
    fileName: "components/router-head/router-head.tsx",
    lineNumber: 14,
    columnNumber: 5
  });
};
const RouterHead = /* @__PURE__ */ componentQrl(/* @__PURE__ */ inlinedQrlDEV(RouterHead_component_BQNqHvlQ7Hs, "RouterHead_component_BQNqHvlQ7Hs", {
  file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/src/components/router-head/router-head.tsx",
  lo: 290,
  hi: 1336,
  displayName: "router-head.tsx_RouterHead_component"
}));

const SpeakContext = createContextId("qwik-speak");
const _speakServerContext = {
    translation: {},
    config: {}
};
const getSpeakContext = ()=>{
    return _speakServerContext;
};
const setSpeakServerContext = (config)=>{
    {
        const { config: _config } = getSpeakContext();
        Object.assign(_config, config);
    }
};

/**
 * @license
 * Qwik Speak
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/robisim74/qwik-speak/blob/main/LICENSE
 */ const logWarn = (message)=>{
    console.warn("\x1B[33mQwik Speak warn\x1B[0m %s", message);
};
const logDebug = (enabled, message)=>{
    if (enabled) console.debug("\x1B[36mQwik Speak\x1B[0m %s", message);
};
const logDebugInline = (enabled, ...data)=>{
    if (enabled) console.debug("%cQwik Speak Inline", "background: #0c75d2; color: white; padding: 2px 3px; border-radius: 2px; font-size: 0.8em;", ...data);
};

const loadTranslations = async (ctx, assets, runtimeAssets, langs)=>{
    {
        const { locale, translation, translationFn, config } = ctx;
        const { translation: _translation } = getSpeakContext();
        {
            const conflictingAsset = assets?.find((asset)=>runtimeAssets?.includes(asset)) || assets?.find((asset)=>config.runtimeAssets?.includes(asset)) || runtimeAssets?.find((asset)=>config.assets?.includes(asset));
            if (conflictingAsset) logWarn(`Conflict between assets and runtimeAssets '${conflictingAsset}'`);
        }
        let resolvedAssets;
        resolvedAssets = [
            ...assets ?? [],
            ...runtimeAssets ?? []
        ];
        if (resolvedAssets.length === 0) return;
        const resolvedLangs = new Set(langs || []);
        resolvedLangs.add(locale.lang);
        for (const lang of resolvedLangs){
            let tasks;
            tasks = resolvedAssets.map((asset)=>translationFn.loadTranslation$(lang, asset));
            const sources = await Promise.all(tasks);
            const assetSources = sources.map((source, i)=>({
                    asset: resolvedAssets[i],
                    source
                }));
            if (!(lang in _translation)) Object.assign(_translation, {
                [lang]: {}
            });
            for (const data of assetSources)if (data?.source) {
                if (assets?.includes(data.asset)) Object.assign(_translation[lang], data.source);
                else {
                    Object.assign(_translation[lang], data.source);
                    Object.assign(translation[lang], data.source);
                }
            }
        }
    }
};

/**
 * @license
 * Qwik Speak
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/robisim74/qwik-speak/blob/main/LICENSE
 */
const useQwikSpeak_resolvedTranslationFn_T9Fy9UxepgA = () => null;
const useQwikSpeak_useTask_0fwIeNJbECQ = async () => {
  const [config2, props2, state2] = useLexicalScope();
  await loadTranslations(state2, config2.assets, config2.runtimeAssets, props2.langs);
};
const useQwikSpeak_resumeContext_6bH92HveK8o = () => {
  const [resolvedConfig2, state2] = useLexicalScope();
  const { locale, translation, config: config2 } = state2;
  {
    const _speakContext = getSpeakContext();
    logDebugInline(resolvedConfig2.showDebugMessagesLocally, "Client context", _speakContext);
  }
};
const useQwikSpeak = (props) => {
  const lang = getLocale("");
  const resolvedConfig = {
    rewriteRoutes: props.config.rewriteRoutes,
    defaultLocale: props.config.defaultLocale,
    supportedLocales: props.config.supportedLocales,
    assets: props.config.assets,
    runtimeAssets: props.config.runtimeAssets,
    keySeparator: props.config.keySeparator || ".",
    keyValueSeparator: props.config.keyValueSeparator || "@@",
    domainBasedRouting: props.config.domainBasedRouting,
    showDebugMessagesLocally: props.config.showDebugMessagesLocally ?? true
  };
  let resolvedLocale = resolvedConfig.supportedLocales.find((value) => value.lang === lang);
  if (!resolvedLocale) {
    resolvedLocale = resolvedConfig.defaultLocale;
    logWarn(`Locale not resolved. Fallback to default locale: ${resolvedConfig.defaultLocale.lang}`);
  } else logDebug(resolvedConfig.showDebugMessagesLocally, `Resolved locale: ${resolvedLocale.lang}`);
  if (props.currency) resolvedLocale.currency = props.currency;
  if (props.timeZone) resolvedLocale.timeZone = props.timeZone;
  const resolvedTranslationFn = {
    loadTranslation$: props.translationFn?.loadTranslation$ ?? /* @__PURE__ */ inlinedQrlDEV(useQwikSpeak_resolvedTranslationFn_T9Fy9UxepgA, "useQwikSpeak_resolvedTranslationFn_T9Fy9UxepgA", {
      file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/node_modules/qwik-speak/lib/use-qwik-speak.qwik.mjs",
      lo: 1890,
      hi: 1900,
      displayName: "use-qwik-speak.qwik.mjs_useQwikSpeak_resolvedTranslationFn"
    })
  };
  const state = {
    locale: Object.assign({}, resolvedLocale),
    translation: Object.fromEntries(resolvedConfig.supportedLocales.map((value) => [
      value.lang,
      {}
    ])),
    config: Object.assign({}, resolvedConfig),
    translationFn: resolvedTranslationFn
  };
  const { config } = state;
  setSpeakServerContext(config);
  useContextProvider(SpeakContext, state);
  useTaskQrl(/* @__PURE__ */ inlinedQrlDEV(useQwikSpeak_useTask_0fwIeNJbECQ, "useQwikSpeak_useTask_0fwIeNJbECQ", {
    file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/node_modules/qwik-speak/lib/use-qwik-speak.qwik.mjs",
    lo: 2440,
    hi: 2623,
    displayName: "use-qwik-speak.qwik.mjs_useQwikSpeak_useTask"
  }, [
    config,
    props,
    state
  ]));
  const resumeContext$ = /* @__PURE__ */ inlinedQrlDEV(useQwikSpeak_resumeContext_6bH92HveK8o, "useQwikSpeak_resumeContext_6bH92HveK8o", {
    file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/node_modules/qwik-speak/lib/use-qwik-speak.qwik.mjs",
    lo: 2755,
    hi: 3369,
    displayName: "use-qwik-speak.qwik.mjs_useQwikSpeak_resumeContext"
  }, [
    resolvedConfig,
    state
  ]);
  useOnWindow("load", resumeContext$);
};

const useSpeakLocale = ()=>useContext(SpeakContext).locale;

const config = {
  defaultLocale: {
    lang: "en-US",
    currency: "USD",
    timeZone: "America/Los_Angeles"
  },
  supportedLocales: [
    {
      lang: "en-US",
      currency: "USD",
      timeZone: "America/Los_Angeles"
    },
    {
      lang: "es-ES",
      currency: "EUR",
      timeZone: "Europe/Madrid"
    }
  ],
  assets: [
    "app",
    "dashboard",
    "tokenPage",
    "home",
    "mint",
    "tutorial",
    "swapPage",
    "profile",
    "myNfts",
    "allNfts",
    "nftDetails"
  ],
  // runtimeAssets enables client-side translation loading during SPA navigation
  runtimeAssets: [
    "app",
    "dashboard",
    "tokenPage",
    "home",
    "mint",
    "tutorial",
    "swapPage",
    "profile",
    "myNfts",
    "allNfts",
    "nftDetails"
  ]
};

const en = {
  app: {
    brand: "KNRT Property",
    brandHub: "KNRT Property Hub",
    title: "KNRT App",
    header: {
      marketplace: "Marketplace",
      myNfts: "My Properties",
      profile: "Profile",
      tutorial: "Tutorial",
      docs: "Docs",
      demoMode: "Demo Mode",
      connect: "Connect",
      wrongNetwork: "Wrong Network. Switch to Base.",
      actions: "Actions",
      mintNft: "Mint NFT",
      mintNftDesc: "Create new NFT",
      swap: "Swap",
      swapDesc: "Swap KNRT tokens",
      newErc20: "New Token",
      newErc20Desc: "Deploy ERC20 token",
      menu: "Menu",
      connecting: "Connecting...",
      switch: "Switch",
      walletMenuTitle: "Account",
      walletMenuSubtitle: "Profile, notification settings, or sign out and disconnect your wallet.",
      walletMenuProfile: "Profile & settings",
      walletMenuNotifications: "Notification settings",
      walletMenuDisconnect: "Sign out & disconnect wallet",
      walletMenuClose: "Close"
    },
    footer: {
      product: "Product",
      resources: "Resources",
      privacy: "Privacy",
      terms: "Terms",
      rights: "All rights reserved.",
      description: "A flexible ecosystem to manage NFT-based properties, sales, rentals and power delegation.",
      ecosystem: "Ecosystem",
      base: "Base Network",
      chainlink: "Chainlink",
      graph: "The Graph",
      blog: "Blog",
      /** Crypto Helper chrome (header / footer) */
      cryptoBrand: "Crypto Helper",
      homeNav: "Home",
      dashboardNav: "Dashboard",
      loginNav: "Login",
      registerNav: "Register",
      copyAddressAria: "Copy wallet address",
      walletShort: "Wallet",
      cryptoTagline: "Markets, SSE signals and wallets — Qwik, Turso and Moralis in one panel.",
      appNavSection: "App",
      apiNavSection: "API",
      healthLink: "Health",
      rightsReserved: "All rights reserved."
    },
    aiFab: {
      teaserTitle: "Hey there!",
      teaserBody: "Questions about markets or the dashboard? Ask the AI assistant (Pro).",
      teaserYes: "Yes",
      teaserNo: "Not now",
      fabAria: "Open AI assistant",
      panelTitle: "Assistant",
      panelSubtitle: "Crypto Helper · DB insight",
      questionLabel: "Question",
      answerLabel: "Answer",
      placeholder: "Ask about market data, signals, sync…",
      send: "Send",
      thinking: "Thinking…",
      signInLine: "Sign in to use the assistant and Pro features.",
      proLine: "DB insight is a Pro feature. Upgrade to ask the AI about aggregated data.",
      openFullPage: "Open full DB insight page",
      close: "Close"
    },
    proUpgrade: {
      nav: "Upgrade Pro",
      title: "Upgrade to Pro",
      subtitle: "5 USDT · one-time · pick your network",
      network: "Network",
      body: "Send exactly 5 USDT on the selected network to the treasury. Pro unlocks after we confirm the transfer.",
      bscDecimals: "BNB Chain uses 18-decimal USDT — the amount is still exactly 5 USDT.",
      usdtDecimals: "USDT uses 6 decimals on this network.",
      badChain: "Select a supported network.",
      needSwitch: "Approve the network switch in your wallet, then try again.",
      recipient: "Recipient",
      copy: "Copy address",
      payWallet: "Pay with connected wallet",
      or: "or",
      manualHash: "Transaction hash",
      verify: "Verify payment",
      close: "Close",
      verifyFail: "Could not verify payment.",
      networkError: "Network error. Try again.",
      needWallet: "Connect your wallet first.",
      needBase: "Switch to Base, then try again.",
      noClient: "Wallet not ready. Reconnect.",
      txFail: "Transaction failed.",
      badHash: "Enter a valid transaction hash (0x…).",
      note: "The sending wallet must match your account wallet. Choose the same network you used for the transfer when verifying.",
      /** Short explorer-facing nuance for the USDT contract we verify (not legal advice). */
      usdtExplorerHints: {
        eth: "Native Ethereum USDT from Tether (6 decimals). Listed on Tether's public supported-protocols page.",
        base: "Explorers often show “Bridged Tether USD” on Base (6 decimals): a bridged token, not minted directly on Base by Tether.",
        arbitrum: "Explorers may label this USD₮0 / USDT0; this is the standard Arbitrum One USDT in wide use (6 decimals).",
        bnb: "Often shown as Binance-Peg BSC-USD (18 decimals). This is the contract the market treats as USDT on BNB—it is not the same as Tether's native-chain listings elsewhere.",
        polygon: "PoS-bridged USDT; explorers may show USDT0 (6 decimals).",
        optimism: "Bridged USDT on Optimism (6 decimals).",
        avalanche: "Official Avalanche C-Chain USDT published by Tether (6 decimals). Do not use legacy USDT.e (e.g. 0xc719…) — that is a different token."
      }
    }
  },
  dashboard: {
    brand: "Crypto Helper",
    subtitle: "Dashboard · market & on-chain",
    subtitleDebug: "Dashboard · Turso + CMC + Moralis",
    chainLabel: "Chain",
    chainAria: "Chain: EVM or Solana",
    evm: "EVM",
    solana: "Solana",
    sidebarExpand: "Expand sidebar",
    sidebarCollapse: "Collapse sidebar",
    overview: "Overview",
    cryptoBubbles: "Crypto bubbles",
    tokens: "Tokens",
    tokensCollapsedTitle: "Tokens · Top volume",
    topVolume: "Top volume",
    trending: "Trending",
    newListings: "New listings",
    meme: "Meme",
    aiBigData: "AI & big data",
    gaming: "Gaming",
    mineable: "Mineable",
    mostVisited: "Most visited",
    allTokens: "All tokens",
    traders: "Traders",
    tradersCollapsedTitle: "Traders · Most profitable",
    mostProfitable: "Most profitable",
    bySwaps: "By swaps (Icarus)",
    topWhales: "Top whales (watchlist)",
    nfts: "NFTs",
    block: "Block",
    signalNotifications: "Signal notifications",
    push: "Push",
    dbInsight: "DB insight",
    liveSignals: "Live signals",
    liveSignalsProSuffix: "· Pro",
    smartMoney: "Smart money",
    whaleAlerts: "Whale alerts",
    usdtSmart: "USDT smart alerts",
    sse: "SSE",
    proOnlyTitle: "Pro subscribers only — see plans on Overview",
    solanaMoralisTitle: "Solana · Moralis",
    solanaOverview: "Overview",
    walletApi: "Wallet API",
    nativeBalance: "Native balance",
    portfolio: "Portfolio",
    tokenBalances: "Token balances",
    nftBalances: "NFT balances",
    swaps: "Swaps",
    tokenApi: "Token API",
    metadataInfo: "Metadata & info",
    prices: "Prices",
    holders: "Holders",
    swapsPairs: "Swaps & pairs",
    marketMetrics: "Market metrics",
    searchDiscovery: "Search & discovery",
    advancedSignals: "Advanced signals",
    nftApi: "NFT API",
    priceApi: "Price API",
    tokenPrice: "Token price",
    tokenPriceBatch: "Token price (batch)",
    priceChartsNote: "Charts (TradingView)"
  },
  tokenPage: {
    backToLeft: "← Back to ",
    backToRight: " list",
    price: "Price",
    volume: "Volume",
    fdv: "FDV",
    turso: "Turso",
    contract: "Contract",
    decimalsShort: "dec",
    supply: "supply",
    syncApiWarnings: "Sync / API notices",
    expand: "expand",
    collapse: "collapse",
    priceChart: "Price chart",
    chartHintDex: "On-chain chart by default (Dexscreener). CEX tab for TradingView — first pair ",
    chartHintTv: "TradingView · first pair ",
    chartHintSuffix: " — switch CEX pair if it does not load.",
    tabTransfers: "Transfers",
    tabHolders: "Holders (snapshot)",
    tabTraders: "Top traders / PnL (snapshot)",
    tabSwaps: "DEX swaps (snapshot)",
    recentTransfers: "Recent transfers",
    snapshotMoralis: "Moralis snapshot · chain",
    colTx: "Tx",
    colFrom: "From",
    colTo: "To",
    colValue: "Value",
    noTransfersSnapshot: "No recent transfers in the snapshot.",
    topTradersPnl: "Top traders (PnL)",
    swapsDex: "DEX swaps",
    syncFooter: "CMC and Moralis data loaded from Turso (daily job). Refresh via scheduled or manual sync. Token id:",
    categories: {
      memes: "Meme",
      "ai-big-data": "AI & data",
      gaming: "Gaming",
      mineable: "Mineable",
      volume: "Top volume",
      trending: "Trending",
      "most-visited": "Most visited",
      earlybird: "New listings"
    }
  },
  home: {
    cryptoHelper: {
      meta: {
        title: "Crypto Helper — Markets, signals & on-chain intelligence",
        description: "CoinMarketCap markets in Turso, live whale and trader signals (SSE), bubbles, watchlists, Moralis wallet and token data, Solana and EVM dashboards. Built with Qwik."
      },
      badge: "Crypto Helper · blazing fast · Qwik",
      hero: {
        line1: "Your crypto command center,",
        line2: "clear and fast.",
        lead: "One app: daily market snapshots from CoinMarketCap, whale and smart-money streams via Moralis, interactive bubbles, trader watchlists and wallet analytics — fluid navigation with View Transitions."
      },
      cta: {
        register: "Create account",
        login: "Sign in / wallet",
        dashboard: "Open dashboard"
      },
      stats: {
        signals: {
          label: "Signals",
          value: "SSE + database"
        },
        markets: {
          label: "Markets",
          value: "CMC → Turso"
        },
        onchain: {
          label: "On-chain",
          value: "Moralis · Icarus"
        }
      },
      modulesSection: {
        title: "Everything essential, one click away",
        subtitle: "Each card opens inside the dashboard. The same shell keeps your place while you explore modules."
      },
      modules: {
        markets: {
          title: "Markets (CMC)",
          desc: "Volume leaders, trending, new listings and verticals (meme, AI, gaming…) — synced into Turso for fast loads.",
          tag: "CMC → Turso"
        },
        whales: {
          title: "Whale alerts",
          desc: "Near–real-time streams from Moralis webhooks; history persisted so you can review past moves.",
          tag: "SSE"
        },
        smart: {
          title: "Smart money & traders",
          desc: "Trader-focused feeds and patterns surfaced next to the rest of your dashboard.",
          tag: "Live"
        },
        watchlist: {
          title: "Watchlist & wallets",
          desc: "Follow addresses with profitability, net worth and cached Moralis snapshots.",
          tag: "Moralis"
        },
        nfts: {
          title: "NFT heatmaps",
          desc: "Trending collections and market signals from Moralis market data.",
          tag: "NFT"
        },
        usdt: {
          title: "Smart USDT signals",
          desc: "Optional on-chain watcher plus stored signals — tune alerts in settings.",
          tag: "Watcher"
        }
      },
      open: "Open",
      stackSection: {
        title: "Fast by design",
        subtitle: "Qwik keeps interactions instant — less JavaScript on the wire, more time for your charts."
      },
      stack: {
        blazing: {
          title: "Blazing fast loads",
          desc: "Optimized bundles and smart loading so the UI becomes interactive quickly — it feels snappy from the first click."
        },
        resumable: {
          title: "Resumable & efficient",
          desc: "Qwik can pause and resume work across navigations, so you spend less time waiting and more time exploring markets."
        },
        fluid: {
          title: "Smooth, app-like flow",
          desc: "Route changes and view transitions stay fluid — the dashboard shell stays put while you jump between modules."
        }
      },
      proSection: {
        title: "Pro",
        desc: "DB insight, live SSE areas, smart alerts and more. Upgrade with USDT (multiple chains) after sign-in.",
        note: "Use email/password or connect a wallet — both work with the same account model."
      },
      pwa: {
        title: "Install Crypto Helper",
        body: "Add the PWA from the browser: small footprint, updates with the site. On Android/Chrome you get a one-tap install; on iPhone, use Add to Home Screen (needed for some push features on iOS).",
        install: "Install now",
        hint: "Android: system dialog. iPhone: follow Safari steps."
      },
      marketplace: {
        kicker: "Also in this app",
        title: "Marketplace, mint & KNRT tools",
        body: "The global header still links to the KNRT marketplace and legacy flows. This landing focuses on the Crypto Helper analytics product.",
        link: "Go to marketplace"
      }
    },
    hero: {
      title: "KNRT Property",
      subtitle: "Tokenized Real World Assets",
      description: "The definitive platform to tokenize, trade, and manage real-world assets on the Base blockchain.",
      cta: "Explore Marketplace",
      stats: {
        tvl: "Total Value Locked",
        tvlValue: "$4.2M+",
        assets: "Tokenized Assets",
        assetsValue: "1,250+",
        users: "Active Users",
        usersValue: "8.5K+"
      }
    },
    features: {
      title: "Why choose KNRT?",
      security: {
        title: "Security First",
        desc: "Audited smart contracts and rigorous verification processes."
      },
      transparency: {
        title: "Full Transparency",
        desc: "All transactions and ownership records are on-chain."
      },
      liquidity: {
        title: "Instant Liquidity",
        desc: "Trade your assets 24/7 on our decentralized marketplace."
      }
    },
    contracts: {
      title: "Smart Contracts",
      subtitle: "Security-first architecture to manage NFT properties with KNRT tokens",
      realEstate: {
        title: "RealEstateMarketplace",
        desc: "Primary marketplace for buying and selling NFT properties",
        capabilities: {
          title: "Capabilities",
          list: "List NFT properties with KNRT pricing",
          escrow: "Automatic escrow of the NFT while it is listed",
          update: "Sellers can update or cancel listings at any time"
        },
        events: {
          title: "Contract events",
          listed: "PropertyListed",
          sold: "PropertySold",
          updated: "ListingUpdated",
          cancelled: "ListingCancelled"
        }
      },
      rental: {
        title: "PropertyRentalManager",
        desc: "Manage time-bound rentals",
        capabilities: {
          pricing: "Monthly KNRT pricing with clear duration windows",
          agreements: "Automated rental agreements",
          payments: "Monthly payments plus term or mutual termination"
        },
        events: {
          title: "Contract events",
          listed: "PropertyListed",
          rented: "PropertyRented",
          paid: "RentPaid",
          ended: "RentalEnded",
          mutual: "MutualEnd"
        }
      },
      power: {
        title: "RightsTransferMarketplace",
        desc: "Temporary rights over NFT properties",
        capabilities: {
          delegate: "Delegate temporary control of NFTs",
          refund: "Early return with KNRT refund",
          expiration: "Automatic expiration of delegated rights"
        },
        events: {
          title: "RightsTransferMarketplace events",
          listed: "RightsListed",
          transferred: "RightsTransferred",
          returned: "RightsReturned",
          expired: "RightsTransferExpired",
          settled: "ExpiredSettled"
        }
      },
      powerRecall: {
        title: "RightsTransfer + Recall",
        desc: "Control with lock and recall guardrails",
        capabilities: {
          lock: "Lock system during the temporary transfer",
          recall: "Owner can recall the asset at any time",
          protection: "Protection against unauthorized transfers"
        },
        events: {
          title: "Contract events",
          base: "Base events + Lock & Recall",
          locked: "NFTLocked",
          recalled: "NFTRecalled"
        }
      },
      security: {
        title: "Security Features",
        subtitle: "Advanced safeguards for the whole ecosystem",
        reentrancy: {
          title: "Reentrancy Guard",
          desc: "Reentrancy protection on every critical function"
        },
        pausable: {
          title: "Pausable",
          desc: "Pause contracts in emergencies or during maintenance"
        },
        access: {
          title: "Access Control",
          desc: "Role-based access control for safe contract administration"
        },
        automation: {
          title: "Chainlink Automation",
          desc: "Automated expirations and payments powered by Chainlink Automation"
        },
        recovery: {
          title: "Fund Recovery",
          desc: "Contracts include fund-recovery functions for token transfer errors so users never lose their KNRT to technical glitches."
        }
      },
      eventsLabels: {
        listed: "PropertyListed",
        sold: "PropertySold",
        updated: "ListingUpdated",
        cancelled: "ListingCancelled",
        rented: "PropertyRented",
        paid: "RentPaid",
        ended: "RentalEnded",
        mutual: "MutualEnd",
        powerListed: "RightsListed",
        transferred: "RightsTransferred",
        returned: "RightsReturned",
        expired: "RightsTransferExpired",
        settled: "ExpiredSettled",
        baseLocked: "Base events + Lock & Recall",
        locked: "NFTLocked",
        recalled: "NFTRecalled"
      }
    },
    contractFeatures: {
      marketplace: {
        label: "Marketplace",
        badge: "Escrow",
        list: "List, buy, update & cancel",
        events: "Events: PropertyListed, PropertySold..."
      },
      rental: {
        badge: "Monthly",
        list: "Listings, agreements, payments",
        events: "Events: PropertyRented, RentPaid..."
      },
      power: {
        badge: "Duration",
        list: "Purchase, early return, expiration",
        events: "Events: PowerListed, PowerTransferred..."
      },
      powerRecall: {
        badge: "Lock",
        list: "Lock/Recall during transfer",
        events: "Base events + Lock & Recall"
      }
    },
    create: "Create your first listing",
    view: "View dashboard",
    dashboard: {
      title: "Dashboard",
      automationActive: "Chainlink Automation active",
      sales: "Sales (24h)",
      trend: "Trend",
      rentals: "Active rentals",
      onTime: "On-time payments",
      power: "Active rights deals",
      expirations: "Expirations (next 7d)",
      salesValue: "38",
      rentalsValue: "127",
      powerValue: "52",
      events: {
        title: "On-chain events",
        last15: "Last 15 min",
        mAgo: "{{count}}m ago",
        days: "{{count}} days",
        soldLog: "0xA1b...93F2 | #721 | 12,500 KNRT",
        paidLog: "0x81e...22A0 | #412 | 900 KNRT",
        transferredLog: "0xF33...aC7B | #118 | {{duration}}",
        cancelledLog: "0x9c2...01De | #532"
      },
      system: {
        status: "System Status",
        operational: "Operational",
        reentrancy: "Reentrancy Guard",
        pause: "Pause Module",
        admin: "Admin Access",
        recovery: "Recovery Module"
      },
      quickActions: {
        title: "Quick Actions",
        sale: "List for sale",
        rental: "List for rental",
        power: "List rights",
        recall: "Recall asset"
      }
    },
    ctaSection: {
      title: "Manage NFT properties with security and total control",
      subtitle: "Combine sales, rentals, and temporary rights in one flow with KNRT payments.",
      create: "Create your first listing",
      view: "View dashboard"
    },
    footer: {
      flexibleStack: "Flexible stack to manage NFT-based properties: sales, rentals, and temporary rights with escrow, lock, and recall mechanics.",
      product: "Product",
      marketplace: "Marketplace",
      rental: "Rental",
      power: "Rights",
      dashboard: "Dashboard",
      resources: "Resources",
      docs: "Docs",
      sdk: "SDK",
      support: "Support",
      status: "Status",
      allRights: "© 2026 KNRT Property. All rights reserved.",
      privacy: "Privacy",
      terms: "Terms"
    },
    modal: {
      list: {
        title: "List NFT property",
        subtitle: "The NFT moves to the escrow contract until it is sold.",
        contractAddress: "Contract address",
        tokenId: "Token ID",
        price: "Price (KNRT)",
        terms: "Terms & conditions",
        escrowEnabled: "Escrow enabled",
        listNow: "List now"
      }
    }
  },
  tutorial: {
    hero: {
      badge: "Official Guide",
      title: "Master the KNRT Ecosystem",
      subtitle: "Learn how to tokenize real-world assets, manage your portfolio, and explore the different templates available for your needs.",
      ctaMint: "Start Minting",
      ctaMarket: "Explore Market"
    },
    steps: {
      title: "How it works",
      subtitle: "Getting started is simple. Our platform handles the complexity of blockchain while you focus on your assets.",
      step1: {
        title: "1. Connect Wallet",
        desc: "Connect your MetaMask or compatible wallet to verify your identity and access your assets on the Base network."
      },
      step2: {
        title: "2. Mint or Trade",
        desc: "Create new tokenized assets using our templates, or trade existing NFTs and tokens in the marketplace."
      },
      step3: {
        title: "3. Manage Portfolio",
        desc: "Track your properties, rent them out, delegating rights, or provide liquidity to earn yield."
      }
    },
    templates: {
      title: "Available Templates",
      subtitle: "Choose from a variety of specialized templates designed for different types of assets, from real estate to IoT data.",
      useTemplate: "Use Template",
      features: {
        erc721: "Standard ERC-721",
        metadata: "Metadata on-chain/IPFS"
      },
      list: {
        iot: {
          name: "IoT Sensor Tokenization",
          desc: "For sensors, gateways and continuous telemetry data.",
          tag: "IoT + Data"
        },
        cells: {
          name: "Tokenized Image (Cells)",
          desc: "Divide a high-res image into tokenizable grid cells.",
          tag: "Map + Image"
        },
        map: {
          name: "Tokenized Map (Leaflet)",
          desc: "Tokenize real-world locations using interactive maps.",
          tag: "Live Map"
        },
        basic: {
          name: "Property (Basic)",
          desc: "Simple residential properties with standard attributes.",
          tag: "Real Estate"
        },
        premium: {
          name: "Property (Premium)",
          desc: "Full property listings with amenities and detailed specs.",
          tag: "Premium"
        },
        membership: {
          name: "Membership / Access",
          desc: "Tokenize access rights, memberships, and loyalty tiers.",
          tag: "General"
        }
      },
      items: {
        iotSensor: {
          name: "IoT Sensor Tokenization",
          desc: "For sensors, gateways and continuous telemetry data.",
          tag: "IoT + Data"
        },
        mapImage: {
          name: "Tokenized Image (Cells)",
          desc: "Divide a high-res image into tokenizable grid cells.",
          tag: "Map + Image"
        },
        liveMap: {
          name: "Tokenized Map (Leaflet)",
          desc: "Tokenize real-world locations using interactive maps.",
          tag: "Live Map"
        },
        realEstate: {
          name: "Property (Basic)",
          desc: "Simple residential properties with standard attributes.",
          tag: "Real Estate"
        },
        realEstatePremium: {
          name: "Property (Premium)",
          desc: "Full property listings with amenities and detailed specs.",
          tag: "Premium"
        },
        membership: {
          name: "Membership / Access",
          desc: "Tokenize access rights, memberships, and loyalty tiers.",
          tag: "General"
        },
        artwork: {
          name: "Artwork / Collection",
          desc: "For digital art, numbered editions and collections.",
          tag: "Art"
        },
        character: {
          name: "Game Character",
          desc: "RPG stats, rarity and power levels.",
          tag: "Gaming"
        }
      },
      attributes: {
        sensorId: "Sensor ID",
        sensorType: "Sensor Type",
        unit: "Unit",
        lastReading: "Last Reading",
        readingTimestamp: "Reading Timestamp",
        status: "Status",
        plot: "Plot",
        provider: "Provider",
        samplingFrequency: "Sampling Frequency",
        battery: "Battery",
        rssi: "RSSI",
        firmware: "Firmware",
        gatewayId: "Gateway ID",
        network: "Network",
        crop: "Crop",
        minThreshold: "Min Threshold",
        maxThreshold: "Max Threshold",
        sla: "SLA",
        dataLicense: "Data License",
        locationPrivacy: "Location Privacy",
        assetType: "Asset Type",
        area: "Tokenized Area (m²)",
        yield: "Estimated Yield",
        year: "Year",
        location: "Location",
        providerMap: "Map Provider",
        style: "Map Style",
        country: "Country",
        region: "Region",
        type: "Type",
        city: "City",
        bedrooms: "Bedrooms",
        bathrooms: "Bathrooms",
        furnished: "Furnished",
        parking: "Parking",
        tier: "Tier",
        benefits: "Benefits",
        expires: "Expires",
        edition: "Edition",
        author: "Author",
        collection: "Collection",
        class: "Class",
        rarity: "Rarity",
        power: "Rights"
      },
      tags: {
        general: "General",
        iot: "IoT",
        mapImage: "Map + Image",
        liveMap: "Live Map",
        realEstate: "Real Estate",
        premium: "Premium"
      },
      highlights: {
        general: "Standard",
        iot: "Connected",
        mapImage: "Grid",
        liveMap: "Interactive",
        realEstate: "Property",
        premium: "Luxury"
      }
    },
    cta: {
      title: "Ready to digitize your assets?",
      subtitle: "Join the future of asset management with KNRT Property. Secure, transparent, and efficient.",
      button: "Get Started Now"
    }
  },
  mint: {
    title: "Mint · Studio",
    subtitle: "Base Network",
    hero: {
      title: "Mint NFTs with a much clearer experience.",
      description: "Keep the same logic and features but add a visual guide, live summaries and context before signing the transaction."
    },
    connectCard: {
      title: "Connect Wallet",
      desc: "Connect your wallet to start creating and managing your property NFTs on Base.",
      button: "Connect Wallet",
      connecting: "Connecting..."
    },
    stats: {
      wallet: {
        title: "Wallet",
        connected: "Connected",
        disconnected: "Disconnected",
        ready: "Ready to sign on Base.",
        connect: "Connect your wallet to continue."
      },
      template: {
        title: "Template",
        notSelected: "Not selected",
        hintSelected: "You can replace or merge in step 2.",
        hintNotSelected: "Choose a template to auto-complete attributes."
      },
      attributes: {
        title: "Attributes",
        cellsReady: "cells ready",
        hint: "Add key traits for your asset."
      }
    },
    steps: {
      guidedFlow: "Guided Flow",
      title: "Complete each block at your own pace",
      desc: "There are no forced steps, but we show the status of each section.",
      details: {
        label: "Details",
        ready: "Name and description ready",
        notReady: "Complete name and description"
      },
      template: {
        label: "Template",
        notSelected: "Select a base template"
      },
      attributes: {
        label: "Attributes",
        custom: "custom attributes",
        hint: "Add or adjust key attributes"
      }
    },
    form: {
      detailsTitle: "NFT Details",
      detailsDesc: "Name, description and optional image if you'll work with an image-based map.",
      block1: "Block 1 · Asset identity",
      name: "NFT Name",
      namePlaceholder: "e.g., El Molino Estate · Vineyard",
      description: "Description",
      descriptionPlaceholder: "Describe your NFT...",
      image: "Image (optional)",
      imageHint: "Ideal for image-based templates.",
      statusReady: "Name and description ready.",
      statusNotReady: "Complete the fields to unlock minting.",
      errorName: "Name is required",
      errorDesc: "Description is required"
    },
    templateSection: {
      title: "Template and attributes",
      desc: "Select templates, define cells (if applicable) and add manual attributes.",
      block2: "Block 2 · Template and map",
      galleryTitle: "Template gallery",
      galleryDesc: "Each template comes with predefined attributes ready to merge or replace.",
      clear: "Clear selection",
      select: "Select",
      selectedTitle: "Selected template",
      replace: "Replace",
      merge: "Merge",
      replaceHint: "Replace all your current attributes with those from the selected template.",
      mergeHint: "Concatenate the template attributes with yours. If the same key exists, it will be updated.",
      emptyHint: "Select a template to view its attributes and apply it to the form.",
      attrs: "attributes"
    },
    mapSection: {
      defineCells: "Define cells on the map",
      imageUploaded: "Image uploaded",
      uploadFirst: "Upload an image in Step 1",
      leafletReady: "Leaflet ready to select cells",
      available: "available",
      selectAll: "Select all",
      removeAll: "Remove all",
      locateMe: "Locate me",
      rows: "Rows",
      cols: "Cols",
      clear: "Clear",
      done: "Done",
      mapView: "Map",
      satelliteView: "Satellite",
      hideGrid: "Hide grid to move",
      searchPlaceholder: "Search address",
      searching: "Searching...",
      search: "Search",
      advanced: "Advanced Coordinates",
      decimal: "Decimal Degrees (GD)",
      syncGo: "Sync & Go",
      lat: "Latitude",
      lng: "Longitude",
      dms: "Degrees, Minutes, Seconds (GMS)",
      deg: "Deg",
      min: "Min",
      sec: "Sec",
      dir: "Dir",
      go: "Go",
      cellEditor: "Cell Editor",
      manualAttrs: "Attributes",
      manualHint: "Adjust, rename or delete attributes manually.",
      clearAll: "Clear all",
      noManual: 'There are no manual attributes yet. Use "Add" or apply a template to get started.',
      allSet: "All set: you can mint whenever you want.",
      metaVisibility: "Metadata Visibility",
      metaVisDesc: "Choose whether your NFT metadata is publicly visible or private.",
      public: "Public",
      private: "Private",
      mapReady: "{{count}} cells ready",
      mapNotReady: "Map not configured",
      autoTitle: "Auto Attributes",
      autoDesc: "Generated from map",
      row: "Row",
      col: "Col",
      null: "Null",
      of: "of",
      dupError: "Duplicated attributes"
    },
    manualSection: {
      type: "Attribute type",
      typePlaceholder: "Attribute type (e.g., Rarity)",
      value: "Value",
      valuePlaceholder: "Value (e.g., Legendary)",
      add: "Add"
    },
    summary: {
      title: "Summary",
      subtitle: "Review and Mint",
      block3: "Block 3 · Confirmation",
      preview: "Raw Metadata Preview",
      mintBtn: "Mint NFT",
      minting: "Minting...",
      success: "Asset Minted Successfully!",
      retry: "Retry",
      sidebar: {
        preview: "Preview",
        unnamed: "Unnamed NFT",
        public: "Public metadata",
        private: "Private metadata",
        description: "Describe your NFT so others understand what they're tokenizing.",
        manual: "Manual attributes",
        cells: "Cells ready",
        checklist: "Checklist",
        percentReady: "{{score}}% ready",
        ready: "ready",
        featured: "Featured attributes"
      },
      guide: {
        title: "Quick guide",
        subtitle: "How to mint in 3 steps",
        desc: "Keep the same features; we just polished the visual experience.",
        step1: {
          title: "1",
          subtitle: "Complete the details",
          desc: "Name, description and optional image. If you will use an image-based map, upload it here."
        },
        step2: {
          title: "2",
          subtitle: "Choose template and cells",
          desc: "Use templates to autofill, open the editor if it's a map and ensure you have at least one available cell."
        },
        step3: {
          title: "3",
          subtitle: "Sign on Base",
          desc: "Review the summary in the sidebar, confirm visibility and press Mint. You'll need gas in your wallet."
        }
      }
    },
    checklist: {
      name: "NFT Name",
      description: "Description",
      template: "Template selected",
      attributes: "Custom attributes ready",
      map: "Map/Image configured"
    },
    demo: {
      enabled: "Demo mode enabled",
      message: "Actions on this page are simulated—no wallet or blockchain transactions are sent.",
      success: "Success! Your demo transaction was simulated and the NFT was created.",
      saveFailed: "Server save failed: {{error}}"
    },
    errors: {
      imageRequired: "Image is required for map template",
      cellsRequired: "Select at least 1 available cell",
      connectRequired: "Connect your wallet to mint.",
      failedToUpload: "Failed to upload metadata/image to IPFS",
      config: "Configuration",
      cancelled: "Signature cancelled",
      cancelledDesc: "You cancelled the request in your wallet.",
      insufficientFunds: "Insufficient funds",
      insufficientFundsDesc: "You do not have enough ETH for gas.",
      wrongNetwork: "Wrong network",
      wrongNetworkDesc: "Connect to the correct network and try again.",
      paymentRevert: "Payment token revert",
      paymentRevertDesc: "Allowance/balance insufficient for escrow.",
      rpcError: "Network/RPC error",
      rpcErrorDesc: "Node issue. Please try again.",
      txFailed: "Transaction failed",
      unknown: "Unknown error",
      configTitle: "Configuration",
      addressNotFound: "Address not found.",
      searchError: "Error searching address."
    },
    attributes: {
      mapCenter: "Map Center",
      mapLat: "Map Latitude",
      mapLng: "Map Longitude",
      mapZoom: "Map Zoom",
      mapBounds: "Map Bounds",
      mapMinZoom: "Map MinZoom",
      mapMaxZoom: "Map MaxZoom",
      mapTileUrl: "Map Tile URL",
      mapProvider: "Map Provider",
      mapStyle: "Map Style",
      mapCrs: "Map CRS",
      mapSize: "Map Size"
    },
    templates: {
      tags: {
        general: "General",
        iot: "IoT + Data",
        mapImage: "Map + Image",
        liveMap: "Live Map",
        realEstate: "Real Estate",
        premium: "Premium"
      },
      highlights: {
        general: "Base template for tokenized assets.",
        iot: "For sensors, gateways and continuous telemetry.",
        mapImage: "Divide an image into tokenizable cells.",
        liveMap: "Tokenize on Leaflet/OSM without uploading images.",
        realEstate: "Simple residential properties.",
        premium: "Full properties with amenities."
      },
      items: {
        iotSensor: {
          name: "IoT Sensor Tokenization",
          desc: "Tokenization template for IoT/sensor services and data."
        },
        mapImage: {
          name: "Tokenized Image (Cells)",
          desc: "Map tokenization: select available cells on the image."
        },
        liveMap: {
          name: "Tokenized Map (Leaflet/OSM)",
          desc: "Tokenization on interactive map. No image upload required."
        },
        realEstate: {
          name: "Property (Basic)",
          desc: "For simple properties: city, bedrooms, bathrooms, area."
        },
        realEstatePremium: {
          name: "Property (Premium)",
          desc: "Includes furnished, parking and year."
        },
        membership: {
          name: "Membership",
          desc: "For access/benefits: tier and expiry."
        },
        artwork: {
          name: "Artwork",
          desc: "Edition, author and collection."
        },
        character: {
          name: "Character (Gaming)",
          desc: "Class, rarity and power."
        }
      }
    }
  },
  nftDetails: {
    units: {
      second: "second",
      seconds: "seconds",
      hour: "hour",
      hours: "hours",
      day: "day",
      days: "days",
      month: "month",
      months: "months"
    },
    header: {
      sale: "For Sale",
      rent: "For Rent",
      power: "Rights Delegation",
      connectBtn: "Connect Wallet",
      mintNew: "Mint New",
      viewAvailable: "View Available"
    },
    alerts: {
      demoError: "Demo Load Error",
      connectBtn: "Connect Wallet",
      connect: "Please connect your wallet to view NFT details and perform actions.",
      notFound: "NFT not found",
      demoNotFound: "Demo property not found",
      notFoundDesc: "We couldn't find the NFT with ID {id}. Please make sure you are on the correct network."
    },
    colors: {
      green: "Green",
      red: "Red",
      blue: "Blue",
      yellow: "Yellow",
      gray: "Gray",
      white: "White",
      black: "Black"
    },
    map: {
      hideGrid: "Hide Grid Overlay",
      showGrid: "Show Grid Overlay",
      viewFullscreen: "View Fullscreen",
      cellColor: "Cell Color:",
      lineColor: "Line Color:",
      close: "Close"
    },
    info: {
      title: "NFT Details",
      tokenUri: "tokenURI (raw)",
      truncated: "truncated",
      copy: "Copy",
      gateway: "Open in Gateway",
      cert: "Download Certificate",
      access: "Metadata access:",
      granted: "granted",
      denied: "denied",
      visibility: "Metadata Visibility",
      public: "Public: Anyone can see metadata",
      private: "Private",
      loading: "Loading...",
      changing: "Updating...",
      json: "Metadata (JSON)",
      locked: "Metadata locked or unavailable",
      retry: "Retry",
      contract: "Contract",
      notConfigured: "Not Configured",
      attrs: "Attributes",
      noAttrs: "No attributes.",
      effectiveOwner: "Effective Owner",
      unavailable: "Unavailable",
      makePrivate: "Make Private",
      makePublic: "Make Public",
      you: "You",
      demoUser: "Demo User",
      attributes: {
        MapCenter: "Map Center",
        MapLatitude: "Map Latitude",
        MapLongitude: "Map Longitude",
        MapZoom: "Map Zoom",
        MapProvider: "Map Provider",
        MapStyle: "Map Style",
        AssetType: "Asset Type",
        TokenizedArea: "Tokenized Area (m²)",
        EstimatedYield: "Estimated Yield",
        Year: "Year",
        TokenizationStatus: "Tokenization Status",
        Location: "Location",
        GridDefinition: "Grid Definition",
        CellSizeRel: "Cell Size (Rel)",
        AvailableCells: "Available Cells",
        NullCells: "Null Cells",
        AvailableCellIDs: "Available Cell IDs",
        GridLineColor: "Grid Line Color",
        Vineyard: "Vineyard",
        Tokenized: "Tokenized",
        Inprocess: "In Process",
        Available: "Available"
      },
      pdf: {
        tech: "Technical Sheet",
        tokenId: "Token ID",
        contract: "Contract",
        chainId: "Chain ID",
        techUri: "Technical URI",
        gateway: "Gateway",
        footer: "Generated by KNRT Marketplace",
        fileName: "Certificate",
        trait: "Trait",
        value: "Value"
      },
      fallbacks: {
        noDesc: "No description.",
        lockedDesc: "🔒 Metadata locked. You should rent or buy to unlock.",
        lackAccess: "Could not load NFT metadata (possible lack of access).",
        connectPrompt: "Connect your wallet to attempt reading private metadata.",
        initContracts: "Initializing contracts..."
      }
    },
    messages: {
      loadError: "Error loading Rights state.",
      powerListSuccess: "Rights listed successfully!",
      invalidPrice: "Enter a valid price (> 0).",
      listSuccess: "NFT listed for sale.",
      cancelSuccess: "Sale canceled.",
      buySuccess: "Purchase completed successfully.",
      rentalListSuccess: "Rental listing created.",
      rentalCancelSuccess: "Rental listing canceled.",
      rentalOfferSuccess: "Rental offer sent.",
      rentalWithdrawSuccess: "Offer withdrawn.",
      rentalAcceptSuccess: "Offer accepted.",
      rentalEndSuccess: "Rental ended (if applicable).",
      powerCancelSuccess: "Rights listing canceled.",
      powerOfferSuccess: "Rights offer sent.",
      powerWithdrawSuccess: "Offer withdrawn.",
      powerAcceptSuccess: "Offer accepted.",
      invalidPct: "Invalid percentage (1–100).",
      invalidAmount: "Amount must be greater than 0",
      min24h: "Duration must be at least 24 hours"
    },
    attributes: {
      MapCenter: "Map Center",
      MapLatitude: "Latitude",
      MapLongitude: "Longitude",
      MapZoom: "Zoom",
      MapProvider: "Provider",
      MapStyle: "Map Style",
      AssetType: "Asset Type",
      Country: "Country",
      Region: "Region",
      TokenizedArea: "Tokenized Area",
      EstimatedYield: "Est. Yield",
      Year: "Year",
      TokenizationStatus: "Status",
      GridDefinition: "Grid Definition",
      CellSizeRel: "Cell Size (Rel)",
      AvailableCells: "Available Cells",
      NullCells: "Null Cells",
      AvailableCellIDs: "Available Cell IDs",
      GridLineColor: "Grid Line Color"
    },
    chat: {
      title: "Chat",
      with: "With:",
      refresh: "Refresh",
      noConvo: "No conversation selected",
      connect: "Connect wallet to chat",
      you: "You",
      justNow: "Just now",
      ago: "ago",
      connectToSend: "Connect your wallet to send messages",
      placeholder: "Type a message...",
      placeholderConnect: "Connect wallet to type",
      send: "Send"
    },
    market: {
      tabs: {
        notListed: "This NFT is not listed",
        choose: "Choose a marketplace to list (only the active marketplace will be displayed).",
        sale: "Sale",
        rent: "Rent",
        power: "Rights"
      },
      common: {
        basePrice: "Base Price (KNRT)",
        placeholderPrice: "e.g., 100.5",
        placeholderAmount: "1",
        duration: "Duration",
        hours: "Hours",
        days: "Days",
        months: "Months",
        min24h: "Minimum 24 hours required"
      },
      sale: {
        title: "Sale Market",
        price: "Price (KNRT)",
        priceLabel: "Current Price",
        listBtn: "List for Sale",
        listing: "Listing...",
        checking: "Checking listing...",
        listedOwner: "NFT listed for sale",
        buy: "Buy Now",
        buying: "Buying...",
        notConfigured: "Sale Market not configured",
        connectToBuy: "Connect Wallet to Buy",
        cancel: "Cancel Listing",
        canceling: "Canceling..."
      },
      rental: {
        title: "Rental Market",
        base: "Base Price",
        duration: "Rental Duration",
        listing: "Listing...",
        listBtn: "List for Rental",
        notConfigured: "Rental Market not configured",
        connectMessage: "Connect wallet to make a rental offer",
        offersTitle: "Rental Offers",
        renterLabel: "Renter",
        pctLabel: "Percentage",
        escrowLabel: "Escrow",
        yourOffer: "Your Offer (%)",
        makeOffer: "Make Offer",
        sending: "Sending...",
        accepting: "Accepting...",
        acceptBtn: "Accept",
        withdrawing: "Withdrawing...",
        withdraw: "Withdraw",
        noOffers: "No active offers.",
        history: "Offer History (withdrawn/paid)",
        noHistory: "No history.",
        activeRenters: "Active Renters",
        none: "None",
        ending: "Ending...",
        endRental: "End Rental",
        withdrawnNote: "(withdrawn)",
        acceptedStatus: "Active",
        withdrawnStatus: "Ended",
        cancel: "Cancel Listing",
        canceling: "Canceling...",
        listedOwner: "Your NFT is listed for rental!"
      },
      power: {
        title: "Rights Market",
        base: "Base Price",
        duration: "Duration",
        active: "Delegation Active",
        upfrontLabel: "Upfront Payment",
        payPerPeriod: "Pay per period",
        listing: "Listing...",
        listBtn: "List for Rights",
        notConfigured: "Rights Market not configured",
        offersTitle: "Rights Offers",
        sending: "Sending...",
        makeOffer: "Make Offer",
        accepting: "Accepting...",
        acceptBtn: "Accept",
        withdrawing: "Withdrawing...",
        withdrawBtn: "Withdraw",
        renterLabel: "Delegated to",
        pctLabel: "Percentage",
        escrowLabel: "Escrow",
        withdrawnNote: "(withdrawn)",
        acceptedStatus: "Active",
        withdrawnStatus: "Ended",
        noHistory: "No delegation history",
        usersAccess: "Users with access",
        none: "None",
        yourAccess: "Your access valid until:",
        validUntil: "Valid until",
        connectMessage: "Connect wallet to make a rights offer",
        cancel: "Cancel Listing",
        canceling: "Canceling..."
      }
    }
  },
  common: {
    placeholderPrice: "e.g., 100.5",
    placeholderAmount: "Amount",
    hours: "Hours",
    days: "Days",
    months: "Months",
    min24h: "Minimum: 24 hours"
  },
  tabs: {
    sale: "Sale",
    rent: "Rent",
    power: "Rights",
    notListed: "This NFT is not listed",
    choose: "Choose a marketplace to list (only the active marketplace will be displayed)."
  },
  chat: {
    title: "Private Chat",
    with: "Chat with:",
    refresh: "Refresh List",
    noConvo: "No conversations yet. Make an offer to start chatting!",
    connect: "Connect wallet to see conversations",
    justNow: "just now",
    ago: "ago",
    connectToSend: "Connect wallet to send messages.",
    placeholder: "Write a message... (Enter to send, Shift+Enter for new line)",
    placeholderConnect: "Connect wallet to chat",
    send: "Send Message",
    sending: "sending...",
    noMessages: "No messages yet. Start the conversation!",
    you: "You"
  },
  allNfts: {
    title: "NFT Properties",
    description: "All minted NFTs and their status in the marketplace",
    loading: "Loading properties...",
    contract: "Contract",
    banner: {
      text: "Connect your wallet for a better experience managing your properties.",
      connect: "Connect"
    },
    subtitle: "All minted NFTs and their status in the marketplace",
    filters: {
      search: "Search",
      searchPlaceholder: "name, desc, id, traits...",
      market: "Market",
      marketOptions: {
        all: "All",
        sale: "Sale",
        rent: "Rent",
        power: "Rights",
        none: "Not listed"
      },
      owner: "Owner contains",
      ownerPlaceholder: "e.g., 0x123...",
      saleMin: "Sale min (KNRT)",
      saleMax: "Sale max (KNRT)",
      rentMin: "Rent min (KNRT)",
      rentMax: "Rent max (KNRT)",
      durationMin: "Duration min (s)",
      durationMax: "Duration max (s)",
      traitKey: "Trait (key)",
      traitKeyPlaceholder: "e.g., Location",
      traitValue: "Value contains",
      traitValuePlaceholder: "e.g., Madrid",
      sortBy: "Sort by",
      sort: "Sort by",
      sortOptions: {
        recent: "Most recent",
        tokenAsc: "Token ID ↑",
        tokenDesc: "Token ID ↓",
        priceAsc: "Price ↑",
        priceDesc: "Price ↓"
      },
      clear: "Clear",
      onlyOffers: "Only with offers"
    },
    stats: {
      total: "Total",
      sale: "For sale",
      rent: "For rent",
      power: "Rights",
      none: "Not listed",
      filtered: "Filtered"
    },
    empty: {
      noProperties: "No properties",
      noPropertiesDesc: "No NFTs have been minted yet or the contract is empty.",
      mintFirst: "Mint your first NFT",
      noResults: "No results with the current filters.",
      clearFilters: "Clear filters"
    },
    card: {
      viewDetails: "View Details",
      buy: "Buy",
      metadataLocked: "Metadata locked",
      unlockHint: "You should rent or buy to unlock.",
      viewGateway: "View image on gateway",
      owner: "Owner",
      na: "N/A",
      saleTitle: "For Sale",
      rentTitle: "For Rent",
      powerTitle: "Rights Access",
      basePrice: "Base price",
      duration: "Duration",
      active: "Active:",
      offers: "Offers:",
      locked: "Locked",
      lockedDesc: "🔒 Metadata locked. You must rent or buy to unlock.",
      metadataUnavailable: "Metadata unavailable",
      metaUnavailable: "Metadata unavailable",
      mode: {
        none: "None",
        sale: "For Sale",
        rent: "For Rent",
        power: "Rights",
        unknown: "Unknown"
      }
    },
    units: {
      min: "min",
      hrs: "hrs",
      days: "days"
    },
    error: {
      title: "Loading Error",
      retry: "Retry"
    }
  },
  myNfts: {
    title: "Your NFT Properties",
    subtitle: "Your NFTs and their status in sale / rent / rights",
    connectWallet: {
      title: "Wallet Disconnected",
      desc: "Connect your wallet to see your NFTs and their marketplace status.",
      button: "Connect Wallet"
    },
    empty: {
      title: "You don’t own NFTs yet",
      desc: "Mint or acquire an NFT to see it here.",
      button: "Mint NFT"
    },
    profile: {
      badge: "Wallet Profile",
      title: "Your Wallet Dashboard",
      subtitle: "Full on-chain profile on Base: balances, history, swaps, PnL, multi-chain activity, and contract deployments.",
      connected: "Connected",
      refresh: "Refresh data",
      connect: {
        title: "Connect Your Wallet",
        desc: "Access your full on-chain profile including balances, PnL analysis, transactions, and multi-chain stats.",
        hint: "Connect your wallet to view your profile, balances, transaction history, PnL, and chain activity.",
        button: "Connect Wallet",
        connecting: "Connecting…"
      },
      stats: {
        address: "Address",
        viewScan: "View on Basescan",
        network: "Network",
        chainId: "Chain ID",
        tx: "Tx",
        tokenTx: "Token tx",
        nfts: "NFTs",
        totalValue: "Total Value",
        poweredBy: "Powered by Moralis",
        estimatedValue: "Estimated USD value across native and ERC-20 positions."
      },
      pnl: {
        title: "PnL Summary",
        subtitle: "Realized profit & trade activity",
        realized: "Realized PnL (USD)",
        realizedDesc: "Based on realized trades only (excludes unrealized PnL).",
        trades: "Trades",
        buysSells: "Buys / Sells",
        volume: "Trade volume",
        emptyTitle: "No realized PnL data yet",
        emptyDesc: "Start trading to see profit & loss analytics across tokens and timeframes.",
        breakdown: "Token PnL breakdown",
        topTokens: "Top {{count}} tokens",
        noData: "No per-token PnL data available for this timeframe.",
        tradesCount: "trades"
      },
      chain: {
        title: "Chain Activity",
        subtitle: "Networks where this wallet has been active",
        chains: "chains",
        empty: "No chain activity detected yet for this wallet.",
        first: "First:",
        last: "Last:"
      },
      swaps: {
        title: "Recent Swaps",
        subtitle: "DEX swaps detected via Moralis",
        empty: "No swap data found yet for this wallet.",
        bought: "Bought",
        sold: "Sold",
        price: "Px:"
      },
      balances: {
        title: "Balances",
        refresh: "Refresh",
        native: "Base ETH",
        nativeDesc: "ETH (native)",
        emptyToken: "No ERC-20 tokens found"
      },
      history: {
        title: "Recent Activity (Full History)",
        lastEntries: "Last {{count}} entries",
        received: "Received",
        sent: "Sent",
        contract: "Contract interaction",
        from: "From",
        to: "To",
        empty: "No recent transactions"
      },
      deployments: {
        title: "Contract Deployments",
        empty: "No contract deployments detected yet. When this wallet deploys contracts, they will appear here.",
        deployed: "Deployed contract",
        block: "Block",
        fee: "Fee:",
        gas: "Gas:"
      },
      footer: {
        desc: "On-chain property & wallet analytics dashboard.",
        powered: "Powered by Moralis & Base"
      },
      relativeTimes: {
        justNow: "Just now",
        minsAgo: "{{count}}m ago",
        hrsAgo: "{{count}}h ago",
        daysAgo: "{{count}}d ago"
      }
    },
    filters: {
      search: "Search",
      market: "Market",
      relationship: "My Relationship",
      owner: "Owner contains",
      owned: "✓ Owned",
      renting: "🏠 Renting",
      power: "⚡ Power",
      unlisted: "Unlisted",
      sortOptions: {
        recent: "Most recent",
        oldest: "Oldest",
        priceAsc: "Sale Price ↑",
        priceDesc: "Sale Price ↓",
        rentAsc: "Rent Price ↑",
        rentDesc: "Rent Price ↓",
        durAsc: "Duration ↑",
        durDesc: "Duration ↓"
      }
    },
    units: {
      min: "min",
      hrs: "hrs",
      days: "days"
    },
    error: {
      title: "Loading Error",
      retry: "Retry"
    },
    badges: {
      owned: "✓ Owned",
      renting: "🏠 Renting",
      power: "⚡ Power",
      yourRental: "🏠 Your Rental",
      yourPower: "⚡ Your Power Grant",
      expiresAt: "Expires at:",
      daysRemaining: "Days remaining:"
    }
  },
  profile: {
    badge: "Wallet Dashboard",
    title: "Wallet Profile",
    subtitle: "Your Wallet Dashboard",
    connected: "Connected",
    desc: "Full on-chain profile on Base: balances, history, swaps, PnL, multi-chain activity, and contract deployments.",
    connect: {
      title: "Connect Your Wallet",
      hint: "Connect your wallet to view your profile, balances, and transaction history.",
      button: "Connect Wallet",
      connecting: "Connecting...",
      desc: "Connect your wallet to view your profile, balances, transaction history, PnL, and chain activity."
    },
    refresh: "Refresh data",
    stats: {
      address: "Address",
      viewScan: "View on Basescan",
      network: "Network",
      chainId: "Chain ID",
      tx: "Transactions",
      tokenTx: "Token Transfers",
      nfts: "NFTs",
      totalValue: "Total Value",
      poweredBy: "Moralis",
      estimatedValue: "Estimated portfolio value"
    },
    cards: {
      address: "Address",
      viewBaseScan: "View on Basescan",
      network: "Network",
      chainId: "Chain ID",
      totalValue: "Total Value",
      poweredBy: "Powered by Moralis",
      estimatedValue: "Estimated USD value across native and ERC-20 positions."
    },
    pnl: {
      title: "PnL Summary",
      subtitle: "Your profit and loss over time",
      desc: "Realized profit & trade activity",
      realizedPnL: "Realized PnL (USD)",
      realizedNote: "Based on realized trades only (excludes unrealized PnL).",
      trades: "Trades",
      buysSells: "Buys / Sells",
      volume: "Trade volume",
      noData: "No realized PnL data yet",
      noDataDesc: "Start trading to see profit & loss analytics across tokens and timeframes.",
      breakdown: "Token PnL breakdown",
      topTokens: "Top tokens",
      emptyTitle: "No trading activity",
      emptyDesc: "Start trading to see your PnL data"
    },
    chain: {
      title: "Chain Activity",
      subtitle: "Your activity across chains",
      desc: "Networks where this wallet has been active",
      noActivity: "No chain activity detected yet for this wallet.",
      chains: "chains active",
      empty: "No activity recorded yet",
      first: "First tx",
      last: "Last tx"
    },
    activity: {
      title: "Chain Activity",
      desc: "Networks where this wallet has been active",
      noActivity: "No chain activity detected yet for this wallet.",
      first: "First",
      last: "Last"
    },
    swaps: {
      title: "Recent Swaps",
      subtitle: "Your latest swap transactions",
      desc: "DEX swaps detected via Moralis",
      noSwaps: "No swap data found yet for this wallet.",
      empty: "No swaps found",
      bought: "Bought",
      sold: "Sold",
      buy: "Buy",
      sell: "Sell"
    },
    balances: {
      title: "Balances",
      refresh: "Refresh",
      native: "Base ETH",
      nativeDesc: "Native token balance",
      erc20: "ERC-20 Tokens",
      noTokens: "No ERC-20 tokens found",
      emptyToken: "No tokens found"
    },
    history: {
      title: "Transaction History",
      lastEntries: "Recent transactions",
      empty: "No transactions found",
      send: "Sent",
      receive: "Received",
      contract: "Contract"
    },
    recentActivity: {
      title: "Recent Activity (Full History)",
      received: "Received",
      sent: "Sent",
      contract: "Contract interaction",
      noRecent: "No recent transactions"
    },
    deployments: {
      title: "Contract Deployments",
      noDeployments: "No contract deployments detected yet. When this wallet deploys contracts, they will appear here.",
      empty: "No contracts deployed yet",
      deployed: "Deployed contract",
      contract: "Contract",
      block: "Block",
      fee: "Fee",
      gas: "Gas Used"
    },
    footer: {
      desc: "A flexible ecosystem to manage NFT-based properties, sales, rentals and power delegation.",
      powered: "Powered by Base & Moralis"
    }
  },
  swapPage: {
    badge: "Swaps beta",
    title: "Swap tokens instantly",
    subtitle: "Direct conversion between KNRT and your favorite tokens with the same clear experience as the rest of the app.",
    tabs: {
      swap: "Swap"
    },
    form: {
      sell: "Sell",
      receive: "Receive",
      balance: "Balance",
      max: "MAX",
      searching: "Searching best price...",
      estimated: "Estimated value",
      slippage: "Slippage",
      route: "Route",
      router: "KNRT Router",
      network: "Base",
      processing: "Processing...",
      button: "Swap now",
      connect: "Connect wallet",
      ready: "ready to sign."
    },
    modal: {
      title: "Select token",
      search: "Search by name or symbol",
      selected: "Selected",
      noTokens: "No tokens found"
    },
    alerts: {
      success: "Swap completed successfully!",
      noRoute: "No liquidity route found",
      error: "Error fetching quote",
      insufficientFunds: "Insufficient funds for gas (ETH) or token.",
      rejected: "Transaction rejected by the user.",
      failed: "Swap failed. Please try again."
    }
  },
  deployErc20: {
    title: "Launch your ERC-20 token with a clear, guided flow.",
    subtitle: "Set name, symbol, decimals, and initial supply. The contract deploys on Base and mints supply to your recipient.",
    badge: "Deploy · ERC-20",
    network: "Base network",
    wallet: {
      title: "Wallet",
      connected: "Connected",
      notConnected: "Not connected",
      ready: "Ready to deploy on Base.",
      connectPrompt: "Connect your wallet to continue."
    },
    decimalsInfo: {
      title: "Decimals",
      desc: "18 is standard. Adjust if needed."
    },
    readiness: {
      title: "Readiness",
      allSet: "All set!",
      completeFields: "Complete the fields to deploy."
    },
    guide: {
      tag: "Deployment guide",
      title: "Complete each section at your pace",
      desc: "No forced steps — we show the status of each field.",
      states: {
        ready: "Ready",
        pending: "Please complete this field"
      },
      checks: {
        name: "Token name",
        symbol: "Token symbol",
        decimals: "Valid decimals",
        recipient: "Recipient address"
      }
    },
    connectSection: {
      title: "Connect your wallet",
      desc: "Connect to deploy ERC-20 contracts on Base.",
      btnConnect: "Connect wallet",
      btnConnecting: "Connecting…"
    },
    form: {
      step1: "Token info",
      step1Desc: "Name, symbol, and decimals",
      name: "Token name",
      namePlaceholder: "e.g. MyToken",
      symbol: "Token symbol",
      symbolPlaceholder: "e.g. MTK",
      decimals: "Decimals",
      decimalsNote: "18 is standard. Use 0 for whole units.",
      step2: "Initial supply & recipient",
      step2Desc: "Define minting and distribution",
      supply: "Initial supply (human-readable)",
      supplyPlaceholder: "e.g. 1000000",
      supplyBaseUnits: "= {value} base units (with {decimals} decimals)",
      supplyInvalid: "Invalid amount for these decimals",
      useSigner: "Send initial supply to my wallet",
      recipient: "Recipient address",
      recipientPlaceholder: "0x…",
      successTitle: "Contract deployed successfully!",
      addressLabel: "Address:",
      txLabel: "Transaction:",
      viewTx: "View on Basescan",
      btnDeploying: "Deploying…",
      btnDeploy: "Deploy ERC-20 token"
    },
    preview: {
      tag: "Live preview",
      title: "Token summary",
      name: "Name",
      symbol: "Symbol",
      decimals: "Decimals",
      supply: "Initial supply",
      recipient: "Recipient",
      empty: "—"
    },
    checklist: {
      tag: "Checklist"
    },
    tips: {
      tag: "Quick tips",
      nameTitle: "Name:",
      nameDesc: "Human-readable name (e.g. “MyToken”).",
      symbolTitle: "Symbol:",
      symbolDesc: "Short ticker (e.g. “MTK”).",
      decimalsTitle: "Decimals:",
      decimalsDesc: "Usually 18. Use 0 for whole units.",
      supplyTitle: "Supply:",
      supplyDesc: "Number of tokens in human-readable form."
    },
    errors: {
      walletNotDetected: "Wallet not detected",
      walletNotDetectedDesc: "Install or enable a compatible wallet (EIP-1193).",
      connectWallet: "Connect your wallet",
      connectWalletDesc: "You need to connect a wallet first.",
      requiredFields: "Required fields",
      requiredFieldsDesc: "Name and symbol are required.",
      invalidDecimals: "Invalid decimals",
      invalidDecimalsDesc: "Use an integer between 0 and 30.",
      invalidRecipient: "Invalid recipient",
      invalidRecipientDesc: "The recipient address is not valid.",
      invalidSupply: "Invalid initial supply",
      invalidSupplyDesc: "Could not parse “{value}” with {decimals} decimals.",
      deployedNoAddress: "Deployed but no address",
      deployedNoAddressDesc: "Could not read the address. Check the explorer for the transaction.",
      noFactory: "No ERC-20 factory configured",
      noFactoryDesc: "Configure `contracts.erc20Factory` or implement `actions.deployErc20()` in your hook.",
      signatureCancelled: "Signature cancelled",
      signatureCancelledDesc: "You cancelled the transaction in your wallet.",
      insufficientFunds: "Insufficient funds",
      insufficientFundsDesc: "Not enough balance for gas.",
      wrongNetwork: "Wrong network",
      wrongNetworkDesc: "Switch to the correct network in your wallet and try again.",
      couldNotDeploy: "Could not deploy",
      deploymentError: "Deployment error."
    }
  },
  newPosition: {
    title: "New position",
    subtitle: "Your positions",
    helpChoose: "Help me choose",
    step1: {
      tag: "Step 1",
      title: "Select token pair and fee tier"
    },
    step2: {
      tag: "Step 2",
      title: "Set price range and deposit"
    },
    pair: {
      edit: "Edit",
      select: "Select pair",
      desc: "Choose the tokens you want to provide liquidity for."
    },
    fee: {
      title: "Fee tier",
      desc: "Pick a fee that fits your strategy.",
      search: "Search tiers"
    },
    range: {
      title: "Set price range",
      desc: "Custom range to concentrate liquidity.",
      full: "Full range",
      custom: "Custom range",
      currentPrice: "Current price",
      loading: "Loading...",
      error: "Error: {err}",
      reset: "Reset",
      minPrice: "Min price",
      maxPrice: "Max price"
    },
    deposit: {
      label: "Deposit {symbol}",
      balance: "Balance"
    },
    strategy: {
      title: "Need guidance?",
      desc: "Price strategies help you place your liquidity."
    },
    action: {
      continue: "Continue",
      depositing: "Depositing tokens",
      btnDeposit: "Deposit tokens",
      approve: "Approve {symbol}"
    },
    promo: {
      tag: "Trade new tokens on Unichain",
      title: "DOGE, XRP, XPL, ZEC — now on Unichain.",
      btn: "Discover pools"
    },
    modal: {
      title: "Select token",
      search: "Search by name or symbol",
      selected: "Selected",
      notFound: "No tokens found"
    },
    errors: {
      enterAmounts: "Please enter amounts",
      poolInvalid: "Pool not initialized or invalid price. Cannot mint.",
      insufficientBalance: "Insufficient {symbol} balance",
      rejected: "Transaction rejected by the user.",
      insufficientFunds: "Insufficient funds for gas + value. Ensure you have enough ETH.",
      mintFailed: "Mint failed: {msg}"
    },
    process: {
      starting: "Starting...",
      approving: "Approving {symbol}",
      minting: "Minting position"
    },
    tiers: {
      t1: "Best for very stable pairs.",
      t2: "Best for stable pairs.",
      t3: "Best for most pairs.",
      t4: "Best for exotic pairs."
    },
    strategies: {
      stable: {
        title: "Stable",
        copy: "Good for stablecoins or low-volatility pairs"
      },
      wide: {
        title: "Wide",
        copy: "Good for volatile pairs"
      },
      lower: {
        title: "Lower bias",
        copy: "Liquidity if price moves down"
      },
      upper: {
        title: "Upper bias",
        copy: "Liquidity if price moves up"
      }
    }
  },
  positions: {
    title: "Your positions",
    subtitle: "Portfolio · Liquidity",
    wallet: "Wallet: ",
    refresh: "Refresh",
    manageAlerts: "Manage alerts",
    newPosition: "New position",
    tag: "Uniswap v3 pools",
    warning: {
      title: "Wallet mismatch",
      desc: "The positions below are recorded for:",
      connected: "You are currently connected with:",
      resolution: "Switch to the owner wallet to manage these positions."
    },
    card: {
      smartWallet: "Smart wallet:",
      position: "Position #{id}",
      active: "Active",
      liquidity: "Liquidity",
      token0: "Token0",
      token1: "Token1",
      viewDetails: "View details"
    },
    empty: {
      title: "No positions",
      subtitle: "You have no liquidity positions yet.",
      desc: "Create a position to start earning fees and rewards on eligible pools. Explore pairs and set your ideal price range.",
      debugInfo: "Debug info:",
      debugConnected: "Connected wallet:",
      debugResolution: "If you just created a position but do not see it, check that your wallet address matches the one used for the transaction.",
      explorePools: "Explore pools",
      newPosition: "New position"
    }
  },
  bot: {
    title: "Trading Bot",
    subtitle: "Market automation",
    status: {
      active: "Active",
      inactive: "Inactive",
      running: "Running...",
      idle: "Idle"
    },
    config: {
      title: "Bot configuration",
      frequency: "Frequency (seconds)",
      minAmount: "Min amount (KNRT)",
      maxAmount: "Max amount (KNRT)",
      mode: "Trading mode",
      walletLabel: "Bot wallet",
      adminNotice: "Must be in ADMIN_WALLETS",
      buy: "Buy",
      sell: "Sell",
      rnd: "Rnd",
      sec: "SEC",
      modes: {
        random: "Random (buy/sell)",
        buy: "Buy only (pump)",
        sell: "Sell only (dump)"
      }
    },
    stats: {
      balance: "Admin balance",
      transactions: "Transactions",
      volume: "Generated volume"
    },
    logs: {
      title: "Activity log",
      empty: "No recent activity",
      emptyLine1: "No recent activity",
      emptyLine2: "Start the bot to see trades here",
      buy: "BUY",
      sell: "SELL",
      success: "Success",
      failed: "Failed",
      pending: "Pending",
      viewTx: "View TX",
      lastError: "Last error",
      clear: "Clear history"
    },
    actions: {
      start: "Start bot",
      stop: "Stop bot",
      clearLogs: "Clear logs",
      connect: "Connect wallet"
    },
    restricted: {
      title: "Restricted access",
      desc: "Connect an admin wallet to use this tool.",
      connect: "Connect wallet"
    }
  },
  login: {
    title: "Welcome Back",
    subtitle: "Access your NFT portfolio, manage your properties, and explore the marketplace.",
    features: {
      wallet: "Managed wallet with secure encryption",
      trade: "Trade NFTs on Base Network",
      security: "Enterprise-grade security"
    },
    form: {
      title: "Sign In",
      subtitle: "Enter your credentials to access your account",
      email: "Email Address",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      submit: "Sign In",
      submitting: "Signing in...",
      noAccount: "Don't have an account?",
      createAccount: "Create Account",
      terms: "By signing in, you agree to our",
      termsLink: "Terms of Service",
      and: "and",
      privacyLink: "Privacy Policy",
      metamaskEmailTitle: "Your email",
      metamaskEmailSubtitle: "First time with this wallet — add an email for your account (notifications and recovery).",
      metamaskEmailSubmit: "Continue",
      metamaskEmailSubmitting: "Saving…",
      metamaskEmailBack: "Cancel and sign again"
    }
  },
  register: {
    title: "Start Your Journey",
    subtitle: "Create your account and get a secure managed wallet automatically generated for you.",
    features: {
      wallet: {
        title: "Auto-Generated Wallet",
        desc: "Secure Ethereum wallet created for you"
      },
      security: {
        title: "Enterprise Security",
        desc: "AES-256 encryption for your keys"
      },
      extensions: {
        title: "No Extensions Needed",
        desc: "Trade NFTs without MetaMask"
      }
    },
    form: {
      title: "Create Account",
      subtitle: "Join KNRT and start managing your NFT properties",
      name: "Full Name",
      namePlaceholder: "John Doe",
      email: "Email Address",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      minChars: "Minimum 8 characters",
      submit: "Create Account",
      submitting: "Creating account...",
      hasAccount: "Already have an account?",
      signIn: "Sign In",
      terms: "By creating an account, you agree to our",
      termsLink: "Terms of Service",
      and: "and",
      privacyLink: "Privacy Policy"
    }
  },
  wallet: {
    connect: "Connect Wallet",
    metamask: "MetaMask / Web3",
    metamaskDesc: "Connect using browser wallet",
    email: "Email",
    emailDesc: "Log in or create account",
    terms: "By connecting, you agree to our Terms of Service and Privacy Policy."
  },
  docs: {
    hero: {
      badge: "Complete step-by-step whitepaper",
      title1: "KNRT Marketplace",
      title2: "For Everyone",
      subtitle1: "Learn to create, buy, sell and rent NFTs on the blockchain.",
      subtitle2: "No prior technical knowledge required.",
      stats: {
        markets: "Markets",
        steps: "Simple Steps",
        secure: "Secure"
      }
    }
  }
};

const es = {
  app: {
    brand: "KNRT Property",
    brandHub: "KNRT Property Hub",
    title: "KNRT App",
    header: {
      marketplace: "Mercado",
      myNfts: "Mis Propiedades",
      profile: "Perfil",
      tutorial: "Tutorial",
      docs: "Docs",
      demoMode: "Modo Demo",
      connect: "Conectar",
      wrongNetwork: "Red incorrecta. Cambia a Base.",
      actions: "Acciones",
      mintNft: "Mintear NFT",
      mintNftDesc: "Crear nuevo NFT",
      swap: "Intercambio",
      swapDesc: "Intercambiar tokens KNRT",
      newErc20: "Nuevo Token",
      newErc20Desc: "Desplegar token ERC20",
      menu: "Menú",
      connecting: "Conectando...",
      switch: "Cambiar",
      walletMenuTitle: "Cuenta",
      walletMenuSubtitle: "Perfil, notificaciones o cerrar sesión y desconectar la wallet.",
      walletMenuProfile: "Perfil y ajustes",
      walletMenuNotifications: "Ajustes de notificaciones",
      walletMenuDisconnect: "Cerrar sesión y desconectar",
      walletMenuClose: "Cerrar"
    },
    footer: {
      product: "Producto",
      resources: "Recursos",
      privacy: "Privacidad",
      terms: "Términos",
      rights: "© 2026 KNRT Property. Todos los derechos reservados.",
      description: "Un ecosistema flexible para gestionar propiedades basadas en NFT, ventas, alquileres y delegación de poder.",
      ecosystem: "Ecosistema",
      base: "Red Base",
      chainlink: "Chainlink",
      graph: "The Graph",
      blog: "Blog",
      cryptoBrand: "Crypto Helper",
      homeNav: "Inicio",
      dashboardNav: "Panel",
      loginNav: "Iniciar sesión",
      registerNav: "Registrarse",
      copyAddressAria: "Copiar dirección de la wallet",
      walletShort: "Wallet",
      cryptoTagline: "Mercados, señales SSE y wallets — Qwik, Turso y Moralis en un solo panel.",
      appNavSection: "App",
      apiNavSection: "API",
      healthLink: "Estado",
      rightsReserved: "Todos los derechos reservados."
    },
    aiFab: {
      teaserTitle: "¡Hola!",
      teaserBody: "¿Dudas sobre mercados o el panel? Pregunta al asistente de IA (Pro).",
      teaserYes: "Sí",
      teaserNo: "Ahora no",
      fabAria: "Abrir asistente de IA",
      panelTitle: "Asistente",
      panelSubtitle: "Crypto Helper · DB insight",
      questionLabel: "Pregunta",
      answerLabel: "Respuesta",
      placeholder: "Pregunta por datos de mercado, señales, sync…",
      send: "Enviar",
      thinking: "Pensando…",
      signInLine: "Inicia sesión para usar el asistente y las funciones Pro.",
      proLine: "DB insight es solo Pro. Mejora el plan para preguntar a la IA sobre datos agregados.",
      openFullPage: "Abrir DB insight completo",
      close: "Cerrar"
    },
    proUpgrade: {
      nav: "Mejorar a Pro",
      title: "Pasar a Pro",
      subtitle: "5 USDT · pago único · elige red",
      network: "Red",
      body: "Envía exactamente 5 USDT en la red elegida a la tesorería. Pro se activa al confirmar el pago.",
      bscDecimals: "En BNB Chain el USDT usa 18 decimales — el importe sigue siendo exactamente 5 USDT.",
      usdtDecimals: "En esta red el USDT usa 6 decimales.",
      badChain: "Elige una red soportada.",
      needSwitch: "Aprueba el cambio de red en la wallet y vuelve a intentar.",
      recipient: "Destinatario",
      copy: "Copiar dirección",
      payWallet: "Pagar con la wallet conectada",
      or: "o",
      manualHash: "Hash de la transacción",
      verify: "Verificar pago",
      close: "Cerrar",
      verifyFail: "No se pudo verificar el pago.",
      networkError: "Error de red. Inténtalo de nuevo.",
      needWallet: "Conecta tu wallet primero.",
      needBase: "Cambia a Base y vuelve a intentar.",
      noClient: "Wallet no lista. Vuelve a conectar.",
      txFail: "La transacción falló.",
      badHash: "Introduce un hash válido (0x…).",
      note: "La wallet que envía debe coincidir con la de tu cuenta. Al verificar, usa la misma red que en el envío.",
      usdtExplorerHints: {
        eth: "USDT nativo en Ethereum de Tether (6 decimales). Aparece en la documentación pública de protocolos soportados.",
        base: "En Base los explorers suelen mostrar “Bridged Tether USD” (6 decimales): versión bridge, no acuñada directamente por Tether en Base.",
        arbitrum: "El explorer puede mostrar USD₮0 / USDT0; es el USDT de uso habitual en Arbitrum One (6 decimales).",
        bnb: "Suele figurar como Binance-Peg BSC-USD (18 decimales). Es el contrato que el mercado usa como USDT en BNB; no equivale a los listados nativos de Tether en otras redes.",
        polygon: "USDT puenteado en Polygon PoS; puede aparecer como USDT0 (6 decimales).",
        optimism: "USDT bridgeado en Optimism (6 decimales).",
        avalanche: "USDT oficial de Tether en Avalanche C-Chain (6 decimales). No uses el USDT.e antiguo (p. ej. 0xc719…) — es otro token."
      }
    }
  },
  dashboard: {
    brand: "Crypto Helper",
    subtitle: "Dashboard · mercado y on-chain",
    subtitleDebug: "Dashboard · Turso + CMC + Moralis",
    chainLabel: "Red",
    chainAria: "Red: EVM o Solana",
    evm: "EVM",
    solana: "Solana",
    sidebarExpand: "Expandir menú lateral",
    sidebarCollapse: "Colapsar menú lateral",
    overview: "Resumen",
    cryptoBubbles: "Burbujas crypto",
    tokens: "Tokens",
    tokensCollapsedTitle: "Tokens · Top volumen",
    topVolume: "Top volumen",
    trending: "Tendencias",
    newListings: "Nuevos listings",
    meme: "Meme",
    aiBigData: "IA y big data",
    gaming: "Gaming",
    mineable: "Minables",
    mostVisited: "Más visitados",
    allTokens: "Todos los tokens",
    traders: "Traders",
    tradersCollapsedTitle: "Traders · Más rentables",
    mostProfitable: "Más rentables",
    bySwaps: "Por swaps (Icarus)",
    topWhales: "Top ballenas (watchlist)",
    nfts: "NFTs",
    block: "Bloque",
    signalNotifications: "Notificaciones de señales",
    push: "Push",
    dbInsight: "DB insight",
    liveSignals: "Señales en vivo",
    liveSignalsProSuffix: "· Pro",
    smartMoney: "Smart money",
    whaleAlerts: "Alertas ballenas",
    usdtSmart: "Alertas USDT smart",
    sse: "SSE",
    proOnlyTitle: "Solo suscriptores Pro — ver planes en Resumen",
    solanaMoralisTitle: "Solana · Moralis",
    solanaOverview: "Resumen",
    walletApi: "Wallet API",
    nativeBalance: "Saldo nativo",
    portfolio: "Portfolio",
    tokenBalances: "Saldos de tokens",
    nftBalances: "Saldos NFT",
    swaps: "Swaps",
    tokenApi: "Token API",
    metadataInfo: "Metadatos e info",
    prices: "Precios",
    holders: "Holders",
    swapsPairs: "Swaps y pares",
    marketMetrics: "Métricas de mercado",
    searchDiscovery: "Búsqueda y descubrimiento",
    advancedSignals: "Señales avanzadas",
    nftApi: "NFT API",
    priceApi: "Price API",
    tokenPrice: "Precio del token",
    tokenPriceBatch: "Precio del token (lote)",
    priceChartsNote: "Gráficos (TradingView)"
  },
  tokenPage: {
    backToLeft: "← Volver a la lista · ",
    backToRight: "",
    price: "Precio",
    volume: "Volumen",
    fdv: "FDV",
    turso: "Turso",
    contract: "Contrato",
    decimalsShort: "dec",
    supply: "supply",
    syncApiWarnings: "Avisos sync / API",
    expand: "expand",
    collapse: "contraer",
    priceChart: "Gráfico de precio",
    chartHintDex: "Gráfico on-chain por defecto (Dexscreener). Pestaña CEX para TradingView — primer par ",
    chartHintTv: "TradingView · primer par ",
    chartHintSuffix: " — cambia el par CEX si no carga.",
    tabTransfers: "Transferencias",
    tabHolders: "Holders (snapshot)",
    tabTraders: "Top traders / PnL (snapshot)",
    tabSwaps: "Swaps DEX (snapshot)",
    recentTransfers: "Transferencias recientes",
    snapshotMoralis: "Snapshot Moralis · cadena",
    colTx: "Tx",
    colFrom: "Origen",
    colTo: "Destino",
    colValue: "Valor",
    noTransfersSnapshot: "Sin transferencias recientes en el snapshot.",
    topTradersPnl: "Top traders (PnL)",
    swapsDex: "Swaps DEX",
    syncFooter: "Datos CMC y Moralis cargados desde Turso (job diario). Refresca con el sync programado o manual. Token id:",
    categories: {
      memes: "Meme",
      "ai-big-data": "IA y datos",
      gaming: "Gaming",
      mineable: "Minables",
      volume: "Top volumen",
      trending: "Tendencias",
      "most-visited": "Más visitados",
      earlybird: "Nuevos listings"
    }
  },
  home: {
    cryptoHelper: {
      meta: {
        title: "Crypto Helper — Mercados, señales e inteligencia on-chain",
        description: "Mercados CoinMarketCap en Turso, señales en vivo de ballenas y traders (SSE), burbujas, watchlists, datos Moralis de wallets y tokens, paneles Solana y EVM. Hecho con Qwik."
      },
      badge: "Crypto Helper · súper rápido · Qwik",
      hero: {
        line1: "Tu centro de mando crypto,",
        line2: "claro y rápido.",
        lead: "Una sola app: snapshots de mercado desde CoinMarketCap, streams de ballenas y smart money vía Moralis, burbujas interactivas, watchlists de traders y análisis de wallets — navegación fluida con View Transitions."
      },
      cta: {
        register: "Crear cuenta",
        login: "Entrar / wallet",
        dashboard: "Ir al panel"
      },
      stats: {
        signals: {
          label: "Señales",
          value: "SSE + base de datos"
        },
        markets: {
          label: "Mercados",
          value: "CMC → Turso"
        },
        onchain: {
          label: "On-chain",
          value: "Moralis · Icarus"
        }
      },
      modulesSection: {
        title: "Lo esencial, a un clic",
        subtitle: "Cada tarjeta abre dentro del panel. El mismo shell mantiene el contexto mientras navegas."
      },
      modules: {
        markets: {
          title: "Mercados (CMC)",
          desc: "Volumen, trending, nuevos listados y verticales (meme, IA, gaming…) — sincronizados en Turso para cargas rápidas.",
          tag: "CMC → Turso"
        },
        whales: {
          title: "Alertas whale",
          desc: "Casi en tiempo real vía webhooks Moralis; historial guardado para revisar movimientos pasados.",
          tag: "SSE"
        },
        smart: {
          title: "Smart money y traders",
          desc: "Feeds orientados a traders junto al resto del panel.",
          tag: "Live"
        },
        watchlist: {
          title: "Watchlist y wallets",
          desc: "Sigue direcciones con PnL, patrimonio y snapshots Moralis en caché.",
          tag: "Moralis"
        },
        nfts: {
          title: "NFT heatmaps",
          desc: "Colecciones trending y señales de mercado desde Moralis.",
          tag: "NFT"
        },
        usdt: {
          title: "Señales USDT smart",
          desc: "Watcher on-chain opcional y señales guardadas — configura alertas en ajustes.",
          tag: "Watcher"
        }
      },
      open: "Abrir",
      stackSection: {
        title: "Rápido por diseño",
        subtitle: "Qwik mantiene la interfaz reactiva al instante — menos JS innecesario, más tiempo para tus gráficos."
      },
      stack: {
        blazing: {
          title: "Cargas ultrarrápidas",
          desc: "Bundles optimizados y carga inteligente para que la UI responda al momento — sensación ágil desde el primer clic."
        },
        resumable: {
          title: "Resumible y eficiente",
          desc: "Qwik puede pausar y reanudar trabajo entre rutas; menos esperas y más tiempo explorando mercados."
        },
        fluid: {
          title: "Flujo tipo app",
          desc: "Cambios de ruta y transiciones fluidas — el panel mantiene el contexto mientras saltas entre módulos."
        }
      },
      proSection: {
        title: "Pro",
        desc: "Insight sobre BD, zonas SSE en vivo, alertas smart y más. Mejora con USDT (varias redes) tras iniciar sesión.",
        note: "Email/contraseña o wallet conectada — el mismo modelo de cuenta."
      },
      pwa: {
        title: "Instalar Crypto Helper",
        body: "Añade la PWA desde el navegador: poco peso y se actualiza con el sitio. En Android/Chrome instalación en un toque; en iPhone, Añadir a inicio (necesario para parte del push en iOS).",
        install: "Instalar ahora",
        hint: "Android: diálogo del sistema. iPhone: pasos en Safari."
      },
      marketplace: {
        kicker: "También en la app",
        title: "Marketplace, mint y herramientas KNRT",
        body: "El header global sigue enlazando al marketplace KNRT y flujos legacy. Esta landing centra el producto Crypto Helper.",
        link: "Ir al marketplace"
      }
    },
    hero: {
      title: "KNRT Property",
      subtitle: "Activos del Mundo Real Tokenizados",
      description: "La plataforma definitiva para tokenizar, intercambiar y gestionar activos del mundo real en la blockchain Base.",
      cta: "Explorar Mercado",
      stats: {
        tvl: "Valor Total Bloqueado",
        tvlValue: "$4.2M+",
        assets: "Activos Tokenizados",
        assetsValue: "1,250+",
        users: "Usuarios Activos",
        usersValue: "8.5K+"
      }
    },
    features: {
      title: "¿Por qué elegir KNRT?",
      security: {
        title: "Seguridad Primero",
        desc: "Contratos inteligentes auditados y procesos de verificación rigurosos."
      },
      transparency: {
        title: "Transparencia Total",
        desc: "Todas las transacciones y registros de propiedad están en la cadena."
      },
      liquidity: {
        title: "Liquidez Instantánea",
        desc: "Intercambia tus activos 24/7 en nuestro mercado descentralizado."
      }
    },
    contracts: {
      title: "Contratos Inteligentes",
      subtitle: "Arquitectura de seguridad primero para gestionar propiedades NFT con tokens KNRT",
      realEstate: {
        title: "RealEstateMarketplace",
        desc: "Mercado principal para comprar y vender propiedades NFT",
        capabilities: {
          title: "Capacidades",
          list: "Listar propiedades NFT con precios en KNRT",
          escrow: "Custodia automática del NFT mientras está listado",
          update: "Los vendedores pueden actualizar o cancelar listados en cualquier momento"
        },
        events: {
          title: "Eventos del contrato",
          listed: "PropertyListed",
          sold: "PropertySold",
          updated: "ListingUpdated",
          cancelled: "ListingCancelled"
        }
      },
      rental: {
        title: "PropertyRentalManager",
        desc: "Gestionar alquileres por tiempo definido",
        capabilities: {
          pricing: "Precios en KNRT mensuales con ventanas de duración claras",
          agreements: "Contratos de alquiler automatizados",
          payments: "Pagos mensuales más terminación por plazo o mutuo acuerdo"
        },
        events: {
          title: "Eventos del contrato",
          listed: "PropertyListed",
          rented: "PropertyRented",
          paid: "RentPaid",
          ended: "RentalEnded",
          mutual: "MutualEnd"
        }
      },
      power: {
        title: "RightsTransferMarketplace",
        desc: "Control temporal sobre propiedades NFT",
        capabilities: {
          delegate: "Delegar control temporal de NFTs",
          refund: "Retorno anticipado con reembolso de KNRT",
          expiration: "Expiración automática del poder delegado"
        },
        events: {
          title: "RightsTransferMarketplace events",
          listed: "RightsListed",
          transferred: "RightsTransferred",
          returned: "RightsReturned",
          expired: "RightsTransferExpired",
          settled: "ExpiredSettled"
        }
      },
      powerRecall: {
        title: "RightsTransfer + Recall",
        desc: "Control con bloqueo y medidas de recuperación",
        capabilities: {
          lock: "Sistema de bloqueo durante la transferencia temporal",
          recall: "El propietario puede recuperar el activo en cualquier momento",
          protection: "Protección contra transferencias no autorizadas"
        },
        events: {
          title: "Eventos base + Bloqueo y Recuperación",
          locked: "NFTLocked",
          recalled: "NFTRecalled"
        }
      },
      security: {
        title: "Características de Seguridad",
        subtitle: "Salvaguardas avanzadas para todo el ecosistema",
        reentrancy: {
          title: "Reentrancy Guard",
          desc: "Protección contra reentrada en cada función crítica"
        },
        pausable: {
          title: "Pausable",
          desc: "Pausar contratos en emergencias o durante mantenimiento"
        },
        access: {
          title: "Control de Acceso",
          desc: "Control de acceso basado en roles para administración segura"
        },
        automation: {
          title: "Chainlink Automation",
          desc: "Expiraciones y pagos automatizados potenciados por Chainlink Automation"
        },
        recovery: {
          title: "Recuperación de Fondos",
          desc: "Los contratos incluyen funciones de recuperación para errores de transferencia, para que los usuarios nunca pierdan KNRT por fallos técnicos."
        }
      },
      eventsLabels: {
        listed: "PropertyListed",
        sold: "PropertySold",
        updated: "ListingUpdated",
        cancelled: "ListingCancelled",
        rented: "PropertyRented",
        paid: "RentPaid",
        ended: "RentalEnded",
        mutual: "MutualEnd",
        powerListed: "RightsListed",
        transferred: "RightsTransferred",
        returned: "RightsReturned",
        expired: "RightsTransferExpired",
        settled: "ExpiredSettled",
        baseLocked: "Eventos base + Bloqueo y Recuperación",
        locked: "NFTLocked",
        recalled: "NFTRecalled"
      }
    },
    contractFeatures: {
      marketplace: {
        label: "Mercado",
        badge: "Custodia",
        list: "Listar, comprar, actualizar y cancelar",
        events: "Eventos: PropertyListed, PropertySold..."
      },
      rental: {
        badge: "Mensual",
        list: "Listados, acuerdos, pagos",
        events: "Eventos: PropertyRented, RentPaid..."
      },
      power: {
        badge: "Duración",
        list: "Compra, devolución temprana, expiración",
        events: "Eventos: RightsListed, RightsTransferred..."
      },
      powerRecall: {
        badge: "Bloqueo",
        list: "Bloqueo/Retorno durante la transferencia",
        events: "Eventos Base + Bloqueo y Retorno"
      }
    },
    create: "Crea tu primer listado",
    view: "Ver dashboard",
    dashboard: {
      title: "Dashboard",
      automationActive: "Chainlink Automation activo",
      sales: "Ventas (24h)",
      trend: "Tendencia",
      rentals: "Alquileres activos",
      onTime: "Pagos a tiempo",
      power: "Acuerdos de derechos activos",
      expirations: "Expiraciones (próx 7d)",
      salesValue: "38",
      rentalsValue: "127",
      powerValue: "52",
      events: {
        title: "Eventos on-chain",
        last15: "Últimos 15 min",
        mAgo: "hace {{count}}m",
        days: "{{count}} días",
        soldLog: "0xA1b...93F2 | #721 | 12,500 KNRT",
        paidLog: "0x81e...22A0 | #412 | 900 KNRT",
        transferredLog: "0xF33...aC7B | #118 | {{duration}}",
        cancelledLog: "0x9c2...01De | #532"
      },
      system: {
        status: "Estado del Sistema",
        operational: "Operativo",
        reentrancy: "Guardia Reentrancia",
        pause: "Módulo de Pausa",
        admin: "Acceso Admin",
        recovery: "Módulo de Recuperación"
      },
      quickActions: {
        title: "Acciones rápidas",
        sale: "Listar venta",
        rental: "Listar alquiler",
        power: "Listar derechos",
        recall: "Recuperar"
      }
    },
    ctaSection: {
      title: "Gestiona propiedades NFT con seguridad y control total",
      subtitle: "Combina ventas, alquileres y poder temporal en un solo flujo con pagos en KNRT.",
      create: "Crea tu primer listado",
      view: "Ver dashboard"
    },
    footer: {
      flexibleStack: "Stack flexible para gestionar propiedades basadas en NFT: ventas, alquileres y poder temporal con mecánicas de custodia, bloqueo y recuperación.",
      product: "Producto",
      marketplace: "Mercado",
      rental: "Alquiler",
      power: "Derechos",
      dashboard: "Panel de control",
      resources: "Recursos",
      docs: "Documentación",
      sdk: "SDK",
      support: "Soporte",
      status: "Estado",
      allRights: "© 2026 KNRT Property. Todos los derechos reservados.",
      privacy: "Privacidad",
      terms: "Términos"
    },
    modal: {
      list: {
        title: "Listar propiedad NFT",
        subtitle: "El NFT se traslada al contrato de custodia hasta que se venda.",
        contractAddress: "Dirección del contrato",
        tokenId: "ID del Token",
        price: "Precio (KNRT)",
        terms: "Términos y condiciones",
        escrowEnabled: "Custodia habilitada",
        listNow: "Listar ahora"
      }
    }
  },
  tutorial: {
    hero: {
      badge: "Guía Oficial",
      title: "Domina el Ecosistema KNRT",
      subtitle: "Aprende cómo tokenizar activos del mundo real, gestionar tu portafolio y explorar las diferentes plantillas disponibles para tus necesidades.",
      ctaMint: "Comenzar a Mintear",
      ctaMarket: "Explorar Mercado"
    },
    steps: {
      title: "Cómo funciona",
      subtitle: "Empezar es simple. Nuestra plataforma maneja la complejidad de la blockchain mientras tú te enfocas en tus activos.",
      step1: {
        title: "1. Conectar Billetera",
        desc: "Conecta tu MetaMask o billetera compatible para verificar tu identidad y acceder a tus activos en la red Base."
      },
      step2: {
        title: "2. Mintear o Comerciar",
        desc: "Crea nuevos activos tokenizados usando nuestras plantillas, o comercia NFTs y tokens existentes en el mercado."
      },
      step3: {
        title: "3. Gestionar Portafolio",
        desc: "Rastrea tus propiedades, alquílalas, delega poder o provee liquidez para ganar rendimiento."
      }
    },
    templates: {
      title: "Plantillas Disponibles",
      subtitle: "Elige entre una variedad de plantillas especializadas diseñadas para diferentes tipos de activos, desde bienes raíces hasta datos IoT.",
      useTemplate: "Usar Plantilla",
      features: {
        erc721: "Estándar ERC-721",
        metadata: "Metadatos on-chain/IPFS"
      },
      list: {
        iot: {
          name: "Tokenización de Sensores IoT",
          desc: "Para sensores, puertas de enlace y datos de telemetría continuos.",
          tag: "IoT + Datos"
        },
        cells: {
          name: "Imagen Tokenizada (Celdas)",
          desc: "Divide una imagen de alta resolución en celdas de cuadrícula tokenizables.",
          tag: "Mapa + Imagen"
        },
        map: {
          name: "Mapa Tokenizado (Leaflet)",
          desc: "Tokeniza ubicaciones del mundo real usando mapas interactivos.",
          tag: "Mapa en Vivo"
        },
        basic: {
          name: "Propiedad (Básico)",
          desc: "Propiedades residenciales simples con atributos estándar.",
          tag: "Bienes Raíces"
        },
        premium: {
          name: "Propiedad (Premium)",
          desc: "Listados de propiedades completos con comodidades y especificaciones detalladas.",
          tag: "Premium"
        },
        membership: {
          name: "Membresía / Acceso",
          desc: "Tokeniza derechos de acceso, membresías y niveles de lealtad.",
          tag: "General"
        }
      },
      items: {
        iotSensor: {
          name: "Tokenización de Sensores IoT",
          desc: "Para sensores, puertas de enlace y datos de telemetría continuos.",
          tag: "IoT + Datos"
        },
        mapImage: {
          name: "Imagen Tokenizada (Celdas)",
          desc: "Divide una imagen de alta resolución en celdas de cuadrícula tokenizables.",
          tag: "Mapa + Imagen"
        },
        liveMap: {
          name: "Mapa Tokenizado (Leaflet)",
          desc: "Tokeniza ubicaciones del mundo real usando mapas interactivos.",
          tag: "Mapa en Vivo"
        },
        realEstate: {
          name: "Propiedad (Básico)",
          desc: "Propiedades residenciales simples con atributos estándar.",
          tag: "Bienes Raíces"
        },
        realEstatePremium: {
          name: "Propiedad (Premium)",
          desc: "Listados de propiedades completos con comodidades y especificaciones detalladas.",
          tag: "Premium"
        },
        membership: {
          name: "Membresía / Acceso",
          desc: "Tokeniza derechos de acceso, membresías y niveles de lealtad.",
          tag: "General"
        },
        artwork: {
          name: "Arte / Colección",
          desc: "Para arte digital, ediciones numeradas y colecciones.",
          tag: "Arte"
        },
        character: {
          name: "Personaje de Juego",
          desc: "Estadísticas RPG, rareza y niveles de poder.",
          tag: "Gaming"
        }
      },
      attributes: {
        sensorId: "ID del Sensor",
        sensorType: "Tipo de Sensor",
        unit: "Unidad",
        lastReading: "Última Lectura",
        readingTimestamp: "Timestamp Lectura",
        status: "Estado",
        plot: "Lote",
        provider: "Proveedor",
        samplingFrequency: "Frecuencia Muestreo",
        battery: "Batería",
        rssi: "RSSI",
        firmware: "Firmware",
        gatewayId: "ID Gateway",
        network: "Red",
        crop: "Cultivo",
        minThreshold: "Umbral Mín",
        maxThreshold: "Umbral Máx",
        sla: "SLA",
        dataLicense: "Licencia Datos",
        locationPrivacy: "Privacidad Ubicación",
        assetType: "Tipo de Activo",
        area: "Área Tokenizada (m²)",
        yield: "Rendimiento Estimado",
        year: "Año",
        location: "Ubicación",
        providerMap: "Proveedor Mapa",
        style: "Estilo Mapa",
        country: "País",
        region: "Región",
        type: "Tipo",
        city: "Ciudad",
        bedrooms: "Dormitorios",
        bathrooms: "Baños",
        furnished: "Amoblado",
        parking: "Estacionamiento",
        tier: "Nivel",
        benefits: "Beneficios",
        expires: "Expira",
        edition: "Edición",
        author: "Autor",
        collection: "Colección",
        class: "Clase",
        rarity: "Rareza",
        power: "Derechos"
      },
      tags: {
        general: "General",
        iot: "IoT",
        mapImage: "Mapa + Ima",
        liveMap: "Mapa Vivo",
        realEstate: "Bienes Raíces",
        premium: "Premium"
      },
      highlights: {
        general: "Estándar",
        iot: "Conectado",
        mapImage: "Grilla",
        liveMap: "Interactivo",
        realEstate: "Propiedad",
        premium: "Lujo"
      }
    },
    cta: {
      title: "¿Listo para digitalizar tus activos?",
      subtitle: "Únete al futuro de la gestión de activos con KNRT Property. Seguro, transparente y eficiente.",
      button: "Empezar Ahora"
    }
  },
  mint: {
    title: "Mint · Studio",
    subtitle: "Red Base",
    hero: {
      title: "Mintea NFTs con una experiencia mucho más clara.",
      description: "Mantén la misma lógica y características pero añade una guía visual, resúmenes en vivo y contexto antes de firmar la transacción."
    },
    connectCard: {
      title: "Conectar Billetera",
      desc: "Conecta tu billetera para comenzar a crear y gestionar tus NFTs de propiedad en Base.",
      button: "Conectar Billetera",
      connecting: "Conectando..."
    },
    stats: {
      wallet: {
        title: "Billetera",
        connected: "Conectada",
        disconnected: "Desconectada",
        ready: "Listo para firmar en Base.",
        connect: "Conecta tu billetera para continuar."
      },
      template: {
        title: "Plantilla",
        notSelected: "No seleccionada",
        hintSelected: "Puedes reemplazar o fusionar en el paso 2.",
        hintNotSelected: "Elige una plantilla para autocompletar atributos."
      },
      attributes: {
        title: "Atributos",
        cellsReady: "celdas listas",
        hint: "Añade rasgos clave para tu activo."
      }
    },
    steps: {
      guidedFlow: "Flujo Guiado",
      title: "Completa cada bloque a tu propio ritmo",
      desc: "No hay pasos forzados, pero mostramos el estado de cada sección.",
      details: {
        label: "Detalles",
        ready: "Nombre y descripción listos",
        notReady: "Completa nombre y descripción"
      },
      template: {
        label: "Plantilla",
        notSelected: "Selecciona una plantilla base"
      },
      attributes: {
        label: "Atributos",
        custom: "atributos personalizados",
        hint: "Añade o ajusta atributos clave"
      }
    },
    form: {
      detailsTitle: "Detalles del NFT",
      detailsDesc: "Nombre, descripción e imagen opcional si trabajarás con un mapa basado en imagen.",
      block1: "Bloque 1 · Identidad del activo",
      name: "Nombre del NFT",
      namePlaceholder: "ej., Finca El Molino · Viñedo",
      description: "Descripción",
      descriptionPlaceholder: "Describe tu NFT...",
      image: "Imagen (opcional)",
      imageHint: "Ideal para plantillas basadas en imágenes.",
      statusReady: "Nombre y descripción listos.",
      statusNotReady: "Completa los campos para desbloquear el minteo.",
      errorName: "El nombre es obligatorio",
      errorDesc: "La descripción es obligatoria"
    },
    templateSection: {
      title: "Plantilla y atributos",
      desc: "Selecciona plantillas, define celdas (si aplica) y añade atributos manuales.",
      block2: "Bloque 2 · Plantilla y mapa",
      galleryTitle: "Galería de plantillas",
      galleryDesc: "Cada plantilla viene con atributos predefinidos listos para fusionar o reemplazar.",
      clear: "Limpiar selección",
      select: "Seleccionar",
      selectedTitle: "Plantilla seleccionada",
      replace: "Reemplazar",
      merge: "Fusionar",
      replaceHint: "Reemplaza todos tus atributos actuales con los de la plantilla seleccionada.",
      mergeHint: "Concatena los atributos de la plantilla con los tuyos. Si la clave existe, se actualizará.",
      emptyHint: "Selecciona una plantilla para ver sus atributos y aplicarla al formulario.",
      attrs: "atributos"
    },
    mapSection: {
      defineCells: "Definir celdas en el mapa",
      imageUploaded: "Imagen subida",
      uploadFirst: "Sube una imagen en el Paso 1",
      leafletReady: "Leaflet listo para seleccionar celdas",
      available: "disponible",
      selectAll: "Seleccionar todo",
      removeAll: "Borrar todo",
      locateMe: "Ubicarme",
      rows: "Filas",
      cols: "Cols",
      clear: "Limpiar",
      done: "Listo",
      mapView: "Mapa",
      satelliteView: "Satélite",
      hideGrid: "Ocultar grilla para mover",
      searchPlaceholder: "Buscar dirección",
      searching: "Buscando...",
      search: "Buscar",
      advanced: "Coordenadas Avanzadas",
      decimal: "Grados Decimales (GD)",
      syncGo: "Sinc & Ir",
      lat: "Latitud",
      lng: "Longitud",
      dms: "Grados, Minutos, Segundos (GMS)",
      deg: "Grad",
      min: "Min",
      sec: "Seg",
      dir: "Dir",
      go: "Ir",
      cellEditor: "Editor de Celdas",
      manualAttrs: "Atributos",
      manualHint: "Ajusta, renombra o elimina atributos manualmente.",
      clearAll: "Borrar todo",
      noManual: 'No hay atributos manuales aún. Usa "Añadir" o aplica una plantilla para comenzar.',
      allSet: "Todo listo: puedes mintear cuando quieras.",
      metaVisibility: "Visibilidad de Metadatos",
      metaVisDesc: "Elige si los metadatos de tu NFT son visibles públicamente o privados.",
      public: "Público",
      private: "Privado",
      mapReady: "{{count}} celdas listas",
      mapNotReady: "Mapa no configurado",
      autoTitle: "Atributos Automáticos",
      autoDesc: "Generados desde el mapa",
      row: "Fila",
      col: "Col",
      null: "Nulo",
      of: "de",
      dupError: "Atributos duplicados"
    },
    manualSection: {
      type: "Tipo de atributo",
      typePlaceholder: "Tipo (ej., Rareza)",
      value: "Valor",
      valuePlaceholder: "Valor (ej., Legendario)",
      add: "Añadir"
    },
    summary: {
      title: "Resumen",
      subtitle: "Revisar y Mintear",
      block3: "Bloque 3 · Confirmación",
      preview: "Vista Previa de Metadatos",
      mintBtn: "Mintear NFT",
      minting: "Minteando...",
      success: "¡Activo Minteado Exitosamente!",
      retry: "Reintentar",
      sidebar: {
        preview: "Vista Previa",
        unnamed: "NFT sin nombre",
        public: "Metadatos públicos",
        private: "Metadatos privados",
        description: "Describe tu NFT para que otros entiendan qué estás tokenizando.",
        manual: "Atributos manuales",
        cells: "Celdas listas",
        checklist: "Checklist",
        percentReady: "{{score}}% listo",
        ready: "listo",
        featured: "Atributos destacados"
      },
      guide: {
        title: "Guía Rápida",
        subtitle: "Cómo mintear en 3 pasos",
        desc: "Mantén las mismas características; solo pulimos la experiencia visual.",
        step1: {
          title: "1",
          subtitle: "Completa los detalles",
          desc: "Nombre, descripción e imagen opcional. Si usarás un mapa basado en imagen, súbela aquí."
        },
        step2: {
          title: "2",
          subtitle: "Elige plantilla y celdas",
          desc: "Usa plantillas para autocompletar, abre el editor si es un mapa y asegura tener al menos una celda disponible."
        },
        step3: {
          title: "3",
          subtitle: "Firma en Base",
          desc: "Revisa el resumen en la barra lateral, confirma visibilidad y presiona Mintear. Necesitarás gas en tu billetera."
        }
      }
    },
    checklist: {
      name: "Nombre del NFT",
      description: "Descripción",
      template: "Plantilla seleccionada",
      attributes: "Atributos personalizados listos",
      map: "Mapa/Imagen configurado"
    },
    demo: {
      enabled: "Modo Demo activado",
      message: "Las acciones en esta página son simuladas; no se envían transacciones a la blockchain.",
      success: "¡Éxito! Tu transacción de demostración fue simulada y el NFT fue creado.",
      saveFailed: "Fallo al guardar en servidor: {{error}}"
    },
    errors: {
      imageRequired: "Se requiere imagen para plantilla de mapa",
      cellsRequired: "Selecciona al menos 1 celda disponible",
      connectRequired: "Conecta tu billetera para mintear.",
      failedToUpload: "Fallo al subir metadatos/imagen a IPFS",
      config: "Configuración",
      cancelled: "Firma cancelada",
      cancelledDesc: "Cancelaste la solicitud en tu billetera.",
      insufficientFunds: "Fondos insuficientes",
      insufficientFundsDesc: "No tienes suficiente ETH para gas.",
      wrongNetwork: "Red incorrecta",
      wrongNetworkDesc: "Conéctate a la red correcta e intenta de nuevo.",
      paymentRevert: "Reversión de token de pago",
      paymentRevertDesc: "Permiso/balance insuficiente para depósito.",
      rpcError: "Error de Red/RPC",
      rpcErrorDesc: "Problema del nodo. Por favor intenta de nuevo.",
      txFailed: "Transacción fallida",
      unknown: "Error desconocido",
      configTitle: "Configuración",
      addressNotFound: "Dirección no encontrada.",
      searchError: "Error buscando la dirección."
    },
    attributes: {
      mapCenter: "Centro del Mapa",
      mapLat: "Latitud del Mapa",
      mapLng: "Longitud del Mapa",
      mapZoom: "Zoom del Mapa",
      mapBounds: "Límites del Mapa",
      mapMinZoom: "Zoom Mín del Mapa",
      mapMaxZoom: "Zoom Máx del Mapa",
      mapTileUrl: "URL de Mosaicos",
      mapProvider: "Proveedor del Mapa",
      mapStyle: "Estilo del Mapa",
      mapCrs: "CRS del Mapa",
      mapSize: "Tamaño del Mapa"
    },
    templates: {
      tags: {
        general: "General",
        iot: "IoT + Datos",
        mapImage: "Mapa + Imagen",
        liveMap: "Mapa en Vivo",
        realEstate: "Bienes Raíces",
        premium: "Premium"
      },
      highlights: {
        general: "Plantilla base para activos tokenizados.",
        iot: "Para sensores, gateways y telemetría continua.",
        mapImage: "Divide una imagen en celdas tokenizables.",
        liveMap: "Tokeniza en Leaflet/OSM sin subir imágenes.",
        realEstate: "Propiedades residenciales simples.",
        premium: "Propiedades completas con amenidades."
      },
      items: {
        iotSensor: {
          name: "Tokenización Sensor IoT",
          desc: "Plantilla de tokenización para servicios y datos IoT/sensor."
        },
        mapImage: {
          name: "Imagen Tokenizada (Celdas)",
          desc: "Tokenización de mapa: selecciona celdas disponibles en la imagen."
        },
        liveMap: {
          name: "Mapa Tokenizado (Leaflet/OSM)",
          desc: "Tokenización en mapa interactivo. No requiere subir imagen."
        },
        realEstate: {
          name: "Propiedad (Básica)",
          desc: "Para propiedades simples: ciudad, habitaciones, baños, área."
        },
        realEstatePremium: {
          name: "Propiedad (Premium)",
          desc: "Incluye amoblado, estacionamiento y año."
        },
        membership: {
          name: "Membresía",
          desc: "Para acceso/beneficios: nivel y vencimiento."
        },
        artwork: {
          name: "Arte",
          desc: "Edición, autor y colección."
        },
        character: {
          name: "Personaje (Gaming)",
          desc: "Clase, rareza y poder."
        }
      }
    }
  },
  nftDetails: {
    units: {
      second: "segundo",
      seconds: "segundos",
      hour: "hora",
      hours: "horas",
      day: "día",
      days: "días",
      month: "mes",
      months: "meses"
    },
    header: {
      sale: "En Venta",
      rent: "En Alquiler",
      power: "Delegación de Derechos",
      connectBtn: "Conectar Billetera",
      mintNew: "Mintear Nuevo",
      viewAvailable: "Ver Disponibles"
    },
    alerts: {
      demoError: "Error de carga (Demo)",
      connectBtn: "Conectar Billetera",
      connect: "Por favor, conecta tu billetera para ver los detalles de este NFT y realizar acciones.",
      notFound: "NFT no encontrado",
      demoNotFound: "Propiedad de demostración no encontrada",
      notFoundDesc: "No pudimos encontrar el NFT con ID {id}. Asegúrate de estar en la red correcta."
    },
    colors: {
      green: "Verde",
      red: "Rojo",
      blue: "Azul",
      yellow: "Amarillo",
      gray: "Gris",
      white: "Blanco",
      black: "Negro"
    },
    map: {
      hideGrid: "Ocultar Cuadrícula",
      showGrid: "Mostrar Cuadrícula",
      viewFullscreen: "Pantalla Completa",
      cellColor: "Color Celda:",
      lineColor: "Color Línea:",
      close: "Cerrar"
    },
    info: {
      title: "Detalles del NFT",
      tokenUri: "tokenURI (crudo)",
      truncated: "truncado",
      copy: "Copiar",
      gateway: "Abrir en Gateway",
      cert: "Descargar Certificado",
      access: "Acceso a metadatos:",
      granted: "concedido",
      denied: "denegado",
      visibility: "Visibilidad de Metadatos",
      public: "Público: Cualquiera puede ver los metadatos",
      private: "Privado",
      loading: "Cargando...",
      changing: "Cambiando...",
      json: "Metadatos (JSON)",
      locked: "Metadatos no disponibles",
      retry: "Reintentar",
      contract: "Contrato",
      notConfigured: "No Configurado",
      attrs: "Atributos",
      noAttrs: "Sin atributos.",
      effectiveOwner: "Dueño Efectivo",
      unavailable: "No disponible",
      makePrivate: "Hacer Privado",
      makePublic: "Hacer Público",
      you: "Tú",
      demoUser: "Usuario Demo",
      attributes: {
        MapCenter: "Centro del Mapa",
        MapLatitude: "Latitud del Mapa",
        MapLongitude: "Longitud del Mapa",
        MapZoom: "Zoom del Mapa",
        MapProvider: "Proveedor del Mapa",
        MapStyle: "Estilo del Mapa",
        AssetType: "Tipo de Activo",
        TokenizedArea: "Área Tokenizada (m²)",
        EstimatedYield: "Rendimiento Estimado",
        Year: "Año",
        TokenizationStatus: "Estado de Tokenización",
        Location: "Ubicación",
        GridDefinition: "Definición de Cuadrícula",
        CellSizeRel: "Tamaño de Celda (Rel)",
        AvailableCells: "Celdas Disponibles",
        NullCells: "Celdas Nulas",
        AvailableCellIDs: "IDs de Celdas Disponibles",
        GridLineColor: "Color de Línea de Cuadrícula",
        Vineyard: "Viñedo",
        Tokenized: "Tokenizado",
        Inprocess: "En Proceso",
        Available: "Disponible"
      },
      pdf: {
        tech: "Ficha Técnica",
        tokenId: "ID Token",
        contract: "Contrato",
        chainId: "Chain ID",
        techUri: "URI Técnica",
        gateway: "Pasarela",
        footer: "Generado por KNRT Marketplace",
        fileName: "Certificado",
        trait: "Rasgo",
        value: "Valor"
      },
      fallbacks: {
        noDesc: "Sin descripción.",
        lockedDesc: "🔒 Metadatos bloqueados. Debes rentar o comprar para desbloquear.",
        lackAccess: "No se pudieron cargar los metadatos (posible falta de acceso).",
        connectPrompt: "Conecta tu billetera para intentar leer metadatos privados.",
        initContracts: "Inicializando contratos..."
      }
    },
    messages: {
      loadError: "Error al cargar estado de Derechos.",
      powerListSuccess: "¡Derechos listados con éxito!",
      invalidPrice: "Ingresa un precio válido (> 0).",
      listSuccess: "NFT listado para venta.",
      cancelSuccess: "Venta cancelada.",
      buySuccess: "Compra completada con éxito.",
      rentalListSuccess: "Listado de renta creado.",
      rentalCancelSuccess: "Listado de renta cancelado.",
      rentalOfferSuccess: "Oferta de renta enviada.",
      rentalWithdrawSuccess: "Oferta retirada.",
      rentalAcceptSuccess: "Oferta aceptada.",
      rentalEndSuccess: "Renta finalizada (si aplica).",
      powerCancelSuccess: "Listado de Derechos cancelado.",
      powerOfferSuccess: "Oferta de Derechos enviada.",
      powerWithdrawSuccess: "Oferta retirada.",
      powerAcceptSuccess: "Oferta aceptada.",
      invalidPct: "Porcentaje inválido (1–100).",
      invalidAmount: "La cantidad debe ser mayor a 0",
      min24h: "La duración debe ser de al menos 24 horas"
    },
    attributes: {
      MapCenter: "Centro del Mapa",
      MapLatitude: "Latitud",
      MapLongitude: "Longitud",
      MapZoom: "Zoom",
      MapProvider: "Proveedor",
      MapStyle: "Estilo de Mapa",
      AssetType: "Tipo de Activo",
      Country: "País",
      Region: "Región",
      TokenizedArea: "Área Tokenizada",
      EstimatedYield: "Rendimiento Est.",
      Year: "Año",
      TokenizationStatus: "Estado",
      GridDefinition: "Definición de Rejilla",
      CellSizeRel: "Tamaño Celda (Rel)",
      AvailableCells: "Celdas Disponibles",
      NullCells: "Celdas Nulas",
      AvailableCellIDs: "IDs Disponibles",
      GridLineColor: "Color de Línea"
    },
    chat: {
      title: "Chat",
      with: "Conversar con:",
      refresh: "Actualizar",
      noConvo: "Sin conversaciones activas",
      connect: "Conecta para chatear",
      you: "Tú",
      justNow: "Ahora",
      ago: "atrás",
      connectToSend: "Conecta tu billetera para enviar mensajes",
      placeholder: "Escribe un mensaje...",
      placeholderConnect: "Conecta tu billetera para escribir",
      send: "Enviar"
    },
    market: {
      tabs: {
        notListed: "Este NFT no está listado",
        choose: "Elige un mercado para listar (solo se mostrará el mercado activo).",
        sale: "Venta",
        rent: "Alquiler",
        power: "Derechos"
      },
      common: {
        basePrice: "Precio Base (KNRT)",
        placeholderPrice: "ej., 100.5",
        placeholderAmount: "1",
        duration: "Duración",
        hours: "Horas",
        days: "Días",
        months: "Meses",
        min24h: "Se requiere un mínimo de 24 horas"
      },
      sale: {
        title: "Mercado de Venta",
        price: "Precio (KNRT)",
        priceLabel: "Precio Actual",
        listBtn: "Listar para Venta",
        listing: "Listando...",
        checking: "Verificando listado...",
        listedOwner: "NFT listado para venta",
        buy: "Comprar Ahora",
        buying: "Comprando...",
        notConfigured: "Mercado de Venta no configurado",
        connectToBuy: "Conectar Billetera para Comprar",
        cancel: "Cancelar Listado",
        canceling: "Cancelando..."
      },
      rental: {
        title: "Mercado de Alquiler",
        base: "Precio Base",
        duration: "Duración del Alquiler",
        listing: "Listando...",
        listBtn: "Listar para Alquiler",
        notConfigured: "Mercado de Alquiler no configurado",
        connectMessage: "Conecta tu billetera para hacer una oferta de alquiler",
        offersTitle: "Ofertas de Alquiler",
        renterLabel: "Inquilino",
        pctLabel: "Porcentaje",
        escrowLabel: "Depósito",
        yourOffer: "Tu Oferta (%)",
        makeOffer: "Hacer Oferta",
        sending: "Enviando...",
        accepting: "Aceptando...",
        acceptBtn: "Aceptar",
        withdrawing: "Retirando...",
        withdraw: "Retirar",
        noOffers: "Sin ofertas activas.",
        history: "Historial de ofertas (retiradas/pagadas)",
        noHistory: "Sin historial.",
        activeRenters: "Inquilinos Activos",
        none: "Ninguno",
        ending: "Finalizando...",
        endRental: "Finalizar Alquiler",
        withdrawnNote: "(retirado)",
        acceptedStatus: "Activo",
        withdrawnStatus: "Terminado",
        cancel: "Cancelar Listado",
        canceling: "Cancelando...",
        listedOwner: "¡Tu NFT está listado para alquiler!"
      },
      power: {
        title: "Mercado de Derechos",
        base: "Precio Base",
        duration: "Duración",
        active: "Delegación Activa",
        upfrontLabel: "Pago por adelantado",
        payPerPeriod: "Pago por periodo",
        listing: "Listando...",
        listBtn: "Listar Derechos",
        notConfigured: "Mercado de Derechos no configurado",
        offersTitle: "Ofertas de Derechos",
        sending: "Enviando...",
        makeOffer: "Hacer Oferta",
        accepting: "Aceptando...",
        acceptBtn: "Aceptar",
        withdrawing: "Retirando...",
        withdrawBtn: "Retirar",
        renterLabel: "Delegado a",
        pctLabel: "Porcentaje",
        escrowLabel: "Custodia",
        withdrawnNote: "(ya retirado)",
        acceptedStatus: "Aceptado",
        withdrawnStatus: "Retirado",
        noHistory: "Sin historial de Derechos",
        usersAccess: "Usuarios con acceso",
        none: "Ninguno",
        yourAccess: "Tu acceso válido hasta:",
        validUntil: "Válido hasta",
        connectMessage: "Conecta tu billetera para hacer una oferta de derechos",
        cancel: "Cancelar Listado",
        canceling: "Cancelando..."
      }
    }
  },
  common: {
    placeholderPrice: "ej., 100.5",
    placeholderAmount: "Cantidad",
    hours: "Horas",
    days: "Días",
    months: "Meses",
    min24h: "Mínimo: 24 horas"
  },
  tabs: {
    sale: "Venta",
    rent: "Renta",
    power: "Derechos",
    notListed: "Este NFT no está listado",
    choose: "Elige un mercado para listar (solo se mostrará el mercado activo)."
  },
  chat: {
    title: "Chat Privado",
    with: "Chatear con:",
    refresh: "Refrescar Lista",
    noConvo: "Sin conversaciones. ¡Haz una oferta para empezar a chatear!",
    connect: "Conecta billetera para ver conversaciones",
    justNow: "ahora mismo",
    ago: "atrás",
    connectToSend: "Conecta billetera para enviar mensajes.",
    placeholder: "Escribe un mensaje... (Enter para enviar, Shift+Enter para nueva línea)",
    placeholderConnect: "Conecta billetera para chatear",
    send: "Enviar Mensaje",
    sending: "enviando...",
    noMessages: "Aún no hay mensajes. ¡Empieza la conversación!",
    you: "Tú"
  },
  allNfts: {
    title: "Propiedades NFT",
    description: "Todos los NFTs minteados y su estado en el mercado",
    loading: "Cargando propiedades...",
    contract: "Contrato",
    banner: {
      text: "Conecta tu billetera para una mejor experiencia gestionando tus propiedades.",
      connect: "Conectar"
    },
    subtitle: "Todos los NFTs minteados y su estado en el mercado",
    filters: {
      search: "Buscar",
      searchPlaceholder: "nombre, desc, id, rasgos...",
      market: "Mercado",
      marketOptions: {
        all: "Todos",
        sale: "Venta",
        rent: "Alquiler",
        power: "Derechos",
        none: "No listados"
      },
      owner: "Propietario contiene",
      ownerPlaceholder: "ej., 0x123...",
      saleMin: "Venta min (KNRT)",
      saleMax: "Venta max (KNRT)",
      rentMin: "Alq min (KNRT)",
      rentMax: "Alq max (KNRT)",
      durationMin: "Duración min (s)",
      durationMax: "Duración max (s)",
      traitKey: "Rasgo (clave)",
      traitKeyPlaceholder: "ej., Ubicación",
      traitValue: "Valor contiene",
      traitValuePlaceholder: "ej., Madrid",
      sortBy: "Ordenar por",
      sort: "Ordenar por",
      sortOptions: {
        recent: "Más reciente",
        tokenAsc: "Token ID ↑",
        tokenDesc: "Token ID ↓",
        priceAsc: "Precio ↑",
        priceDesc: "Precio ↓"
      },
      clear: "Limpiar",
      onlyOffers: "Solo con ofertas"
    },
    stats: {
      total: "Total",
      sale: "En venta",
      rent: "En alquiler",
      power: "Derechos",
      none: "No listados",
      filtered: "Filtrados"
    },
    empty: {
      noProperties: "Sin propiedades",
      noPropertiesDesc: "Aún no se han minteado NFTs o el contrato está vacío.",
      mintFirst: "Mintea tu primer NFT",
      noResults: "Sin resultados con los filtros actuales.",
      clearFilters: "Limpiar filtros"
    },
    card: {
      viewDetails: "Ver Detalles",
      buy: "Comprar",
      metadataLocked: "Metadatos bloqueados",
      unlockHint: "Debes alquilar o comprar para desbloquear.",
      viewGateway: "Ver imagen en gateway",
      owner: "Dueño",
      na: "N/D",
      saleTitle: "En Venta",
      rentTitle: "En Alquiler",
      powerTitle: "Acceso de Derechos",
      basePrice: "Precio base",
      duration: "Duración",
      active: "Activos:",
      offers: "Ofertas:",
      locked: "Bloqueado",
      lockedDesc: "🔒 Metadatos bloqueados. Debes rentar o comprar para desbloquear.",
      metadataUnavailable: "Metadatos no disponibles",
      metaUnavailable: "Metadatos no disponibles",
      mode: {
        none: "Ninguno",
        sale: "En Venta",
        rent: "En Alquiler",
        power: "Derechos",
        unknown: "Desconocido"
      }
    },
    units: {
      min: "min",
      hrs: "hrs",
      days: "días"
    },
    error: {
      title: "Error de Carga",
      retry: "Reintentar"
    }
  },
  myNfts: {
    title: "Mis Propiedades NFT",
    subtitle: "Tus NFTs y su estado en venta / alquiler / poder",
    connectWallet: {
      title: "Billetera Desconectada",
      desc: "Conecta tu billetera para ver tus NFTs y su estado en el mercado.",
      button: "Conectar Billetera"
    },
    empty: {
      title: "Aún no posees NFTs",
      desc: "Mintea o adquiere un NFT para verlo aquí.",
      button: "Mintear NFT"
    },
    profile: {
      badge: "Perfil de Billetera",
      title: "Tu Dashboard de Billetera",
      subtitle: "Perfil completo on-chain en Base: balances, historial, swaps, PnL, actividad multi-chain y despliegues de contratos.",
      connected: "Conectado",
      refresh: "Refrescar datos",
      connect: {
        title: "Conecta tu Billetera",
        desc: "Accede a tu perfil completo incluyendo balances, análisis PnL, transacciones y estadísticas multi-chain.",
        hint: "Conecta tu billetera para ver tu perfil, balances, historial de transacciones, PnL y actividad en cadenas.",
        button: "Conectar Billetera",
        connecting: "Conectando…"
      },
      stats: {
        address: "Dirección",
        viewScan: "Ver en Basescan",
        network: "Red",
        chainId: "ID de Cadena",
        tx: "Tx",
        tokenTx: "Tx Token",
        nfts: "NFTs",
        totalValue: "Valor Total",
        poweredBy: "Potenciado por Moralis",
        estimatedValue: "Valor estimado en USD a través de posiciones nativas y ERC-20."
      },
      pnl: {
        title: "Resumen PnL",
        subtitle: "Beneficio realizado y actividad de comercio",
        realized: "PnL Realizado (USD)",
        realizedDesc: "Basado solo en operaciones realizadas (excluye PnL no realizado).",
        trades: "Operaciones",
        buysSells: "Compras / Ventas",
        volume: "Volumen comercial",
        emptyTitle: "Aún no hay datos de PnL realizado",
        emptyDesc: "Empieza a operar para ver análisis de ganancias y pérdidas por tokens y periodos.",
        breakdown: "Desglose de PnL por Token",
        topTokens: "Mejores {{count}} tokens",
        noData: "No hay datos de PnL por token disponibles para este periodo.",
        tradesCount: "ops"
      },
      chain: {
        title: "Actividad de Cadena",
        subtitle: "Redes donde esta billetera ha estado activa",
        chains: "cadenas",
        empty: "No se detectó actividad en cadenas para esta billetera aún.",
        first: "Primera:",
        last: "Última:"
      },
      swaps: {
        title: "Swaps Recientes",
        subtitle: "Swaps DEX detectados vía Moralis",
        empty: "No se encontraron datos de swap para esta billetera aún.",
        bought: "Comprado",
        sold: "Vendido",
        price: "Px:"
      },
      balances: {
        title: "Balances",
        refresh: "Refrescar",
        native: "Base ETH",
        nativeDesc: "ETH (nativo)",
        emptyToken: "No se encontraron tokens ERC-20"
      },
      history: {
        title: "Actividad Reciente (Historial Completo)",
        lastEntries: "Últimas {{count}} entradas",
        received: "Recibido",
        sent: "Enviado",
        contract: "Interacción contrato",
        from: "De",
        to: "A",
        empty: "No hay transacciones recientes"
      },
      deployments: {
        title: "Despliegues de Contratos",
        empty: "No se detectaron despliegues de contratos aún. Cuando esta billetera despliegue contratos, aparecerán aquí.",
        deployed: "Contrato desplegado",
        block: "Bloque",
        fee: "Tarifa:",
        gas: "Gas:"
      },
      footer: {
        desc: "Dashboard de análisis de propiedad on-chain y billetera.",
        powered: "Potenciado por Moralis & Base"
      },
      relativeTimes: {
        justNow: "Ahora mismo",
        minsAgo: "hace {{count}}m",
        hrsAgo: "hace {{count}}h",
        daysAgo: "hace {{count}}d"
      }
    },
    filters: {
      search: "Buscar",
      market: "Mercado",
      relationship: "Mi Relación",
      owner: "Dueño contiene",
      owned: "✓ Propio",
      renting: "🏠 Alquilando",
      power: "⚡ Derechos",
      unlisted: "No listado",
      sortOptions: {
        recent: "Más reciente",
        oldest: "Más antiguo",
        priceAsc: "Precio Venta ↑",
        priceDesc: "Precio Venta ↓",
        rentAsc: "Precio Renta ↑",
        rentDesc: "Precio Renta ↓",
        durAsc: "Duración ↑",
        durDesc: "Duración ↓"
      }
    },
    units: {
      min: "min",
      hrs: "hrs",
      days: "días"
    },
    error: {
      title: "Error de Carga",
      retry: "Reintentar"
    },
    badges: {
      owned: "✓ Propio",
      renting: "🏠 Alquilando",
      power: "⚡ Derechos",
      yourRental: "🏠 Tu Alquiler",
      yourPower: "⚡ Tu Acceso de Derechos",
      expiresAt: "Expira el:",
      daysRemaining: "Días restantes:"
    }
  },
  profile: {
    badge: "Panel de Wallet",
    title: "Perfil de Wallet",
    subtitle: "Tu Panel de Control",
    connected: "Conectado",
    desc: "Perfil completo on-chain en Base: balances, historial, intercambios, PnL, actividad multi-cadena y despliegues de contratos.",
    connect: {
      title: "Conecta tu Wallet",
      hint: "Conecta tu wallet para ver tu perfil, balances e historial de transacciones.",
      button: "Conectar Wallet",
      connecting: "Conectando...",
      desc: "Conecta tu billetera para ver tu perfil, balances, historial de transacciones, PnL y actividad en la cadena."
    },
    refresh: "Actualizar datos",
    stats: {
      address: "Dirección",
      viewScan: "Ver en Basescan",
      network: "Red",
      chainId: "Chain ID",
      tx: "Transacciones",
      tokenTx: "Transferencias de Tokens",
      nfts: "NFTs",
      totalValue: "Valor Total",
      poweredBy: "Moralis",
      estimatedValue: "Valor estimado del portafolio"
    },
    cards: {
      address: "Dirección",
      viewBaseScan: "Ver en Basescan",
      network: "Red",
      chainId: "Chain ID",
      totalValue: "Valor Total",
      poweredBy: "Potenciado por Moralis",
      estimatedValue: "Valor estimado en USD a través de posiciones nativas y ERC-20."
    },
    pnl: {
      title: "Resumen PnL",
      subtitle: "Tus ganancias y pérdidas a lo largo del tiempo",
      desc: "Ganancia realizada y actividad comercial",
      realizedPnL: "PnL Realizado (USD)",
      realizedNote: "Basado solo en operaciones realizadas (excluye PnL no realizado).",
      trades: "Operaciones",
      buysSells: "Compras / Ventas",
      volume: "Volumen comercial",
      noData: "Aún no hay datos de PnL realizado",
      noDataDesc: "Comienza a operar para ver análisis de ganancias y pérdidas en tokens y plazos.",
      breakdown: "Desglose de PnL por Token",
      topTokens: "Mejores tokens",
      emptyTitle: "Sin actividad de trading",
      emptyDesc: "Comienza a operar para ver tus datos de PnL"
    },
    chain: {
      title: "Actividad por Cadena",
      subtitle: "Tu actividad en diferentes cadenas",
      desc: "Redes donde esta billetera ha estado activa",
      noActivity: "No se ha detectado actividad en cadena para esta billetera.",
      chains: "cadenas activas",
      empty: "Sin actividad registrada aún",
      first: "Primera tx",
      last: "Última tx"
    },
    activity: {
      title: "Actividad en Cadena",
      desc: "Redes donde esta billetera ha estado activa",
      noActivity: "No se ha detectado actividad en cadena para esta billetera.",
      first: "Primera",
      last: "Última"
    },
    swaps: {
      title: "Recent Swaps",
      subtitle: "Tus últimas transacciones de swap",
      desc: "Intercambios DEX detectados vía Moralis",
      noSwaps: "No se encontraron datos de intercambio para esta billetera.",
      empty: "No se encontraron swaps",
      bought: "Comprado",
      sold: "Vendido",
      buy: "Compra",
      sell: "Venta"
    },
    balances: {
      title: "Balances",
      refresh: "Actualizar",
      native: "Base ETH",
      nativeDesc: "Balance de token nativo",
      erc20: "Tokens ERC-20",
      noTokens: "No se encontraron tokens ERC-20",
      emptyToken: "No se encontraron tokens"
    },
    history: {
      title: "Historial de Transacciones",
      lastEntries: "Transacciones recientes",
      empty: "No se encontraron transacciones",
      send: "Enviado",
      receive: "Recibido",
      contract: "Contrato"
    },
    recentActivity: {
      title: "Actividad Reciente (Historial Completo)",
      received: "Recibido",
      sent: "Enviado",
      contract: "Interacción de contrato",
      noRecent: "No hay transacciones recientes"
    },
    deployments: {
      title: "Contratos Desplegados",
      noDeployments: "No se detectaron despliegues de contratos. Cuando esta billetera despliegue contratos, aparecerán aquí.",
      empty: "Aún no has desplegado contratos",
      deployed: "Contrato desplegado",
      contract: "Contrato",
      block: "Bloque",
      fee: "Tarifa",
      gas: "Gas Usado"
    },
    footer: {
      desc: "Un ecosistema flexible para gestionar propiedades basadas en NFT, ventas, alquileres y delegación de poder.",
      powered: "Impulsado por Base y Moralis"
    }
  },
  swapPage: {
    badge: "Intercambios beta",
    title: "Intercambia tokens al instante",
    subtitle: "Conversión directa entre KNRT y tus tokens favoritos con la misma experiencia clara que el resto de la app.",
    tabs: {
      swap: "Intercambiar"
    },
    form: {
      sell: "Vender",
      receive: "Recibir",
      balance: "Saldo",
      max: "MAX",
      searching: "Buscando el mejor precio...",
      estimated: "Valor estimado",
      slippage: "Slippage",
      route: "Ruta",
      router: "KNRT Router",
      network: "Base",
      processing: "Procesando...",
      button: "Swap ahora",
      connect: "Conectar wallet",
      ready: "listo para firmar.",
      switchTokens: "Intercambiar tokens"
    },
    modal: {
      title: "Seleccionar token",
      search: "Buscar por nombre o símbolo",
      selected: "Seleccionado",
      noTokens: "No se encontraron tokens"
    },
    alerts: {
      success: "¡Intercambio completado con éxito!",
      noRoute: "No se encontró una ruta de liquidez",
      error: "Error al obtener la cotización",
      insufficientFunds: "Fondos insuficientes para gas (ETH) o token.",
      rejected: "Transacción rechazada por el usuario.",
      failed: "El intercambio falló. Por favor, inténtalo de nuevo."
    }
  },
  deployErc20: {
    title: "Lanza tu token ERC-20 con una experiencia clara y guiada.",
    subtitle: "Configura el nombre, símbolo, decimales y el suministro inicial. El contrato se lanzará en Base y el suministro se enviará al destinatario.",
    badge: "Desplegar · ERC-20",
    network: "Red Base",
    wallet: {
      title: "Wallet",
      connected: "Conectada",
      notConnected: "No conectada",
      ready: "Lista para desplegar en Base.",
      connectPrompt: "Conecta tu wallet para continuar."
    },
    decimalsInfo: {
      title: "Decimales",
      desc: "El estándar es 18. Ajusta si es necesario."
    },
    readiness: {
      title: "Preparación",
      allSet: "¡Todo listo!",
      completeFields: "Completa los campos para desplegar."
    },
    guide: {
      tag: "Guía de despliegue",
      title: "Completa cada sección a tu ritmo",
      desc: "Sin pasos forzados, te mostramos el estado de cada campo.",
      states: {
        ready: "Listo",
        pending: "Por favor completa este campo"
      },
      checks: {
        name: "Nombre del Token",
        symbol: "Símbolo del Token",
        decimals: "Decimales Válidos",
        recipient: "Dirección Destino"
      }
    },
    connectSection: {
      title: "Conecta Tu Wallet",
      desc: "Conecta tu wallet para desplegar contratos ERC-20 en Base.",
      btnConnect: "Conectar Wallet",
      btnConnecting: "Conectando…"
    },
    form: {
      step1: "Información del Token",
      step1Desc: "Nombre, símbolo y decimales",
      name: "Nombre del Token",
      namePlaceholder: "ej. MiToken",
      symbol: "Símbolo del Token",
      symbolPlaceholder: "ej. MTK",
      decimals: "Decimales",
      decimalsNote: "El estándar es 18. Usa 0 para unidades enteras.",
      step2: "Suministro Inicial & Destinatario",
      step2Desc: "Define el minteo y distribución",
      supply: "Suministro Inicial (legible por humanos)",
      supplyPlaceholder: "ej. 1000000",
      supplyBaseUnits: "= {value} unidades base (con {decimals} decimales)",
      supplyInvalid: "Cantidad inválida para estos decimales",
      useSigner: "Enviar suministro inicial a mi wallet",
      recipient: "Dirección del Destinatario",
      recipientPlaceholder: "0x…",
      successTitle: "¡Contrato desplegado con éxito!",
      addressLabel: "Dirección:",
      txLabel: "Transacción:",
      viewTx: "Ver en Basescan",
      btnDeploying: "Desplegando…",
      btnDeploy: "Desplegar Token ERC-20"
    },
    preview: {
      tag: "Vista en Vivo",
      title: "Resumen del Token",
      name: "Nombre",
      symbol: "Símbolo",
      decimals: "Decimales",
      supply: "Suministro Inicial",
      recipient: "Destinatario",
      empty: "—"
    },
    checklist: {
      tag: "Lista de Verificación"
    },
    tips: {
      tag: "Consejos Rápidos",
      nameTitle: "Nombre:",
      nameDesc: 'Nombre legible (ej. "MiToken").',
      symbolTitle: "Símbolo:",
      symbolDesc: 'Abreviatura del token (ej. "MTK").',
      decimalsTitle: "Decimales:",
      decimalsDesc: "Típicamente 18. Usa 0 para unidades enteras.",
      supplyTitle: "Suministro:",
      supplyDesc: "Número de tokens en formato legible."
    },
    errors: {
      walletNotDetected: "Wallet no detectada",
      walletNotDetectedDesc: "Instala o habilita una wallet compatible (EIP-1193).",
      connectWallet: "Conecta tu wallet",
      connectWalletDesc: "Necesitas conectar una wallet primero.",
      requiredFields: "Campos requeridos",
      requiredFieldsDesc: "El Nombre y el Símbolo son requeridos.",
      invalidDecimals: "Decimales inválidos",
      invalidDecimalsDesc: "Usa un entero entre 0 y 30.",
      invalidRecipient: "Destinatario inválido",
      invalidRecipientDesc: "La dirección del destinatario no es válida.",
      invalidSupply: "Suministro inicial inválido",
      invalidSupplyDesc: "No se pudo convertir '{value}' con {decimals} decimales.",
      deployedNoAddress: "Desplegado, pero sin dirección",
      deployedNoAddressDesc: "No se pudo leer la dirección. Revisa el explorador para la transacción.",
      noFactory: "No hay fábrica ERC20 configurada",
      noFactoryDesc: "Configura `contracts.erc20Factory` o implementa `actions.deployErc20()` en tu hook.",
      signatureCancelled: "Firma cancelada",
      signatureCancelledDesc: "Cancelaste la transacción en tu wallet.",
      insufficientFunds: "Fondos insuficientes",
      insufficientFundsDesc: "No tienes saldo suficiente para el gas.",
      wrongNetwork: "Red incorrecta",
      wrongNetworkDesc: "Cambia a la red correcta en tu wallet e intenta de nuevo.",
      couldNotDeploy: "No se pudo desplegar",
      deploymentError: "Error de despliegue."
    }
  },
  newPosition: {
    title: "Nueva posición",
    subtitle: "Tus posiciones",
    helpChoose: "Ayúdame a elegir",
    step1: {
      tag: "Paso 1",
      title: "Seleccionar par de tokens y tarifas"
    },
    step2: {
      tag: "Paso 2",
      title: "Definir rango de precios y depositar"
    },
    pair: {
      edit: "Editar",
      select: "Seleccionar par",
      desc: "Elige los tokens para los que quieres proveer liquidez."
    },
    fee: {
      title: "Nivel de tarifa",
      desc: "Elige una tarifa que se ajuste a tu estrategia.",
      search: "Buscar niveles"
    },
    range: {
      title: "Configurar rango de precios",
      desc: "Rango personalizado para concentrar liquidez.",
      full: "Rango completo",
      custom: "Rango personalizado",
      currentPrice: "Precio actual",
      loading: "Cargando...",
      error: "Error: {err}",
      reset: "Restablecer",
      minPrice: "Precio min",
      maxPrice: "Precio max"
    },
    deposit: {
      label: "Depositar {symbol}",
      balance: "Balance"
    },
    strategy: {
      title: "¿Necesitas orientación?",
      desc: "Las estrategias de precio te ayudan a posicionar tu liquidez."
    },
    action: {
      continue: "Continuar",
      depositing: "Depositando tokens",
      btnDeposit: "Depositar tokens",
      approve: "Aprobar {symbol}"
    },
    promo: {
      tag: "Opera nuevos tokens en Unichain",
      title: "DOGE, XRP, XPL, ZEC — ahora disponibles en Unichain.",
      btn: "Descubrir pools"
    },
    modal: {
      title: "Seleccionar token",
      search: "Buscar por nombre o símbolo",
      selected: "Seleccionado",
      notFound: "No se encontraron tokens"
    },
    errors: {
      enterAmounts: "Por favor ingresa cantidades",
      poolInvalid: "Pool no inicializado o precio inválido. No se puede emitir.",
      insufficientBalance: "Saldo de {symbol} insuficiente",
      rejected: "Transacción rechazada por el usuario.",
      insufficientFunds: "Fondos insuficientes para gas + valor. Asegúrate de tener suficiente ETH.",
      mintFailed: "Emisión fallida: {msg}"
    },
    process: {
      starting: "Iniciando...",
      approving: "Aprobando {symbol}",
      minting: "Emitiendo Posición"
    },
    tiers: {
      t1: "Ideal para pares muy estables.",
      t2: "Ideal para pares estables.",
      t3: "Ideal para la mayoría de los pares.",
      t4: "Ideal para pares exóticos."
    },
    strategies: {
      stable: {
        title: "Estable",
        copy: "Bueno para stablecoins o pares de baja volatilidad"
      },
      wide: {
        title: "Amplio",
        copy: "Bueno para pares volátiles"
      },
      lower: {
        title: "Inclinado inferior",
        copy: "Aporta liquidez si el precio baja"
      },
      upper: {
        title: "Inclinado superior",
        copy: "Aporta liquidez si el precio sube"
      }
    }
  },
  positions: {
    title: "Tus posiciones",
    subtitle: "Portafolio · Liquidez",
    wallet: "Billetera: ",
    refresh: "Actualizar",
    manageAlerts: "Gestionar alertas",
    newPosition: "Nueva posición",
    tag: "Uniswap v3 Pools",
    warning: {
      title: "Discrepancia de Billetera",
      desc: "Las posiciones a continuación están registradas a:",
      connected: "Actualmente estás conectado con:",
      resolution: "Debes cambiar a la billetera dueña para gestionar estas posiciones."
    },
    card: {
      smartWallet: "Smart Wallet:",
      position: "Posición #{id}",
      active: "Activa",
      liquidity: "Liquidez",
      token0: "Token0",
      token1: "Token1",
      viewDetails: "Ver Detalles"
    },
    empty: {
      title: "Sin posiciones",
      subtitle: "No tienes ninguna posición de liquidez.",
      desc: "Crea una nueva posición para comenzar a ganar comisiones y recompensas en pools elegibles. Explora pares y define tu rango de precios ideal.",
      debugInfo: "Información de Depuración:",
      debugConnected: "Billetera Conectada:",
      debugResolution: "Si acabas de crear una posición pero no la ves, verifica si la dirección de tu billetera coincide con la usada para la transacción.",
      explorePools: "Explorar pools",
      newPosition: "Nueva posición"
    }
  },
  bot: {
    title: "Bot de Trading",
    subtitle: "Automatización de Mercado",
    status: {
      active: "Activo",
      inactive: "Inactivo",
      running: "Ejecutando...",
      idle: "En espera"
    },
    config: {
      title: "Configuración del bot",
      frequency: "Frecuencia (segundos)",
      minAmount: "Monto Mínimo (KNRT)",
      maxAmount: "Monto Máximo (KNRT)",
      mode: "Modo de Trading",
      walletLabel: "Wallet del Bot",
      adminNotice: "Debe estar en ADMIN_WALLETS",
      buy: "Comprar",
      sell: "Vender",
      rnd: "Aleat",
      sec: "SEG",
      modes: {
        random: "Aleatorio (Compra/Venta)",
        buy: "Solo Compra (Sube Precio)",
        sell: "Solo Venta (Baja Precio)"
      }
    },
    stats: {
      balance: "Balance Admin",
      transactions: "Transacciones",
      volume: "Volumen Generado"
    },
    logs: {
      title: "Registro de Actividad",
      emptyLine1: "Sin actividad reciente",
      emptyLine2: "Inicia el bot para ver trades aquí",
      buy: "COMPRA",
      sell: "VENTA",
      success: "Éxito",
      failed: "Fallido",
      pending: "Pendiente",
      viewTx: "Ver TX",
      lastError: "Último Error",
      clear: "Limpiar Historial"
    },
    actions: {
      start: "Iniciar Bot",
      stop: "Detener Bot",
      clearLogs: "Limpiar Registros",
      connect: "Conectar Wallet"
    },
    restricted: {
      title: "Acceso Restringido",
      desc: "Por favor, conecta una wallet de administrador para acceder a esta herramienta.",
      connect: "Conectar Wallet"
    }
  },
  login: {
    title: "Bienvenido de nuevo",
    subtitle: "Accede a tu portafolio de NFTs, gestiona tus propiedades y explora el mercado.",
    features: {
      wallet: "Wallet gestionada con cifrado seguro",
      trade: "Intercambia NFTs en Base Network",
      security: "Seguridad de nivel empresarial"
    },
    form: {
      title: "Iniciar sesión",
      subtitle: "Ingresa tus credenciales para acceder a tu cuenta",
      email: "Correo Electrónico",
      emailPlaceholder: "tu@ejemplo.com",
      password: "Contraseña",
      passwordPlaceholder: "••••••••",
      submit: "Iniciar sesión",
      submitting: "Iniciando sesión...",
      noAccount: "¿No tienes una cuenta?",
      createAccount: "Crear cuenta",
      terms: "Al iniciar sesión, aceptas nuestros",
      termsLink: "Términos de Servicio",
      and: "y la",
      privacyLink: "Política de Privacidad",
      metamaskEmailTitle: "Tu correo",
      metamaskEmailSubtitle: "Es la primera vez con esta wallet — añade un correo para tu cuenta (avisos y recuperación).",
      metamaskEmailSubmit: "Continuar",
      metamaskEmailSubmitting: "Guardando…",
      metamaskEmailBack: "Cancelar y firmar de nuevo"
    }
  },
  register: {
    title: "Comienza tu viaje",
    subtitle: "Crea tu cuenta y obtén una wallet gestionada segura generada automáticamente para ti.",
    features: {
      wallet: {
        title: "Wallet autogenerada",
        desc: "Wallet de Ethereum segura creada para ti"
      },
      security: {
        title: "Seguridad empresarial",
        desc: "Cifrado AES-256 para tus llaves"
      },
      extensions: {
        title: "Sin extensiones",
        desc: "Intercambia NFTs sin MetaMask"
      }
    },
    form: {
      title: "Crear Cuenta",
      subtitle: "Únete a KNRT y comienza a gestionar tus propiedades NFT",
      name: "Nombre completo",
      namePlaceholder: "Juan Pérez",
      email: "Correo Electrónico",
      emailPlaceholder: "tu@ejemplo.com",
      password: "Contraseña",
      passwordPlaceholder: "••••••••",
      minChars: "Mínimo 8 caracteres",
      submit: "Crear Cuenta",
      submitting: "Creando cuenta...",
      hasAccount: "¿Ya tienes una cuenta?",
      signIn: "Iniciar sesión",
      terms: "Al crear una cuenta, aceptas nuestros",
      termsLink: "Términos de Servicio",
      and: "y la",
      privacyLink: "Política de Privacidad"
    }
  },
  wallet: {
    connect: "Conectar Billetera",
    metamask: "MetaMask / Web3",
    metamaskDesc: "Conectar usando billetera de navegador",
    email: "Correo",
    emailDesc: "Iniciar sesión o crear cuenta",
    terms: "Al conectar, aceptas nuestros Términos de Servicio y Política de Privacidad."
  },
  docs: {
    hero: {
      badge: "Whitepaper completo paso a paso",
      title1: "KNRT Marketplace",
      title2: "Para Todos",
      subtitle1: "Aprende a crear, comprar, vender y alquilar NFTs en la blockchain.",
      subtitle2: "No se requieren conocimientos técnicos previos.",
      stats: {
        markets: "Mercados",
        steps: "Pasos Simples",
        secure: "Seguro"
      }
    }
  }
};

const loadTranslation_server_VeIizmDEir8 = /* @__PURE__ */ _regSymbol(async (lang, asset) => {
  try {
    const normalizedLang = lang.toLowerCase();
    const isEn = normalizedLang.startsWith("en");
    console.log(`[Speak Loader] Request: lang=${lang}, asset=${asset}`);
    const data = isEn ? en : es;
    if (!data) {
      console.warn(`[Speak Loader] Warning: No data found for lang ${lang}`);
      return null;
    }
    const response = {
      ...data,
      ...typeof data[asset] === "object" ? data[asset] : {}
    };
    console.log(`[Speak Loader] Success: lang=${lang}, asset=${asset}, returning hybrid dataset`);
    return response;
  } catch (err) {
    console.error(`[Speak Loader] Error loading lang=${lang}, asset=${asset}:`, err);
    return null;
  }
}, "VeIizmDEir8");
const loadTranslation$ = serverQrl(/* @__PURE__ */ inlinedQrlDEV(loadTranslation_server_VeIizmDEir8, "loadTranslation_server_VeIizmDEir8", {
  file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/src/speak-functions.ts",
  lo: 283,
  hi: 1435,
  displayName: "speak-functions.ts_loadTranslation_server"
}));
const translationFn = {
  loadTranslation$
};

const root_component_cVQdHOTioT8 = () => {
  useQwikSpeak({
    config,
    translationFn
  });
  const loc = useSpeakLocale();
  return /* @__PURE__ */ _jsxC(QwikCityProvider, {
    viewTransition: true,
    children: [
      /* @__PURE__ */ _jsxQ("head", null, null, [
        /* @__PURE__ */ _jsxQ("meta", null, {
          charSet: "utf-8"
        }, null, 3, null, {
          fileName: "root.tsx",
          lineNumber: 28,
          columnNumber: 9
        }),
        /* @__PURE__ */ _jsxQ("link", null, {
          rel: "manifest",
          href: "/manifest.json"
        }, null, 3, null, {
          fileName: "root.tsx",
          lineNumber: 29,
          columnNumber: 9
        }),
        /* @__PURE__ */ _jsxC(RouterHead, null, 3, "2v_0", {
          fileName: "root.tsx",
          lineNumber: 30,
          columnNumber: 9
        }),
        /* @__PURE__ */ _jsxC(ServiceWorkerRegister, null, 3, "2v_1", {
          fileName: "root.tsx",
          lineNumber: 31,
          columnNumber: 9
        })
      ], 1, null, {
        fileName: "root.tsx",
        lineNumber: 27,
        columnNumber: 7
      }),
      /* @__PURE__ */ _jsxQ("body", null, {
        lang: _fnSignal((p0) => p0.lang, [
          loc
        ], "p0.lang")
      }, /* @__PURE__ */ _jsxC(RouterOutlet, null, 3, "2v_2", {
        fileName: "root.tsx",
        lineNumber: 34,
        columnNumber: 9
      }), 1, null, {
        fileName: "root.tsx",
        lineNumber: 33,
        columnNumber: 7
      })
    ],
    [_IMMUTABLE]: {
      viewTransition: _IMMUTABLE
    }
  }, 1, "2v_3", {
    fileName: "root.tsx",
    lineNumber: 26,
    columnNumber: 5
  });
};
const Root = /* @__PURE__ */ componentQrl(/* @__PURE__ */ inlinedQrlDEV(root_component_cVQdHOTioT8, "root_component_cVQdHOTioT8", {
  file: "C:/Users/golfredo/Documents/apps/crypto-helper/qwik-crypto-helper/src/root.tsx",
  lo: 419,
  hi: 1048,
  displayName: "root.tsx_root_component"
}));

function entry_ssr(opts) {
  const extra = opts.containerAttributes;
  const mergedClass = [
    "vt-root",
    extra?.class
  ].filter(Boolean).join(" ").trim();
  return renderToStream(/* @__PURE__ */ _jsxC(Root, null, 3, "0j_0", {
    fileName: "entry.ssr.tsx",
    lineNumber: 24,
    columnNumber: 25
  }), {
    manifest,
    ...opts,
    // Use container attributes to set attributes on the html tag.
    containerAttributes: {
      lang: "en-US",
      ...opts.containerAttributes,
      class: mergedClass || "vt-root"
    }
  });
}

export { entry_ssr as default };
//# sourceMappingURL=entry.ssr.mjs.map
