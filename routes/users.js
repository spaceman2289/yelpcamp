const express = require('express');
const { User } = require('../models');
const routeHandlerAsync = require('../utils/routeHandlerAsync');
const validate = require('../utils/validate');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('index');
});

router.get('/register', (req, res) => {
  res.render('users/register');
});

router.post('/register', validate('user'), routeHandlerAsync(async (req, res, next) => {
  const user = new User({ username: req.body.username, email: req.body.email });

  User.register(user, req.body.password, (err) => {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('/register');
    }

    req.flash('success', `Welcome to YelpCamp, ${user.username}!`);
    res.redirect('/campgrounds');
  });
}));

module.exports = router;
