import Express from "express";
import compression from "compression";
import cors from "cors";
import bodyParser from "body-parser";
import router from "./router";
import globalErrorHandler from "./config/globalErrorHandler";

const App = Express();

App.use(compression());
App.use(cors());
App.use(bodyParser.json());
App.use(bodyParser.urlencoded({ extended: true }));

App.use((req, res, next) => {
  req.url = req.url.replace(/\/{2,}/g, "/");
  next();
});

App.use("/api", router);
App.use(globalErrorHandler);

export default App;
