/* eslint-disable max-len */
const express = require('express');
const mongoose = require('mongoose');
const {authorization} = require('../middlewares');

const router = express.Router();

const Source = require('../models/source');

// Gets all the sources of a user 
router.get('/sources',
  authorization,
  async (req, res, next) => {
    try {
      const {id} = req.decoded;
      const foundSources = await Source.find({owner: mongoose.Types.ObjectId(id)});
      const sources = [];
      //getting the sources 
      foundSources.forEach((s) => {
        sources.push({
          id: s._id,
          name: s.name,
          type: s.type,
          url: s.url,
          login: s.login,
          passcode: s.passcode,
          vhost: s.vhost,
          active: false
        });
      });
      
      //return sources 
      return res.json({
        success: true,
        sources
      });
    } catch (err) {
      return next(err.body);
    }
  });

  // creating a source
router.post('/create-source', 
  authorization,
  async (req, res, next) => {
    try {
      //giving name, type, url, login, passcode and vhost for the new source
      const {name, type, url, login, passcode, vhost} = req.body;
      const {id} = req.decoded;
      // checking if a host with the same name exists 
      const foundSource = await Source.findOne({owner: mongoose.Types.ObjectId(id), name});
      if (foundSource) {
        //return message and error code 
        return res.json({
          status: 409,
          message: 'A source with that name already exists.'
        });
      }
      //creating the new source
      await new Source({
        name,
        type,
        url,
        login,
        passcode,
        vhost,
        owner: mongoose.Types.ObjectId(id)
      }).save();

      return res.json({success: true});
    } catch (err) {
      return next(err.body);
    }
  }); 

  // changing an existing source
router.post('/change-source', 
  authorization,
  async (req, res, next) => {
    try {
      // giving the new properties of the souce
      const {id, name, type, url, login, passcode, vhost} = req.body;
      const foundSource = await Source.findOne({_id: mongoose.Types.ObjectId(id), owner: mongoose.Types.ObjectId(req.decoded.id)});
      if (!foundSource) {
        // checking if a host with the given id exists 
        // if it does not exist return error code and a message 
        return res.json({
          status: 409,
          message: 'The selected source has not been found.'
        });
      }
      
      const sameNameSources = await Source.findOne({_id: {$ne: mongoose.Types.ObjectId(id)}, owner: mongoose.Types.ObjectId(req.decoded.id), name});
      if (sameNameSources) {
        //checking if another source with the same name exists
        //if another source has the same name return error code and a message 
        return res.json({
          status: 409,
          message: 'A source with the same name has been found.'
        });
      }
      
      // giving the source the new properties 
      foundSource.name = name;
      foundSource.type = type;
      foundSource.url = url;
      foundSource.login = login;
      foundSource.passcode = passcode;
      foundSource.vhost = vhost;
      await foundSource.save();

      return res.json({success: true});
    } catch (err) {
      return next(err.body);
    }
  }); 

  // delete a source
router.post('/delete-source', 
  authorization,
  async (req, res, next) => {
    try {
      //  give the id of the source to be deleted 
      const {id} = req.body;

      const foundSource = await Source.findOneAndRemove({_id: mongoose.Types.ObjectId(id), owner: mongoose.Types.ObjectId(req.decoded.id)});
      if (!foundSource) {
        //checking if a source with the given id exists
        //if it does not exist return error code and a message 
        return res.json({
          status: 409,
          message: 'The selected source has not been found.'
        });
      }
      return res.json({success: true});
    } catch (err) {
      return next(err.body);
    }
  }); 

  // finding a specific source
router.post('/source',
  async (req, res, next) => {
    try {
      // give the name of the source, the owner and the user
      const {name, owner, user} = req.body;
      const userId = (owner === 'self') ? user.id : owner;
      const foundSource = await Source.findOne({name, owner: mongoose.Types.ObjectId(userId)});
      if (!foundSource) {
        // checking if the wanted source exists 
        // if it does not exist return error code and a message 
        return res.json({
          status: 409,
          message: 'The selected source has not been found.'
        });
      }

      // taking the poperties of the wanted source
      const source = {};
      source.type = foundSource.type;
      source.url = foundSource.url;
      source.login = foundSource.login;
      source.passcode = foundSource.passcode;
      source.vhost = foundSource.vhost;
    
      // return the wanted source
      return res.json({
        success: true,
        source
      });
    } catch (err) {
      return next(err.body);
    }
  });

router.post('/check-sources',
  authorization,
  async (req, res, next) => {
    try {
      const {sources} = req.body;
      const {id} = req.decoded;

      const newSources = [];

      for (let i = 0; i < sources.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const result = await Source.findOne({name: sources[i], owner: mongoose.Types.ObjectId(id)});
        if (!result) {
          newSources.push(sources[i]);
        }
      }

      for (let i = 0; i < newSources.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await new Source({
          name: newSources[i],
          type: 'stomp',
          url: '',
          login: '',
          passcode: '',
          vhost: '',
          owner: mongoose.Types.ObjectId(id)
        }).save();
      } 
      
      return res.json({
        success: true,
        newSources
      });
    } catch (err) {
      return next(err.body);
    }
  });

module.exports = router;
