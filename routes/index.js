const express = require('express');
const router = express.Router();

router.use('/', require('./live'));
router.use('/', require('./fourtyeight'));
router.use('/', require('./map'));

// root route redirects to /live
router.get('/', (req, res) => {
    res.redirect('/live');
});

// contact route
router.get('/contact', (req, res) => {
    res.render('contact');
});

// about route
router.get('/about', (req, res) => {
    res.render('about');
});

// data sources route
router.get('/data', (req, res) => {
    res.render('data');
});

// embedded generation route
router.get('/embedded', (req, res) => {
    res.render('embedded');
});

module.exports = router;
