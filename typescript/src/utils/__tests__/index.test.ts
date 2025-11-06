import fs from "fs";
import csv from "csv-parser";
import { convertCsvToJson } from "../index";
import { CsvItem } from "../../types/CsvItem";

jest.mock("fs");
jest.mock("csv-parser");

describe("convertCsvToJson", () => {
  const mockReadStream = {
    pipe: jest.fn(),
    on: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.createReadStream as jest.Mock).mockReturnValue(mockReadStream);
    mockReadStream.pipe.mockReturnValue(mockReadStream);
  });

  it("should convert CSV to JSON array", async () => {
    const filePath = "/path/to/test.csv";
    const mockCsvData: CsvItem[] = [
      {
        teacherEmail: "teacher1@example.com",
        teacherName: "Teacher One",
        studentEmail: "student1@example.com",
        studentName: "Student One",
        classCode: "C1",
        classname: "Class 1",
        subjectCode: "S1",
        subjectName: "Subject 1",
        toDelete: "false",
      },
      {
        teacherEmail: "teacher2@example.com",
        teacherName: "Teacher Two",
        studentEmail: "student2@example.com",
        studentName: "Student Two",
        classCode: "C2",
        classname: "Class 2",
        subjectCode: "S2",
        subjectName: "Subject 2",
        toDelete: "false",
      },
    ];

    mockReadStream.on.mockImplementation((event: string, handler: Function) => {
      if (event === "data") {
        mockCsvData.forEach((item) => handler(item));
      } else if (event === "end") {
        setTimeout(() => handler(), 0);
      }
      return mockReadStream;
    });

    const result = await convertCsvToJson(filePath);

    expect(fs.createReadStream).toHaveBeenCalledWith(filePath);
    expect(mockReadStream.pipe).toHaveBeenCalledWith(csv());
    expect(result).toEqual(mockCsvData);
    expect(result).toHaveLength(2);
  });

  it("should return empty array when CSV file is empty", async () => {
    const filePath = "/path/to/empty.csv";

    mockReadStream.on.mockImplementation((event: string, handler: Function) => {
      if (event === "end") {
        setTimeout(() => handler(), 0);
      }
      return mockReadStream;
    });

    const result = await convertCsvToJson(filePath);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("should reject promise on stream error", async () => {
    const filePath = "/path/to/invalid.csv";
    const mockError = new Error("File read error");

    mockReadStream.on.mockImplementation((event: string, handler: Function) => {
      if (event === "error") {
        setTimeout(() => handler(mockError), 0);
      }
      return mockReadStream;
    });

    await expect(convertCsvToJson(filePath)).rejects.toThrow("File read error");
  });

  it("should handle single CSV row", async () => {
    const filePath = "/path/to/single-row.csv";
    const mockCsvData: CsvItem[] = [
      {
        teacherEmail: "teacher@example.com",
        teacherName: "Teacher",
        studentEmail: "student@example.com",
        studentName: "Student",
        classCode: "C1",
        classname: "Class 1",
        subjectCode: "S1",
        subjectName: "Subject 1",
        toDelete: "false",
      },
    ];

    mockReadStream.on.mockImplementation((event: string, handler: Function) => {
      if (event === "data") {
        mockCsvData.forEach((item) => handler(item));
      } else if (event === "end") {
        setTimeout(() => handler(), 0);
      }
      return mockReadStream;
    });

    const result = await convertCsvToJson(filePath);

    expect(result).toEqual(mockCsvData);
    expect(result).toHaveLength(1);
  });
});
