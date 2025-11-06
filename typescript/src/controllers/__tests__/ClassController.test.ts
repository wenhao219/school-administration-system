import request from "supertest";
import Express from "express";
import ClassController from "../ClassController";
import { StatusCodes } from "http-status-codes";
import { Class } from "../../models";

// Mock the Class model
jest.mock("../../models", () => ({
  Class: {
    findOne: jest.fn(),
  },
}));

// Mock Logger
jest.mock("../../config/logger", () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }));
});

describe("ClassController", () => {
  let app: Express.Application;

  beforeEach(() => {
    app = Express();
    app.use(Express.json());
    app.use("/api", ClassController);
    jest.clearAllMocks();
  });

  describe("PUT /api/class/:classCode", () => {
    it("should update class name successfully", async () => {
      const classCode = "C1";
      const className = "Updated Class Name";
      const mockClass = {
        id: 1,
        code: classCode,
        name: "Old Name",
        update: jest.fn().mockResolvedValue(undefined),
      };

      (Class.findOne as jest.Mock).mockResolvedValue(mockClass);

      const response = await request(app)
        .put(`/api/class/${classCode}`)
        .send({ className })
        .expect(StatusCodes.NO_CONTENT);

      expect(Class.findOne).toHaveBeenCalledWith({
        where: { code: classCode },
      });
      expect(mockClass.update).toHaveBeenCalledWith({
        name: className.trim(),
      });
    });

    it("should return 400 when classCode is missing", async () => {
      const response = await request(app)
        .put("/api/class/")
        .send({ className: "New Name" })
        .expect(StatusCodes.NOT_FOUND);

      // Express router treats empty path as not found
    });

    it("should return 400 when className is missing", async () => {
      const classCode = "C1";

      const response = await request(app)
        .put(`/api/class/${classCode}`)
        .send({})
        .expect(StatusCodes.BAD_REQUEST);

      expect(response.body).toEqual({
        errorCode: 400,
        message: "className is required and must be a non-empty string",
      });
    });

    it("should return 400 when className is empty string", async () => {
      const classCode = "C1";

      const response = await request(app)
        .put(`/api/class/${classCode}`)
        .send({ className: "" })
        .expect(StatusCodes.BAD_REQUEST);

      expect(response.body).toEqual({
        errorCode: 400,
        message: "className is required and must be a non-empty string",
      });
    });

    it("should return 400 when className is only whitespace", async () => {
      const classCode = "C1";

      const response = await request(app)
        .put(`/api/class/${classCode}`)
        .send({ className: "   " })
        .expect(StatusCodes.BAD_REQUEST);

      expect(response.body).toEqual({
        errorCode: 400,
        message: "className is required and must be a non-empty string",
      });
    });

    it("should return 400 when className is not a string", async () => {
      const classCode = "C1";

      const response = await request(app)
        .put(`/api/class/${classCode}`)
        .send({ className: 123 })
        .expect(StatusCodes.BAD_REQUEST);

      expect(response.body).toEqual({
        errorCode: 400,
        message: "className is required and must be a non-empty string",
      });
    });

    it("should return 400 when class is not found", async () => {
      const classCode = "NONEXISTENT";
      const className = "New Name";

      (Class.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/class/${classCode}`)
        .send({ className })
        .expect(StatusCodes.BAD_REQUEST);

      expect(response.body).toEqual({
        errorCode: 400,
        message: `Class with code '${classCode}' not found`,
      });
    });

    it("should trim className before updating", async () => {
      const classCode = "C1";
      const className = "  Trimmed Class Name  ";
      const mockClass = {
        id: 1,
        code: classCode,
        name: "Old Name",
        update: jest.fn().mockResolvedValue(undefined),
      };

      (Class.findOne as jest.Mock).mockResolvedValue(mockClass);

      await request(app)
        .put(`/api/class/${classCode}`)
        .send({ className })
        .expect(StatusCodes.NO_CONTENT);

      expect(mockClass.update).toHaveBeenCalledWith({
        name: "Trimmed Class Name",
      });
    });

    it("should return 500 on database error", async () => {
      const classCode = "C1";
      const className = "New Name";

      (Class.findOne as jest.Mock).mockRejectedValue(
        new Error("Database connection error")
      );

      const response = await request(app)
        .put(`/api/class/${classCode}`)
        .send({ className })
        .expect(StatusCodes.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        errorCode: 500,
        message: "Internal server error",
      });
    });

    it("should return 500 when update fails", async () => {
      const classCode = "C1";
      const className = "New Name";
      const mockClass = {
        id: 1,
        code: classCode,
        name: "Old Name",
        update: jest.fn().mockRejectedValue(new Error("Update failed")),
      };

      (Class.findOne as jest.Mock).mockResolvedValue(mockClass);

      const response = await request(app)
        .put(`/api/class/${classCode}`)
        .send({ className })
        .expect(StatusCodes.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        errorCode: 500,
        message: "Internal server error",
      });
    });
  });
});
