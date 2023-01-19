/* eslint-disable max-len */
const express = require('express');
const mongoose = require('mongoose');
//aythorization throught token 
const {authorization} = require('../middlewares');

const router = express.Router();

const Dashboard = require('../models/dashboard');
const Source = require('../models/source');

// Returns all the dashboards of a user 
router.get('/dashboards',
  authorization,
  async (req, res, next) => {
    try {
      const {id} = req.decoded;
      // Find all the dashboardds
      const foundDashboards = await Dashboard.find({owner: mongoose.Types.ObjectId(id)});
      const dashboards = [];
      foundDashboards.forEach((s) => {
        dashboards.push({
          id: s._id,
          name: s.name,
          views: s.views
        });
      });
      // Return the dashboard 
      return res.json({
        success: true,
        dashboards
      });
    } catch (err) {
      return next(err.body);
    }
  });

//Creates a dashboard with a desired name 
router.post('/create-dashboard', 
  authorization,
  async (req, res, next) => {
    try {
      // The name we want to give to the dashboard 
      const {name} = req.body;
      const {id} = req.decoded;
      // Checking if another dashboard with the same name exists 
      const foundDashboard = await Dashboard.findOne({owner: mongoose.Types.ObjectId(id), name});
      if (foundDashboard) {
        // If it exists return error code and a message 
        return res.json({
          status: 409,
          message: 'A dashboard with that name already exists.'
        });
      }
      // Creating the new dashboard 
      await new Dashboard({
        name,
        layout: [],
        items: {},
        nextId: 1,
        owner: mongoose.Types.ObjectId(id)
      }).save();

      return res.json({success: true});
    } catch (err) {
      return next(err.body);
    }
  }); 

// Deletes a dashboard with a certain id
router.post('/delete-dashboard', 
  authorization,
  async (req, res, next) => {
    try {
      // Thed dashboard's id we want to delete
      const {id} = req.body;
      // Checking if a dashboard with the given id exists 
      const foundDashboard = await Dashboard.findOneAndRemove({_id: mongoose.Types.ObjectId(id), owner: mongoose.Types.ObjectId(req.decoded.id)});
      if (!foundDashboard) {
        // If it does not exist return an error code and a message 
        return res.json({
          status: 409,
          message: 'The selected dashboard has not been found.'
        });
      }
      return res.json({success: true});
    } catch (err) {
      return next(err.body);
    }
  }); 

// Rerturns a dashboard via it's id 
router.get('/dashboard',
  authorization,
  async (req, res, next) => {
    try {
      // The id of the dashboard we want to get 
      const {id} = req.query;
      // Checking if a dashboard with the given id exists 
      const foundDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(id), owner: mongoose.Types.ObjectId(req.decoded.id)});
      if (!foundDashboard) {
        // If it does not exist return error code and a message 
        return res.json({
          status: 409,
          message: 'The selected dashboard has not been found.'
        });
      }

      // The wanted dashboard 
      const dashboard = {};
      dashboard.id = foundDashboard._id;
      dashboard.name = foundDashboard.name;
      dashboard.layout = foundDashboard.layout;
      dashboard.items = foundDashboard.items;
      dashboard.nextId = foundDashboard.nextId;

      // Getting any sources tha dashboard has 
      const foundSources = await Source.find({owner: mongoose.Types.ObjectId(req.decoded.id)});
      const sources = [];
      foundSources.forEach((s) => {
        sources.push(s.name);
      });
      
      // return dashboard and it's sources 
      return res.json({
        success: true,
        dashboard,
        sources
      });
    } catch (err) {
      return next(err.body);
    }
  });

// Saves a dashoboard with some id,layout,items and next id 
router.post('/save-dashboard', 
  authorization,
  async (req, res, next) => {
    try {
      const {id, layout, items, nextId} = req.body;

      const result = await Dashboard.findOneAndUpdate({_id: mongoose.Types.ObjectId(id), owner: mongoose.Types.ObjectId(req.decoded.id)}, {
        $set: {
          layout,
          items,
          nextId
        }
      }, {new: true});
      // Checking if a dashoard with these properties exists 
      if (result === null) {
        // If it does not exist return error code and a message 
        return res.json({
          status: 409,
          message: 'The selected dashboard has not been found.'
        });
      }
      return res.json({success: true});
    } catch (err) {
      return next(err.body);
    }
  }); 

