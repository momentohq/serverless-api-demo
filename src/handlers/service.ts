import express, {Request, Response} from "express";
import serverlessExpress from "@vendia/serverless-express";

import {
    handleBootstrapTestUsers,
    handleGetCachedFollowers,
    handleGetCachedUser,
    handleGetFollowers,
    handleGetProfilePic,
    handleGetUser
} from "../controllers/users";
import {metricMiddleware} from "../middleware/request-metric-logger";

const app = express();
const router = express.Router();

// Middleware that records time taken for each API
app.use(metricMiddleware)

// Set up API routes
router.post('/bootstrap', async (req: Request, res: Response) => {
    return res.json(await handleBootstrapTestUsers());
});

router.get("/users/:userId", async (req: Request, res: Response) => {
    return res.json(await handleGetUser(req.params.userId));
});
router.get("/cached-users/:userId", async (req: Request, res: Response) => {
    return res.json(await handleGetCachedUser(req.params.userId));
});

router.get("/followers/:userId", async (req: Request, res: Response) => {
    return res.json(await handleGetFollowers(req.params.userId));
});
router.get("/cached-followers/:userId", async (req: Request, res: Response) => {
    return res.json(await handleGetCachedFollowers(req.params.userId));
});

router.get("/profile-pic/:userId", async (req: Request, res: Response) => {
    return res.json(await handleGetProfilePic(req.params.userId));
});

app.use("/", router);
export const handler = serverlessExpress({ app });
