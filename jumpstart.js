'use strict';

// This will be the main server file (aka: server.js / app.js)

// Declare app dependencies.
const express = require('express');
const pg = require('pg');
const superagent = require('superagent');
const methodOverride = require('method-override');
require('dotenv').config();
require('ejs');

// Declare app configs.
const app = express();
const client = new pg.Client(process.env.DATABASE_URL);

// Declare app middleware.
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));
app.use(methodOverride('_method'));
