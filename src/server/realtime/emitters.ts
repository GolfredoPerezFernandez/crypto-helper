import { EventEmitter } from "node:events";

export const whaleEmitter = new EventEmitter();
export const traderEmitter = new EventEmitter();
export const smartEmitter = new EventEmitter();

whaleEmitter.setMaxListeners(100);
traderEmitter.setMaxListeners(100);
smartEmitter.setMaxListeners(100);
