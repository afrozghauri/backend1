// src/models/quiz.model.ts
import * as mongoose from 'mongoose'; 

// Import the Quiz schema and QuizDocument type
import { QuizSchema, QuizDocument } from '../schemas/quiz.schema';

export type QuizModelType = mongoose.Model<QuizDocument>;

// Create and export the Quiz model
export const QuizModel = mongoose.model<QuizDocument>('Quiz', QuizSchema);