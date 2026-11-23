class ApiError extends Error {
    static badRequest(message, errors = []) {
        return new ApiError(400, message, errors);
    }

    static forbidden(message = "Forbidden") {
        return new ApiError(403, message);
    }

    static notFound(message = "Not found") {
        return new ApiError(404, message);
    }

    static internal(message = "Internal server error") {
        return new ApiError(500, message);
    }
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }

    }
}

export { ApiError }