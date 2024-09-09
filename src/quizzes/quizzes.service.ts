import { Injectable, HttpException, HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import   
 { Model, Types } from 'mongoose';
import { Quiz, QuizDocument } from 'src/schemas/quiz.schema';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import { Answer } from 'src/schemas/answer.schema';
import { CreateQuizDto } from 'src/dtos/create_quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument>,
    @InjectModel(Question.name) private readonly questionModel: Model<QuestionDocument>,   

    @InjectModel(Answer.name) private readonly answerModel: Model<Answer>,   

  ) {}

  async getUserQuizzes(userId: string): Promise<Quiz[]> {
    try {
      const quizzes = await this.quizModel.find({ createdBy: userId }).exec();
      return quizzes;
    } catch (error) {
      console.error('Error fetching user quizzes:', error);
      throw new HttpException('Failed to fetch quizzes', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createQuiz(createQuizDto: CreateQuizDto, userId: string): Promise<Quiz> {
    try {
      const questionDocuments = await Promise.all(
        createQuizDto.questions.map(async (questionData) => {
          const answerDocuments = await Promise.all(
            questionData.answers.map(async (answerText: string, index: number) => {
              const newAnswer = new this.answerModel({
                text: answerText,
                isCorrect: questionData.isAnswerCorrect[index],
              });
              return newAnswer.save();
            })
          );

          const newQuestion = new this.questionModel({
            text: questionData.text,
            answers: answerDocuments.map((answer) => answer._id),
            type: questionData.type,
          });
          return newQuestion.save();
        })
      );

      const newQuiz = new this.quizModel({
        title: createQuizDto.title,
        questions: questionDocuments.map((question) => question._id),
        createdBy: userId,
        isPublished: createQuizDto.isPublished || false,
      });

      return await newQuiz.save();
    } catch (error) {
      console.error('Error creating quiz:', error);
      throw new HttpException('Failed to create quiz', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Updated updateQuiz method to handle question updates
  async updateQuiz(quizId: string, updateQuizDto: CreateQuizDto, userId: string): Promise<Quiz | null> { 
    try {
      // 1. Find the existing quiz
      const existingQuiz = await this.quizModel.findOne({ _id: quizId, createdBy: userId });
      if (!existingQuiz) {
        throw new NotFoundException('Quiz not found or you are not authorized to modify it');
      }

      // 2. Update the quiz title and isPublished fields
      existingQuiz.title = updateQuizDto.title;
      existingQuiz.isPublished = updateQuizDto.isPublished || false;

      // 3. Handle question additions (no updates, as we removed the ID from QuestionDto)
      if (updateQuizDto.questions && updateQuizDto.questions.length > 0) {
        for (const questionData of updateQuizDto.questions) {
          // Handle answer creation
          const answerDocuments = await Promise.all(
            questionData.answers.map(async (answerText: string, index: number) => {
              const newAnswer = new this.answerModel({
                text: answerText,
                isCorrect: questionData.isAnswerCorrect[index],
              });
              return newAnswer.save();
            })
          );

          // Create a new question and add its ID to the quiz
          const newQuestion = new this.questionModel({
            text: questionData.text,
            answers: answerDocuments.map(answer => answer._id),
            type: questionData.type,
          });
          const savedQuestion = await newQuestion.save();
          existingQuiz.questions.push(savedQuestion._id);
        }
      }

      const savedQuiz = await existingQuiz.save();
      return savedQuiz;
    } catch (error) {
      console.error('Error updating quiz:', error);
      throw new HttpException('Failed to update quiz', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async getQuizByPermalink(permalink: string): Promise<Quiz | null> {
    try {
      const quiz = await this.quizModel.findOne({ permalink })
        .populate({
          path: 'questions',
          populate: {
            path: 'answers'
          }
        })
        .exec(); 

      if (!quiz) {
        throw new NotFoundException('Quiz not found');
      }

      return quiz;
    } catch (error) {
      console.error('Error fetching quiz by permalink:', error);
      throw new HttpException('Failed to fetch quiz', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteQuiz(quizId: string, userId: string) {
    // Find the quiz by ID and createdBy
    const quiz = await this.quizModel.findOne({ _id: quizId, createdBy: userId });

    if (!quiz) {
      throw new NotFoundException('Quiz not found or you are not authorized to delete it');
    }

    if (quiz.isPublished) { 
      throw new BadRequestException('Cannot delete a published quiz');
    }

    // Delete the quiz
    await this.quizModel.deleteOne({ _id: quizId });
  }
}
