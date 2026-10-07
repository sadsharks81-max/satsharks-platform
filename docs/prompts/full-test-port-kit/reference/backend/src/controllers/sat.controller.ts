import { Request, Response } from "express";
import SATTest from "../models/SATTest";
import SATTestAttempt from "../models/SATTestAttempt";
import Question from "../models/Question";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth.middleware";
import { checkAnswerCorrectness } from "../utils/grading";
import { sendError } from "../utils/http";
import { stripEmojis } from "../utils/text";
import { FULL_TEST_QUESTION_TAG, fullTestQuestionTag } from "../utils/question-tags";

// --- Student: list available SAT tests ---
export const getSATTests = async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = { isActive: true };

    const tests = await SATTest.find(filter)
      .sort({ year: -1, testNumber: 1 });

    const testsWithMeta = await Promise.all(
      tests.map(async (t) => {
        const doc = t.toObject();
        
        let totalQuestions = 0;
        let totalMinutes = 0;
        let modulesSummary = [];

        if (t.isAdaptive) {
          // Adaptive: student only takes 4 modules: Mod 1 & Mod 2 of R&W, Mod 1 & Mod 2 of Math.
          const rw1 = t.modules[0];
          const rw2 = t.modules[1]; // Easier (or Harder, they have same count/time)
          const math1 = t.modules[3];
          const math2 = t.modules[4]; // Easier (or Harder)

          totalQuestions = (rw1?.questions?.length || 0) + (rw2?.questions?.length || 0) + (math1?.questions?.length || 0) + (math2?.questions?.length || 0);
          totalMinutes = (rw1?.timeLimitMinutes || 0) + (rw2?.timeLimitMinutes || 0) + (math1?.timeLimitMinutes || 0) + (math2?.timeLimitMinutes || 0) + t.breakDurationMinutes;

          modulesSummary = [
            { name: "Reading & Writing Module 1", section: "READING_WRITING" as const, questionCount: rw1?.questions?.length || 0, timeLimitMinutes: rw1?.timeLimitMinutes || 0 },
            { name: "Reading & Writing Module 2 (Adaptive)", section: "READING_WRITING" as const, questionCount: rw2?.questions?.length || 0, timeLimitMinutes: rw2?.timeLimitMinutes || 0 },
            { name: "Math Module 1", section: "MATH" as const, questionCount: math1?.questions?.length || 0, timeLimitMinutes: math1?.timeLimitMinutes || 0 },
            { name: "Math Module 2 (Adaptive)", section: "MATH" as const, questionCount: math2?.questions?.length || 0, timeLimitMinutes: math2?.timeLimitMinutes || 0 }
          ];
        } else {
          totalQuestions = t.modules.reduce((s, m) => s + (m.questions?.length || 0), 0);
          totalMinutes = t.modules.reduce((s, m) => s + m.timeLimitMinutes, 0) + t.breakDurationMinutes;
          modulesSummary = t.modules.map((m) => ({
            name: m.name,
            section: m.section,
            questionCount: m.questions?.length || 0,
            timeLimitMinutes: m.timeLimitMinutes,
          }));
        }

        const attemptCount = await SATTestAttempt.countDocuments({
          student: req.user?.userId, test: t._id, status: "COMPLETED",
        });

        return {
          ...doc,
          totalQuestions,
          totalMinutes,
          attemptCount,
          modulesSummary,
        };
      })
    );

    res.status(200).json({ success: true, tests: testsWithMeta });
  } catch (error) {
    sendError(res, error, "sat.getSATTests");
  }
};

/**
 * Loads a test for an in-progress attempt with the answer key removed.
 *
 * `populate("modules.questions")` returned whole Question documents, so starting
 * a test shipped `correctAnswer` and `explanation` for every question in it to
 * the browser. The exam runner never reads those fields , it renders only
 * `text`, `options`, and `imageUrl` , and the post-submission review screen gets
 * them from getSATAttempt(), which populates them deliberately. Withholding them
 * here removes the answer key from the live exam payload without changing any UI.
 */
