/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').serial;
const got = require('got');
const listen = require('test-listen');

const app = require('../src/index');
const {jwtSign} = require('../src/utilities/authentication/helpers');

const test_token = jwtSign({id:process.env.TEST_ID });

var dashboards_id;

test.before(async (t) => {
  t.context.server = http.createServer(app);
  t.context.prefixUrl = await listen(t.context.server);
  t.context.got = got.extend({http2: true, throwHttpErrors: false, responseType: 'json', prefixUrl: t.context.prefixUrl});
});

test.after.always((t) => {
  t.context.server.close();
});

test('GET /statistics returns correct response and status code', async (t) => {
  const {statusCode, body } = await t.context.got('general/statistics');

  t.is(statusCode, 200);
  t.assert(body.success);
});

test('GET /sources returns correct response and status code', async (t) => {
  const {statusCode} = await t.context.got(`sources/sources?token=${test_token}`);

  t.is(statusCode, 200);
});


// Testing for dashboards

// Take all the dashboards
test('GET /dashboards', async (t) => {
  const {body, statusCode} = await t.context.got(`dashboards/dashboards?token=${test_token}`);
  
  t.assert(body.success);
  t.is(statusCode, 200);
  t.is(body.dashboards.length, 0);
});

// Create a test dashboard
test('POST /create-dashboard ', async (t) => {
  const name = "TestDashboard";

  const {body,statusCode} = await t.context.got.post(`dashboards/create-dashboard?token=${test_token}`, { json: {name} });

  t.assert(body.success);
  t.is(statusCode, 200);
});

//Check if the test dashboard is added 
test('GET /dashboards after the post test', async (t) => {
  const {body, statusCode} = await t.context.got(`dashboards/dashboards?token=${test_token}`);
  
  t.assert(body.success);
  t.is(statusCode, 200);
  t.is(body.dashboards.length, 1);
  dashboards_id = body.dashboards[0].id;
});

// Creating a test dashboard that already exists 
test('POST /create-dashboard that already exists', async (t) => {
  const name = "TestDashboard";

  const {body,statusCode} = await t.context.got.post(`dashboards/create-dashboard?token=${test_token}`, { json: {name} });
  
  t.is(body.status, 409);
  t.is(body.message, 'A dashboard with that name already exists.');
});

//Getting a certain dashboard base on it's id 
test('GET /dashboard get dashboard via id', async (t) => {
  var id = dashboards_id;

  const {body, statusCode} = await t.context.got(`dashboards/dashboard?token=${test_token}&id=${id}`);
  
  t.is(statusCode,200);
  t.assert(body.success);
  t.is(body.dashboard.name,'TestDashboard');
});

//Save a dashboard
test('POST /save-dashboard', async (t) => {
  var id = dashboards_id;

  var {body,statusCode} = await t.context.got(`dashboards/dashboard?token=${test_token}&id=${id}`);

  var layout = body.dashboard.layout;
  var items = body.dashboard.items;
  var nextId = body.dashboard.nextId;

  var {body,statusCode} = await t.context.got.post(`dashboards/save-dashboard?token=${test_token}`, { json: {id, layout, items, nextId} });

  t.is(statusCode,200);
  t.assert(body.success);
});

// Deleting the test dashboard
test('POST /delete-dashboard ', async (t) => {
  var id = dashboards_id;
  
  const {body, statusCode} = await t.context.got.post(`dashboards/delete-dashboard?token=${test_token}`, {json: {id}});

  t.is(statusCode,200);
  t.assert(body.success);
});

// Checking if dashboard is deleted 
test('GET /dashboards after the delete test', async (t) => {
  const {body, statusCode} = await t.context.got(`dashboards/dashboards?token=${test_token}`);
  
  t.assert(body.success);
  t.is(statusCode, 200);
  t.is(body.dashboards.length, 0);
});

//Getting a certain dashboard,that does not exist, base on it's id 
test('GET /dashboard get dashboard, that does not exist, via id', async (t) => {
  var id = dashboards_id;

  const {body, statusCode} = await t.context.got(`dashboards/dashboard?token=${test_token}&id=${id}`);
  
  t.is(body.status, 409);
  t.assert(body.message, 'The selected dashboard has not been found.');
  
});

// Deleting a dashboard that does not exist
test('POST /delete-dashboard that does not exist ', async (t) => {
  var id = dashboards_id;
  
  const {body, statusCode} = await t.context.got.post(`dashboards/delete-dashboard?token=${test_token}`, {json: {id}});

  t.is(body.status,409);
  t.is(body.message,'The selected dashboard has not been found.');
});

//Save a dashboard that does not exits
test('POST /save-dashboard that does not exits', async (t) => {
  var id = dashboards_id;
  var layout =[];
  var items = [];
  var nextId = 0;

  const {body,statusCode} = await t.context.got.post(`dashboards/save-dashboard?token=${test_token}`, { json: {id,layout,items,nextId} });

  t.is(body.status,409);
  t.is(body.message,'The selected dashboard has not been found.' );
});
