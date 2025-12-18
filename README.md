# User Service

Authentication and user management microservice for the G11 CMS platform.

## Stack

- Node.js 18
- TypeScript
- Express.js
- PostgreSQL
- JWT authentication
- WSO2 Asgardeo integration

## API Endpoints

- `POST /api/users/register` - User registration
- `POST /api/users/login` - User authentication
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user

## Environment Variables

```env
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/users
JWT_SECRET=your-secret-key
ASGARDEO_CLIENT_ID=your-client-id
ASGARDEO_CLIENT_SECRET=your-client-secret
```

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t g11-user-service .
docker run -p 3001:3001 g11-user-service
```
