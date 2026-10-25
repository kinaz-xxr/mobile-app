export type RawScores = {
  design: number;
  completion: number;
  theme_relevance: number;
  idea_innovation: number;
  technicality: number;
  pitching: number;
  time: number;
};

export const RUBRIC_VERSION = 2 as const;
export const CRITERIA = [
  {
    key: "idea_innovation",
    label: "Idea and Innovation",
    weight: 25,
    description:
      "How well the project identifies a problem and how original the solution is for a student project.",
    levels: [
      {
        value: 1,
        text: "Very basic or unoriginal idea that solves a trivial problem.",
      },
      {
        value: 2,
        text: "Clear problem defined, but mostly unoriginal with only a small creative touch.",
      },
      {
        value: 3,
        text: "Good practical solution with notable creativity and a solid use case.",
      },
      {
        value: 4,
        text: "Very interesting idea, highly original for a hackathon, and demonstrates great creative problem solving.",
      },
      {
        value: 5,
        text: "Deeply inspiring and creative concept that tackles a problem in a uniquely clever way.",
      },
    ],
  },
  {
    key: "technicality",
    label: "Technicality",
    weight: 25,
    description:
      "How effectively was technology used to implement the solution?",
    levels: [
      {
        value: 1,
        text: "Limited or overly simple use of technology that does not match the problem complexity.",
      },
      {
        value: 2,
        text: "Basic use of technology, but inefficient or poorly aligned with the solution needs.",
      },
      {
        value: 3,
        text: "Appropriate technology usage with good features like a proper balance of frameworks, databases, and application programming interfaces.",
      },
      {
        value: 4,
        text: "Well structured, thoughtful, and impressive technical implementation for a hackathon timeline.",
      },
      {
        value: 5,
        text: "Highly ambitious and successfully executed technical challenge, showing fantastic learning, coordination, and smart tool choices.",
      },
    ],
  },
  {
    key: "design",
    label: "Design",
    weight: 15,
    description:
      "How well-designed is the project including user interface, user experience, aesthetics, and accessibility?",
    levels: [
      {
        value: 1,
        text: "Barely functional, messy layout, and zero attention to design.",
      },
      {
        value: 2,
        text: "Basic user interface and user experience, but looks rushed and lacks visual polish.",
      },
      {
        value: 3,
        text: "Clean layout with decent usability and basic accessibility.",
      },
      {
        value: 4,
        text: "Very polished design with thoughtful user experience and strong accessibility features.",
      },
      {
        value: 5,
        text: "Exceptionally well crafted design that looks amazing, feels intuitive to use, and includes thoughtful accessibility touches for everyone.",
      },
    ],
  },
  {
    key: "completion",
    label: "Completion",
    weight: 15,
    description: "How complete is the project?",
    levels: [
      {
        value: 1,
        text: "Barely functional or missing most core features.",
      },
      {
        value: 2,
        text: "Functional, but heavily buggy or missing major intended features.",
      },
      {
        value: 3,
        text: "Functional with minor bugs and a solid set of working features.",
      },
      {
        value: 4,
        text: "Mostly complete, robust, and running smoothly with very few bugs.",
      },
      {
        value: 5,
        text: "Fully finished for a hackathon scope, completely stable, and shows incredible dedication to getting everything working.",
      },
    ],
  },
  {
    key: "pitching",
    label: "Pitching",
    weight: 10,
    description:
      "How clear and effective was the pitch? Award one point for each criterion met (0–5 total; zero means none met):",
    levels: [
      {
        value: 1,
        text: "Spoke clearly and audibly.",
      },
      {
        value: 2,
        text: "Explained the idea effectively.",
      },
      {
        value: 3,
        text: "Explained the data and technologies used.",
      },
      {
        value: 4,
        text: "Demonstrated the project smoothly.",
      },
      {
        value: 5,
        text: "Delivered an engaging presentation with great team coordination and a well-organized structure.",
      },
    ],
  },
  {
    key: "theme_relevance",
    label: "Theme Relevance",
    weight: 5,
    description: "How well does the project tie into the theme?",
    levels: [
      {
        value: 1,
        text: "Barely touches the theme and feels forced.",
      },
      {
        value: 2,
        text: "Moderate connection, but lacks creative integration.",
      },
      {
        value: 3,
        text: "Strong connection with clear and creative use of the theme.",
      },
      {
        value: 4,
        text: "Cleverly designed around the theme in a way that heavily shapes the core experience.",
      },
      {
        value: 5,
        text: "Deeply integrated connection where it is easy to tell where and how the project ties into the theme.",
      },
    ],
  },
  {
    key: "time",
    label: "Time Management",
    weight: 5,
    description: "Did the team stay within the given six minute time limit?",
    levels: [
      {
        value: 5,
        text: "Stayed within six minutes.",
      },
      {
        value: 3,
        text: "Over by more than 0 but less than 30 seconds.",
      },
      {
        value: 2,
        text: "Over by 30 to 60 seconds, inclusive.",
      },
      {
        value: 1,
        text: "Over by more than 60 seconds.",
      },
    ],
  },
] as const;

export function weightedTotal(scores: RawScores): number {
  return CRITERIA.reduce((sum, c) => sum + (scores[c.key] * c.weight) / 5, 0);
}
