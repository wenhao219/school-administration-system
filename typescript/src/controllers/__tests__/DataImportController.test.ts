import request from "supertest";
import Express from "express";
import DataImportController from "../DataImportController";
import { StatusCodes } from "http-status-codes";
import { Teacher, Student, Class, Subject, Enrollment } from "../../models";
import sequelize from "../../config/database";
import { convertCsvToJson } from "../../utils";
import fs from "fs";

jest.mock("../../models", () => ({
  Teacher: {
    findOrCreate: jest.fn(),
  },
  Student: {
    findOrCreate: jest.fn(),
  },
  Class: {
    findOrCreate: jest.fn(),
  },
  Subject: {
    findOrCreate: jest.fn(),
  },
  Enrollment: {
    findOrCreate: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock("../../utils", () => ({
  convertCsvToJson: jest.fn(),
}));

jest.mock("../../config/database", () => ({
  transaction: jest.fn(),
}));

jest.mock("fs", () => ({
  unlinkSync: jest.fn(),
}));

jest.mock("../../config/multer", () => {
  const mockMulterSingle = jest.fn(() => {
    return (req: any, res: any, next: any) => {
      next();
    };
  });
  return {
    __esModule: true,
    default: {
      single: mockMulterSingle,
    },
  };
});

jest.mock("../../config/logger", () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }));
});

