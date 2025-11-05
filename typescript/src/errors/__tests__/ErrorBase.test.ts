import ErrorBase from "../ErrorBase";

describe("ErrorBase", () => {
  describe("constructor", () => {
    it("should create an ErrorBase instance with message, errorCode, and httpStatusCode", () => {
      const message = "Test error message";
      const errorCode = 123;
      const httpStatusCode = 400;

      const error = new ErrorBase(message, errorCode, httpStatusCode);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ErrorBase);
      expect(error.message).toBe(message);
    });
  });

  describe("getMessage", () => {
    it("should return the error message", () => {
      const message = "Custom error message";
      const error = new ErrorBase(message, 100, 500);

      expect(error.getMessage()).toBe(message);
    });
  });

  describe("getErrorCode", () => {
    it("should return the error code", () => {
      const errorCode = 456;
      const error = new ErrorBase("Error", errorCode, 500);

      expect(error.getErrorCode()).toBe(errorCode);
    });
  });

  describe("getHttpStatusCode", () => {
    it("should return the HTTP status code", () => {
      const httpStatusCode = 404;
      const error = new ErrorBase("Error", 100, httpStatusCode);

      expect(error.getHttpStatusCode()).toBe(httpStatusCode);
    });

    it("should handle different HTTP status codes", () => {
      const statusCodes = [200, 400, 401, 403, 404, 500, 503];

      statusCodes.forEach((statusCode) => {
        const error = new ErrorBase("Error", 100, statusCode);
        expect(error.getHttpStatusCode()).toBe(statusCode);
      });
    });
  });

  describe("complete error instance", () => {
    it("should store and retrieve all properties correctly", () => {
      const message = "Complete error test";
      const errorCode = 789;
      const httpStatusCode = 503;

      const error = new ErrorBase(message, errorCode, httpStatusCode);

      expect(error.getMessage()).toBe(message);
      expect(error.getErrorCode()).toBe(errorCode);
      expect(error.getHttpStatusCode()).toBe(httpStatusCode);
    });
  });
});
