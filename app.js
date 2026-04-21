const express = require('express');
const path = require('path');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

app.set('trust proxy', true);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

const allowedOrigins = [
  'http://localhost:3000',
  'https://survey-profiling-tool.vercel.app',
  'https://survey-profiling-tool-frontend.vercel.app',
  'https://survey-profiling-tool-backend.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, allow all origins for Vercel deployments
    if (isProduction) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Username', 'x-username', 'X-Parish-Id', 'x-parish-id', 'X-User-Role', 'x-user-role', 'cache-control', 'pragma'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  next(err);
});

app.use(logger(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const username = req.headers['x-username'] || '';
  const parishId = req.headers['x-parish-id'];
  const userRole = req.headers['x-user-role'];
  
  const isArchdiocese = username === 'Archdiocese of Tuguegarao' || userRole === 'archdiocese';
  const isAdmin = username === 'SJCB_Admin' || username.toLowerCase() === 'admin' || userRole === 'admin';
  
  req.userRole = isArchdiocese || isAdmin ? 'archdiocese' : 'parish';
  req.userParish = username;
  req.userParishId = parishId ? Number(parishId) : null;
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal Server Error states' : err.message
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports = app;
