// src/middlewares/validate.js
export const validate = (schema) => async (req, res, next) => {
    try {
        // Parse and sanitize request body against the Zod schema
        req.body = await schema.parseAsync(req.body);
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input data provided',
                details: error.errors?.map(e => ({ field: e.path.join('.'), message: e.message }))
            }
        });
    }
};