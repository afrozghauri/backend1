import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../auth/auth.module';
import { QuizzesModule } from '../quizzes/quizzes.module';

import { Question, QuestionSchema } from '../schemas/question.schema';
import { Answer, AnswerSchema } from '../schemas/answer.schema';
import { ConfigModule } from '@nestjs/config'; 
import { Quiz, QuizSchema } from 'src/schemas/quiz.schema';


@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI!), 
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: Answer.name, schema: AnswerSchema },
      {name:Quiz.name, schema: QuizSchema},
    ]),
    AuthModule,
    QuizzesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}