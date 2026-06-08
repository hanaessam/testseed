/**
 * Generates testseed_a3.pptx — CISC 818 Milestone 3 presentation deck.
 * Run: node scripts/generate-testseed-a3-deck.mjs
 */
import PptxGenJS from "pptxgenjs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "testseed_a3.pptx");

const C = {
  bg: "09090B",
  card: "18181B",
  green: "4ADE80",
  greenDim: "166534",
  white: "FFFFFF",
  muted: "A1A1AA",
  border: "3F3F46",
  orange: "F97316",
  blue: "60A5FA",
};

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_16x9";
pptx.author = "TestSeed Team";

function setBg(slide) {
  slide.background = { color: C.bg };
}

function addSectionLabel(slide, text) {
  slide.addText(text, {
    x: 0.5,
    y: 0.3,
    w: 3,
    h: 0.35,
    fontFace: "Consolas",
    fontSize: 11,
    color: C.green,
    charSpacing: 4,
    margin: 0,
  });
}

function addSlideTitle(slide, text, y = 0.6) {
  slide.addText(text, {
    x: 0.5,
    y,
    w: 9,
    h: 0.6,
    fontFace: "Consolas",
    fontSize: 30,
    bold: true,
    color: C.white,
    margin: 0,
  });
}

function addMemberTag(slide, name) {
  slide.addText(name, {
    x: 7.5,
    y: 0.2,
    w: 2,
    h: 0.4,
    fontFace: "Consolas",
    fontSize: 13,
    bold: true,
    color: C.green,
    align: "right",
    margin: 0,
  });
}

function addRect(slide, opts) {
  slide.addShape(pptx.ShapeType.rect, opts);
}

function addPanel(slide, x, y, w, h, fill = C.card) {
  addRect(slide, {
    x,
    y,
    w,
    h,
    fill: { color: fill },
    line: { color: fill, width: 0 },
  });
}

function addLeftAccent(slide, x, y, h, color = C.green) {
  addRect(slide, {
    x,
    y,
    w: 0.07,
    h,
    fill: { color },
    line: { color, width: 0 },
  });
}

function addCard(slide, x, y, w, h, fill = C.card, accent = C.green) {
  addPanel(slide, x, y, w, h, fill);
  addLeftAccent(slide, x, y, h, accent);
}

function addCardText(slide, x, y, w, h, lines, padX = 0.2) {
  const items = lines.map((line, i) => {
    if (typeof line === "string") {
      return { text: line, options: { breakLine: i < lines.length - 1 } };
    }
    return {
      text: line.text,
      options: {
        fontFace: line.fontFace || "Calibri",
        fontSize: line.fontSize || 13,
        color: line.color || C.white,
        bold: line.bold || false,
        italic: line.italic || false,
        bullet: line.bullet || false,
        breakLine: line.breakLine !== false && i < lines.length - 1,
      },
    };
  });
  slide.addText(items, {
    x: x + padX,
    y: y + 0.1,
    w: w - padX - 0.15,
    h: h - 0.15,
    valign: "top",
    margin: 0,
  });
}

function addAgendaCard(slide, x, y, w, h, time, label) {
  addCard(slide, x, y, w, h);
  slide.addText(time, {
    x: x + 0.2,
    y: y + 0.12,
    w: 1.2,
    h: 0.25,
    fontFace: "Consolas",
    fontSize: 10,
    color: C.green,
    margin: 0,
  });
  slide.addText(label, {
    x: x + 0.2,
    y: y + 0.42,
    w: w - 0.35,
    h: 0.45,
    fontFace: "Calibri",
    fontSize: 14,
    bold: true,
    color: C.white,
    margin: 0,
  });
}

function addPainPanel(slide, x, y, w, h, main, sub) {
  addCard(slide, x, y, w, h, C.card, C.orange);
  addCardText(slide, x, y, w, h, [
    { text: main, bold: true, fontSize: 14 },
    { text: sub, color: C.muted, fontSize: 12 },
  ]);
}

function addFlowStep(slide, x, y, w, h, num, label, sub) {
  addCard(slide, x, y, w, h);
  slide.addText(num, {
    x: x + 0.15,
    y: y + 0.15,
    w: 0.6,
    h: 0.35,
    fontFace: "Consolas",
    fontSize: 18,
    color: C.green,
    margin: 0,
  });
  slide.addText(label, {
    x: x + 0.15,
    y: y + 0.5,
    w: w - 0.25,
    h: 0.35,
    fontFace: "Calibri",
    fontSize: 13,
    bold: true,
    color: C.white,
    margin: 0,
  });
  slide.addText(sub, {
    x: x + 0.15,
    y: y + 0.85,
    w: w - 0.25,
    h: 0.9,
    fontFace: "Calibri",
    fontSize: 11,
    color: C.muted,
    margin: 0,
  });
}

