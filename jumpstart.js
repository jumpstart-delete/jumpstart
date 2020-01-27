'use strict';

// This will be the main server file (aka: server.js / app.js)

// Declare app dependencies.
const express = require('express');
const pg = require('pg');
const superagent = require('superagent');
const methodOverride = require('method-override');
require('dotenv').config();
require('ejs');
const PORT = process.env.PORT||3001;


// Declare app configs.
const app = express();
const client = new pg.Client(process.env.DATABASE_URL);

// Declare app middleware.
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));
app.use(methodOverride('_method'));

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

//connect with client
client.connect()
  .then(() => {
    app.listen(PORT, ()=> (console.log(`JumpStart_Delete are chatting on ${PORT}`)));
  })
  .catch(err => console.log('we have problem Houston', err));

