const express = require('express');
const {validation, authorization} = require('../middlewares');
const {helpers: {jwtSign}} = require('../utilities/authentication');

const {mailer: {mail, send}} = require('../utilities');

const router = express.Router();

const User = require('../models/user');
const Reset = require('../models/reset');

// Create a new user with username, password, email 
router.post('/create',
  (req, res, next) => validation(req, res, next, 'register'),
  async (req, res, next) => {
    const {username, password, email} = req.body;
    try {
      const user = await User.findOne({$or: [{username}, {email}]});
      if (user) {
        // If email or username are already in use return error status and message
        return res.json({
          status: 409,
          message: 'Registration Error: A user with that e-mail or username already exists.'
        });
      }
      //creation of the new user 
      const newUser = await new User({
        username,
        password,
        email
      }).save();
      // returns the new user and the id 
      return res.json({success: true, id: newUser._id});
    } catch (error) {
      return next(error);
    }
  });

  //Authenticate user via his username and password 
router.post('/authenticate',
  (req, res, next) => validation(req, res, next, 'authenticate'),
  async (req, res, next) => {
    const {username, password} = req.body;
    try {
      const user = await User.findOne({username}).select('+password');
      if (!user) {
        // if user does not exist return error status and message 
        return res.json({
          status: 401,
          message: 'Authentication Error: User not found.'
        });
      }
      if (!user.comparePassword(password, user.password)) {
        // if password is wrong return error status and message 
        return res.json({
          status: 401,
          message: 'Authentication Error: Password does not match!'
        });
      }
      // In success return the user and the given authentication token 
      return res.json({
        user: {
          username, 
          id: user._id, 
          email: user.email
        },
        token: jwtSign({username, id: user._id, email: user.email})
      });
    } catch (error) {
      return next(error);
    }
  });

  //resets user's password 
router.post('/resetpassword',
  (req, res, next) => validation(req, res, next, 'request'),
  async (req, res, next) => {
    const {username} = req.body;
    try {
      const user = await User.findOne({username});
      if (!user) {
        // if user does not exist return error status and message 
        return res.json({
          status: 404,
          message: 'Resource Error: User not found.'
        });
      }
      const token = jwtSign({username});
      await Reset.findOneAndRemove({username});
      await new Reset({
        username,
        token,
      }).save();
      
      //send email with the reset token 
      const email = mail(token);
      send(user.email, 'Forgot Password', email);
      return res.json({
        ok: true,
        message: 'Forgot password e-mail sent.'
      });
    } catch (error) {
      return next(error);
    }
  });

  //changes user's password 
router.post('/changepassword',
  (req, res, next) => validation(req, res, next, 'change'),
  authorization,
  async (req, res, next) => {
    const {password} = req.body;
    const {username} = req.decoded;
    try {
      const user = await User.findOne({username});
      // if user forsn not exist return error status and message 
      if (!user) {
        return res.json({
          status: 404,
          message: 'Resource Error: User not found.'
        });
      }
      const reset = await Reset.findOneAndRemove({username});
      // if user's token has expired return error status and message 
      if (!reset) {
        return res.json({
          status: 410,
          message: ' Resource Error: Reset token has expired.'
        });
      }
      // change the password and save it to the user 
      user.password = password;
      await user.save();
      return res.json({
        ok: true,
        message: 'Password was changed.'
      });
    } catch (error) {
      return next(error);
    }
  });

module.exports = router;
