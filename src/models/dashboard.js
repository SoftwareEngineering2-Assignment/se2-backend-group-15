/* eslint-disable func-names */
const mongoose = require('mongoose');
const beautifyUnique = require('mongoose-beautiful-unique-validation');
const {passwordDigest, comparePassword} = require('../utilities/authentication/helpers');

mongoose.pluralize(null);

//  Dashboard schema definition
const DashboardSchema = new mongoose.Schema(
  {
    // The dashboard' name, it is always required
    name: {
      index: true,
      type: String,
      required: [true, 'Dashboard name is required']
    },
    // The dashboard's layout
    layout: {
      type: Array,
      default: []
    },
    // The items thah dashboard contains
    items: {
      type: Object,
      default: {}
    },
    // The next id given
    nextId: {
      type: Number,
      min: 1,
      default: 1
    },
    // If the dashboard has password and the password 
    password: {
      type: String,
      select: false,
      default: null
    },
    // If the dashboard is shared with someone else 
    shared: {
      type: Boolean,
      default: false
    },
    // How many views the dashboard has 
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    // The owner of the dashboard 
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Date that the dashboard was created 
    createdAt: {type: Date}
  }
);

// Plugin for Mongoose that turns duplicate errors into regular Mongoose validation errors.

DashboardSchema.plugin(beautifyUnique);

// Pre save hook that hashes passwords

DashboardSchema.pre('save', function (next) {
  if (this.isModified('password')) {
    this.password = passwordDigest(this.password);
  }
  if (this.isModified('name')) {
    this.createdAt = Date.now();
  }
  return next();
});

// Model method that compares hashed passwords

DashboardSchema.methods.comparePassword = function (password) {
  return comparePassword(password, this.password);
};

module.exports = mongoose.model('dashboards', DashboardSchema);
