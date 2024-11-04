const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error)
    {
        console.log(error)
    }
};

/*
 const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next))
      .catch((error) => next(error));
  };
};
*/


// asyncHandler is a higher-order function that takes in 'function' as
// an argument and implicitly returns another asynchronous function
// that uses that function somewhere inside it.

export { asyncHandler };