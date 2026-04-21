import { Router, type IRouter } from "express";
import healthRouter from "./health";
import provisionRouter from "./provision";

const router: IRouter = Router();

router.use(healthRouter);
router.use(provisionRouter);

export default router;
