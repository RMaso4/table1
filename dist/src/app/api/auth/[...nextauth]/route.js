"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = void 0;
// src/app/api/auth/[...nextauth]/route.ts
const next_auth_1 = __importDefault(require("next-auth"));
const auth_1 = require("@/lib/auth");
// Create the handler
const handler = (0, next_auth_1.default)(auth_1.authOptions);
exports.GET = handler;
exports.POST = handler;
