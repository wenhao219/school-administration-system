import request from "supertest";
import Express from "express";
import HealthcheckController from "../HealthcheckController";
import { StatusCodes } from "http-status-codes";

describe("HealthcheckController", () => {
  let app: Express.Application;

  beforeEach(() => {
    app = Express();
    app.use("/api", HealthcheckController);
  });

  it("should return 200 OK for GET /api/healthcheck", async () => {
    const response = await request(app)
      .get("/api/healthcheck")
      .expect(StatusCodes.OK);

    expect(response.status).toBe(StatusCodes.OK);
  });

  it("should handle healthcheck endpoint correctly", async () => {
    const response = await request(app).get("/api/healthcheck");

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.text).toBe("OK");
  });

  it("should return 404 for non-existent routes", async () => {
    const response = await request(app).get("/api/nonexistent");

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });
});
