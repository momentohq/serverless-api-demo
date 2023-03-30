import express, {Request, Response} from "express";

import {UserHandler} from "../controllers/users";
import {metricMiddleware} from "../middleware/request-metric-logger";
import {UsersFirestore} from "../repository/users/data-clients/firestore";
import {DefaultClient} from "../repository/users/users";
import {UsersDdb} from "../repository/users/data-clients/ddb";
import {UsersMongo} from "../repository/users/data-clients/mongo";


// Set up standard express app and router
export const app = express();
const router = express.Router();

// Init our user's handler with proper data store based off runtime
// const uh = new UserHandler(new DefaultClient(
//     process.env['RUNTIME'] == 'GCP' ?
//         new UsersFirestore() : // Use Firestore in GCP
//         new UsersDdb()  // Use DDB in AWS
// ));

const uh = new UserHandler(new DefaultClient(
    new UsersMongo()
));
// Middleware that records time taken for each API
app.use(metricMiddleware)

// Routes ----------------
router.post('/bootstrap', async (req: Request, res: Response) => {
    return res.json(await uh.handleBootstrapTestUsers());
});
router.get("/users/:userId", async (req: Request, res: Response) => {
    return res.json(await uh.handleGetUser(req.params.userId));
});
router.get("/cached-users/:userId", async (req: Request, res: Response) => {
    return res.json(await uh.handleGetCachedUser(req.params.userId));
});
router.get("/followers/:userId", async (req: Request, res: Response) => {
    return res.json(await uh.handleGetFollowers(req.params.userId));
});
router.get("/cached-followers/:userId", async (req: Request, res: Response) => {
    return res.json(await uh.handleGetCachedFollowers(req.params.userId));
});
router.get("/profile-pic/:userId", async (req: Request, res: Response) => {
    return res.json(await uh.handleGetProfilePic(req.params.userId));
});
router.get("/cached-profile-pic/:userId", async (req: Request, res: Response) => {
    return res.json(await uh.handleGetCachedProfilePic(req.params.userId));
});


// Make app use router we just initialized
app.use("/", router);