const loadTestForTaking = (testId: unknown) =>
  SATTest.findById(testId).populate({
    path: "modules.questions",
    select: "-correctAnswer -explanation",
  });

// --- Student: start a SAT test ---
export const startSATTest = async (req: AuthRequest, res: Response) => {
  try {
    const test = await SATTest.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, error: "Test not found" });
    if (!test.isActive) return res.status(400).json({ success: false, error: "Test is not active" });

    if (req.user?.subscription === "FREE" && test.accessLevel === "PAID") {
      return res.status(403).json({ success: false, error: "Paid subscription required" });
    }

    // Check for existing in-progress attempt
    const existing = await SATTestAttempt.findOne({
      student: req.user?.userId, test: test._id,
      status: { $in: ["IN_PROGRESS", "ON_BREAK"] },
    });
    if (existing) {
      // Resume existing attempt
      const currentModule = existing.moduleAttempts[existing.currentModuleIndex];
      if (currentModule) {
        currentModule.startedAt = new Date();
        currentModule.completedAt = null;
      }
      existing.startedAt = new Date();
      await existing.save();
      const populatedTest = await loadTestForTaking(test._id);
      return res.status(200).json({ success: true, attempt: existing, test: populatedTest, resumed: true });
    }

    const moduleAttempts = test.modules.map((m, idx) => ({
      moduleIndex: idx,
      answers: [],
      startedAt: idx === 0 ? new Date() : null,
      completedAt: null,
      score: 0,
      totalQuestions: m.questions.length,
      correctCount: 0,
    }));

    let totalQuestions = 0;
    if (test.isAdaptive) {
      totalQuestions = (test.modules[0]?.questions.length || 0) +
                       (test.modules[1]?.questions.length || 0) +
                       (test.modules[3]?.questions.length || 0) +
                       (test.modules[4]?.questions.length || 0);
    } else {
      totalQuestions = test.modules.reduce((s, m) => s + m.questions.length, 0);
    }

    const attempt = await SATTestAttempt.create({
      student: req.user?.userId,
      test: test._id,
      moduleAttempts,
      currentModuleIndex: 0,
      totalQuestions,
      startedAt: new Date(),
    });

    const populatedTest = await loadTestForTaking(test._id);

    res.status(201).json({ success: true, attempt, test: populatedTest });
  } catch (error) {
    sendError(res, error, "sat.startSATTest");
  }
};

// --- Student: save progress (auto-save / manual save) ---
export const saveSATProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { moduleIndex, answers, markedForReview } = req.body;

    const attempt = await SATTestAttempt.findOne({
      _id: id, student: req.user?.userId,
      status: { $in: ["IN_PROGRESS", "ON_BREAK"] },
    });
    if (!attempt) return res.status(404).json({ success: false, error: "Attempt not found" });

    if (moduleIndex !== undefined && attempt.moduleAttempts[moduleIndex]) {
      const modAttempt = attempt.moduleAttempts[moduleIndex];
      if (answers) {
        modAttempt.answers = answers.map((a: any) => ({
          question: a.question,
          selectedAnswer: a.selectedAnswer || null,
          isCorrect: false,
          markedForReview: markedForReview?.[a.question] || false,
          timeSpent: a.timeSpent || 0,
        }));
      }
    }

    await attempt.save();
    res.status(200).json({ success: true, message: "Progress saved" });
  } catch (error) {
    sendError(res, error, "sat.saveSATProgress");
  }
};

