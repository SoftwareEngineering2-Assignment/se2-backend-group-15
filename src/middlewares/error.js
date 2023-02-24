/* eslint-disable no-console */
const {pipe, has, ifElse, assoc, identity, allPass, propEq} = require('ramda');

// Every 500 status gets a modified message
const withFormatMessageForProduction = ifElse(
  allPass([propEq('status', 500), () => process.env.NODE_ENV === 'production']),
  
  // Send server error message
  assoc('message', 'Internal server error occurred.'),
  identity
);

module.exports = (error, res) => 
  /**
     * @name error
     * @description Middleware that handles errors
     */
  pipe(
    (e) => ({...e, message: e.message}),
    // Give 500 status
    ifElse(has('status'), identity, assoc('status', 500)),
    // Give the created message
    withFormatMessageForProduction,
    // return error
    (fError) => res.status(fError.status).json(fError)
  )(error);