function addTierRow(slide, x, y, w, h, fill, accent, headerColor, header, body) {
  addPanel(slide, x, y, w, h, fill);
  addLeftAccent(slide, x, y, h, accent);
  slide.addText(header, {
    x: x + 0.2,
    y: y + 0.1,
    w: w - 0.3,
    h: 0.25,
    fontFace: "Consolas",
    fontSize: 11,
    color: headerColor,
    margin: 0,
  });
  slide.addText(body, {
    x: x + 0.2,
    y: y + 0.38,
    w: w - 0.3,
    h: 0.35,
    fontFace: "Calibri",
    fontSize: 12,
    color: C.white,
    margin: 0,
  });
}

function addInfoCard(slide, x, y, w, h, fill, accent, header, headerColor, body, bodyColor = C.white) {
  addCard(slide, x, y, w, h, fill, accent);
  slide.addText(header, {
    x: x + 0.2,
    y: y + 0.1,
    w: w - 0.3,
    h: 0.28,
    fontFace: "Consolas",
    fontSize: 12,
    color: headerColor,
    bold: true,
    margin: 0,
  });
  slide.addText(body, {
    x: x + 0.2,
    y: y + 0.38,
    w: w - 0.3,
    h: h - 0.48,
    fontFace: "Calibri",
    fontSize: 12,
    color: bodyColor,
    margin: 0,
  });
}

function addReflectionSlide(slide, name, left, right) {
  setBg(slide);
  addRect(slide, {
    x: 0,
    y: 1.0,
    w: 0.12,
    h: 4.0,
    fill: { color: C.green },
    line: { color: C.green, width: 0 },
  });
  addSectionLabel(slide, "INDIVIDUAL REFLECTION");
  addSlideTitle(slide, name);

  left.forEach((card) => {
    const fill = card.fill || C.card;
    const accent = card.accent || C.green;
    addCard(slide, card.x, card.y, card.w, card.h, fill, accent);
    slide.addText(card.header, {
      x: card.x + 0.2,
      y: card.y + 0.1,
      w: card.w - 0.3,
      h: 0.28,
      fontFace: "Consolas",
      fontSize: 12,
      color: card.headerColor || C.green,
      bold: true,
      margin: 0,
    });
    slide.addText(card.body, {
      x: card.x + 0.2,
      y: card.y + 0.38,
      w: card.w - 0.3,
      h: card.h - 0.48,
      fontFace: "Calibri",
      fontSize: 12,
      color: C.white,
      margin: 0,
    });
  });

  right.forEach((card) => {
    const fill = card.fill || C.card;
    const accent = card.accent || C.green;
    addCard(slide, card.x, card.y, card.w, card.h, fill, accent);
    slide.addText(card.header, {
      x: card.x + 0.2,
      y: card.y + 0.1,
      w: card.w - 0.3,
      h: 0.28,
      fontFace: "Consolas",
      fontSize: 12,
      color: card.headerColor || C.green,
      bold: true,
      margin: 0,
    });
    slide.addText(card.body, {
      x: card.x + 0.2,
      y: card.y + 0.38,
      w: card.w - 0.3,
      h: card.h - 0.48,
      fontFace: "Calibri",
      fontSize: 12,
      color: C.white,
      margin: 0,
    });
  });
}

function addFullBleedAccents(slide) {
  addRect(slide, {
    x: 0,
    y: 0,
    w: 0.25,
    h: 5.625,
    fill: { color: C.green, transparency: 60 },
    line: { color: C.green, width: 0 },
  });
  addRect(slide, {
    x: 9.75,
    y: 0,
    w: 0.25,
    h: 5.625,
    fill: { color: C.green, transparency: 60 },
    line: { color: C.green, width: 0 },
  });
}

// ─── Slide 1: Title ───────────────────────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addRect(slide, {
    x: 0,
    y: 1.5,
    w: 0.12,
    h: 2.6,
    fill: { color: C.green },
    line: { color: C.green, width: 0 },
  });
  slide.addText(
    [
      {
        text: "TESTSEED",
        options: {
          fontFace: "Consolas",
          fontSize: 48,
          bold: true,
          color: C.white,
          charSpacing: 6,
          breakLine: true,
        },
      },
      {
        text: "AI-Powered MongoDB Seed Data Generator",
        options: { fontFace: "Calibri", fontSize: 18, color: C.muted },
      },
    ],
    { x: 1, y: 1.7, w: 8, h: 1.6, align: "center", margin: 0 },
  );
  slide.addShape(pptx.ShapeType.line, {
    x: 2,
    y: 3.5,
    w: 6,
    h: 0,
    line: { color: C.border, width: 1 },
  });
  slide.addText("Hana  ·  Mariam  ·  Hassan  ·  Mazen", {
    x: 1,
    y: 3.7,
    w: 8,
    h: 0.5,
    fontFace: "Consolas",
    fontSize: 13,
    color: C.green,
    align: "center",
    margin: 0,
  });
  slide.addText("CISC 818 — Software Engineering with AI  |  Milestone 3", {
    x: 1,
    y: 4.3,
    w: 8,
    h: 0.4,
    fontFace: "Calibri",
    fontSize: 11,
    color: C.muted,
    align: "center",
    margin: 0,
  });
  addRect(slide, {
    x: 8.6,
    y: 4.9,
    w: 0.18,
    h: 0.25,
    fill: { color: C.green },
    line: { color: C.green, width: 0 },
  });
}

