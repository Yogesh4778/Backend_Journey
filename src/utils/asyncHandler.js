//wrapper function which we use in our app to keep code clean and concise


//using promise .then .catch 
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req,res,next)).
        catch((err) => next(err))
    }
}



export {asyncHandler}



/*
//using try catch
//since we have fn in argument so we can use it with the help of below syntax
const asyncHandler = (fn) => async (req,res,next) => {
    try{
        await fn(req,res,next);
    }
    catch(err){
        res.status(500).json({
            success: false,
            message: err.message,
        })
    }
}
*/