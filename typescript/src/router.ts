import Express from "express";
import DataImportController from "./controllers/DataImportController";
import HealthcheckController from "./controllers/HealthcheckController";
import StudentController from "./controllers/StudentController";
import ClassController from "./controllers/ClassController";
import ReportsController from "./controllers/ReportsController";

const router = Express.Router();

router.use("/", DataImportController);
router.use("/", HealthcheckController);
router.use("/", StudentController);
router.use("/", ClassController);
router.use("/", ReportsController);

export default router;
