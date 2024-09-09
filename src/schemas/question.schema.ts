import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Answer } from './answer.schema';

export type QuestionDocument = Question & Document;

@Schema()
export class Question {
  @Prop({ required: true })
  text: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Answer' }] })
  answers: Answer[];

  @Prop({ enum: ['single', 'multiple'], required: true })
  type: 'single' | 'multiple';

  _id: Types.ObjectId; // Add this line to include the _id property
}

export const QuestionSchema = SchemaFactory.createForClass(Question);