// --- Student: complete a module and move to break/next ---
export const completeModule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { moduleIndex, answers } = req.body;

    const attempt = await SATTestAttempt.findOne({
      _id: id, student: req.user?.userId,
      status: { $in: ["IN_PROGRESS", "ON_BREAK"] },
    });
    if (!attempt) return res.status(404).json({ success: false, error: "Attempt not found" });

    const test = await SATTest.findById(attempt.test);
    if (!test) return res.status(404).json({ success: false, error: "Test not found" });

    const mod = test.modules[moduleIndex];
    const modAttempt = attempt.moduleAttempts[moduleIndex];
    if (!mod || !modAttempt) return res.status(400).json({ success: false, error: "Invalid module index" });

    // Score the answers
    const questionIds = mod.questions.map((q) => q.toString());
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    let correctCount = 0;
    const incomingAnswersMap = new Map<string, any>((answers || []).map((a: any) => [a.question.toString(), a]));

    modAttempt.answers = mod.questions.map((qIdRef) => {
      const qIdStr = qIdRef.toString();
      const q = questionMap.get(qIdStr);
      const incomingAns = incomingAnswersMap.get(qIdStr);
      
      const selectedAnswer = incomingAns?.selectedAnswer || null;
      const isCorrect = q && selectedAnswer
        ? checkAnswerCorrectness(q.correctAnswer, selectedAnswer)
        : false;

      if (isCorrect) correctCount++;

      return {
        question: qIdRef,
        selectedAnswer,
        isCorrect,
        markedForReview: incomingAns?.markedForReview || false,
        timeSpent: incomingAns?.timeSpent || 0,
      };
    });
    modAttempt.correctCount = correctCount;
    modAttempt.score = correctCount;
    // Older custom-test attempts were created without this field, which made
    // completed tests appear as 0/0 in results and history.
    modAttempt.totalQuestions = mod.questions.length;
    modAttempt.completedAt = new Date();

    let nextModuleIndex = moduleIndex + 1;
    let isBreakPoint = false;

    if (test.isAdaptive) {
      const scorePct = modAttempt.totalQuestions > 0 ? (correctCount / modAttempt.totalQuestions) * 100 : 0;
      
      if (moduleIndex === 0) {
        // R&W Module 1 completed: route to R&W Module 2 (index 2 for Harder >= 65%, index 1 for Easier < 65%)
        nextModuleIndex = scorePct >= 65 ? 2 : 1;
      } else if (moduleIndex === 1 || moduleIndex === 2) {
        // R&W Module 2 (Easier or Harder) completed: go to break, next is Math Module 1 (index 3)
        isBreakPoint = true;
        nextModuleIndex = 3;
      } else if (moduleIndex === 3) {
        // Math Module 1 completed: route to Math Module 2 (index 5 for Harder >= 65%, index 4 for Easier < 65%)
        nextModuleIndex = scorePct >= 65 ? 5 : 4;
      } else if (moduleIndex === 4 || moduleIndex === 5) {
        // Math Module 2 (Easier or Harder) completed: end of test
        return finalizeAttempt(attempt, res);
      }
    } else {
      // Linear logic
      nextModuleIndex = moduleIndex + 1;
      isBreakPoint = moduleIndex === 1 && test.modules.length > 2;
    }

    if (isBreakPoint) {
      attempt.status = "ON_BREAK";
      attempt.breakStartedAt = new Date();
      attempt.currentModuleIndex = nextModuleIndex;
    } else if ((test.isAdaptive && nextModuleIndex < 6) || (!test.isAdaptive && nextModuleIndex < test.modules.length)) {
      attempt.currentModuleIndex = nextModuleIndex;
      attempt.moduleAttempts[nextModuleIndex].startedAt = new Date();
      attempt.status = "IN_PROGRESS";
    } else {
      return finalizeAttempt(attempt, res);
    }

    await attempt.save();
    res.status(200).json({ success: true, attempt });
  } catch (error) {
    sendError(res, error, "sat.completeModule");
  }
};

