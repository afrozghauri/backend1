import { Model } from 'mongoose';
import { QuestionDocument } from '../schemas/question.schema';

export type QuestionModel = Model<QuestionDocument>;