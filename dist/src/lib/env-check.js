"use strict";
// src/lib/env-check.ts
/**
 * This file checks if critical environment variables are loaded and logs them
 * Import it early in your application to validate environment setup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEnvironmentVariables = checkEnvironmentVariables;
function checkEnvironmentVariables() {
    const requiredVars = [
        'JWT_SECRET',
        'NEXTAUTH_SECRET',
        'DATABASE_URL',
        'NEXT_PUBLIC_BASE_URL',
        'NEXTAUTH_URL'
    ];
    const optionalVars = [
        'PULSE_API_KEY'
    ];
    console.log('========== ENVIRONMENT VARIABLE CHECK ==========');
    // Check required variables
    let missingVars = 0;
    requiredVars.forEach(varName => {
        const exists = !!process.env[varName];
        console.log(`${varName}: ${exists ? 'LOADED ✓' : 'MISSING! ✗'}`);
        if (!exists)
            missingVars++;
    });
    // Check optional variables
    optionalVars.forEach(varName => {
        const exists = !!process.env[varName];
        console.log(`${varName}: ${exists ? 'LOADED ✓' : 'NOT FOUND (Optional)'}`);
    });
    if (missingVars > 0) {
        console.error(`CRITICAL ERROR: ${missingVars} required environment variables are missing!`);
    }
    else {
        console.log('Environment check complete - all required variables are set.');
    }
    console.log('===============================================');
}
// Auto-run check if imported
checkEnvironmentVariables();
