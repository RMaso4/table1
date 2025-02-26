"use strict";
// src/lib/pulseInit.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = init;
// Import using ES Module syntax
const pulseService_1 = require("./pulseService");
// Default export for dynamic import in server.js
async function init() {
    try {
        console.log('Initializing real-time updates...');
        await (0, pulseService_1.initPulseStreams)();
        console.log('Real-time updates initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize real-time updates:', error);
    }
}
