"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
// app/api/permissions/route.ts sus
const server_1 = require("next/server");
const next_1 = require("next-auth/next");
const auth_1 = require("@/lib/auth");
const prisma_1 = require("@/lib/prisma");
async function GET() {
    try {
        const session = await (0, next_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: session.user.email },
        });
        if (!user) {
            return server_1.NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const permissions = await prisma_1.prisma.columnPermission.findMany({
            where: { role: user.role },
        });
        return server_1.NextResponse.json(permissions);
    }
    catch (error) {
        console.error('Error fetching permissions:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
    }
}