// --- Student: end break and start next module ---
export const endBreak = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const attempt = await SATTestAttempt.findOne({
      _id: id, student: req.user?.userId, status: "ON_BREAK",
    });
    if (!attempt) return res.status(404).json({ success: false, error: "Attempt not found or not on break" });

    attempt.breakCompletedAt = new Date();
    attempt.status = "IN_PROGRESS";
    const nextIdx = attempt.currentModuleIndex;
    if (attempt.moduleAttempts[nextIdx]) {
      attempt.moduleAttempts[nextIdx].startedAt = new Date();
    }

    await attempt.save();
    res.status(200).json({ success: true, attempt });
  } catch (error) {
    sendError(res, error, "sat.endBreak");
  }
};

// --- Student: submit entire test ---
export const submitSATTest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const attempt = await SATTestAttempt.findOne({
      _id: id, student: req.user?.userId,
      status: { $in: ["IN_PROGRESS", "ON_BREAK"] },
    });
    if (!attempt) return res.status(404).json({ success: false, error: "Attempt not found" });

    return finalizeAttempt(attempt, res);
  } catch (error) {
    sendError(res, error, "sat.submitSATTest");
  }
};

async function finalizeAttempt(attempt: any, res: Response) {
  let totalCorrect = 0;
  let totalQuestions = 0;
  let totalTime = 0;

  const test = await SATTest.findById(attempt.test);
  const isAdaptive = test?.isAdaptive || false;

  for (const mod of attempt.moduleAttempts) {
    if (isAdaptive && !mod.startedAt) continue;

    // Fall back to the test definition for legacy/custom attempts whose
    // module totals were not initialized when the attempt was created.
    const moduleQuestionCount = test?.modules?.[mod.moduleIndex]?.questions?.length || 0;
    if (!mod.totalQuestions && moduleQuestionCount) {
      mod.totalQuestions = moduleQuestionCount;
    }
    totalCorrect += mod.correctCount;
    totalQuestions += mod.totalQuestions;
    if (mod.startedAt && mod.completedAt) {
      const moduleLimitMinutes = test?.modules?.[mod.moduleIndex]?.timeLimitMinutes || 35;
      const actualTimeSpent = Math.round(
        (new Date(mod.completedAt).getTime() - new Date(mod.startedAt).getTime()) / 1000
      );
      totalTime += Math.min(actualTimeSpent, moduleLimitMinutes * 60);
    }
  }

  attempt.totalCorrect = totalCorrect;
  attempt.totalScore = totalCorrect;
  attempt.totalQuestions = totalQuestions;
  attempt.percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  attempt.totalTimeTaken = totalTime;
  attempt.status = "COMPLETED";
  attempt.completedAt = new Date();

  await attempt.save();

  // Update student stats for gamification
  try {
    const student = await User.findById(attempt.student);
    if (student) {
      const pointsToAdd = (totalCorrect * 10) + 100; // 10 points per correct + 100 bonus for full test
      student.leaderboardPoints += pointsToAdd;

      const todayStr = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (student.lastActiveDate === yesterdayStr) {
        student.streakCount += 1;
        student.lastActiveDate = todayStr;
      } else if (student.lastActiveDate !== todayStr) {
        student.streakCount = 1;
        student.lastActiveDate = todayStr;
      }
      await student.save();
    }
  } catch (err) {
    console.error("Error updating user stats on mock test completion:", err);
  }

  res.status(200).json({ success: true, attempt });
}

