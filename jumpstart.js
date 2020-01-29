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
let dataArr = [];

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
app.get('/search', renderSearch);
app.post('/searches/new', displayResult);
app.post('/searches/detail', displayDetail);

/// entering into database from the view_details.ejs///
app.post('/status', addJobToDb);
app.get('/status/:id', findDetailsfromDB);
app.post('/status/:id', showDetailsfromDB);




/////// LOGIN FUNCTIONS /////////
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
        res.redirect('/search');
      } else {
        flags.loginFail = true;
        res.render('/', { loginFail: flags.loginFail })
      }
    })
    .catch(err => console.error(err));
}

/////// REGISTER FUNCTIONS, ROUTED TO THE SEARCH PAGE /////////

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
      }
      else {
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
                // console.log('this is just results', results);
                user.username = registerResults.username;
                console.log('this is user.username', user.username);
                res.status(200).redirect('/search');
              })
          )
          .catch(err => console.error(err));
      }
    })
}

////// RENDER SEARCHES ON SEARCH PAGE///////
function renderSearch(req, res) {
  res.status(200).render('./pages/search', {username: user.username});
}

///////// DISPLAY SEARCH RESULTS ON RESULTS PAGE USING API KEYS//////
function displayResult (request, response) {

  let city = request.body.location;
  let azunaKey = process.env.AZUNA_API_KEY;
  let museKey = process.env.MUSE_API_KEY
  let jobQuery = request.body.job_title;
  let azunaUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=9b8fb405&app_key=${azunaKey}&where=${city}&what=$${jobQuery}`;
  // let museUrl = `https://www.themuse.com/api/public/jobs?location=${city}&page=1&descending=true&api_key=${museKey}`;
  // let githubUrl= `https://jobs.github.com/positions.json?description=${jobQuery}&location=${city}`;

  superagent.get(azunaUrl)
    .then(results => {
      let parsedData = (JSON.parse(results.text))
      let azunaData = parsedData.results.map(data => {
        return new AzunaJobsearchs(data)
      });
      response.status(200).render('./pages/results', {data: azunaData});
    }) .catch(err => console.error(err));
  // superagent.get(museUrl)
  //   .then(results => {
  //     let parseData = JSON.parse(results.text);
  //     parseData.results.map(data => {
  //       return new Musejobsearch(data)
  //     })
  //     console.log('we hit muse')
  //     response.status(200).render('./pages/results', {data: dataArr});
  //   }) .catch(err => console.error(err))
  // superagent.get(githubUrl)
  //   .then(githubresults => {
  //     return githubresults.body.map(value => {
  //       return new Github(value)
  //     })
  //   }) .catch(err => console.error(err));
}

///////// DISPLAY DETAIL OF JOB ON DETAIL PAGE///////////
function displayDetail(request, response) {
  let detailData = request.body
  console.log(detailData)
  response.status(200).render('./pages/detail', {datas: detailData});
  // let {title, location, company, summary, url, skill} = request.body

}
/////// ADDING SELECTED JOB TO DATABASE/////
function addJobToDb(request, response) {
  console.log('this is request.body within the add job to database', request.body);

  // deconstruct the input
  let {title, location, summary, url, skill} = request.body;

  //// check if it already exits in the database

  let SQL1 = `INSERT INTO ${user.username}_jobs (title, url, summary, location, skills) VALUES ($1, $2, $3, $4, $5) RETURNING id;`;
  let safeValues = [title, url, summary, location, skill];

  return client.query(SQL1, safeValues)
    .then(result => {
      console.log('this is the result from the client query in the add to database function', result.rows[0].id);
      response.redirect(`/status/${result.rows[0].id}`)
    })
    .catch(err => console.error(err));
}

////// get details from the database to allow updating/////
function findDetailsfromDB(request, response){
  console.log('hi Jin, inside teh findDetails');
  let SQL2 = `SELECT * FROM ${user.username}_jobs WHERE id=$1;`;
  let values = [request.params.id];
  console.log('this is the values in the findDetails function', values);
  return client.query(SQL2, values)
    .then((results) => {console.log('this is the results.rows', results.rows);
    response.render('./pages/status.ejs',{results: results.rows[0]});
    })
    .catch(err => console.error(err));
}

function showDetailsfromDB(request, response) {
  console.log('hi Vij, be patient');

  response.status(200).render('./pages/status');
}

//////////////////////// CONSTRUCTORS FOR THE SEARCH PAGE/////////////////
// /////// constructor for azuna/////
function AzunaJobsearchs(obj) {
  obj.title !== undefined ? this.title = obj.title : this.title = 'title is unavailable'
  obj.location.display_name !== undefined ? this.location = obj.location.display_name : this.location = 'location is unavailable'
  this.company = obj.company.display_name;
  this.summary = obj.description;
  this.url = obj.redirect_url;
  obj.category.label !== undefined ? this.skill = obj.category.label : this.skill = 'not available'

  // dataArr.push(this)
}

/////// constructor for Muse/////
function Musejobsearch(obj) {
  obj.name !== undefined ? this.title = obj.name : this.title = 'title is unavailable'
  obj.locations.length > 1 ? this.location = obj.locations.map(value => {return value.name}).join(', ') : this.location = obj.locations[0].name
  this.company = obj.company.name;
  this.summary = obj.contents;
  this.url = obj.refs.landing_page;
  obj.categories.name !== undefined ? this.skill = obj.categories[0].name : this.skill = 'not available';

  dataArr.push(this)
}

//////constructor for github////
function Github(obj) {
  obj.name !== undefined ? this.title = obj.title : this.title = 'title is unavailable';
  obj.location !== undefined ? this.location = obj.location : this.location = 'not available';
  obj.company !== undefined ? this.company = obj.company : this.company = 'not available';
  this.summary !== undefined ? this.summary = obj.description :'not available';
  obj.url !== undefined ? this.url = obj.url :
    this.url = 'not available';
  this.skill = 'not available'

  dataArr.push(this)
}

/////////////////// Error handler////////////////
app.get('*', notFoundHandler);

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
