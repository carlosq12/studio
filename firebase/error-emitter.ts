import { EventEmitter } from 'events';

// This is a client-side only event emitter
const errorEmitter = typeof window !== 'undefined' ? new EventEmitter() : null;

if (errorEmitter) {
    errorEmitter.setMaxListeners(50);
}


export { errorEmitter };
