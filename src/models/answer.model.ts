import { Model } from 'mongoose';
import { AnswerDocument } from '../schemas/answer.schema';

export type AnswerModel = Model<AnswerDocument>;