// ─── Slide 2: Agenda ──────────────────────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addSectionLabel(slide, "OVERVIEW");
  addSlideTitle(slide, "What We'll Cover Today");
  addAgendaCard(slide, 0.5, 1.4, 4.2, 1.0, "~5 min", "01  Project Overview & Demo");
  addAgendaCard(slide, 5.2, 1.4, 4.2, 1.0, "~10 min", "02  AI Usage Across the SDLC");
  addAgendaCard(slide, 0.5, 2.6, 4.2, 1.0, "~20 min", "03  Individual Reflections  (4 × 5 min)");
  addAgendaCard(slide, 5.2, 2.6, 4.2, 1.0, "remaining", "04  Q&A");
  slide.addText("Total: 35 minutes  ·  Team of 4", {
    x: 0.5,
    y: 4.8,
    w: 9,
    h: 0.35,
    fontFace: "Calibri",
    fontSize: 11,
    color: C.muted,
    align: "center",
    margin: 0,
  });
}

// ─── Slide 3: Problem Statement ───────────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addSectionLabel(slide, "PROJECT OVERVIEW");
  addSlideTitle(slide, "The Problem We Solved");

  addPainPanel(
    slide,
    0.5,
    1.2,
    5.3,
    1.0,
    "Manual seed data is slow, repetitive, and error-prone",
    "Especially painful with related collections, unique constraints, and ObjectId references",
  );
  addPainPanel(
    slide,
    0.5,
    2.35,
    5.3,
    1.0,
    "Seed data is needed before building, testing, or demoing",
    "But it's always treated as an afterthought",
  );
  addPainPanel(
    slide,
    0.5,
    3.5,
    5.3,
    0.8,
    "No existing tool focuses on Mongoose + relational consistency",
    "",
  );

  addCard(slide, 6.0, 1.2, 3.7, 3.2);
  slide.addText("Target Users", {
    x: 6.2,
    y: 1.35,
    w: 3.3,
    h: 0.3,
    fontFace: "Consolas",
    fontSize: 13,
    color: C.green,
    bold: true,
    margin: 0,
  });
  slide.addText(
    [
      { text: "Backend & full-stack developers", options: { bullet: true, breakLine: true } },
      { text: "QA engineers", options: { bullet: true, breakLine: true } },
      { text: "Student software teams", options: { bullet: true, breakLine: true } },
      { text: "Instructors needing demo data", options: { bullet: true, breakLine: true } },
      { text: "Teams with MongoDB + Mongoose apps", options: { bullet: true } },
    ],
    {
      x: 6.2,
      y: 1.7,
      w: 3.3,
      h: 2.5,
      fontFace: "Calibri",
      fontSize: 13,
      color: C.white,
      margin: 0,
    },
  );
}

// ─── Slide 4: What TestSeed Does ──────────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addSectionLabel(slide, "PROJECT OVERVIEW");
  addSlideTitle(slide, "TestSeed: How It Works");

  const steps = [
    [0.4, "01", "Login", "Sessions tied to your identity"],
    [2.2, "02", "Add Context", "Project description + schema"],
    [4.0, "03", "AI Generates", "Realistic, relational records"],
    [5.8, "04", "Refine", "Feedback-based iterations"],
    [7.6, "05", "Export / Seed", "JSON, script, or direct insert + rollback"],
  ];
  steps.forEach(([x, num, label, sub]) => addFlowStep(slide, x, 1.4, 1.7, 2.0, num, label, sub));

  const arrowXs = [2.1, 3.9, 5.7, 7.5];
  arrowXs.forEach((ax) => {
    slide.addShape(pptx.ShapeType.line, {
      x: ax,
      y: 2.4,
      w: 0.1,
      h: 0,
      line: { color: C.green, width: 1.5 },
    });
  });

  addCard(slide, 0.5, 3.6, 9, 1.4);
  slide.addText("3 Key Evolutions Since Proposal", {
    x: 0.7,
    y: 3.75,
    w: 8.6,
    h: 0.3,
    fontFace: "Consolas",
    fontSize: 12,
    color: C.green,
    margin: 0,
  });
  slide.addText(
    "Account management added as core  ·  Dual schema input modes  ·  Iterative regeneration with feedback loop",
    {
      x: 0.7,
      y: 4.1,
      w: 8.6,
      h: 0.7,
      fontFace: "Calibri",
      fontSize: 13,
      color: C.white,
      margin: 0,
    },
  );
}

