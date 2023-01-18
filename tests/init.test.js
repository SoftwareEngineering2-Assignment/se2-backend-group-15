/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').serial;
const got = require('got');
const listen = require('test-listen');

const app = require('../src/index');
const {jwtSign} = require('../src/utilities/authentication/helpers');

const test_token = jwtSign({id:process.env.TEST_ID });

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

test('GET /dashboards', async (t) => {
  const {body, statusCode} = await t.context.got(`dashboards/dashboards?token=${test_token}`);
  
  t.assert(body.success);
  t.is(statusCode, 200);
});

test('POST /create-dashboard ', async (t) => {
  const name = "TestDashboard";

  const {body,statusCode} = await t.context.got.post(`dashboards/create-dashboard?token=${test_token}`, { json: {name} });

  t.assert(body.success);
  t.is(statusCode, 200);
});

test('POST /create-dashboard that already exists', async (t) => {
  const name = "TestDashboard";

  const {body,statusCode} = await t.context.got.post(`dashboards/create-dashboard?token=${test_token}`, { json: {name} });
  
  t.is(body.status, 409);
  t.is(body.message, 'A dashboard with that name already exists.');
});
