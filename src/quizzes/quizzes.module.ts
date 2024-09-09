import { Module } from '@nestjs/common';
import { QuizzesController } from 'src/quizzes/quizzes.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Quiz, QuizSchema } from '../schemas/quiz.schema';
import { Question, QuestionSchema } from '../schemas/question.schema';
import { Answer, AnswerSchema } from '../schemas/answer.schema';
import { QuizzesService } from './quizzes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: Question.name, schema: QuestionSchema },
      { name: Answer.name, schema: AnswerSchema },
    ]),
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
})
export class QuizzesModule {}