// ─── Slide 5: System Architecture ───────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addSectionLabel(slide, "SYSTEM DESIGN");
  addSlideTitle(slide, "Architecture & Tech Stack");

  addPanel(slide, 0.5, 1.2, 4.5, 3.6);
  addTierRow(
    slide,
    0.65,
    1.35,
    4.2,
    0.8,
    C.greenDim,
    C.green,
    C.green,
    "Presentation Layer",
    "Next.js + React + TypeScript + Tailwind CSS",
  );
  addTierRow(
    slide,
    0.65,
    2.25,
    4.2,
    0.8,
    C.card,
    C.blue,
    C.blue,
    "API / Business Layer",
    "Next.js API Routes + Clean Architecture (4 layers)",
  );
  addTierRow(
    slide,
    0.65,
    3.15,
    4.2,
    0.8,
    C.card,
    C.orange,
    C.orange,
    "Data Layer",
    "MongoDB Atlas (app DB) + User MongoDB + OpenAI API",
  );
  slide.addText("Turborepo monorepo: types → core → db → api → web", {
    x: 0.65,
    y: 4.1,
    w: 4.2,
    h: 0.5,
    fontFace: "Consolas",
    fontSize: 11,
    color: C.green,
    margin: 0,
  });

  addPanel(slide, 5.2, 1.2, 4.5, 3.6);
  addInfoCard(
    slide,
    5.35,
    1.35,
    4.2,
    1.0,
    C.greenDim,
    C.green,
    "Security by Design",
    C.green,
    "MongoDB connection strings are NEVER stored. Used only for the active operation, then discarded.",
  );
  addInfoCard(
    slide,
    5.35,
    2.45,
    4.2,
    0.9,
    C.card,
    C.green,
    "Auth: JWT + Nodemailer + Upstash Redis",
    C.white,
    "OTP email verification, Redis-backed expiry",
  );
  addInfoCard(
    slide,
    5.35,
    3.45,
    4.2,
    0.9,
    C.card,
    C.green,
    "Build Pipeline",
    C.green,
    "types → db → core → api → web (enforced by turbo.json)",
  );
}

// ─── Slide 6: Demo Transition ─────────────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addFullBleedAccents(slide);
  slide.addText(
    [
      {
        text: "LIVE DEMO",
        options: {
          fontFace: "Consolas",
          fontSize: 52,
          bold: true,
          color: C.white,
          charSpacing: 8,
          breakLine: true,
        },
      },
      {
        text: "TestSeed in Action",
        options: { fontFace: "Calibri", fontSize: 20, color: C.muted },
      },
    ],
    { x: 1, y: 1.5, w: 8, h: 2.5, align: "center", valign: "middle", margin: 0 },
  );
  slide.addText("Login  →  Describe Project  →  Paste Schema  →  Generate  →  Refine  →  Export", {
    x: 1.5,
    y: 3.8,
    w: 7,
    h: 0.6,
    fontFace: "Consolas",
    fontSize: 13,
    color: C.green,
    align: "center",
    margin: 0,
  });
  slide.addText(
    "Showing: Account flow · Schema input · Generation preview · Feedback refinement · Direct seeding",
    {
      x: 2,
      y: 4.6,
      w: 6,
      h: 0.4,
      fontFace: "Calibri",
      fontSize: 11,
      color: C.muted,
      align: "center",
      margin: 0,
    },
  );
}

// ─── Slide 7: AI Across SDLC Overview ─────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addSectionLabel(slide, "AI USAGE ACROSS THE SDLC");
  addSlideTitle(slide, "How AI Supported Every Stage");

  const headerOpts = {
    fill: { color: C.greenDim },
    color: C.white,
    bold: true,
    fontFace: "Consolas",
    fontSize: 10,
  };
  const rowFillA = { fill: { color: C.card }, color: C.white, fontFace: "Calibri", fontSize: 10 };
  const rowFillB = { fill: { color: C.bg }, color: C.white, fontFace: "Calibri", fontSize: 10 };

  const tableRows = [
    [
      { text: "SDLC Stage", options: headerOpts },
      { text: "AI Tools Used", options: headerOpts },
      { text: "What It Produced", options: headerOpts },
      { text: "Key Limitation", options: headerOpts },
      { text: "Owner", options: headerOpts },
    ],
    [
      { text: "Planning & Requirements", options: rowFillA },
      { text: "Claude, ChatGPT", options: rowFillA },
      { text: "11 epics, user stories, acceptance criteria, edge cases", options: rowFillA },
      { text: "Over-scoped — needed human pruning", options: rowFillA },
      { text: "Mariam", options: rowFillA },
    ],
    [
      { text: "Design & UI/UX", options: rowFillB },
      { text: "Figma AI, v0.dev, Eraser.io, Mermaid", options: rowFillB },
      { text: "8 wireframe screens, architecture diagram", options: rowFillB },
      { text: "Safety flows needed manual redesign", options: rowFillB },
      { text: "Hassan", options: rowFillB },
    ],
    [
      { text: "Implementation", options: rowFillA },
      { text: "Cursor Agent, OpenAI Codex, Cline", options: rowFillA },
      { text: "Monorepo scaffold, auth pipeline, API layer", options: rowFillA },
      { text: "Layer boundary violations in agent output", options: rowFillA },
      { text: "Hana", options: rowFillA },
    ],
    [
      { text: "Testing & Docs", options: rowFillB },
      { text: "Cline, GitHub Copilot, Mintlify", options: rowFillB },
      { text: "12+ edge-case scenarios, API docs", options: rowFillB },
      { text: "Rollback scenarios too optimistic", options: rowFillB },
      { text: "Mazen", options: rowFillB },
    ],
  ];

  slide.addTable(tableRows, {
    x: 0.5,
    y: 1.2,
    w: 9,
    h: 3.5,
    colW: [1.6, 1.7, 2.4, 2.2, 0.8],
    border: { pt: 0.5, color: C.border },
    margin: 0,
  });

  slide.addText(
    "AI was most valuable for organizing and expanding — human review was essential for scoping and safety decisions.",
    {
      x: 0.5,
      y: 4.85,
      w: 9,
      h: 0.45,
      fontFace: "Calibri",
      fontSize: 12,
      italic: true,
      color: C.green,
      align: "center",
      margin: 0,
    },
  );
}

