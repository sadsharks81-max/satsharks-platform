import { Router } from "express";
import {
  addFriend,
  getAnalytics,
  getEngagement,
  getLeaderboard,
  getMistakes,
  getQuestionHistory,
  getShareCard,
  getTestHistory,
  removeFriend,
  updateEngagement,
} from "../controllers/student.controller";
import { requireAuth } from "../middleware/auth";
import { requireDb } from "../middleware/require-db";

// The signed-in student's own history, analytics, goals and leaderboards (Week 3).
export const studentRouter = Router();

studentRouter.use(requireDb, requireAuth);

studentRouter.get("/history/tests", getTestHistory);
studentRouter.get("/history/questions", getQuestionHistory);
studentRouter.get("/mistakes", getMistakes);
studentRouter.get("/analytics", getAnalytics);
studentRouter.get("/engagement", getEngagement);
studentRouter.patch("/engagement", updateEngagement);
studentRouter.get("/leaderboard", getLeaderboard);
studentRouter.post("/friends", addFriend);
studentRouter.delete("/friends/:id", removeFriend);
studentRouter.get("/share-card", getShareCard);
