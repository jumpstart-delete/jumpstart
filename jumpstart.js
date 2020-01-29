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
app.get('/', displayIndex);
app.post('/login', logInUser);
app.get('/register', displayRegister);
app.post('/register', registerUser);

// search pages and display searches
app.get('/search', renderSearch);
app.post('/searches/new', displayResult);
app.post('/searches/detail', displayDetail);

// enter search results into database
app.post('/status', addJobToDb);
app.get('/status/:id', findDetailsfromDB);
app.post('/status/:id', showDetailsfromDB);

///see list in the database
app.get('/list', displayUserTable);
app.put('/update/list/:id', updateUserTable);

//update database from the status page
app.put('/update/:id', updateJob);
app.delete('/status/:id', deleteJob);


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
        res.redirect('/list');
      } else {
        flags.loginFail = true;
        res.render('./index', { loginFail: flags.loginFail })
      }
    })
    .catch(err => console.error(err));
}

/// Display register page
function displayRegister (request, response){
  response.render('./pages/register');
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
            company VARCHAR(255),
            tags TEXT
          );`;
        client.query(newUserQuery, newUserValues)
          .then(
            client.query(newUserTable)
              .then(results => {
                user.username = registerResults.username;
                console.log('this is user.username', user.username);
                res.status(200).redirect('/search');
              })
          )
          .catch(err => console.error(err));
      }
    })
}


///////////RANDOMIZE////
Array.prototype.shuffle = function () {
  let input = this;

  for (let i = input.length - 1; i >= 0; i--) {

    let randomIndex = Math.floor(Math.random() * (i + 1));
    let itemAtIndex = input[randomIndex];

    input[randomIndex] = input[i];
    input[i] = itemAtIndex;
  }
  return input;
}

////// RENDER SEARCHES ON SEARCH PAGE///////
function renderSearch(req, res) {
  res.status(200).render('./pages/search', { username: user.username });
}


///////// DISPLAY SEARCH RESULTS ON RESULTS PAGE USING API KEYS//////
function displayResult (request, response) {
  let azunaKey = process.env.AZUNA_API_KEY;
  let museKey = process.env.MUSE_API_KEY;
  let usaKey = process.env.USAJOBS_API_KEY;
  let city = request.body.location;
  let email= process.env.EMAIL;

  let jobQuery = request.body.job_title;
  let azunaUrl = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=9b8fb405&app_key=${azunaKey}&where=${city}&what=$${jobQuery}`;
  let museUrl = `https://www.themuse.com/api/public/jobs?location=${city}&page=1&descending=true&api_key=${museKey}`;
  let githubUrl= `https://jobs.github.com/positions.json?description=${jobQuery}&location=${city}`;
  let usaUrl = `https://data.usajobs.gov/api/search?Keyword=${jobQuery}&LocationName=${city}`

  let azunaResult = superagent.get(azunaUrl)
    .then(results => {
      let parsedData = (JSON.parse(results.text))
      return parsedData.results.map(data => {
        return new AzunaJobsearchs(data)
      });
    }) .catch(err => console.error(err));

  let museResult = superagent.get(museUrl)
    .then(results => {
      let parseData = JSON.parse(results.text);
      return parseData.results.map(data => {
        return new Musejobsearch(data)
      })
    }) .catch(err => console.error(err))
  let gitHubResult = superagent.get(githubUrl)
    .then(githubresults => {
      return githubresults.body.map(value => {
        return new Github(value)
      })
    }) .catch(err => console.error(err));
  let usaJobResult = superagent.get(usaUrl)
    .set({
      'Host': 'data.usajobs.gov',
      'User-Agent': email,
      'Authorization-Key': usaKey
    })
    .then(results => {
      let parsedData = JSON.parse(results.text)
      // console.log(parsedData)
      let data = parsedData.SearchResult.SearchResultItems
      return data.map(value => {
        return new USAJOB(value.MatchedObjectDescriptor)
      })
    }) .catch(err => console.error(err));

  Promise.all([azunaResult, museResult, gitHubResult, usaJobResult])
    .then(result => {
      let newData =result.flat(3);
      let shuffleData= newData.shuffle();

      response.status(200).render('./pages/results', {data: shuffleData});
    })
}

///////// DISPLAY DETAIL OF JOB ON DETAIL PAGE///////////
function displayDetail(request, response) {
  let detailData = request.body
  // console.log(detailData);
  response.status(200).render('./pages/detail', {datas: detailData});
}
/////// ADDING SELECTED JOB TO DATABASE/////
function addJobToDb(request, response) {
  // deconstruct the input
  let {title, location, summary, url, skill, company} = request.body;
  //// INCOMPLETE: check if it already exits in the database
  let SQL1 = `INSERT INTO ${user.username}_jobs (title, url, summary, location, skills, company, tags) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;`;
  let safeValues = [title, url, summary, location, skill, company, 'favorite'];

  return client.query(SQL1, safeValues)
    .then(result => {
      response.redirect(`/status/${result.rows[0].id}`)
    })
    .catch(err => console.error(err));
}