// ─── Slide 8: AI in Planning ──────────────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addSectionLabel(slide, "AI USAGE — REQUIREMENTS");
  addSlideTitle(slide, "Planning & Requirements");
  addMemberTag(slide, "Mariam");

  addInfoCard(slide, 0.5, 1.2, 4.5, 0.9, C.card, C.green, "Tools Used", C.green, "Claude (primary)  ·  ChatGPT  ·  GitHub Spec Kit");
  addInfoCard(
    slide,
    0.5,
    2.2,
    4.5,
    0.9,
    C.card,
    C.green,
    "What We Asked AI to Do",
    C.green,
    "Convert A1 proposal into a structured A2 requirements document with user stories, acceptance criteria, and alternative flows across 11 epics",
  );
  addInfoCard(
    slide,
    0.5,
    3.2,
    4.5,
    0.9,
    C.greenDim,
    C.green,
    "What AI Produced",
    C.green,
    "Complete requirements.md: 11 epics · 20+ user stories · edge cases for invalid schemas, malformed JSON, failed connections, and rollback errors",
  );

  addInfoCard(
    slide,
    5.2,
    1.2,
    4.5,
    1.3,
    C.card,
    C.green,
    "Key Limitation",
    C.orange,
    "AI consistently expanded scope — suggested SQL support, Prisma, Sequelize, team workspaces, and long-term seed history. Human review was needed every iteration to cut non-core features.",
  );
  addInfoCard(
    slide,
    5.2,
    2.6,
    4.5,
    1.0,
    C.card,
    C.green,
    "Most Valuable Use",
    C.green,
    "Edge case generation — AI identified 12+ alternative flows humans missed by focusing on the happy path (invalid rollback IDs, partial insertion failures, empty MongoDB collections)",
  );
  addInfoCard(
    slide,
    5.2,
    3.7,
    4.5,
    0.9,
    C.card,
    C.green,
    "What We'd Do Differently",
    C.green,
    "Include explicit scope constraints in the initial prompt: 'MongoDB/Mongoose only. No SQL. No team workspaces.'",
  );
}

// ─── Slide 9: AI in Design ────────────────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addSectionLabel(slide, "AI USAGE — DESIGN");
  addSlideTitle(slide, "Design & UI/UX");
  addMemberTag(slide, "Hassan");

  addInfoCard(
    slide,
    0.5,
    1.2,
    4.5,
    0.85,
    C.card,
    C.green,
    "Tools Used",
    C.green,
    "Figma AI · v0.dev · Galileo AI · Eraser.io · Mermaid Live",
  );

  addCard(slide, 0.5, 2.15, 4.5, 1.5, C.greenDim, C.green);
  slide.addText("What Was Generated", {
    x: 0.7,
    y: 2.25,
    w: 4.1,
    h: 0.28,
    fontFace: "Consolas",
    fontSize: 12,
    color: C.green,
    bold: true,
    margin: 0,
  });
  slide.addText(
    [
      { text: "First-pass wireframes for all 8 required screens", options: { bullet: true, breakLine: true } },
      { text: "Architecture flow diagram (Mermaid → Eraser.io)", options: { bullet: true, breakLine: true } },
      { text: "Dark terminal-precision aesthetic: 09090B bg, 4ADE80 accent", options: { bullet: true, breakLine: true } },
      { text: "Developer-focused layout: no marketing fluff", options: { bullet: true } },
    ],
    { x: 0.7, y: 2.55, w: 4.1, h: 1.0, fontFace: "Calibri", fontSize: 12, color: C.white, margin: 0 },
  );

  addCard(slide, 0.5, 3.75, 4.5, 1.0);
  slide.addText("Figma AI Prompt Used", {
    x: 0.7,
    y: 3.85,
    w: 4.1,
    h: 0.28,
    fontFace: "Consolas",
    fontSize: 12,
    color: C.green,
    bold: true,
    margin: 0,
  });
  slide.addText(
    '"Create a clean developer-focused web app UI for TestSeed... Use a simple dashboard layout, clear tables, validation warnings, and restrained colors."',
    {
      x: 0.7,
      y: 4.15,
      w: 4.1,
      h: 0.5,
      fontFace: "Consolas",
      fontSize: 11,
      color: C.green,
      italic: true,
      margin: 0,
    },
  );

  addInfoCard(
    slide,
    5.2,
    1.2,
    4.5,
    1.3,
    C.card,
    C.green,
    "Safety-Critical Design Failure",
    C.orange,
    "AI wireframes treated direct MongoDB seeding as a low-stakes action. The confirmation screen was too easy to skip. Required manual redesign to ensure the warning was prominent and the user had to explicitly confirm before insertion.",
  );
  addInfoCard(
    slide,
    5.2,
    2.6,
    4.5,
    1.0,
    C.card,
    C.green,
    "What We'd Do Differently",
    C.green,
    "Specify safety-critical UI requirements explicitly in the Figma prompt: 'Make direct seeding require a two-step confirmation with a visible warning.'",
  );
  addInfoCard(
    slide,
    5.2,
    3.7,
    4.5,
    0.9,
    C.card,
    C.green,
    "v0.dev Prototype",
    C.green,
    "v0.dev was used to rapidly prototype the Generation Workbench UI — especially the split-pane preview + chat layout. Saved ~4 hours of initial layout work.",
  );
}