// Clones a dashboard, with same properties, via it's id with a different name 
router.post('/clone-dashboard', 
  authorization,
  async (req, res, next) => {
    try {
      // Dashboard's id we want to clone and the new dashboard's name 
      const {dashboardId, name} = req.body;
      // Checking if a dashboard with the new name exists 
      const foundDashboard = await Dashboard.findOne({owner: mongoose.Types.ObjectId(req.decoded.id), name});
      if (foundDashboard) {
        // If it exists return error code and a message 
        return res.json({
          status: 409,
          message: 'A dashboard with that name already exists.'
        });
      }

      // Getting the properties of the dashboard we want to clone 
      const oldDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(dashboardId), owner: mongoose.Types.ObjectId(req.decoded.id)});
      
      // Passing the properties to the new dashboard 
      await new Dashboard({
        name,
        layout: oldDashboard.layout,
        items: oldDashboard.items,
        nextId: oldDashboard.nextId,
        owner: mongoose.Types.ObjectId(req.decoded.id)
      }).save();

      return res.json({success: true});
    } catch (err) {
      return next(err.body);
    }
  }); 

// Checks if password is needed for access in a dashboard 
router.post('/check-password-needed', 
  async (req, res, next) => {
    try {
      const {user, dashboardId} = req.body;
      const userId = user.id;
      // Checking if a dashboard with the given id exists 
      const foundDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(dashboardId)}).select('+password');
      if (!foundDashboard) {
        // If it does not exist return error code and a message 
        return res.json({
          status: 409,
          message: 'The specified dashboard has not been found.'
        });
      }
      // Getting dashboard's properties 
      const dashboard = {};
      dashboard.name = foundDashboard.name;
      dashboard.layout = foundDashboard.layout;
      dashboard.items = foundDashboard.items;

      // Increase dashboard's views 
      if (userId && foundDashboard.owner.equals(userId)) {
        foundDashboard.views += 1;
        await foundDashboard.save();

        // Return the owner , if it is shared, if it has password and the dashboard 
        return res.json({
          success: true,
          owner: 'self',
          shared: foundDashboard.shared,
          hasPassword: foundDashboard.password !== null,
          dashboard
        });
      } 
      // If it is not shared
      if (!(foundDashboard.shared)) {
        return res.json({
          success: true,
          owner: '',
          shared: false
        });
      }
      // If dashboard does not have password 
      if (foundDashboard.password === null) {
        foundDashboard.views += 1;
        await foundDashboard.save();

        return res.json({
          success: true,
          owner: foundDashboard.owner,
          shared: true,
          passwordNeeded: false,
          dashboard
        });
      }
      return res.json({
        success: true,
        owner: '',
        shared: true,
        passwordNeeded: true
      });
    } catch (err) {
      return next(err.body);
    }
  }); 

// Checks if a password is correct for access in a dashboard 
router.post('/check-password', 
  async (req, res, next) => {
    try {
      // Give the dashboard and the password we want to check
      const {dashboardId, password} = req.body;

      //Checking if a dashboard with the given id exists 
      const foundDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(dashboardId)}).select('+password');
      if (!foundDashboard) {
        // If it does not exist return error code and a message 
        return res.json({
          status: 409,
          message: 'The specified dashboard has not been found.'
        });
      }
      // Checking if the password is correct 
      if (!foundDashboard.comparePassword(password, foundDashboard.password)) {
        return res.json({
          success: true,
          correctPassword: false
        });
      }

      // Increase views 
      foundDashboard.views += 1;
      await foundDashboard.save();

      const dashboard = {};
      dashboard.name = foundDashboard.name;
      dashboard.layout = foundDashboard.layout;
      dashboard.items = foundDashboard.items;

      return res.json({
        success: true,
        correctPassword: true,
        owner: foundDashboard.owner,
        dashboard
      });
    } catch (err) {
      return next(err.body);
    }
  }); 

// Shares a dashboard and returns it;s owner,if it need's password and the dashboard 
router.post('/share-dashboard', 
  authorization,
  async (req, res, next) => {
    try {
      // The dashboard's id we want to share 
      const {dashboardId} = req.body;
      const {id} = req.decoded;
      // Checking if a dashboard with this id exists
      const foundDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(dashboardId), owner: mongoose.Types.ObjectId(id)});
      if (!foundDashboard) {
        //If it does noe exist return error code and a message 
        return res.json({
          status: 409,
          message: 'The specified dashboard has not been found.'
        });
      }
      foundDashboard.shared = !(foundDashboard.shared);
      
      await foundDashboard.save();

      return res.json({
        success: true,
        shared: foundDashboard.shared
      });
    } catch (err) {
      return next(err.body);
    }
  }); 

// Changes the dashboard's password 
router.post('/change-password', 
  authorization,
  async (req, res, next) => {
    try {
      // The dashboard's id and the new password
      const {dashboardId, password} = req.body;
      const {id} = req.decoded;

      // Checking id a dashboard with this id exists 
      const foundDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(dashboardId), owner: mongoose.Types.ObjectId(id)});
      if (!foundDashboard) {
        // If it does not exists return error code and a message 
        return res.json({
          status: 409,
          message: 'The specified dashboard has not been found.'
        });
      }
      foundDashboard.password = password;
      
      await foundDashboard.save();

      return res.json({success: true});
    } catch (err) {
      return next(err.body);
    }
  }); 

module.exports = router;
