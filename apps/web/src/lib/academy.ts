/* GoalAI Academy details. Edit here to change the Academy page and home banner. */
export const ACADEMY = {
  name: "GoalAI Academy",
  path: "Scratch to Top AI",
  motto: "Why AI rules all in all",
  coach: "Coach V Jayamurali",
  coachRole: "AI Specialist",
  phones: [{ label: "6380150117", href: "tel:+916380150117" }, { label: "8122061192", href: "tel:+918122061192" }],
  seminar: { title: "AI Seminar", fee: 99, blurb: "A short, practical introduction to what AI can do for your career and income. The best place to start." },
  course: {
    title: "GoalAI All-round AI Class",
    months: 3,
    feeMrp: 17999,
    fee: 14999,
    offerLabel: "Launch offer",
    blurb: "A 3-month hands-on course. You learn by doing, not by watching slides.",
    modules: [
      { t: "AI tools", d: "Use today's best AI tools for writing, images, research, video and daily work, with confidence." },
      { t: "AI agents", d: "Build agents that do tasks for you: answer customers, collect leads, prepare content." },
      { t: "AI workflows", d: "Connect tools into automatic workflows that save hours every week." },
    ],
  },
  audience: [
    "Students, with or without a degree",
    "Job-seekers who want a skill employers and clients ask for",
    "Working people who want to move to an AI career without quitting their job",
    "Shop and small-business owners who want AI to bring them customers",
  ],
  uses: [
    "Take freelance or part-time work that uses AI tools",
    "Help local businesses with AI-made content, posters and replies",
    "Automate your own work, or your employer's, and grow in your job",
    "Start a small AI service of your own",
  ],
  disclaimer: "These are examples of how people use AI skills. Your income depends on your effort and the market. Goalai Academy does not guarantee any earnings or job placement.",
} as const;

export const waLink = (whatsapp: string, text: string) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
