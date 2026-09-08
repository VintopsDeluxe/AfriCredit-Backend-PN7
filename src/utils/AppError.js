// src/utils/AppError.js
export class AppError extends Error {
    constructor(message, statusCode, isOperational = true, errorCode = null) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errorCode = errorCode;
        
        Error.captureStackTrace(this, this.constructor);
    }
}