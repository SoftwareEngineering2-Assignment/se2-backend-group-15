/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').serial;
const got = require('got');
const listen = require('test-listen');

const app = require('../src/index');
const {jwtSign} = require('../src/utilities/authentication/helpers');
const { mongoose } = require('../src/config');

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

//Testing for users 

// It works only at first test. At next test it fails because user already exist

// //Create test user 
// test('POST /create a user', async (t) => {
//   var username = "test-username";
//   var password = "test-password";
//   var email = "test@test.com";

//   const {body, statusCode} = await t.context.got.post(`users/create`, {json: {username, password, email}});

//   t.assert(body.success);
// });


//Create a user with an email that already is used  
test('POST /create a user an email tha already is used ', async (t) => {
  var username = "test";
  var password = "test-password";
  var email = "test@test.com";

  const {body, statusCode} = await t.context.got.post(`users/create`, {json: {username, password, email}});

  t.is(body.status, 409);
  t.is(body.message, 'Registration Error: A user with that e-mail or username already exists.');
});

//Create a user with a username that already is used  
test('POST /create a user a username tha already is used ', async (t) => {
  var username = "test-username";
  var password = "test-password";
  var email = "test@different.com";

  const {body, statusCode} = await t.context.got.post(`users/create`, {json: {username, password, email}});

  t.is(body.status, 409);
  t.is(body.message, 'Registration Error: A user with that e-mail or username already exists.');
});

//Authenticate user 
var test_user_token;

test('POST /authenticate', async (t) => {
  var username = "test-username";
  var password = "test-password";


  const {body, statusCode} = await t.context.got.post(`users/authenticate`, {json: {username, password}});
  
  t.is(statusCode, 200)
  t.is(body.user.username, username);
  
  //Store test user token for future test 
  test_user_token = body.token ;
});

//Authenticate a user that does not exist 
test('POST /authenticate a user that does not exist', async (t) => {
  var username = "not_a_user";
  var password = "test-password";


  const {body, statusCode} = await t.context.got.post(`users/authenticate`, {json: {username, password}});
  
  t.is(body.status, 401)
  t.is(body.message, 'Authentication Error: User not found.');
});

//Authenticate a user with wrong password 
test('POST /authenticate a user with wrong password', async (t) => {
  var username = "test-username";
  var password = "wrong_password";


  const {body, statusCode} = await t.context.got.post(`users/authenticate`, {json: {username, password}});
  
  t.is(body.status, 401)
  t.is(body.message, 'Authentication Error: Password does not match!');
});

//Reset user's password
test('POST /resetpassword', async (t) => {
  var username = "test-username";

  const {body, statusCode} = await t.context.got.post(`users/resetpassword`, {json: {username}});
  
  t.assert(body.ok)
  t.is(body.message,'Forgot password e-mail sent.');
});

//Reset password to a user that does not exist
test('POST /resetpassword to a user tha does not exist', async (t) => {
  var username = "not_a_user";

  const {body, statusCode} = await t.context.got.post(`users/resetpassword`, {json: {username}});
  
  t.is(body.status, 404);
  t.is(body.message,'Resource Error: User not found.');
});

//Change password 
test('POST /changepassword', async (t) => {
  var password = "test-password";

  const {body, statusCode} = await t.context.got.post(`users/changepassword?token=${test_user_token}`, {json: {password}});
  
  t.assert(body.ok);
  t.is(body.message,'Password was changed.');
});

// //Change password to a user that does not exist
// test('POST /changepassword to a user that does not exist', async (t) => {
//   var password = "test-password";
//   test_user_token = jwtSign({username: "not_a_user"});

//   const {body, statusCode} = await t.context.got.post(`users/changepassword?token=${test_user_token}`, {json: {password}});
  
//   t.is(body.status, 404);
//   t.is(body.message,'Resource Error: User not found.');
// });