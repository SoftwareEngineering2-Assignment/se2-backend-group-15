/* eslint-disable max-len */
const express = require('express');
const got = require('got');

const router = express.Router();

const User = require('../models/user');
const Dashboard = require('../models/dashboard');
const Source = require('../models/source');

// Getting the statistics from the home page 
router.get('/statistics',
  async (req, res, next) => {
    try {
      // The statistics that we are taking, total # of users, total # of dashboards, total # of views and total # of sources
      const users = await User.countDocuments();
      const dashboards = await Dashboard.countDocuments();
      const views = await Dashboard.aggregate([
        {
          $group: {
            _id: null, 
            views: {$sum: '$views'}
          }
        }
      ]);
      const sources = await Source.countDocuments();

      // Calculate total views
      let totalViews = 0;
      if (views[0] && views[0].views) {
        totalViews = views[0].views;
      }
      
      // Return the stastistics 
      return res.json({
        success: true,
        users,
        dashboards,
        views: totalViews,
        sources
      });
    } catch (err) {
      return next(err.body);
    }
  });

  // Testing a url 
router.get('/test-url',
  async (req, res) => {
    try {
      // Url is given with a query parameter 
      const {url} = req.query;
      const {statusCode} = await got(url);
      // Return the status code and if the url is active 
      return res.json({
        status: statusCode,
        active: (statusCode === 200),
      });
    } catch (err) {
      // If the url is not active return error code 
      return res.json({
        status: 500,
        active: false,
      });
    }
  });

  // Testing http request to a url
router.get('/test-url-request',
  async (req, res) => {
    try {
      // query parameters to specify the request we want to do 
      const {url, type, headers, body: requestBody, params} = req.query;

      let statusCode;
      let body;
      switch (type) {
        // Choose the type of the request 
        case 'GET':
          ({statusCode, body} = await got(url, {
            headers: headers ? JSON.parse(headers) : {},
            searchParams: params ? JSON.parse(params) : {}
          }));
          break;
        case 'POST':
          ({statusCode, body} = await got.post(url, {
            headers: headers ? JSON.parse(headers) : {},
            json: requestBody ? JSON.parse(requestBody) : {}
          }));
          break;
        case 'PUT':
          ({statusCode, body} = await got.put(url, {
            headers: headers ? JSON.parse(headers) : {},
            json: requestBody ? JSON.parse(requestBody) : {}
          }));
          break;
          // If request is sent but does not work 
        default:
          statusCode = 500;
          body = 'Something went wrong';
      }
      
      return res.json({
        status: statusCode,
        response: body,
      });
    } catch (err) {
      // If the request is not send return error code 
      return res.json({
        status: 500,
        response: err.toString(),
      });
    }
  });

module.exports = router;
