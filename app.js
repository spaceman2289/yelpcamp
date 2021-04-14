const dotenv = require('dotenv').config();
if (dotenv.error) throw dotenv.error;

const path = require('path');
const createError = require('http-errors');
const engine = require('ejs-mate');
const express = require('express');
const flash = require('connect-flash');
const helmet = require('helmet');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const session = require('express-session');
const { User } = require('./models');
const routes = require('./routes');

const uri = process.env.NODE_ENV === 'production' ? process.env.DATABASE_URL : 'mongodb://localhost:27017/yelp-camp';

mongoose.connect(uri, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
  useCreateIndex: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.on('open', () => { console.log(`Connected to database: ${db.host}:${db.port}/${db.name}`); });

const app = express();

app.engine('ejs', engine);
app.set('view engine', 'ejs');

app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(mongoSanitize());

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'connect-src': [
        "https://api.mapbox.com",
        "https://events.mapbox.com"
      ],
      'img-src': [
        "'self'",
        "data:",
        "https://res.cloudinary.com/da8gaqzfc/",
        "https://source.unsplash.com",
        "https://images.unsplash.com"
      ],
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        "blob:",
        "https://cdn.jsdelivr.net",
        "https://api.mapbox.com"
      ]
    }
  }
}));

app.use(session({
  name: '_yc',
  secret: process.env.SESSION_SECRETS.split(','),
  proxy: true,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? true : false,
    maxAge: 1000 * 60 * 60 * 24 * 7
  },
  store: MongoStore.create({
    mongoUrl: uri,
    touchAfter: 60 * 60 * 24
  })
}));

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(passport.initialize());
app.use(passport.session());

app.use(flash(), (req, res, next) => {
  if (!['/register', '/login', '/logout'].includes(req.originalUrl) ) {
    req.session.returnTo = req.originalUrl;
  }

  res.locals.user = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.use('/', routes.root);
app.use('/campgrounds', routes.campgrounds);
app.use('/campgrounds/:id/reviews', routes.reviews);

app.all('*', (req, res, next) => {
  next(createError(404, 'The resource you requested could not be found.'));
});

app.use((err, req, res, next) => {
  if (createError.isHttpError(err)) {
    res.status(err.statusCode);
    res.render('error', { err });
  } else {
    console.error(err.stack || err.message);
    res.status(500);
    res.render('error', { err: createError(500, 'An unexpected server error occured.') });
  }
});

app.listen(3000, () => {
  console.log('Listening on 3000.');
});
