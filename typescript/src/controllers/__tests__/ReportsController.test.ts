import request from "supertest";
import Express from "express";
import ReportsController from "../ReportsController";
import { StatusCodes } from "http-status-codes";
import { Enrollment, Teacher, Subject } from "../../models";

// Mock dependencies
jest.mock("../../models", () => ({
  Enrollment: {
    findAll: jest.fn(),
  },
  Teacher: {},
  Subject: {},
}));

// Mock Logger
jest.mock("../../config/logger", () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }));
});

describe("ReportsController", () => {
  let app: Express.Application;

  beforeEach(() => {
    app = Express();
    app.use(Express.json());
    app.use("/api", ReportsController);
    jest.clearAllMocks();
  });

  describe("GET /api/reports/workload", () => {
    it("should return workload report successfully", async () => {
      const mockEnrollments = [
        {
          teacherId: 1,
          subjectId: 1,
          classId: 1,
          teacher: {
            id: 1,
            name: "Teacher A",
          },
          subject: {
            id: 1,
            code: "MATH",
            name: "Mathematics",
          },
        },
        {
          teacherId: 1,
          subjectId: 1,
          classId: 2,
          teacher: {
            id: 1,
            name: "Teacher A",
          },
          subject: {
            id: 1,
            code: "MATH",
            name: "Mathematics",
          },
        },
        {
          teacherId: 1,
          subjectId: 2,
          classId: 1,
          teacher: {
            id: 1,
            name: "Teacher A",
          },
          subject: {
            id: 2,
            code: "ENG",
            name: "English",
          },
        },
        {
          teacherId: 2,
          subjectId: 1,
          classId: 3,
          teacher: {
            id: 2,
            name: "Teacher B",
          },
          subject: {
            id: 1,
            code: "MATH",
            name: "Mathematics",
          },
        },
      ];

      (Enrollment.findAll as jest.Mock).mockResolvedValue(mockEnrollments);

      const response = await request(app)
        .get("/api/reports/workload")
        .expect(StatusCodes.OK);

      expect(response.body).toBeDefined();
      expect(response.body["Teacher A"]).toBeDefined();
      expect(response.body["Teacher B"]).toBeDefined();

      // Teacher A teaches MATH in 2 classes and ENG in 1 class
      const teacherAWorkload = response.body["Teacher A"];
      expect(Array.isArray(teacherAWorkload)).toBe(true);
      expect(teacherAWorkload.length).toBe(2);

      const mathSubject = teacherAWorkload.find(
        (s: any) => s.subjectCode === "MATH"
      );
      expect(mathSubject).toBeDefined();
      expect(mathSubject.numberOfClasses).toBe(2);

      const engSubject = teacherAWorkload.find(
        (s: any) => s.subjectCode === "ENG"
      );
      expect(engSubject).toBeDefined();
      expect(engSubject.numberOfClasses).toBe(1);

      // Teacher B teaches MATH in 1 class
      const teacherBWorkload = response.body["Teacher B"];
      expect(teacherBWorkload.length).toBe(1);
      expect(teacherBWorkload[0].subjectCode).toBe("MATH");
      expect(teacherBWorkload[0].numberOfClasses).toBe(1);
    });

    it("should return empty report when no enrollments exist", async () => {
      (Enrollment.findAll as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get("/api/reports/workload")
        .expect(StatusCodes.OK);

      expect(response.body).toEqual({});
    });

    it("should handle multiple classes for same teacher and subject", async () => {
      const mockEnrollments = Array.from({ length: 5 }, (_, i) => ({
        teacherId: 1,
        subjectId: 1,
        classId: i + 1,
        teacher: {
          id: 1,
          name: "Teacher A",
        },
        subject: {
          id: 1,
          code: "MATH",
          name: "Mathematics",
        },
      }));

      (Enrollment.findAll as jest.Mock).mockResolvedValue(mockEnrollments);

      const response = await request(app)
        .get("/api/reports/workload")
        .expect(StatusCodes.OK);

      expect(response.body["Teacher A"]).toBeDefined();
      const mathSubject = response.body["Teacher A"].find(
        (s: any) => s.subjectCode === "MATH"
      );
      expect(mathSubject.numberOfClasses).toBe(5);
    });

    it("should count unique classes per teacher-subject combination", async () => {
      // Same classId appears multiple times (should be counted once)
      const mockEnrollments = [
        {
          teacherId: 1,
          subjectId: 1,
          classId: 1,
          teacher: {
            id: 1,
            name: "Teacher A",
          },
          subject: {
            id: 1,
            code: "MATH",
            name: "Mathematics",
          },
        },
        {
          teacherId: 1,
          subjectId: 1,
          classId: 1, // Same class
          teacher: {
            id: 1,
            name: "Teacher A",
          },
          subject: {
            id: 1,
            code: "MATH",
            name: "Mathematics",
          },
        },
        {
          teacherId: 1,
          subjectId: 1,
          classId: 2, // Different class
          teacher: {
            id: 1,
            name: "Teacher A",
          },
          subject: {
            id: 1,
            code: "MATH",
            name: "Mathematics",
          },
        },
      ];

      (Enrollment.findAll as jest.Mock).mockResolvedValue(mockEnrollments);

      const response = await request(app)
        .get("/api/reports/workload")
        .expect(StatusCodes.OK);

      const mathSubject = response.body["Teacher A"].find(
        (s: any) => s.subjectCode === "MATH"
      );
      // Should count 2 unique classes, not 3 enrollments
      expect(mathSubject.numberOfClasses).toBe(2);
    });

    it("should skip enrollments without teacher", async () => {
      const mockEnrollments = [
        {
          teacherId: 1,
          subjectId: 1,
          classId: 1,
          teacher: null, // Missing teacher
          subject: {
            id: 1,
            code: "MATH",
            name: "Mathematics",
          },
        },
        {
          teacherId: 2,
          subjectId: 1,
          classId: 2,
          teacher: {
            id: 2,
            name: "Teacher B",
          },
          subject: {
            id: 1,
            code: "MATH",
            name: "Mathematics",
          },
        },
      ];

      (Enrollment.findAll as jest.Mock).mockResolvedValue(mockEnrollments);

      const response = await request(app)
        .get("/api/reports/workload")
        .expect(StatusCodes.OK);

      // Should only include Teacher B
      expect(response.body).not.toHaveProperty("null");
      expect(response.body["Teacher B"]).toBeDefined();
    });

    it("should skip enrollments without subject", async () => {
      const mockEnrollments = [
        {
          teacherId: 1,
          subjectId: 1,
          classId: 1,
          teacher: {
            id: 1,
            name: "Teacher A",
          },
          subject: null, // Missing subject
        },
        {
          teacherId: 1,
          subjectId: 2,
          classId: 2,
          teacher: {
            id: 1,
            name: "Teacher A",
          },
          subject: {
            id: 2,
            code: "ENG",
            name: "English",
          },
        },
      ];

      (Enrollment.findAll as jest.Mock).mockResolvedValue(mockEnrollments);

      const response = await request(app)
        .get("/api/reports/workload")
        .expect(StatusCodes.OK);

      // Should only include ENG subject
      const teacherAWorkload = response.body["Teacher A"];
      expect(teacherAWorkload.length).toBe(1);
      expect(teacherAWorkload[0].subjectCode).toBe("ENG");
    });

    it("should return correct subject information", async () => {
      const mockEnrollments = [
        {
          teacherId: 1,
          subjectId: 1,
          classId: 1,
          teacher: {
            id: 1,
            name: "Teacher A",
          },
          subject: {
            id: 1,
            code: "SCI",
            name: "Science",
          },
        },
      ];

      (Enrollment.findAll as jest.Mock).mockResolvedValue(mockEnrollments);

      const response = await request(app)
        .get("/api/reports/workload")
        .expect(StatusCodes.OK);

      const subject = response.body["Teacher A"][0];
      expect(subject.subjectCode).toBe("SCI");
      expect(subject.subjectName).toBe("Science");
      expect(subject.numberOfClasses).toBe(1);
    });

    it("should return 500 on database error", async () => {
      (Enrollment.findAll as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app)
        .get("/api/reports/workload")
        .expect(StatusCodes.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        errorCode: 500,
        message: "Internal server error",
      });
    });

    it("should handle multiple teachers with different subjects", async () => {
      const mockEnrollments = [
        {
          teacherId: 1,
          subjectId: 1,
          classId: 1,
          teacher: { id: 1, name: "Teacher A" },
          subject: { id: 1, code: "MATH", name: "Mathematics" },
        },
        {
          teacherId: 2,
          subjectId: 2,
          classId: 2,
          teacher: { id: 2, name: "Teacher B" },
          subject: { id: 2, code: "ENG", name: "English" },
        },
        {
          teacherId: 3,
          subjectId: 3,
          classId: 3,
          teacher: { id: 3, name: "Teacher C" },
          subject: { id: 3, code: "SCI", name: "Science" },
        },
      ];

      (Enrollment.findAll as jest.Mock).mockResolvedValue(mockEnrollments);

      const response = await request(app)
        .get("/api/reports/workload")
        .expect(StatusCodes.OK);

      expect(Object.keys(response.body).length).toBe(3);
      expect(response.body["Teacher A"]).toBeDefined();
      expect(response.body["Teacher B"]).toBeDefined();
      expect(response.body["Teacher C"]).toBeDefined();
    });
  });
});

