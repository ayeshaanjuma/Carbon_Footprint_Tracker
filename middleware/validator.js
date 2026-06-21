const { validationResult } = require('express-validator');

/**
 * Middleware wrapper to validate express-validator schemas
 * @param {Array} validations - express-validator rules array
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validation schemas sequentially
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const errorDetails = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      location: err.location
    }));

    return res.status(400).json({
      status: 'fail',
      statusCode: 400,
      message: 'Validation failed',
      errors: errorDetails
    });
  };
};

module.exports = validate;
