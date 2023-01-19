const jwt = require('jsonwebtoken');
const {path, ifElse, isNil, startsWith, slice, identity, pipe} = require('ramda');

const secret = process.env.SERVER_SECRET;

module.exports = (req, res, next) => {
  /**
     * @name authorization
     * @description Middleware that checks a token's presence and validity in a request
    */
  pipe(
    (r) =>
    // Take the token from one of paths 
      path(['query', 'token'], r)
          || path(['headers', 'x-access-token'], r)
          || path(['headers', 'authorization'], r),
    ifElse(
      (t) => !isNil(t) && startsWith('Bearer ', t),
      (t) => slice(7, t.length, t).trimLeft(),
      identity
    ),
    ifElse(
      isNil,
      () =>
        next({
          // Checking if the token exists 
          // If it does not exist return an error code and a message 
          message: 'Authorization Error: token missing.',
          status: 403
        }),
      (token) =>
      // Checking if the token is correct 
        jwt.verify(token, secret, (e, d) =>
          ifElse(
            (err) => !isNil(err),
            (er) => {
              // Checking if the token has expired 
              if (er.name === 'TokenExpiredError') {
                // If it has expired return error code and a message 
                next({
                  message: 'TokenExpiredError',
                  status: 401,
                });
              }
              // If the token is not correct 
              // Return and error code and a message
              next({
                message: 'Authorization Error: Failed to verify token.',
                status: 403
              });
            },
            // Decode the token 
            (_, decoded) => {
              req.decoded = decoded;
              return next();
            }
          )(e, d))
    )
  )(req);
};
