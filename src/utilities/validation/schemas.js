const {isNil} = require('ramda');

const yup = require('yup');
const {min} = require('./constants');

const email = yup
  .string()
  .lowercase()
  .trim()
  .email();

const username = yup
  .string()
  .trim();

const password = yup
  .string()
  .trim()
  .min(min);

// Username is required to make request
const request = yup.object().shape({username: username.required()});

// Authenticate user data
const authenticate = yup.object().shape({
  username: username.required(),
  password: password.required()
});

// Register required data
const register = yup.object().shape({
  email: email.required(),
  password: password.required(),
  username: username.required()
});

// Update user data and check params
const update = yup.object().shape({
  username,
  password
}).test({
  message: 'Missing parameters',
  test: ({username: u, password: p}) => !(isNil(u) && isNil(p))
});

// Password is required to apply
const change = yup.object().shape({password: password.required()});

module.exports = {
  authenticate, register, request, change, update
};
