// src/middlewares/errorHandler.js
export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errorCode = err.errorCode || 'SERVER_ERROR';

    if (process.env.NODE_ENV === 'development') {
        console.error('Error Stack:', err);
    }

    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message: message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};