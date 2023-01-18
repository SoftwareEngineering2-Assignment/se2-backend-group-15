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

//Cloning a dashboard 
test('POST /clone-dashboard', async (t) =>{
  var dashboardId = dashboards_id;
  var name = "TestDashboard2";

  var {body,statusCode} = await t.context.got.post(`dashboards/clone-dashboard?token=${test_token}`, { json: {dashboardId, name} });

  t.is(statusCode,200);
  t.assert(body.success);

  //Cloning a dashboard that it's name already exists
  var {body,statusCode} = await t.context.got.post(`dashboards/clone-dashboard?token=${test_token}`, { json: {dashboardId, name} });
  t.is(body.status, 409);
  t.is(body.message,'A dashboard with that name already exists.');

  // Deleting the cloned dashoboard to not affect other tests 
  var {body, statusCode} = await t.context.got(`dashboards/dashboards?token=${test_token}`);
  var id = body.dashboards[1].id

  var {body, statusCode} = await t.context.got.post(`dashboards/delete-dashboard?token=${test_token}`, {json: {id}});

  t.is(statusCode,200);
  t.assert(body.success);
});

//Check if password needed 
test('POST /check-password-needed', async (t) =>{
  var dashboardId = dashboards_id;
  var user ={
    id: process.env.TEST_ID
  }

  var {body,statusCode} = await t.context.got.post(`dashboards/check-password-needed`, { json: {user, dashboardId} });

  t.is(statusCode, 200);
  t.assert(body.success);
  t.is(body.dashboard.name,'TestDashboard');
  t.is(body.hasPassword, false);
  

  //If dashboard does not exits 
  var dashboardId = 0;

  var {body,statusCode} = await t.context.got.post(`dashboards/check-password-needed`, { json: {user, dashboardId} });
  
  t.is(body.message,'The specified dashboard has not been found.');
  t.is(body.status, 409); 
});

//Change password
test('POST /change-password', async (t) =>{
  var dashboardId = dashboards_id;
  var password = "12345";

  var {body,statusCode} = await t.context.got.post(`dashboards/change-password?token=${test_token}`, { json: {dashboardId, password} });
  t.assert(body.success);
});

//Check password
test('POST /check-password', async (t) =>{
  var dashboardId = dashboards_id;
  var password = "12345";

  var {body,statusCode} = await t.context.got.post(`dashboards/check-password`, { json: {dashboardId, password} });

  t.assert(body.success);
  t.assert(body.correctPassword);

  //Incorrect password 
  var password = "12354";

  var {body,statusCode} = await t.context.got.post(`dashboards/check-password`, { json: {dashboardId, password} });

  t.assert(body.success);
  t.is(body.correctPassword,false);
});

//Share a dashboard 
test('POST /sahre-dashboard ', async (t) => {
  var dashboardId = dashboards_id;
  
  const {body, statusCode} = await t.context.got.post(`dashboards/share-dashboard?token=${test_token}`, {json: {dashboardId}});

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

//Check password if dashboard does not exist
test('POST /check-password if dashboard does not exist', async (t) =>{
  var dashboardId = dashboards_id;
  var password = "12345";

  var {body,statusCode} = await t.context.got.post(`dashboards/check-password`, { json: {dashboardId, password} });

  t.is(body.status, 409);
  t.is(body.message,'The specified dashboard has not been found.');
});

//Change password if dashboard does not exist
test('POST /change-password if dashboard does not exist', async (t) =>{
  var dashboardId = dashboards_id;
  var password = "12345";

  var {body,statusCode} = await t.context.got.post(`dashboards/change-password?token=${test_token}`, { json: {dashboardId, password} });
 
  t.is(body.status, 409);
  t.is(body.message,'The specified dashboard has not been found.');
});

//Share a dashboard that does not exist 
test('POST /sahre-dashboard that does not exist', async (t) => {
  var dashboardId = dashboards_id;
  
  const {body, statusCode} = await t.context.got.post(`dashboards/share-dashboard?token=${test_token}`, {json: {dashboardId}});

  t.is(body.status, 409);
  t.is(body.message,'The specified dashboard has not been found.');
});