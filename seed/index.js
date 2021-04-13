if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const faker = require('faker');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mongoose = require('mongoose');
const { User, Campground, Review } = require('../models');
const { descriptors, places, images, cities }= require('./lists');

mongoose.connect('mongodb://localhost:27017/yelp-camp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: true,
  useCreateIndex: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.on('open', () => { console.log('Database connected.'); });

const geocodingClient = mbxGeocoding({ accessToken: process.env.MAPBOX_TOKEN });

Array.prototype.random = function() {
  return this[Math.floor(Math.random() * this.length)];
}

seedDb();

async function seedDb() {
  await User.deleteMany();
  await Campground.deleteMany();

  const users = await seedUsers();
  await seedCampgrounds(users);

  console.log('Finished seeding.');
  db.close();
};

async function seedUsers() {
  const users = [];

  for (let i = 0; i < 10; i++) {
    const profile = new User({ username: `test${i}`, email: `test${i}@test.com` });
    const user = await User.register(profile, `test${i}`);
    users.push(user);
  }

  return users;
}

async function seedCampgrounds(users) {
  for (let i = 0; i < 50; i++) {
    const city = cities.random();

    const campground = new Campground({
      title: `${descriptors.random()} ${places.random()}`,
      description: `${faker.lorem.paragraph()}`,
      images: seedImages(),
      price: (Math.random() * 200).toFixed(2),
      location: `${city.city}, ${city.state}`,
      author: users.random(),
      reviews: await seedReviews(users)
    });

    campground.geometry = await getGeometry(campground.location);

    await campground.save();
  }
}

function seedImages() {
  const result = [];
  let num = Math.ceil(Math.random() * 5);
  let i = num;

  while (num > 0) {
    result.push(images[i]);
    i++;
    if (i > images.length - 1) i = 0;
    num--;
  }

  return result;
}

async function seedReviews(users) {
  const result = [];

  for (let j = 0; j < Math.floor(Math.random() * 10); j++) {
    const review = new Review({
      rating: Math.ceil(Math.random() * 5),
      text: faker.lorem.paragraphs(),
      author: users.random()
    });

    const document = await review.save();
    result.push(document);
  }

  return result;
}

async function getGeometry(location) {
  try {
    const geocodingResponse = await geocodingClient.forwardGeocode({
      query: location,
      limit: 1
    }).send();

    return geocodingResponse.body.features[0].geometry;
  } catch (err) {
    throw createHttpError(400, `A location named '${location}' could not be found.`);
  }
}
