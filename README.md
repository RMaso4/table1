# Parthos Order Management System

This is a Next.js project for managing manufacturing orders with real-time updates.

## Features

- **Real-time Updates**: Using Prisma Pulse and Socket.IO
- **Role-based Access Control**: Different permissions for Planners, Sales, Scanner roles
- **Order Management**: Track orders through various manufacturing stages
- **Notifications**: Real-time notifications for order changes

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL database
- Prisma Pulse API key

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

4. Set up your database and Pulse API key in the `.env` file
5. Run the database migrations:

```bash
npx prisma migrate dev
```

6. Seed the database:

```bash
npx prisma db seed
```

7. Build the project:

```bash
npm run build
```

8. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Real-time Architecture

This application uses two technologies for real-time updates:

1. **Prisma Pulse**: Database change notification system
   - Listens for changes to Orders and Notifications tables
   - Triggers events when data changes

2. **Socket.IO**: Real-time client-server communication
   - Broadcasts changes to connected clients
   - Handles role-based update distribution

### How It Works

1. When data is updated in the database, Prisma Pulse detects the change
2. The Pulse stream sends the change data to our Node.js server
3. The server processes the change and emits the appropriate Socket.IO event
4. Connected clients receive the update and update their UI in real-time

## User Roles

- **PLANNER**: Full access to all data and features
- **BEHEERDER**: Administrative access to all data and features
- **SALES**: Limited edit access for customer-facing fields
- **SCANNER**: Access to scan and update manufacturing progress
- **GENERAL_ACCESS**: View-only access

## Deployment

For production deployment, ensure you have set up:

1. A production PostgreSQL database
2. A valid Prisma Pulse API key
3. Proper environment variables

Then build and start the production server:

```bash
npm run build
npm start
```