import Express, { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import Logger from "../config/logger";
import upload from "../config/multer";
import { convertCsvToJson } from "../utils";
import { Teacher, Student, Class, Subject, Enrollment } from "../models";
import sequelize from "../config/database";
import { CsvItem } from "../types/CsvItem";
import fs from "fs";

const DataImportController = Express.Router();
const LOG = new Logger("DataImportController.js");

const dataImportHandler: RequestHandler = async (req, res, next) => {
  LOG.info("Upload request received");

  if (!req.file) {
    LOG.warn("No file in request");
    return res.status(StatusCodes.BAD_REQUEST).send({
      errorCode: 400,
      message: "No file uploaded",
    });
  }

  LOG.info(
    `File received: ${req.file.originalname}, size: ${req.file.size} bytes`
  );

  try {
    const csvData = await convertCsvToJson(req.file.path);

    if (!csvData || csvData.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        errorCode: 400,
        message: "CSV file is empty",
      });
    }

    const processedData = processCsvData(csvData);

    await sequelize.transaction(async (t) => {
      const teacherMap = new Map<string, number>();
      const studentMap = new Map<string, number>();
      const classMap = new Map<string, number>();
      const subjectMap = new Map<string, number>();
      for (const row of processedData) {
        const [teacher, teacherCreated] = await Teacher.findOrCreate({
          where: { email: row.teacherEmail },
          defaults: { email: row.teacherEmail, name: row.teacherName },
          transaction: t,
        });
        if (!teacherCreated) {
          await teacher.update(
            {
              email: row.teacherEmail,
              name: row.teacherName,
            },
            { transaction: t }
          );
        }
        teacherMap.set(row.teacherEmail, teacher.id);

        const [student, studentCreated] = await Student.findOrCreate({
          where: { email: row.studentEmail },
          defaults: { email: row.studentEmail, name: row.studentName },
          transaction: t,
        });
        if (!studentCreated) {
          await student.update(
            {
              email: row.studentEmail,
              name: row.studentName,
            },
            { transaction: t }
          );
        }
        studentMap.set(row.studentEmail, student.id);

        const [classEntity, classCreated] = await Class.findOrCreate({
          where: { code: row.classCode },
          defaults: { code: row.classCode, name: row.classname },
          transaction: t,
        });
        if (!classCreated) {
          await classEntity.update(
            {
              code: row.classCode,
              name: row.classname,
            },
            { transaction: t }
          );
        }
        classMap.set(row.classCode, classEntity.id);

        const [subject, subjectCreated] = await Subject.findOrCreate({
          where: { code: row.subjectCode },
          defaults: { code: row.subjectCode, name: row.subjectName },
          transaction: t,
        });
        if (!subjectCreated) {
          await subject.update(
            {
              code: row.subjectCode,
              name: row.subjectName,
            },
            { transaction: t }
          );
        }
        subjectMap.set(row.subjectCode, subject.id);
      }

      for (const row of processedData) {
        const teacherId = teacherMap.get(row.teacherEmail);
        const studentId = studentMap.get(row.studentEmail);
        const classId = classMap.get(row.classCode);
        const subjectId = subjectMap.get(row.subjectCode);

        if (!teacherId || !studentId || !classId || !subjectId) {
          throw new Error("Failed to resolve entity IDs");
        }

        const toDelete = row.toDelete === "1" || row.toDelete === "true";

        if (toDelete) {
          await Enrollment.destroy({
            where: {
              teacherId,
              subjectId,
              studentId,
              classId,
            },
            transaction: t,
          });
        } else {
          const [enrollment, created] = await Enrollment.findOrCreate({
            where: {
              teacherId,
              subjectId,
              studentId,
              classId,
            },
            defaults: {
              teacherId,
              subjectId,
              studentId,
              classId,
            },
            transaction: t,
          });

          if (!created) {
            await enrollment.update(
              {
                teacherId,
                subjectId,
                studentId,
                classId,
              },
              { transaction: t }
            );
          }
        }
      }
    });

    LOG.info(`Successfully processed ${csvData.length} CSV rows`);

    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
        LOG.info(`Cleaned up temporary file: ${req.file.path}`);
      } catch (cleanupError) {
        LOG.warn(`Failed to cleanup file: ${req.file.path}`);
      }
    }

    return res.sendStatus(StatusCodes.NO_CONTENT);
  } catch (error: any) {
    LOG.error(`Error processing CSV: ${error.message || String(error)}`);

    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
        LOG.info(`Cleaned up temporary file after error: ${req.file.path}`);
      } catch (cleanupError) {
        LOG.warn(`Failed to cleanup file: ${req.file.path}`);
      }
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      errorCode: 500,
      message: "Internal server error",
    });
  }
};

function processCsvData(csvData: CsvItem[]): CsvItem[] {
  const teacherMap = new Map<string, string>();
  const studentMap = new Map<string, string>();
  const classMap = new Map<string, string>();
  const subjectMap = new Map<string, string>();

  for (let i = csvData.length - 1; i >= 0; i--) {
    const row = csvData[i];

    if (!teacherMap.has(row.teacherEmail)) {
      teacherMap.set(row.teacherEmail, row.teacherName);
    }
    if (!studentMap.has(row.studentEmail)) {
      studentMap.set(row.studentEmail, row.studentName);
    }
    if (!classMap.has(row.classCode)) {
      classMap.set(row.classCode, row.classname);
    }
    if (!subjectMap.has(row.subjectCode)) {
      subjectMap.set(row.subjectCode, row.subjectName);
    }
  }

  return csvData.map((row) => ({
    ...row,
    teacherName: teacherMap.get(row.teacherEmail) || row.teacherName,
    studentName: studentMap.get(row.studentEmail) || row.studentName,
    className: classMap.get(row.classCode) || row.classname,
    subjectName: subjectMap.get(row.subjectCode) || row.subjectName,
  }));
}

DataImportController.post(
  "/upload",
  (req, res, next) => {
    upload.single("data")(req, res, (err: any) => {
      if (err) {
        LOG.error(`Multer error: ${err.message}`);
        return res.status(StatusCodes.BAD_REQUEST).send({
          errorCode: 400,
          message: err.message || "File upload error",
        });
      }

      next();
    });
  },
  dataImportHandler
);

export default DataImportController;
