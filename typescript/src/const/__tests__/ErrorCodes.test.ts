import ErrorCodes from "../ErrorCodes";

describe("ErrorCodes", () => {
  it("should have MALFORMED_JSON_ERROR_CODE defined", () => {
    expect(ErrorCodes.MALFORMED_JSON_ERROR_CODE).toBeDefined();
    expect(typeof ErrorCodes.MALFORMED_JSON_ERROR_CODE).toBe("number");
    expect(ErrorCodes.MALFORMED_JSON_ERROR_CODE).toBe(88);
  });

  it("should have RUNTIME_ERROR_CODE defined", () => {
    expect(ErrorCodes.RUNTIME_ERROR_CODE).toBeDefined();
    expect(typeof ErrorCodes.RUNTIME_ERROR_CODE).toBe("number");
    expect(ErrorCodes.RUNTIME_ERROR_CODE).toBe(99);
  });

  it("should contain all expected error codes", () => {
    expect(ErrorCodes).toHaveProperty("MALFORMED_JSON_ERROR_CODE");
    expect(ErrorCodes).toHaveProperty("RUNTIME_ERROR_CODE");
  });

  it("should have unique error codes", () => {
    const codes = Object.values(ErrorCodes);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});
