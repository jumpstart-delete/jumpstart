'use strict';

// This will be the main server file (aka: server.js / app.js)

// Declare app dependencies.
require('dotenv').config();
const express = require('express');
const superagent = require('superagent');
const methodOverride = require('method-override');
const pg = require('pg');
require('ejs');

// Declare lib dependencies.
const user = require('./lib/user');

// Declare app configs.
const app = express();
const PORT = process.env.PORT || 8081;
const client = new pg.Client(process.env.DATABASE_URL);

// Declare app middleware.
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));
app.use(methodOverride('_method'));

// Declare routes.
app.get("/", (request,response) => {
  response.status(200).render('./index');
})

/////// ERROR FUNCTIONS /////////

function notFoundHandler(request, response){
  response.status(404).send('This route does not exist');
}

function errorHandler(error, request, response){
  console.log('Error', error);
  response.status(500).send(error);
}

// Assign app to connect to database and then listen on PORT.
client.connect()
  .then(
    app.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
  )
  .catch(err => console.error(err))
