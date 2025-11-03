import Express, { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import Logger from "../config/logger";
import { Class } from "../models";

const ClassController = Express.Router();
const LOG = new Logger("ClassController.ts");

interface UpdateClassNameRequest {
  className: string;
}

const updateClassNameHandler: RequestHandler = async (req, res, next) => {
  try {
    const classCode = req.params.classCode;
    const { className } = req.body as UpdateClassNameRequest;

    if (!classCode) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        errorCode: 400,
        message: "Class code is required",
      });
    }

    if (
      !className ||
      typeof className !== "string" ||
      className.trim().length === 0
    ) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        errorCode: 400,
        message: "className is required and must be a non-empty string",
      });
    }

    LOG.info(`Updating class name for class code: ${classCode}`);

    const classEntity = await Class.findOne({
      where: { code: classCode },
    });

    if (!classEntity) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        errorCode: 400,
        message: `Class with code '${classCode}' not found`,
      });
    }

    await classEntity.update({ name: className.trim() });

    LOG.info(`Successfully updated class name for class code: ${classCode}`);

    return res.sendStatus(StatusCodes.NO_CONTENT);
  } catch (error: any) {
    LOG.error(`Error updating class name: ${error.message || String(error)}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      errorCode: 500,
      message: "Internal server error",
    });
  }
};

ClassController.put("/class/:classCode", updateClassNameHandler);

export default ClassController;