// --- Student: get attempt details ---
export const getSATAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const attempt = await SATTestAttempt.findOne({
      _id: req.params.id, student: req.user?.userId,
    })
      .populate({
        path: "test",
        populate: {
          path: "modules.questions",
          select: "text options correctAnswer explanation difficulty category imageUrl"
        }
      })
      .populate({ path: "moduleAttempts.answers.question", select: "text options correctAnswer explanation difficulty category imageUrl" });

    if (!attempt) return res.status(404).json({ success: false, error: "Attempt not found" });

    const attemptObj = attempt.toObject();
    const test = attemptObj.test as any;

    if (test && test.modules) {
      for (const ma of attemptObj.moduleAttempts) {
        const testMod = test.modules[ma.moduleIndex];
        if (!testMod || !testMod.questions) continue;

        if (!ma.totalQuestions && (ma.startedAt || ma.completedAt)) {
          ma.totalQuestions = testMod.questions.length;
        }
        if (!ma.startedAt && ma.completedAt) {
          ma.startedAt = attemptObj.startedAt || ma.completedAt;
        }
        if (!ma.startedAt) continue;

        // Map existing answers by question ID
        const existingAnswersMap = new Map();
        for (const ans of ma.answers) {
          const qId = ans.question?._id?.toString() || ans.question?.toString();
          if (qId) {
            existingAnswersMap.set(qId, ans);
          }
        }

        // Reconstruct answers list to match all questions of the module in order
        const fullAnswers = testMod.questions.map((q: any) => {
          const qId = q._id?.toString() || q.toString();
          const existing = existingAnswersMap.get(qId);
          if (existing) {
            return {
              ...existing,
              question: q
            };
          } else {
            return {
              question: q,
              selectedAnswer: null,
              isCorrect: false,
              markedForReview: false,
              timeSpent: 0
            };
          }
        });

        ma.answers = fullAnswers;
      }

      // Keep old completed custom tests useful without requiring a database
      // migration. Their module scores were stored correctly; only the totals
      // were missing.
      if (attemptObj.status === "COMPLETED" && !attemptObj.totalQuestions) {
        const completedModules = attemptObj.moduleAttempts.filter((ma: any) => ma.startedAt || ma.completedAt);
        attemptObj.totalCorrect = completedModules.reduce((sum: number, ma: any) => sum + (ma.correctCount || 0), 0);
        attemptObj.totalQuestions = completedModules.reduce((sum: number, ma: any) => sum + (ma.totalQuestions || 0), 0);
        attemptObj.percentage = attemptObj.totalQuestions
          ? Math.round((attemptObj.totalCorrect / attemptObj.totalQuestions) * 100)
          : 0;
      }
    }

    res.status(200).json({ success: true, attempt: attemptObj });
  } catch (error) {
    sendError(res, error, "sat.getSATAttempt");
  }
};

// --- Student: list own SAT attempts ---
export const getMySATAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const attempts = await SATTestAttempt.find({
      student: req.user?.userId, status: "COMPLETED",
    })
      .populate("test", "title year testNumber")
      .sort({ completedAt: -1 });

    res.status(200).json({ success: true, attempts });
  } catch (error) {
    sendError(res, error, "sat.getMySATAttempts");
  }
};

// --- Admin: list all SAT tests ---
export const getAllSATTestsAdmin = async (req: Request, res: Response) => {
  try {
    // The list shows only test details and module counts, so questions stay as
    // ids here. Populating them shipped every question and inline graph image of
    // every test (~19 MB, 12-18 s), which could run past the client's 30 s
    // timeout and leave the page without its tests. The Questions dialog loads a
    // single test in full from getSATTestAdminById.
    const tests = await SATTest.find({
      $or: [{ year: { $ne: 9999 } }, { year: { $exists: false } }],
    })
      .sort({ year: -1, testNumber: 1 })
      .lean();

    res.status(200).json({ success: true, tests });
  } catch (error) {
    sendError(res, error, "sat.getAllSATTestsAdmin");
  }
};

// --- Admin: get single SAT test by ID ---
export const getSATTestAdminById = async (req: Request, res: Response) => {
  try {
    const test = await SATTest.findById(req.params.id)
      .populate({
        path: "modules.questions",
        select: "text options correctAnswer explanation difficulty category imageUrl",
      })
      .lean();
    if (!test) return res.status(404).json({ success: false, error: "Test not found" });
    res.status(200).json({ success: true, test });
  } catch (error) {
    sendError(res, error, "sat.getSATTestAdminById");
  }
};


