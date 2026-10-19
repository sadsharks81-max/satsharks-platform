// SAT guides: pages that answer the questions students ask search engines and AI assistants
// (proposal 4.3 "GEO"). Facts about the Digital SAT follow College Board's published test
// specifications; keep them in step if College Board changes the test. Each guide ends with a link
// into the site.

export interface GuideSection {
  heading: string;
  // Paragraphs; a paragraph starting with "- " lines is shown as a list.
  paragraphs: string[];
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  // Short answer shown first (what an AI assistant would quote).
  summary: string;
  sections: GuideSection[];
  updated: string;
  cta: { label: string; href: string };
}

export const GUIDES: Guide[] = [
  {
    slug: "digital-sat-format",
    title: "The Digital SAT format: sections, timing and adaptive modules",
    description: "How the Digital SAT is built: Reading and Writing then Math, two modules each, 2 hours 14 minutes, a 10-minute break, and Module 2 that adapts to Module 1.",
    summary:
      "The Digital SAT has two sections taken on the Bluebook app. Reading and Writing: 54 questions in 64 minutes, in two 27-question modules of 32 minutes. Math: 44 questions in 70 minutes, in two 22-question modules of 35 minutes. There is a 10-minute break between the sections, so the test takes 2 hours 14 minutes. Each section is adaptive: how you do in Module 1 decides whether Module 2 is easier or harder.",
    updated: "2026-10-19",
    cta: { label: "Take a full adaptive practice test", href: "/register" },
    sections: [
      {
        heading: "Sections and timing",
        paragraphs: [
          "- Reading and Writing: Module 1 (27 questions, 32 minutes), then Module 2 (27 questions, 32 minutes).\n- A 10-minute break.\n- Math: Module 1 (22 questions, 35 minutes), then Module 2 (22 questions, 35 minutes).",
          "Once a module ends you cannot go back to it. Inside a module you can move between questions, mark questions for review and change answers until time runs out.",
        ],
      },
      {
        heading: "How the adaptive modules work",
        paragraphs: [
          "The SAT adapts by module, not by question. Everyone gets a Module 1 with a mix of easy, medium and hard questions. If you do well, Module 2 is harder; otherwise it is easier. The harder Module 2 is the route to the top scores, so accuracy in Module 1 matters a lot.",
          "A few questions in each section are being tried out for future tests and do not count towards your score. You cannot tell which ones, so treat every question as if it counts.",
        ],
      },
      {
        heading: "What each section tests",
        paragraphs: [
          "Reading and Writing uses short passages, each with one question, across four areas: Craft and Structure, Information and Ideas, Standard English Conventions, and Expression of Ideas.",
          "Math covers Algebra, Advanced Math, Problem-Solving and Data Analysis, and Geometry and Trigonometry. Most questions are multiple choice with four options; about a quarter ask you to type your own answer.",
        ],
      },
      {
        heading: "Tools in the test app",
        paragraphs: [
          "Bluebook has a built-in Desmos graphing calculator for the whole Math section (you may also bring an approved calculator), a reference sheet of common formulas, a countdown timer you can hide, mark for review, an answer eliminator and an annotation tool for Reading and Writing.",
          "SAT Sharks uses the same layout and tools on its test screen, so test day feels familiar.",
        ],
      },
    ],
  },
  {
    slug: "sat-scoring",
    title: "How Digital SAT scoring works (400–1600)",
    description: "How the Digital SAT is scored: two sections of 200–800 add up to a 400–1600 total, there is no penalty for wrong answers, and harder questions are worth more.",
    summary:
      "The Digital SAT is scored from 400 to 1600: Reading and Writing and Math are each scored from 200 to 800, in steps of 10, and the two are added together. Wrong answers cost nothing, so answer every question. Because the test is adaptive, the questions you got right and how difficult they were both shape your score, not just how many you got right.",
    updated: "2026-10-19",
    cta: { label: "Get your predicted score", href: "/register" },
    sections: [
      {
        heading: "Section scores and the total",
        paragraphs: [
          "- Reading and Writing: 200–800.\n- Math: 200–800.\n- Total: 400–1600, the sum of the two.",
          "Scores go up in steps of 10. Official scores usually arrive in your College Board account a couple of weeks after test day; College Board publishes the exact release dates.",
        ],
      },
      {
        heading: "No penalty for guessing",
        paragraphs: [
          "A wrong answer and a blank answer score the same: zero for that question. Never leave a question empty. If time is nearly up, eliminate what you can and pick an answer for the rest.",
        ],
      },
      {
        heading: "Why the same number right can give different scores",
        paragraphs: [
          "College Board uses item response theory: each question has its own difficulty, and your score reflects which questions you answered correctly, not only how many. Getting the harder Module 2 opens up the highest scores, which is why Module 1 accuracy matters so much.",
          "Practice scores on SAT Sharks come from conversion tables for each section and Module 2 route. They are estimates to guide your practice, not official scores.",
        ],
      },
      {
        heading: "What is a good SAT score?",
        paragraphs: [
          "It depends on the universities you are aiming for. Look up the middle 50% score range of admitted students for each university on your list and set your target near the top of that range. SAT Sharks shows the distance between your predicted score and your target, and which skills will close it fastest.",
        ],
      },
    ],
  },
  {
    slug: "free-sat-practice",
    title: "Free Digital SAT practice: where to find real practice",
    description: "The best free ways to practise for the Digital SAT: College Board's Bluebook practice tests, official question banks, and full past papers on SAT Sharks' free plan.",
    summary:
      "Start with the free full-length practice tests in College Board's Bluebook app: they are the closest thing to the real test. Then add more real practice: SAT Sharks' free plan lets you sit full past papers in a Bluebook-style test screen, with a score out of 1600 and a daily drill allowance, without a card.",
    updated: "2026-10-19",
    cta: { label: "Start practising free", href: "/register" },
    sections: [
      {
        heading: "1. Official Bluebook practice tests",
        paragraphs: [
          "Download Bluebook, College Board's testing app, and take its full-length adaptive practice tests. Take them under real timing, on the device you will use on test day.",
        ],
      },
      {
        heading: "2. Practise past papers in the real format",
        paragraphs: [
          "Most students finish the official practice tests quickly. SAT Sharks has full past Digital SAT papers in the same adaptive format, with the same tools (Desmos, reference sheet, timer, mark for review), and scores every test from 400 to 1600. The free plan includes full papers and drills every day.",
        ],
      },
      {
        heading: "3. Fix your weak topics with drills",
        paragraphs: [
          "After each test, look at which skills cost you points and drill them: a short set of questions on one topic with instant answer checks. Questions you get wrong come back after 1, 3, 7 and 16 days until you get them right.",
        ],
      },
      {
        heading: "4. Practise every day",
        paragraphs: [
          "Short daily practice beats a long session once a week. Set a daily goal, keep a streak, and take a full timed test every week or two to track your predicted score.",
        ],
      },
    ],
  },
  {
    slug: "sat-in-pakistan",
    title: "Taking the SAT in Pakistan: dates, registration and preparation",
    description: "How students in Pakistan take the Digital SAT: international test dates, registering through College Board, what to bring on test day, and how to prepare.",
    summary:
      "Students in Pakistan take the same Digital SAT as everyone else, on College Board's international test dates, at authorised test centres. You register online through a College Board account, choose a centre and date, and bring an accepted photo ID (for students in Pakistan, an original passport or national ID card) on test day. Register early: centres in big cities fill up.",
    updated: "2026-10-19",
    cta: { label: "See upcoming SAT dates", href: "/sat-dates" },
    sections: [
      {
        heading: "Test dates",
        paragraphs: [
          "The SAT is offered several times a year at international centres, on the same weekends as in other countries. Each date has a registration deadline about two weeks before. SAT Sharks keeps the upcoming dates and deadlines on its SAT dates page.",
        ],
      },
      {
        heading: "Registering",
        paragraphs: [
          "- Create a free College Board account.\n- Choose a test date and an available test centre near you.\n- Upload a photo that meets College Board's rules.\n- Pay the registration fee online.\n- Print or save your admission ticket.",
          "Fees and ID rules are set by College Board and can change, so check them on College Board's website when you register.",
        ],
      },
      {
        heading: "Preparing",
        paragraphs: [
          "Take a full timed practice test first to find your starting score, set a target based on the universities you want, and practise every day on your weakest skills. SAT Sharks shows prices in PKR for students in Pakistan, and its free plan is enough to get started.",
        ],
      },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((guide) => guide.slug === slug);
