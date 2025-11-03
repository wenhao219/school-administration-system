import Express, { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';

const HealthcheckController = Express.Router();

const healthcheckHandler: RequestHandler = async (req, res) => {
  return res.sendStatus(StatusCodes.OK);
}

HealthcheckController.get('/healthcheck', healthcheckHandler);

export default HealthcheckController;