// ─── Slide 10: AI in Implementation ───────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addSectionLabel(slide, "AI USAGE — IMPLEMENTATION");
  addSlideTitle(slide, "Implementation");
  addMemberTag(slide, "Hana");

  addInfoCard(
    slide,
    0.5,
    1.2,
    4.5,
    0.85,
    C.card,
    C.green,
    "Tools Used",
    C.green,
    "Cursor (Agent mode) · OpenAI Codex · Cline (VS Code) · BMAD Methodology",
  );

  addCard(slide, 0.5, 2.15, 4.5, 1.8, C.greenDim, C.green);
  slide.addText("What the Agent Built", {
    x: 0.7,
    y: 2.25,
    w: 4.1,
    h: 0.28,
    fontFace: "Consolas",
    fontSize: 12,
    color: C.green,
    bold: true,
    margin: 0,
  });
  slide.addText(
    [
      {
        text: "Turborepo monorepo scaffold (packages/types, packages/core, packages/db, apps/api, apps/web)",
        options: { bullet: true, breakLine: true },
      },
      { text: "Clean Architecture layer boundaries enforced via turbo.json", options: { bullet: true, breakLine: true } },
      { text: "Account Management epic: JWT auth + Nodemailer OTP + Upstash Redis", options: { bullet: true, breakLine: true } },
      { text: "Working health check endpoint (green baseline)", options: { bullet: true, breakLine: true } },
      { text: "Cross-package @testseed/* import aliases", options: { bullet: true } },
    ],
    { x: 0.7, y: 2.55, w: 4.1, h: 1.3, fontFace: "Calibri", fontSize: 12, color: C.white, margin: 0 },
  );

  addCard(slide, 5.2, 1.2, 4.5, 1.55);
  slide.addText(
    [
      { text: "What Went Wrong", options: { fontFace: "Consolas", fontSize: 12, color: C.orange, bold: true, breakLine: true } },
      {
        text: "Agent output used workspace:* syntax (pnpm/Yarn) inside package.json — invalid in npm workspaces.",
        options: { fontFace: "Calibri", fontSize: 11, color: C.white, breakLine: true },
      },
      {
        text: '"dependencies": { "@testseed/types": "workspace:*" }  ← broken',
        options: { fontFace: "Consolas", fontSize: 11, color: C.green, breakLine: true },
      },
      {
        text: '"@testseed/types": "*"  ← correct for npm',
        options: { fontFace: "Consolas", fontSize: 11, color: C.muted },
      },
    ],
    { x: 5.4, y: 1.3, w: 4.1, h: 1.35, margin: 0, valign: "top" },
  );
  addInfoCard(
    slide,
    5.2,
    2.85,
    4.5,
    1.0,
    C.card,
    C.green,
    "Key Agent Discipline",
    C.green,
    "Never delegate architectural layer rules to agent assumptions. Pass Clean Architecture constraints explicitly in every agent session prompt.",
  );
  addInfoCard(
    slide,
    5.2,
    3.95,
    4.5,
    0.85,
    C.card,
    C.green,
    "What We'd Do Differently",
    C.green,
    "Create AGENTS.md with monorepo conventions before the first coding session.",
  );
}