////// get details from the database/////
function findDetailsfromDB(request, response){
  let SQL2 = `SELECT * FROM ${user.username}_jobs WHERE id=$1;`;
  let values = [request.params.id];
  return client.query(SQL2, values)
    .then((results) => {
      response.render('./pages/status.ejs',{results: results.rows[0]});
    })
    .catch(err => console.error(err));
}

function showDetailsfromDB(request, response) {
  console.log('hi Vij, be patient');

  response.status(200).render('./pages/status');
}

/////update details from the status page using middleware

function updateJob (request, response) {
  let {title, location, summary, url, skill, company, tags} = request.body;
  let SQL3 = `UPDATE ${user.username}_jobs SET title=$1, location=$2, summary=$3, url=$4, skills=$5, company=$6, tags=$7 WHERE id=$8;`;
  let newvalues = [title, location, summary, url, skill, company, tags, request.params.id];
  return client.query(SQL3, newvalues)
    // .then(response.redirect(`/status/${request.params.id}`))
    .then(response.redirect(`/list`))
    .catch(error => console.error('this is inside the updateJobList', error));
}

///// delete book from the database
function deleteJob (request,response){
  let SQL4 = `DELETE FROM ${user.username}_jobs WHERE id=$1;`;
  let values = [request.params.id]

  client.query(SQL4, values)
    .then(response.redirect('/list'))
    .catch(() => {
      errorHandler ('cannot delete request here!', request, response);
    });
}

// post joblist from database
function displayUserTable(request, response) {
  let sql5 =`Select * FROM ${user.username}_jobs ORDER BY tags DESC`;
  client.query(sql5)
    .then(results => {
      response.render('./pages/list', {results: results.rows, username: user.username });})
    .catch(err => console.log('this is inside displayUserTable function failure', err));
}

/// render job listing from database
function updateUserTable (request, response) {
  console.log('inside the updateUserTable function this is the request.body', request.body);
  console.log('this is the params id', request.params.id);
  let tags = request.body.tags;
  let SQL5 = `UPDATE ${user.username}_jobs SET tags=$1 WHERE id=$2;`;
  let newvalues = [tags, request.params.id];
  return client.query(SQL5, newvalues)
    .then(response.redirect(`/list`))
    .catch(error => console.error('this is inside the updateUserTable', error));
}

////// displayIndexpage
function displayIndex(request, response) {
  response.status(200).render('./index');
}

/// CONSTRUCTORS FOR THE SEARCH PAGE/////////////////

// /////// constructor for azuna/////
function AzunaJobsearchs(obj) {
  obj.title !== undefined ? this.title = obj.title : this.title = 'title is unavailable'
  obj.location.display_name !== undefined ? this.location = obj.location.display_name : this.location = 'location is unavailable'
  this.company = obj.company.display_name;
  this.summary = obj.description;
  this.url = obj.redirect_url;
  obj.category.label !== undefined ? this.skill = obj.category.label : this.skill = 'not available'
}

/////// constructor for Muse/////
function Musejobsearch(obj) {
  obj.name !== undefined ? this.title = obj.name : this.title = 'title is unavailable'
  obj.locations.length > 1 ? this.location = obj.locations.map(value => { return value.name }).join(', ') : this.location = obj.locations[0].name
  this.company = obj.company.name;
  this.summary = obj.contents;
  this.url = obj.refs.landing_page;
  obj.categories.name !== undefined ? this.skill = obj.categories[0].name : this.skill = 'not available';
}

//////constructor for github////
function Github(obj) {
  obj.title !== undefined ? this.title = obj.title : this.title = 'title is unavailable';
  obj.location !== undefined ? this.location = obj.location : this.location = 'not available';
  obj.company !== undefined ? this.company = obj.company : this.company = 'not available';
  obj.description !== undefined ? this.summary = obj.description : 'not available';
  obj.url !== undefined ? this.url = obj.url :
    this.url = 'not available';
  this.skill = 'not available'
}

///////////constructor for USAjob/////
function USAJOB(obj) {
  obj.PositionTitle !== undefined ? this.title = obj.PositionTitle : this.title = 'title is unavailable';
  this.location = obj.PositionLocationDisplay;
  obj.OrganizationName !== undefined ? this.company = obj.OrganizationName : this.company = 'undefined';
  obj.QualificationSummary !== undefined ? this.summary = obj.QualificationSummary : this.summary = 'undefined'
  obj.ApplyURI !== undefined ? this.url = obj.ApplyURI : this.url = 'undefined';
  this.skill = 'Military job'
}

/////////////////// Error handler////////////////
app.get('*', notFoundHandler);

function notFoundHandler(request, response) {
  response.status(404).render('./pages/404');
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
