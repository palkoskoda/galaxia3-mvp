# Galaxia3 MVP - Modern Restaurant Management Platform

## 🎯 Overview

Galaxia3 MVP is a foundational restaurant management platform that transforms basic lunch ordering into a comprehensive restaurant management system. Built with modern technologies and designed for immediate value delivery.

## 🏗️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT-based auth
- **Payment**: Stripe integration
- **Deployment**: Docker + Vercel/Render ready

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm >= 9.0.0

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
galaxia3-mvp/
├── frontend/          # React TypeScript frontend
├── backend/           # Node.js Express backend
├── database/          # Database schemas and migrations
├── docker/           # Docker configuration
├── docs/             # Documentation
└── .github/          # GitHub workflows
```

## 🧪 Development

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm run test` - Run tests for both frontend and backend
- `npm run lint` - Run linting for both frontend and backend

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/galaxia3

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend
VITE_API_URL=http://localhost:3000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

## 🐳 Docker Development

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in detached mode
docker-compose up -d
```

## 📱 Features

### Customer Features
- Personalized menu with dietary preferences
- Real-time order tracking
- Loyalty program integration
- Mobile-responsive design
- Multiple payment methods

### Admin Features
- Real-time order dashboard
- Dynamic menu management
- Basic analytics and reporting
- Staff management
- Revenue tracking

## 🔐 Security

- JWT-based authentication
- Input validation and sanitization
- Rate limiting
- HTTPS enforcement in production
- PCI compliance for payments

## 📊 Monitoring

- API response time monitoring
- Error rate tracking
- User analytics
- Performance metrics

## 🚀 Deployment

### Vercel (Frontend)
```bash
cd frontend
vercel --prod
```

### Render (Backend)
```bash
# Deploy via Render dashboard or CLI
git push origin main
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.