// ─── Slide 11: AI in Testing & Documentation ──────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addSectionLabel(slide, "AI USAGE — TESTING & DOCS");
  addSlideTitle(slide, "Testing & Documentation");
  addMemberTag(slide, "Mazen");

  addInfoCard(
    slide,
    0.5,
    1.2,
    4.5,
    0.85,
    C.card,
    C.green,
    "Tools Used",
    C.green,
    "Cline (VS Code) · GitHub Copilot · Mintlify · Swimm · Claude",
  );

  addCard(slide, 0.5, 2.15, 4.5, 1.8, C.greenDim, C.green);
  slide.addText("AI-Generated Edge Case Scenarios", {
    x: 0.7,
    y: 2.25,
    w: 4.1,
    h: 0.28,
    fontFace: "Consolas",
    fontSize: 12,
    color: C.green,
    bold: true,
    margin: 0,
  });
  slide.addText(
    [
      { text: "Invalid / malformed Mongoose schema input", options: { bullet: true, breakLine: true } },
      { text: "Failed MongoDB connection string", options: { bullet: true, breakLine: true } },
      { text: "Empty database (no collections found)", options: { bullet: true, breakLine: true } },
      { text: "Malformed AI JSON output → retry with correction prompt", options: { bullet: true, breakLine: true } },
      { text: "Duplicate unique field values across generated records", options: { bullet: true, breakLine: true } },
      { text: "Partial insertion failure → rollback only inserted collections", options: { bullet: true, breakLine: true } },
      { text: "Invalid or already-rolled-back seedBatchId", options: { bullet: true } },
    ],
    { x: 0.7, y: 2.55, w: 4.1, h: 1.3, fontFace: "Calibri", fontSize: 11, color: C.white, margin: 0 },
  );

  addInfoCard(
    slide,
    5.2,
    1.2,
    4.5,
    1.0,
    C.card,
    C.green,
    "Documentation Tooling",
    C.green,
    "Mintlify: Auto-generated API documentation from JSDoc comments in the backend. Swimm: Code walkthrough for onboarding new contributors.",
  );
  addInfoCard(
    slide,
    5.2,
    2.3,
    4.5,
    1.0,
    C.card,
    C.green,
    "Key Limitation",
    C.orange,
    "AI-generated rollback scenarios assumed all records in a batch would be accessible. Real-world MongoDB partial failures required human-designed retry logic.",
  );
  addInfoCard(
    slide,
    5.2,
    3.4,
    4.5,
    0.9,
    C.card,
    C.green,
    "What We'd Do Differently",
    C.green,
    "Run AI-generated test scenarios against the actual implementation much earlier — many scenarios were written before the feature was built.",
  );
}

// ─── Slides 12–15: Individual Reflections ─────────────────────────────────────
const reflectionLayout = (name, task, why, output, useful, challenge, future) => {
  const slide = pptx.addSlide();
  const lw = 4.5;
  const rx = 5.2;
  addReflectionSlide(slide, name, [
    { x: 0.5, y: 1.2, w: lw, h: 0.9, header: "Task", body: task },
    { x: 0.5, y: 2.2, w: lw, h: 0.9, header: "Why I Used AI", body: why },
    { x: 0.5, y: 3.2, w: lw, h: 1.1, fill: C.greenDim, header: "What AI Produced", body: output },
  ], [
    { x: rx, y: 1.2, w: lw, h: 1.0, header: "What Was Useful", body: useful },
    { x: rx, y: 2.3, w: lw, h: 1.0, header: "What Was Challenging", headerColor: C.orange, body: challenge },
    { x: rx, y: 3.4, w: lw, h: 0.9, header: "What I'd Do Differently", body: future },
  ]);
};

reflectionLayout(
  "Hana",
  "Bootstrapping the Turborepo monorepo with Clean Architecture using OpenAI Codex as an agent",
  "Complex multi-package setup with strict layer rules — too much boilerplate for manual scaffolding without introducing inconsistencies",
  "A working monorepo: packages/types + packages/core + packages/db + apps/api + apps/web with turbo.json build pipeline and @testseed/* import aliases",
  "Codex handled repetitive tsconfig.json, package.json, and turbo pipeline configuration correctly once given a clear architecture spec in the prompt",
  "Agent silently used workspace:* syntax (pnpm) in npm workspaces. Debugging took longer than the scaffold itself because the error only appeared at install time.",
  "Write AGENTS.md before the first session — an explicit file of monorepo conventions the agent must follow, checked into the repo.",
);

reflectionLayout(
  "Mariam",
  "Generating the A2 requirements and design document from the A1 proposal using Claude",
  "A2 required 11 epics, user stories with acceptance criteria, and alternative flows — far more structured content than the team could draft manually in the available time",
  "Complete requirements.md: 11 epics, 20+ user stories, acceptance criteria, alternative flows, system architecture description, 8 UI screen specs, Figma AI prompt, and AI usage reflection",
  "AI was especially valuable for edge case generation — it identified 12 alternative flows the team had not considered, including empty databases, sparse sample documents, and partial insertion failures",
  "AI repeatedly re-introduced features that were explicitly out of scope — SQL support, Prisma/Sequelize, team workspaces, long-term seed history. Every AI session required a pruning pass.",
  "Include a hard scope boundary statement at the start of every session: 'This project supports MongoDB and Mongoose only. Do not suggest SQL, Prisma, or multi-tenant features.'",
);

