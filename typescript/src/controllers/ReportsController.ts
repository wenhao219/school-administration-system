import Express, { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import Logger from "../config/logger";
import { Enrollment, Teacher, Subject } from "../models";

const ReportsController = Express.Router();
const LOG = new Logger("ReportsController.ts");

interface SubjectWorkload {
  subjectCode: string;
  subjectName: string;
  numberOfClasses: number;
}

interface WorkloadReport {
  [teacherName: string]: SubjectWorkload[];
}

const getWorkloadReportHandler: RequestHandler = async (req, res, next) => {
  try {
    LOG.info("Generating workload report");

    const enrollments = await Enrollment.findAll({
      include: [
        {
          model: Teacher,
          as: "teacher",
          attributes: ["id", "name"],
          required: true,
        },
        {
          model: Subject,
          as: "subject",
          attributes: ["id", "code", "name"],
          required: true,
        },
      ],
      attributes: ["teacherId", "subjectId", "classId"],
    });

    const workloadMap = new Map<
      string,
      Map<number, { subject: Subject; classes: Set<number> }>
    >();

    for (const enrollment of enrollments) {
      const teacher = (enrollment as any).teacher;
      const subject = (enrollment as any).subject;

      if (!teacher || !subject) {
        continue;
      }

      const teacherName = teacher.name;
      const subjectId = subject.id;
      const classId = (enrollment as any).classId;

      if (!workloadMap.has(teacherName)) {
        workloadMap.set(teacherName, new Map());
      }

      const teacherSubjects = workloadMap.get(teacherName)!;

      if (!teacherSubjects.has(subjectId)) {
        teacherSubjects.set(subjectId, {
          subject,
          classes: new Set<number>(),
        });
      }

      teacherSubjects.get(subjectId)!.classes.add(classId);
    }

    const report: WorkloadReport = {};

    for (const [teacherName, teacherSubjects] of workloadMap.entries()) {
      const subjects: SubjectWorkload[] = [];

      for (const [, { subject, classes }] of teacherSubjects.entries()) {
        subjects.push({
          subjectCode: subject.code,
          subjectName: subject.name,
          numberOfClasses: classes.size,
        });
      }

      report[teacherName] = subjects;
    }

    LOG.info(`Workload report generated for ${workloadMap.size} teachers`);

    return res.status(StatusCodes.OK).json(report);
  } catch (error: any) {
    LOG.error(
      `Error generating workload report: ${error.message || String(error)}`
    );
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      errorCode: 500,
      message: "Internal server error",
    });
  }
};

ReportsController.get("/reports/workload", getWorkloadReportHandler);

export default ReportsController;
