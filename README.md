# Parthos Order Management System

![Parthos Logo](public/ParthosLogo.svg)

A real-time manufacturing order management system built with Next.js, Prisma, and real-time synchronization capabilities.

## Overview

Parthos Order Management System (OMS) is a comprehensive solution for managing manufacturing orders throughout their entire lifecycle. It provides real-time tracking and updates, role-based access control, and a flexible interface for monitoring production processes.

### Key Features

- **Real-time Updates**: Synchronized order data across all connected clients
- **Role-based Access Control**: Different permissions for Planners, Sales, Scanners, and Administrators
- **Order Tracking**: Follow orders through each stage of the manufacturing process
- **Priority Management**: Drag-and-drop interface for order prioritization
- **Custom Views**: Create and save custom table views with specific columns
- **Notifications System**: Real-time alerts for order changes and updates
- **Barcode Scanning**: Efficiently update order status via scanning interface
- **Dark Mode Support**: Full light and dark theme implementations
- **Offline Capabilities**: Graceful degradation when network connection is lost

## Technology Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Next.js API Routes, Socket.IO, Pusher
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with custom JWT implementation
- **Real-time**: Dual-layer real-time with Pusher and Socket.IO fallback
- **Deployment**: Vercel-compatible with standalone output

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL database
- npm or yarn package manager

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/parthos-oms.git
cd parthos-oms
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables by creating a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/parthos?schema=public"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
JWT_SECRET="your-jwt-secret"

# General
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Optional: Pusher for enhanced real-time (recommended for production)
PUSHER_APP_ID="your-pusher-app-id"
NEXT_PUBLIC_PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
NEXT_PUBLIC_PUSHER_CLUSTER="eu"
```

4. Initialize the database:

```bash
npx prisma migrate dev
```

5. Seed the database with sample data:

```bash
npx prisma db seed
```

6. Start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at http://localhost:3000.

## User Roles

The system supports different user roles with varying permissions:

- **BEHEERDER (Administrator)**: Full system access, can modify all settings and data
- **PLANNER**: Full access to order data, notifications, and priority management
- **SALES**: Limited access focused on customer-facing fields and order creation
- **SCANNER**: Access to production scanning interface for updating order status
- **GENERAL_ACCESS**: Read-only access to basic order information

## Default Test Users

After seeding the database, you can log in with these test credentials:

- Administrator: `beheerder@test.com` / `test123`
- Planner: `planner@test.com` / `test123`
- Sales: `sales@test.com` / `test123`
- Scanner: `scanner@test.com` / `test123`

## Project Structure

```
parthos-oms/
├── prisma/                  # Prisma schema and migrations
├── public/                  # Static assets
├── server/                  # Socket.IO server configuration
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/             # API routes
│   │   ├── dashboard/       # Dashboard page
│   │   ├── login/           # Login page
│   │   ├── scan/            # Scanner interface
│   │   ├── settings/        # User settings
│   │   └── custom/          # Custom page views
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Helper functions
└── server.js                # Custom server for Socket.IO integration
```

## Main Features Explained

### Order Management

The core of the system is the order table, which allows users to:
- View and filter orders with customizable columns
- Edit fields based on user role permissions
- Sort and search through orders
- Export data to Excel-compatible formats

### Priority Orders

The priority system allows production managers to:
- Drag and drop orders to prioritize production
- Reorder the priority list as needed
- Synchronize priority updates across all connected clients
- Export priority lists separately

### Real-time Updates

The system uses a dual-layer approach to real-time updates:
- Pusher for efficient WebSocket-based updates (primary)
- Socket.IO as a fallback mechanism
- Local storage for offline capability

### Scanning Interface

The scanning interface allows shop floor workers to:
- Scan order barcodes to quickly access order data
- Update production stages with a single click
- View and add machine-specific instructions
- Lock orders to prevent concurrent modifications

### Custom Pages

Administrators can create custom views that:
- Display only specific columns of interest
- Are accessible to all users through the navigation menu
- Can be exported independently
- Persist across sessions

## Development

### Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build the application for production
- `npm start`: Start the production server
- `npm run lint`: Run ESLint to check code quality

### Testing User Roles

To test different user roles, use the provided test accounts or create new users with the desired roles using the Prisma Studio:

```bash
npx prisma studio
```

### Custom Server

This project uses a custom server.js file to integrate Socket.IO for real-time updates. When deploying, ensure your platform supports custom server configurations.

## Deployment

The application is configured for deployment on platforms like Vercel, Netlify, or any Node.js hosting service.

1. Build the application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

### Database Considerations

In production, ensure:
- The PostgreSQL database is properly secured
- Connection pooling is configured for optimal performance
- Regular backups are scheduled
- Migrations are applied carefully to avoid data loss

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions, please contact your system administrator or open an issue in the GitHub repository.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Prisma](https://prisma.io/)
- [TailwindCSS](https://tailwindcss.com/)
- [Socket.IO](https://socket.io/)
- [Pusher](https://pusher.com/)
- [NextAuth.js](https://next-auth.js.org/)
