/* GoalAI Academy details. Edit here to change the Academy page and home banner. */
export const ACADEMY = {
  name: "GoalAI Academy",
  path: "Scratch to Top AI",
  motto: "Why AI rules all in all",
  coach: "Mr V Jayamurali",
  coachRole: "friendly AI coach",
  phones: [{ label: "6380150117", href: "tel:+916380150117" }, { label: "8122061192", href: "tel:+918122061192" }],
  seminar: { title: "AI Seminar", fee: 99, blurb: "A short, practical introduction to what AI can do for your career and income. The best place to start." },
  course: {
    title: "GoalAI All-round AI Class",
    months: 3,
    feeMrp: 17899,
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

export interface AcademyCourse {
  id: "ai" | "marketing" | "robotics";
  name: string; ta: string; icon: string;
  fee: number; mrp: number; from?: boolean;
  /** What institutes commonly charge (our market estimate). */
  othersLow: number; othersHigh: number;
  tag: string; blurb: string; ta_blurb: string;
  mode: string;
  modules: { t: string; d: string }[];
}

/** The three classes running now. Edit fees / modules here — the home page and /academy update together. */
export const COURSES: AcademyCourse[] = [
  {
    id: "ai", name: "AI Full Course", ta: "AI முழு பயிற்சி", icon: "🤖", fee: 14999, mrp: 17899, othersLow: 30000, othersHigh: 99999,
    tag: "Most popular", mode: `${ACADEMY.course.months} months · hands-on`,
    blurb: "Learn practical AI from scratch: tools, agents and workflows, so you can build your own AI business.",
    ta_blurb: "AI கருவிகள், ஏஜென்ட்கள், வொர்க்ஃப்ளோக்கள் — புதிதாகக் கற்று உங்கள் சொந்த AI தொழிலை உருவாக்குங்கள்.",
    modules: ACADEMY.course.modules.map((m) => ({ ...m })),
  },
  {
    id: "marketing", name: "AI Digital Marketing", ta: "AI டிஜிட்டல் மார்க்கெட்டிங்", icon: "📣", fee: 9999, mrp: 13999, othersLow: 25000, othersHigh: 50000,
    tag: "Best for business owners", mode: "Hands-on · live practice",
    blurb: "Get customers with AI-powered digital marketing: content, social media, ads and WhatsApp.",
    ta_blurb: "AI உதவியுடன் உள்ளடக்கம், சமூக ஊடகம், விளம்பரம், WhatsApp மூலம் வாடிக்கையாளர்களைப் பெறுங்கள்.",
    modules: [
      { t: "AI content", d: "Posts, reels scripts, posters and captions made faster with AI." },
      { t: "Social & search", d: "Instagram, Facebook, YouTube and Google presence that brings enquiries." },
      { t: "Ads & WhatsApp", d: "Run small paid campaigns and follow up leads on WhatsApp." },
    ],
  },
  {
    id: "robotics", name: "Robotics Class", ta: "ரோபோட்டிக்ஸ் வகுப்பு", icon: "🦾", fee: 24999, mrp: 40000, from: true, othersLow: 150000, othersHigh: 150000,
    tag: "Live classes only", mode: "Live classes only",
    blurb: "Build and program real robots in live classes, and bring AI into your machines.",
    ta_blurb: "நேரடி வகுப்புகளில் உண்மையான ரோபோக்களை உருவாக்கி நிரலிடுங்கள்; AI-யையும் இணையுங்கள்.",
    modules: [
      { t: "Build", d: "Sensors, motors and controllers: put a working robot together." },
      { t: "Program", d: "Make it move, sense and decide with simple code." },
      { t: "Add AI", d: "Bring vision and smart behaviour into your robot projects." },
    ],
  },
];

export const FAQ: { q: string; a: string }[] = [
  { q: "Do I have to quit my job?", a: "No. Please don't. These classes are made so you can learn next to your job or studies and build your own AI business on the side. Many people start small and grow at their own pace." },
  { q: "I am a beginner. Can I join?", a: "Yes. We start from the basics and you learn by doing. You do not need a degree." },
  { q: "Are the classes live?", a: "The Robotics class is live only. For batch dates and timings of the other classes, message us on WhatsApp." },
  { q: "Will I get a job or a fixed income?", a: "No one can promise that, and we don't. Goalai Academy teaches you skills. Your results depend on your effort and the market." },
  { q: "How do I enrol and pay?", a: "Chat with us on WhatsApp or call. We share the batch details and confirm your seat on the chat." },
];

export const PERSONAS: { id: string; label: string; ta: string; text: string; pick: AcademyCourse["id"] }[] = [
  { id: "student", label: "Student", ta: "மாணவர்", pick: "ai", text: "Add a skill that clients and employers ask for while you study. No degree is needed to start." },
  { id: "job", label: "Working professional", ta: "வேலை செய்பவர்", pick: "ai", text: "Learn in your free time and build an AI business beside your job. Keep your salary, grow a second income. Don't quit your job." },
  { id: "owner", label: "Business owner", ta: "தொழில் உரிமையாளர்", pick: "marketing", text: "Use AI marketing to get customers, make content and reply faster for your own shop or service." },
  { id: "maker", label: "Tech lover", ta: "தொழில்நுட்ப ஆர்வலர்", pick: "robotics", text: "Build real robots in live classes and learn how AI makes machines smart." },
];

export const waLink = (whatsapp: string, text: string) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
