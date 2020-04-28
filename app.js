require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

//to go above the route handlers
// Body Parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// View Engine setup
app.set('view engine', 'ejs');
// Static folder
app.use(express.static('public'));

app.use(require('./routes'));

// any other route catch-all
app.get('*', function (req, res) {
  res.send('Sorry page not found..');
});

//===========================
var port = process.env.PORT || 3500;

app.listen(port, function () {
  console.log('Energy Dashboard Server has started');
});
