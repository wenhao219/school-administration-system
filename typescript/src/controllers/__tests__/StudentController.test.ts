import request from "supertest";
import Express from "express";
import StudentController from "../StudentController";
import { StatusCodes } from "http-status-codes";
import { Student, Enrollment, Class } from "../../models";
import axios from "axios";

jest.mock("../../models", () => ({
  Student: {},
  Enrollment: {
    findAll: jest.fn(),
  },
  Class: {
    findOne: jest.fn(),
  },
}));

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock("../../config/logger", () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }));
});

describe("StudentController", () => {
  let app: Express.Application;

  beforeEach(() => {
    app = Express();
    app.use(Express.json());
    app.use("/api", StudentController);
    jest.clearAllMocks();
    process.env.EXTERNAL_API_URL = "http://localhost:5000";
  });

  afterEach(() => {
    delete process.env.EXTERNAL_API_URL;
  });

  describe("GET /api/class/:classCode/students", () => {
    it("should return students successfully with pagination", async () => {
      const classCode = "C1";
      const offset = 0;
      const limit = 10;

      const mockClass = {
        id: 1,
        code: classCode,
        name: "Class 1",
      };

      const mockEnrollments = [
        {
          student: {
            id: 1,
            name: "Alice Smith",
            email: "alice@example.com",
          },
        },
        {
          student: {
            id: 2,
            name: "Bob Johnson",
            email: "bob@example.com",
          },
        },
      ];

      const mockExternalStudents = [
        {
          id: 3,
          name: "Charlie Brown",
          email: "charlie@example.com",
        },
      ];

      (Class.findOne as jest.Mock).mockResolvedValue(mockClass);
      (Enrollment.findAll as jest.Mock).mockResolvedValue(mockEnrollments);
      mockedAxios.get.mockResolvedValue({
        data: {
          count: 1,
          students: mockExternalStudents,
        },
      });

      const response = await request(app)
        .get(`/api/class/${classCode}/students`)
        .query({ offset, limit })
        .expect(StatusCodes.OK);

      expect(response.body).toHaveProperty("count");
      expect(response.body).toHaveProperty("students");
      expect(Array.isArray(response.body.students)).toBe(true);
      expect(Class.findOne).toHaveBeenCalledWith({
        where: { code: classCode },
      });
      expect(Enrollment.findAll).toHaveBeenCalledWith({
        where: { classId: mockClass.id },
        include: [
          {
            model: Student,
            as: "student",
            attributes: ["id", "name", "email"],
            required: true,
          },
        ],
        attributes: [],
      });
    });

    it("should return 400 when classCode is missing", async () => {
      const response = await request(app)
        .get("/api/class//students")
        .query({ offset: 0, limit: 10 })
        .expect(StatusCodes.BAD_REQUEST);

      expect(response.body).toEqual({
        errorCode: 400,
        message: "Class code is required",
      });
    });

    it("should return 400 when offset is negative", async () => {
      const classCode = "C1";

      const response = await request(app)
        .get(`/api/class/${classCode}/students`)
        .query({ offset: -1, limit: 10 })
        .expect(StatusCodes.BAD_REQUEST);

      expect(response.body).toEqual({
        errorCode: 400,
        message: "Offset must be >= 0 and limit must be >= 1",
      });
    });

    it("should return 400 when limit is less than 1", async () => {
      const classCode = "C1";

      const response = await request(app)
        .get(`/api/class/${classCode}/students`)
        .query({ offset: 0, limit: 0 })
        .expect(StatusCodes.BAD_REQUEST);

      expect(response.body).toEqual({
        errorCode: 400,
        message: "Offset must be >= 0 and limit must be >= 1",
      });
    });

    it("should use default values for offset and limit", async () => {
      const classCode = "C1";
      const mockClass = {
        id: 1,
        code: classCode,
        name: "Class 1",
      };

      (Class.findOne as jest.Mock).mockResolvedValue(mockClass);
      (Enrollment.findAll as jest.Mock).mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({
        data: {
          count: 0,
          students: [],
        },
      });

      await request(app)
        .get(`/api/class/${classCode}/students`)
        .expect(StatusCodes.OK);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/students"),
        expect.objectContaining({
          params: { class: classCode, offset: 0, limit: 10000 },
        })
      );
    });

    it("should return 404 when class is not found", async () => {
      const classCode = "NONEXISTENT";

      (Class.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/class/${classCode}/students`)
        .query({ offset: 0, limit: 10 })
        .expect(StatusCodes.NOT_FOUND);

      expect(response.body).toEqual({
        errorCode: 404,
        message: `Class with code '${classCode}' not found`,
      });
    });

    it("should merge and sort internal and external students", async () => {
      const classCode = "C1";
      const mockClass = {
        id: 1,
        code: classCode,
        name: "Class 1",
      };

      const mockEnrollments = [
        {
          student: {
            id: 1,
            name: "Zebra Adams",
            email: "zebra@example.com",
          },
        },
        {
          student: {
            id: 2,
            name: "Alice Smith",
            email: "alice@example.com",
          },
        },
      ];

      const mockExternalStudents = [
        {
          id: 3,
          name: "Bob Johnson",
          email: "bob@example.com",
        },
      ];

      (Class.findOne as jest.Mock).mockResolvedValue(mockClass);
      (Enrollment.findAll as jest.Mock).mockResolvedValue(mockEnrollments);
      mockedAxios.get.mockResolvedValue({
        data: {
          count: 1,
          students: mockExternalStudents,
        },
      });

      const response = await request(app)
        .get(`/api/class/${classCode}/students`)
        .query({ offset: 0, limit: 10 })
        .expect(StatusCodes.OK);

      expect(response.body.students[0].name).toBe("Alice Smith");
      expect(response.body.students[1].name).toBe("Bob Johnson");
      expect(response.body.students[2].name).toBe("Zebra Adams");
    });

    it("should handle pagination correctly", async () => {
      const classCode = "C1";
      const mockClass = {
        id: 1,
        code: classCode,
        name: "Class 1",
      };

      const allStudents = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Student ${i + 1}`,
        email: `student${i + 1}@example.com`,
      }));

      (Class.findOne as jest.Mock).mockResolvedValue(mockClass);
      (Enrollment.findAll as jest.Mock).mockResolvedValue(
        allStudents.map((s) => ({ student: s }))
      );
      mockedAxios.get.mockResolvedValue({
        data: {
          count: 0,
          students: [],
        },
      });

      const response = await request(app)
        .get(`/api/class/${classCode}/students`)
        .query({ offset: 5, limit: 5 })
        .expect(StatusCodes.OK);

      expect(response.body.count).toBe(20);
      expect(response.body.students).toHaveLength(5);
    });

    it("should handle external API failure gracefully", async () => {
      const classCode = "C1";
      const mockClass = {
        id: 1,
        code: classCode,
        name: "Class 1",
      };

      const mockEnrollments = [
        {
          student: {
            id: 1,
            name: "Alice Smith",
            email: "alice@example.com",
          },
        },
      ];

      (Class.findOne as jest.Mock).mockResolvedValue(mockClass);
      (Enrollment.findAll as jest.Mock).mockResolvedValue(mockEnrollments);
      mockedAxios.get.mockRejectedValue(new Error("External API error"));

      const response = await request(app)
        .get(`/api/class/${classCode}/students`)
        .query({ offset: 0, limit: 10 })
        .expect(StatusCodes.OK);

      expect(response.body.students).toHaveLength(1);
      expect(response.body.students[0].name).toBe("Alice Smith");
    });

    it("should return 500 on database error", async () => {
      const classCode = "C1";

      (Class.findOne as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app)
        .get(`/api/class/${classCode}/students`)
        .query({ offset: 0, limit: 10 })
        .expect(StatusCodes.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        errorCode: 500,
        message: "Internal server error",
      });
    });

    it("should handle duplicate students correctly", async () => {
      const classCode = "C1";
      const mockClass = {
        id: 1,
        code: classCode,
        name: "Class 1",
      };

      const mockEnrollments = [
        {
          student: {
            id: 1,
            name: "Alice Smith",
            email: "alice@example.com",
          },
        },
        {
          student: {
            id: 1,
            name: "Alice Smith",
            email: "alice@example.com",
          },
        },
      ];

      (Class.findOne as jest.Mock).mockResolvedValue(mockClass);
      (Enrollment.findAll as jest.Mock).mockResolvedValue(mockEnrollments);
      mockedAxios.get.mockResolvedValue({
        data: {
          count: 0,
          students: [],
        },
      });

      const response = await request(app)
        .get(`/api/class/${classCode}/students`)
        .query({ offset: 0, limit: 10 })
        .expect(StatusCodes.OK);

      expect(response.body.students).toHaveLength(1);
    });
  });
});
