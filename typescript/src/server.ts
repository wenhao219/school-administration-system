import "dotenv/config";
import sequelize from "./config/database";
import Logger from "./config/logger";
import App from "./app";
import "./models";

const MAX_RETRY = 20;
const LOG = new Logger("server.js");
const { PORT = 3000 } = process.env;

const startApplication = async (retryCount: number) => {
  try {
    LOG.info(
      `Attempting to connect to database (attempt ${
        MAX_RETRY - retryCount + 1
      }/${MAX_RETRY})...`
    );
    await sequelize.authenticate();
    LOG.info("Database connection has been established successfully.");

    await sequelize.sync({ alter: false });
    LOG.info("All models were synchronized successfully.");

    App.listen(PORT, () => {
      LOG.info(`Application started at http://localhost:${PORT}`);
    });
  } catch (e: any) {
    LOG.error(`Database connection failed: ${e.message || String(e)}`);

    const nextRetryCount = retryCount - 1;
    if (nextRetryCount > 0) {
      LOG.info(
        `Retrying in 3 seconds... (${nextRetryCount} attempts remaining)`
      );
      setTimeout(async () => await startApplication(nextRetryCount), 3000);
      return;
    }

    LOG.error(
      "Unable to start application - database connection failed after all retries"
    );
    process.exit(1);
  }
};

startApplication(MAX_RETRY);
