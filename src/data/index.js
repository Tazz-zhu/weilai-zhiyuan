// 数据聚合入口
import { careersPart1 } from './careersPart1.js';
import { careersPart2 } from './careersPart2.js';
import { careersPart3 } from './careersPart3.js';
import { careersPart4 } from './careersPart4.js';
import { careersPart5 } from './careersPart5.js';
import { careersPart6 } from './careersPart6.js';
import { careersPart7 } from './careersPart7.js';
import { careersPart8 } from './careersPart8.js';
import { majorsPart1 } from './majorsPart1.js';
import { majorsPart2 } from './majorsPart2.js';
import { scripts, mentors } from './miscData.js';
import { questions } from './questions.js';
import { schools } from './schools.js';

export const careers = [...careersPart1, ...careersPart2, ...careersPart3, ...careersPart4, ...careersPart5, ...careersPart6, ...careersPart7, ...careersPart8];
export const majors = [...majorsPart1, ...majorsPart2];
export { scripts, mentors, questions, schools };

export const careerCategories = [...new Set(careers.map(c => c.category))];
export const majorCategories = [...new Set(majors.map(m => m.category))];

export const careerById = new Map(careers.map(c => [c.id, c]));
export const majorById = new Map(majors.map(m => [m.id, m]));
export const scriptById = new Map(scripts.map(s => [s.id, s]));
export const mentorById = new Map(mentors.map(m => [m.id, m]));
