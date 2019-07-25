var express             = require('express');
var path                = require('path');
var favicon             = require('serve-favicon');
var logger              = require('morgan');
var cookieParser        = require('cookie-parser');
var bodyParser          = require('body-parser');
var passport            = require('passport');
var session             = require('express-session');
var LocalStrategy       = require('passport-local').Strategy;
var ConnectRoles        = require('connect-roles');
var roles               = require('./controllers/roleAccess');
const MongoStore        = require('connect-mongo')(session);
var sslRedirect         = require('heroku-ssl-redirect');
const compression       = require('compression');
const helmet            = require("helmet");
const moment            = require('moment');
const expressValidator  = require('express-validator');
const shortDateFormat   = "D/M/Y"; // this is just an example of storing a date format once so you can change it in one place and have it propagate
var bunyan              = require('bunyan');
const timber            = require('timber');

var app = express();

require('dotenv').config();

var User = require('./models/User');

app.use(session({
    secret: 'preezeappsession',
    store: new MongoStore({ url: process.env.MONGODB_URI }),
    resave: false,
    // COMENT OUT THE FOLLOWING LINES IN DELEVOPMENT MODE
    proxy : true, // add this when behind a reverse proxy, if you need secure cookies
    cookie : {
        secure : true,
        maxAge: 5184000000 // 2 months
    },
    // COMENT UP TO HERE
    saveUninitialized: false
})); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(roles.middleware());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// SECURE
app.use(helmet());
// USE GZIP COMPRESION IN REPSONSE HEADERS
app.use(compression());


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(expressValidator());
app.use(cookieParser());
app.use('/public', express.static(__dirname + "/public"));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('/public'));

// ------------------
// LOGGING MIDDLEWARE
// ------------------
// const log = bunyan.createLogger({
//     name: 'Logger',
//     stream: new timber.transports.Bunyan()
// });
// app.use(log);
const transport = new timber.transports.HTTPS(process.env.TIMBER_KEY);
timber.install(transport);

app.use(timber.middlewares.express());

// ------------------
// EXPRESS MESSAGES MIDDLEWARE
// ------------------
app.use(require('connect-flash')());
app.use(function (req, res, next) {
    res.locals.messages = require('express-messages')(req, res);
    next();
});
app.use(sslRedirect());

app.use(function (req, res, next) {
// Pass moment.js to EJS templating engine
    res.locals.moment = moment; // this makes moment available as a variable in every EJS page
    res.locals.shortDateFormat = shortDateFormat;
    next();
});


app.get('*', function(req, res, next) {
    res.locals.cart = req.session.cart;
    res.locals.cartSupplier = req.session.cartSupplier;
    // res.locals.coupon = res.session.coupon;
    next();
});

app.post('*', function(req, res, next) {
    res.locals.cart = req.session.cart;
    res.locals.cartSupplier = req.session.cartSupplier;
    // res.locals.coupon = res.session.coupon;
    next();
});

// ------------------
// SET THE ROUTES
// ------------------
var index = require('./routes/index');
var pages = require('./routes/pages');
var users = require('./routes/users');
var admin = require('./routes/admin');
var cart = require('./routes/cart');
var driver = require('./routes/driver');
var supplier = require('./routes/supplier');
var test = require('./routes/test');

app.use('/', index);
app.use('/pages/', pages);
app.use('/supplier', supplier);
app.use('/users', users);
app.use('/driver', driver);
app.use('/admin', admin);
app.use('/cart', cart);
app.use('/test', test);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