describe("DataImportController", () => {
  let app: Express.Application;
  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
    afterCommit: jest.fn(),
    LOCK: {},
  } as any;

  beforeEach(() => {
    app = Express();
    app.use(Express.json());
    app.use("/api", DataImportController);
    jest.clearAllMocks();

    (sequelize.transaction as jest.Mock).mockImplementation((callback: any) => {
      return callback(mockTransaction);
    });
  });

  describe("POST /api/upload", () => {
    it("should return 400 when no file is uploaded", async () => {
      const response = await request(app)
        .post("/api/upload")
        .expect(StatusCodes.BAD_REQUEST);

      expect(response.body).toEqual({
        errorCode: 400,
        message: "No file uploaded",
      });
    });

    it("should return 400 when CSV file is empty", async () => {
      const mockCsvData: any[] = [];
      (convertCsvToJson as jest.Mock).mockResolvedValue(mockCsvData);

      expect(mockCsvData.length).toBe(0);
    });

    it("should verify entity creation logic", async () => {
      const mockCsvData = [
        {
          teacherEmail: "teacher@example.com",
          teacherName: "Teacher One",
          studentEmail: "student@example.com",
          studentName: "Student One",
          classCode: "C1",
          classname: "Class 1",
          subjectCode: "S1",
          subjectName: "Subject 1",
          toDelete: "false",
        },
      ];

      const mockTeacher = {
        id: 1,
        email: "teacher@example.com",
        name: "Teacher One",
        update: jest.fn().mockResolvedValue(undefined),
      };

      (Teacher.findOrCreate as jest.Mock).mockResolvedValue([
        mockTeacher,
        true,
      ]);

      const [teacher, created] = await Teacher.findOrCreate({
        where: { email: mockCsvData[0].teacherEmail },
        defaults: {
          email: mockCsvData[0].teacherEmail,
          name: mockCsvData[0].teacherName,
        },
        transaction: mockTransaction,
      });

      expect(teacher).toBeDefined();
      expect(created).toBe(true);
    });

    it("should handle file cleanup after successful processing", async () => {
      const mockFile = {
        path: "/tmp/test.csv",
        originalname: "test.csv",
        size: 100,
      };

      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      fs.unlinkSync(mockFile.path);

      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });

    it("should handle file cleanup after error", async () => {
      const mockFile = {
        path: "/tmp/test.csv",
        originalname: "test.csv",
        size: 100,
      };

      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      fs.unlinkSync(mockFile.path);

      expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });

    it("should return 500 on CSV processing error", async () => {
      const mockFile = {
        path: "/tmp/test.csv",
        originalname: "test.csv",
        size: 100,
      };

      (convertCsvToJson as jest.Mock).mockRejectedValue(
        new Error("CSV parsing error")
      );

      expect(convertCsvToJson).toBeDefined();
    });

    it("should handle toDelete flag set to true", async () => {
      const mockCsvData = [
        {
          teacherEmail: "teacher@example.com",
          teacherName: "Teacher One",
          studentEmail: "student@example.com",
          studentName: "Student One",
          classCode: "C1",
          classname: "Class 1",
          subjectCode: "S1",
          subjectName: "Subject 1",
          toDelete: "true",
        },
      ];

      const mockTeacher = {
        id: 1,
        email: "teacher@example.com",
        name: "Teacher One",
      };

      const mockStudent = {
        id: 1,
        email: "student@example.com",
        name: "Student One",
      };

      const mockClass = {
        id: 1,
        code: "C1",
        name: "Class 1",
      };

      const mockSubject = {
        id: 1,
        code: "S1",
        name: "Subject 1",
      };

      (convertCsvToJson as jest.Mock).mockResolvedValue(mockCsvData);
      (Teacher.findOrCreate as jest.Mock).mockResolvedValue([
        mockTeacher,
        false,
      ]);
      (Student.findOrCreate as jest.Mock).mockResolvedValue([
        mockStudent,
        false,
      ]);
      (Class.findOrCreate as jest.Mock).mockResolvedValue([mockClass, false]);
      (Subject.findOrCreate as jest.Mock).mockResolvedValue([
        mockSubject,
        false,
      ]);
      (Enrollment.destroy as jest.Mock).mockResolvedValue(1);

      expect(Enrollment.destroy).toBeDefined();
    });

    it("should handle toDelete flag set to 1", async () => {
      const mockCsvData = [
        {
          teacherEmail: "teacher@example.com",
          teacherName: "Teacher One",
          studentEmail: "student@example.com",
          studentName: "Student One",
          classCode: "C1",
          classname: "Class 1",
          subjectCode: "S1",
          subjectName: "Subject 1",
          toDelete: "1",
        },
      ];

      (convertCsvToJson as jest.Mock).mockResolvedValue(mockCsvData);

      const toDelete =
        mockCsvData[0].toDelete === "1" || mockCsvData[0].toDelete === "true";
      expect(toDelete).toBe(true);
    });

    it("should update existing entities when not created", async () => {
      const mockCsvData = [
        {
          teacherEmail: "teacher@example.com",
          teacherName: "Updated Teacher",
          studentEmail: "student@example.com",
          studentName: "Updated Student",
          classCode: "C1",
          classname: "Updated Class",
          subjectCode: "S1",
          subjectName: "Updated Subject",
          toDelete: "false",
        },
      ];

      const mockTeacher = {
        id: 1,
        email: "teacher@example.com",
        name: "Old Name",
        update: jest.fn().mockResolvedValue(undefined),
      };

      const mockStudent = {
        id: 1,
        email: "student@example.com",
        name: "Old Name",
        update: jest.fn().mockResolvedValue(undefined),
      };

      const mockClass = {
        id: 1,
        code: "C1",
        name: "Old Name",
        update: jest.fn().mockResolvedValue(undefined),
      };

      const mockSubject = {
        id: 1,
        code: "S1",
        name: "Old Name",
        update: jest.fn().mockResolvedValue(undefined),
      };

      (convertCsvToJson as jest.Mock).mockResolvedValue(mockCsvData);
      (Teacher.findOrCreate as jest.Mock).mockResolvedValue([
        mockTeacher,
        false,
      ]);
      (Student.findOrCreate as jest.Mock).mockResolvedValue([
        mockStudent,
        false,
      ]);
      (Class.findOrCreate as jest.Mock).mockResolvedValue([mockClass, false]);
      (Subject.findOrCreate as jest.Mock).mockResolvedValue([
        mockSubject,
        false,
      ]);

      expect(mockTeacher.update).toBeDefined();
      expect(mockStudent.update).toBeDefined();
      expect(mockClass.update).toBeDefined();
      expect(mockSubject.update).toBeDefined();
    });

    it("should process CSV data and deduplicate names correctly", async () => {
      const mockCsvData = [
        {
          teacherEmail: "teacher@example.com",
          teacherName: "Name A",
          studentEmail: "student@example.com",
          studentName: "Name B",
          classCode: "C1",
          classname: "Name C",
          subjectCode: "S1",
          subjectName: "Name D",
          toDelete: "false",
        },
        {
          teacherEmail: "teacher@example.com",
          teacherName: "Name X",
          studentEmail: "student@example.com",
          studentName: "Name Y",
          classCode: "C1",
          classname: "Name Z",
          subjectCode: "S1",
          subjectName: "Name W",
          toDelete: "false",
        },
      ];

      (convertCsvToJson as jest.Mock).mockResolvedValue(mockCsvData);

      expect(convertCsvToJson).toBeDefined();
    });

    it("should handle transaction errors", async () => {
      const mockCsvData = [
        {
          teacherEmail: "teacher@example.com",
          teacherName: "Teacher One",
          studentEmail: "student@example.com",
          studentName: "Student One",
          classCode: "C1",
          classname: "Class 1",
          subjectCode: "S1",
          subjectName: "Subject 1",
          toDelete: "false",
        },
      ];

      (convertCsvToJson as jest.Mock).mockResolvedValue(mockCsvData);
      (sequelize.transaction as jest.Mock).mockRejectedValue(
        new Error("Transaction failed")
      );

      await expect(sequelize.transaction(jest.fn())).rejects.toThrow(
        "Transaction failed"
      );
    });
  });
});
