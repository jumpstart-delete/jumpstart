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
const flags = require('./lib/flags');
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
app.get('/', (request, response) => {
  response.status(200).render('./index');
})
app.post('/login', logInUser);
app.get('/register', (req, res) => res.render('./pages/register'));
app.post('/register', registerUser);
app.get('*', notFoundHandler);

/////// ERROR FUNCTIONS /////////
function logInUser(req, res) {
  let loginResults = {
    username: req.body.username,
    password: req.body.password
  }
  let SQL = 'SELECT * FROM users WHERE username = $1 AND password = crypt($2, password);';
  let safeValues = [loginResults.username, loginResults.password];
  client.query(SQL, safeValues)
    .then(result => {
      console.log(req.body);
      if (result.rowCount === 1) {
        user.username = result.rows[0].username;
        console.log(user.username);
      } else {
        flags.loginFail = true;
        res.render('/', { loginFail: flags.loginFail })
      }
    })
    .catch(err => console.error(err));
}

function registerUser(req, res) {
  let registerResults = {
    username: req.body.username,
    password: req.body.password
  }
  let querySQL = 'SELECT * FROM users WHERE username = $1;';
  let queryValues = [registerResults.username];
  client.query(querySQL, queryValues)
    .then(results => {
      console.log(req.body)
      if (results.rowCount !== 0) {
        console.log('User already exists!');
      } else {
        let newUserQuery = `INSERT INTO users (username, password) VALUES ($1, crypt($2, gen_salt('bf', 8)));`;
        let newUserValues = [registerResults.username, registerResults.password];
        let newUserTable = `CREATE TABLE ${registerResults.username}_jobs
          (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            url VARCHAR(255),
            summary TEXT,
            location VARCHAR(255),
            skills TEXT,
            tags TEXT
          );`;
        client.query(newUserQuery, newUserValues)
          .then(
            client.query(newUserTable)
              .then(results => {
                console.log(results);
              })
          )
          .catch(err => console.error(err));
      }
    })
}

function notFoundHandler(request, response) {
  response.status(404).send('This route does not exist');
}

function errorHandler(error, request, response) {
  console.log('Error', error);
  response.status(500).send(error);
}

// Assign app to connect to database and then listen on PORT.
client.connect()
  .then(
    app.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
  )
  .catch(err => console.error(err))
