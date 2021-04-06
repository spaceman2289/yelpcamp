const engine = require('ejs-mate');
const express = require('express');
const createError = require('http-errors');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const Campground = require('./models/campground');
const routeHandlerAsync = require('./utils/routeHandlerAsync');
const { campgroundSchema } = require('./schemas');

mongoose.connect('mongodb://localhost:27017/yelp-camp', {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
  useCreateIndex: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.on('open', () => { console.log('Database connected.'); });

const app = express();

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true}));

const validateCampground = (req, res, next) => {
  const { error, value } = campgroundSchema.validate(req.body, { abortEarly: false });

  if (error) {
    throw createError(400, error.details.map((e) => e.message).join('\n'));
  } else {
    req.body = value;
    next();
  }
};

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/campgrounds', routeHandlerAsync(async (req, res, next) => {
  const campgrounds = await Campground.find();
  res.render('campgrounds/index', { campgrounds });
}));

app.get('/campgrounds/new', (req, res) => {
  res.render('campgrounds/new');
});

app.post('/campgrounds/new', validateCampground, routeHandlerAsync(async (req, res, next) => {
  const campground = new Campground(req.body.campground);
  await campground.save();
  res.redirect(`/campgrounds/${campground._id}`);
}));

app.get('/campgrounds/:id/edit', routeHandlerAsync(async (req, res, next) => {
  const campground = await Campground.findById(req.params.id);
  res.render('campgrounds/edit', { campground });
}));

app.put('/campgrounds/:id/edit', validateCampground, routeHandlerAsync(async (req, res, next) => {
  const campground = await Campground.findByIdAndUpdate(req.params.id, req.body.campground);
  res.redirect(`/campgrounds/${campground._id}`);
}));

app.get('/campgrounds/:id', routeHandlerAsync(async (req, res, next) => {
  const campground = await Campground.findById(req.params.id);
  res.render('campgrounds/show', { campground });
}));

app.delete('/campgrounds/:id', routeHandlerAsync(async (req, res, next) => {
    await Campground.findByIdAndDelete(req.params.id);
    res.redirect('/campgrounds');
}));

app.all('*', (req, res, next) => {
  next(createError(404, 'The resource you requested could not be found.'));
});

app.use((err, req, res, next) => {
  if (createError.isHttpError(err)) {
    res.render('error', { err });
  } else {
    console.error(err.stack || err.message);
    res.render('error', { err: createError(500, 'An unexpected server error occured.') });
  }
});

app.listen(3000, () => {
  console.log('Listening on 3000.');
});
