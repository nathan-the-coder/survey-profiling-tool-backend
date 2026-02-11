var express = require('express');
var path = require('path');
var logger = require('morgan');
const cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Username'],
  credentials: true
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Authentication middleware
app.use((req, res, next) => {
  const username = req.headers['x-username'] || req.session?.username;
  req.userRole = username === 'Archdiocese of Tuguegarao' ? 'archdiocese' : 'parish';
  req.userParish = username;
  console.log(`User: ${username}, Role: ${req.userRole}`);
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;
