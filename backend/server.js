require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const copyRoutes = require('./routes/copies');
const borrowingRoutes = require('./routes/borrowings');
const reservationRoutes = require('./routes/reservations');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const courseRoutes = require('./routes/courses');
const categoryRoutes = require('./routes/categories');
const authorRoutes = require('./routes/authors');
const studentRoutes = require('./routes/students');
const librarianRoutes = require('./routes/librarians');
const activityRoutes = require('./routes/activity_logs');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure Helmet to allow cross-origin requests from Vercel
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

// Bulletproof CORS allowing Vercel and local origins
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps)
    if (!origin) return callback(null, true);
    // Allow localhost or any vercel.app domain
    if (
      origin.includes('localhost') ||
      origin.endsWith('.vercel.app') ||
      origin.includes('vercel.app') ||
      (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive fallback
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Explicit fallback headers middleware for any reverse proxies / load balancers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/copies', copyRoutes);
app.use('/api/borrowings', borrowingRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/librarians', librarianRoutes);
app.use('/api/activity-logs', activityRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'School Library Management System API' }));

app.listen(PORT, () => {
  console.log(`Backend server successfully listening on port ${PORT}`);
});
