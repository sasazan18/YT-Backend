const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).
        catch((error) => next(error));
    };
};


export { asyncHandler }

/* Method 2: With Try/Catch inside 
const asyncHandler = (fn) => {
    async (req, res, next) => {
        try {
            await fn(req, res, next) // ← Executes the function you passed in
        }
        catch (error) {
            res.status(error.code || 500).json({
                message: error.message || "Something went wrong",
                success: false,
            })
        }
    }
}
*/