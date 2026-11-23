class ApiResponse {
    static success(data, message = "Success") {
        return new ApiResponse(200, data, message);
    }

    static created(data, message = "Created") {
        return new ApiResponse(201, data, message);
    }
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}

export { ApiResponse }