/* eslint-disable func-names */
const mongoose = require('mongoose');
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const {passwordDigest, comparePassword} = require('../utilities/authentication/helpers');
const {constants: {min}} = require('../utilities/validation');

mongoose.pluralize(null);

// The structure of the user 
const UserSchema = new mongoose.Schema(
  {
    // The email of the user is reuired and in lowercase 
    // It needs not to be in use from another user
    email: {
      index: true,
      type: String,
      unique: 'A user already exists with that email!',
      required: [true, 'User email is required'],
      lowercase: true
    },
    // The username of the user it is required 
    // It needs not to be in use from another user
    username: {
      index: true,
      type: String,
      unique: 'A user already exists with that username!',
      required: [true, 'Username is required'],
    },
    // A password for each user is required
    // It must has a minimun length
    password: {
      type: String,
      required: [true, 'User password is required'],
      select: false,
      minlength: min
    },
    // The date that user registered 
    registrationDate: {type: Number}
  }
);

// Plugin for Mongoose that turns duplicate errors into regular Mongoose validation errors.

UserSchema.plugin(beautifyUnique);

// Pre save hook that hashes passwords

UserSchema.pre('save', function (next) {
  if (this.isModified('password')) {
    this.password = passwordDigest(this.password);
  }
  if (this.isModified('email') || this.isModified('username')) {
    this.registrationDate = Date.now();
  }
  return next();
});

// Model method that compares hashed passwords

UserSchema.methods.comparePassword = function (password) {
  return comparePassword(password, this.password);
};

module.exports = mongoose.model('users', UserSchema);