reflectionLayout(
  "Hassan",
  "Generating first-pass wireframes for all 8 required TestSeed screens using Figma AI",
  "8 screens needed initial mockups for team review before any coding started — generating drafts with AI was significantly faster than designing from scratch",
  "First-pass wireframes for: Login · Start screen · MongoDB connection · Schema review · Preview & edit · AI refinement chat · Export options · Insertion report & rollback",
  "Figma AI produced clean developer-tool layouts that matched the mental model of the target user. The starting point was good enough to review and validate the flow before implementation.",
  "AI wireframes treated the 'Insert into MongoDB' action as low-stakes — the confirmation was a single button. The real risk of direct database writes required a completely redesigned multi-step confirmation flow.",
  "Specify safety-critical interactions explicitly in the design prompt, not just the feature name. 'Include a two-step confirmation with visible warning before any destructive or irreversible database operation.'",
);

reflectionLayout(
  "Mazen",
  "Using Cline (VS Code) and GitHub Copilot to generate test scenarios for edge cases and error flows",
  "Edge cases like partial insertion failures and invalid rollback IDs are easy to miss when focusing on the happy path — AI can systematically explore negative flows",
  "12+ test scenarios covering: invalid schemas, failed connections, empty databases, malformed AI JSON, duplicate unique values, partial insertion failures, and invalid seedBatchId errors",
  "AI systematically covered the negative path in a way that complemented human happy-path thinking. Most of the alternative flows in the A2 document were originally AI-suggested.",
  "AI rollback scenarios assumed the seedBatchId would always be in the application database and all records accessible. Real partial failures required more sophisticated retry and compensation logic than the AI anticipated.",
  "Run AI-generated test scenarios against the actual implementation as it is being built — not after. Writing tests before the feature stabilizes leads to scenarios that don't match the real behavior.",
);

// ─── Slide 16: Key Learnings ──────────────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addSectionLabel(slide, "REFLECTION");
  addSlideTitle(slide, "What We Learned");

  const insights = [
    [0.5, "01", "AI is best at organizing and expanding — humans are needed for scoping and safety"],
    [3.6, "02", "Clean Architecture from day 1 prevented business logic leakage into framework layers"],
    [6.7, "03", "Agent mode works best when architectural rules are passed explicitly — not assumed"],
    [0.5, "04", "Always verify AI output before treating it as fact — especially for security-sensitive decisions"],
    [3.6, "05", "AI-generated edge cases are one of the highest-value uses in requirements engineering"],
    [6.7, "06", "AGENTS.md + DESIGN.md established upfront dramatically improves agent output quality"],
  ];

  insights.forEach(([x, num, text], i) => {
    const y = i < 3 ? 1.2 : 2.7;
    addCard(slide, x, y, 2.9, 1.3);
    slide.addText(num, {
      x: x + 0.15,
      y: y + 0.12,
      w: 0.5,
      h: 0.35,
      fontFace: "Consolas",
      fontSize: 18,
      color: C.green,
      margin: 0,
    });
    slide.addText(text, {
      x: x + 0.15,
      y: y + 0.5,
      w: 2.6,
      h: 0.7,
      fontFace: "Calibri",
      fontSize: 12,
      color: C.white,
      margin: 0,
    });
  });

  addCard(slide, 0.5, 4.2, 9, 0.8, C.greenDim, C.green);
  slide.addText(
    "The core question was never whether AI could write the code. It was whether the team could guide it toward the right architecture, the right scope, and the right safety decisions.",
    {
      x: 0.7,
      y: 4.3,
      w: 8.6,
      h: 0.6,
      fontFace: "Calibri",
      fontSize: 13,
      italic: true,
      color: C.white,
      margin: 0,
    },
  );
}

// ─── Slide 17: Q&A / Thank You ────────────────────────────────────────────────
{
  const slide = pptx.addSlide();
  setBg(slide);
  addFullBleedAccents(slide);
  slide.addText(
    [
      {
        text: "Thank You",
        options: {
          fontFace: "Consolas",
          fontSize: 48,
          bold: true,
          color: C.white,
          charSpacing: 4,
          breakLine: true,
        },
      },
      {
        text: "Questions?",
        options: { fontFace: "Calibri", fontSize: 22, color: C.muted },
      },
    ],
    { x: 1, y: 1.3, w: 8, h: 2, align: "center", valign: "middle", margin: 0 },
  );
  slide.addText("Hana  ·  Mariam  ·  Hassan  ·  Mazen", {
    x: 1,
    y: 3.4,
    w: 8,
    h: 0.5,
    fontFace: "Consolas",
    fontSize: 14,
    color: C.green,
    align: "center",
    margin: 0,
  });
  slide.addText("TestSeed — AI-Powered MongoDB Seed Data Generator", {
    x: 1,
    y: 4.0,
    w: 8,
    h: 0.4,
    fontFace: "Calibri",
    fontSize: 12,
    color: C.muted,
    align: "center",
    margin: 0,
  });
  slide.addText("CISC 818 · Milestone 3 · Queen's University", {
    x: 1,
    y: 4.5,
    w: 8,
    h: 0.4,
    fontFace: "Calibri",
    fontSize: 11,
    color: C.border,
    align: "center",
    margin: 0,
  });
}

// ─── Write file ───────────────────────────────────────────────────────────────
await pptx.writeFile({ fileName: OUT });
console.log(`Wrote ${OUT} (${pptx.slides.length} slides)`);
