import Express, { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import Logger from "../config/logger";
import { Student, Enrollment, Class } from "../models";
import axios from "axios";

const StudentController = Express.Router();
const LOG = new Logger("StudentController.ts");

interface ExternalStudent {
  id: number;
  name: string;
  email: string;
}

interface StudentResponse {
  id: number;
  name: string;
  email: string;
}

interface StudentListResponse {
  count: number;
  students: StudentResponse[];
}

async function fetchExternalStudents(
  classCode: string,
  offset: number,
  limit: number
): Promise<ExternalStudent[]> {
  try {
    const EXTERNAL_API_URL =
      process.env.EXTERNAL_API_URL || "http://localhost:5000";
    const response = await axios.get<StudentListResponse>(
      `${EXTERNAL_API_URL}/students`,
      {
        params: { class: classCode, offset, limit },
        timeout: 5000,
      }
    );
    return response.data.students || [];
  } catch (error: any) {
    LOG.warn(
      `Failed to fetch external students: ${error.message || String(error)}`
    );
    return [];
  }
}

async function getInternalStudents(
  classId: number
): Promise<StudentResponse[]> {
  const enrollments = await Enrollment.findAll({
    where: { classId },
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

  const studentsMap = new Map<number, StudentResponse>();

  for (const enrollment of enrollments) {
    const student = (enrollment as any).student;
    if (student && !studentsMap.has(student.id)) {
      studentsMap.set(student.id, {
        id: student.id,
        name: student.name,
        email: student.email,
      });
    }
  }

  return Array.from(studentsMap.values());
}

function mergeAndSortStudents(
  internalStudents: StudentResponse[],
  externalStudents: StudentResponse[]
): StudentResponse[] {
  const allStudents = [...internalStudents, ...externalStudents];

  allStudents.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return a.email.localeCompare(b.email, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  return allStudents;
}

const getStudentsHandler: RequestHandler = async (req, res, next) => {
  try {
    const classCode = req.params.classCode;
    const offset = parseInt(req.query.offset as string, 10);
    const limit = parseInt(req.query.limit as string, 10);
    if (!classCode) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        errorCode: 400,
        message: "Class code is required",
      });
    }

    if (offset < 0 || limit < 1) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        errorCode: 400,
        message: "Offset must be >= 0 and limit must be >= 1",
      });
    }

    const classEntity = await Class.findOne({
      where: { code: classCode },
    });

    if (!classEntity) {
      return res.status(StatusCodes.NOT_FOUND).send({
        errorCode: 404,
        message: `Class with code '${classCode}' not found`,
      });
    }

    const classId = classEntity.id;

    LOG.info(
      `Fetching students for class ${classCode} (id: ${classId}) with offset=${offset}, limit=${limit}`
    );

    const [internalStudents, externalStudents] = await Promise.all([
      getInternalStudents(classId),
      fetchExternalStudents(classCode, 0, 10000), // Fetch all external students to merge properly
    ]);

    const allStudents = mergeAndSortStudents(
      internalStudents,
      externalStudents
    );

    const totalCount = allStudents.length;

    const paginatedStudents = allStudents.slice(offset, offset + limit);

    const response: StudentListResponse = {
      count: totalCount,
      students: paginatedStudents,
    };

    LOG.info(
      `Returning ${paginatedStudents.length} students out of ${totalCount} total`
    );

    return res.status(StatusCodes.OK).json(response);
  } catch (error: any) {
    LOG.error(`Error fetching students: ${error.message || String(error)}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      errorCode: 500,
      message: "Internal server error",
    });
  }
};

const validateClassCode: RequestHandler = (req, res, next) => {
  const classCode = req.params.classCode?.trim();
  if (!classCode) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      errorCode: 400,
      message: "Class code is required",
    });
  }
  next();
};

StudentController.get(
  "/class/:classCode/students",
  validateClassCode,
  getStudentsHandler
);

StudentController.get("/class//students", (req, res) => {
  return res.status(StatusCodes.BAD_REQUEST).json({
    errorCode: 400,
    message: "Class code is required",
  });
});

export default StudentController;