// --- Admin: update SAT test active status / access level ---
export const updateSATTestAdmin = async (req: Request, res: Response) => {
  try {
    const { title, year, testNumber, isActive, accessLevel, pdfUrl, explanationPdfUrl, rwScoreMapping, mathScoreMapping } = req.body;
    const update: any = {};
    if (title !== undefined) update.title = title;
    if (year !== undefined) update.year = year;
    if (testNumber !== undefined) update.testNumber = testNumber;
    if (isActive !== undefined) update.isActive = isActive;
    if (accessLevel !== undefined) update.accessLevel = accessLevel;
    if (pdfUrl !== undefined) update.pdfUrl = pdfUrl;
    if (explanationPdfUrl !== undefined) update.explanationPdfUrl = explanationPdfUrl;
    if (rwScoreMapping !== undefined) update.rwScoreMapping = rwScoreMapping;
    if (mathScoreMapping !== undefined) update.mathScoreMapping = mathScoreMapping;

    // Students must never be routed into an empty module, so a test can only be
    // activated once every module (all six for an adaptive test) has questions.
    if (isActive === true) {
      const existing = await SATTest.findById(req.params.id).select("isAdaptive modules.name modules.questions").lean();
      if (!existing) return res.status(404).json({ success: false, error: "Test not found" });
      const emptyModules = existing.modules.filter((module) => !module.questions?.length).map((module) => module.name);
      if (existing.isAdaptive && existing.modules.length !== 6) {
        return res.status(400).json({ success: false, error: "An adaptive test needs exactly six modules before it can be activated." });
      }
      if (existing.modules.length === 0 || emptyModules.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Add questions to every module before activating. Empty: ${emptyModules.join(", ") || "all modules"}.`,
        });
      }
    }

    const test = await SATTest.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!test) return res.status(404).json({ success: false, error: "Test not found" });
    res.status(200).json({ success: true, test });
  } catch (error) {
    sendError(res, error, "sat.updateSATTestAdmin");
  }
};

// --- Admin: delete SAT test ---
export const deleteSATTestAdmin = async (req: Request, res: Response) => {
  try {
    const test = await SATTest.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ success: false, error: "Test not found" });
    res.status(200).json({ success: true, message: "Test deleted" });
  } catch (error) {
    sendError(res, error, "sat.deleteSATTestAdmin");
  }
};

// --- Admin: add question to test module ---
export const addQuestionToTestModule = async (req: AuthRequest, res: Response) => {
  try {
    const { testId, moduleIndex } = req.params;
    const { text, options, correctAnswer, explanation, category, difficulty, section, tags, imageUrl } = req.body;

    const test = await SATTest.findById(testId);
    if (!test) return res.status(404).json({ success: false, error: "Test not found" });

    const mIndex = parseInt(moduleIndex as string);
    if (isNaN(mIndex) || mIndex < 0 || mIndex >= test.modules.length) {
      return res.status(400).json({ success: false, error: "Invalid module index" });
    }

    // A question added to an uploaded full test belongs to that exam like its
    // siblings, so it inherits their tags and stays out of practice pools.
    const testTag = fullTestQuestionTag(String(test._id));
    const isUploadedFullTest = Boolean(await Question.exists({ tags: testTag }));
    const questionTags: string[] = Array.isArray(tags) ? tags : [];

    const question = await Question.create({
      text,
      options,
      correctAnswer,
      explanation: stripEmojis(explanation),
      category,
      difficulty,
      section,
      tags: isUploadedFullTest
        ? [...new Set([...questionTags, FULL_TEST_QUESTION_TAG, testTag])]
        : questionTags,
      imageUrl: imageUrl || null,
      source: "MANUAL",
      status: imageUrl ? "UPDATED" : "PUBLISHED",
      createdBy: req.user?.userId,
    });

    test.modules[mIndex].questions.push(question._id as any);
    await test.save();

    res.status(201).json({ success: true, question });
  } catch (error) {
    sendError(res, error, "sat.addQuestionToTestModule");
  }
};

