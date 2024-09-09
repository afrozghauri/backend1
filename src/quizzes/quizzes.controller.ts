import { 
  Controller, Post, Get, Body, UseGuards, Req, BadRequestException, NotFoundException, Param, Delete, Put 
} from '@nestjs/common';
import { QuizModel, QuizModelType } from '../models/quiz.model';
import { QuestionModel } from '../models/question.model';
import { AnswerModel } from '../models/answer.model';
import { InjectModel } from '@nestjs/mongoose';
import { validate } from 'class-validator';
import { Request } from 'express';
import { FirebaseAuthGuard } from '../auth/auth.guard';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Quiz, QuizDocument } from '../schemas/quiz.schema';
import { Question, QuestionDocument } from '../schemas/question.schema';
import { Answer, AnswerDocument } from '../schemas/answer.schema';
import  { QuizzesService } from './quizzes.service';
import { Model, PopulateOptions, Types } from 'mongoose';
import { CreateQuizDto } from 'src/dtos/create_quiz.dto';
import { QuestionDto } from '../dtos/question.dto';
import {v4 as uuidv4} from 'uuid';


@Controller('quizzes')
export class QuizzesController {
  constructor(
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument> & { populate: (path: string | PopulateOptions) => any },
    @InjectModel(Question.name) private readonly questionModel: QuestionModel,
    @InjectModel(Answer.name) private readonly answerModel: AnswerModel,
    private readonly quizzesService: QuizzesService, 
  ) {}

  @Post('create')
@UseGuards(FirebaseAuthGuard)
async createQuiz(@Body() quizData: CreateQuizDto, @Req() req: Request) {
  try {
    // 1. Validate quiz data (keep this validation)
    const validationErrors = await validate(quizData);
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(error => Object.values(error.constraints || {})).flat();
      throw new BadRequestException(errorMessages);
    }

    // 2. Get the authenticated user's ID from the request (keep this too)
    const userId = (req as any).user.uid;

    // 3. Delegate the quiz creation to the service 
    console.log('Calling quizzesService.createQuiz'); 
    const savedQuiz = await this.quizzesService.createQuiz(quizData, userId);
    console.log('Quiz created:', savedQuiz);

    return savedQuiz; 
  }catch (error) {
      // ... (error handling)
    }
  }

  @Post('save')
@UseGuards(FirebaseAuthGuard) 
async saveQuiz(@Body() quizData: CreateQuizDto, @Req() req: Request) {
  try {
    // 1. Validate quiz data
    const validationErrors = await validate(quizData);
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(error => Object.values(error.constraints || {})).flat();
      throw new BadRequestException(errorMessages); 
    }

    // 2. Get the authenticated user's ID from the request
    const userId = (req as any).user.uid;
    console.log('Incoming quizData in saveQuiz:', quizData);

    // 3. Create/Update questions and answers in MongoDB
    const questionDocuments = await Promise.all(
      quizData.questions.map(async (questionData: QuestionDto) => {
        // Add a check to ensure isAnswerCorrect exists and has the correct length
        if (!questionData.isAnswerCorrect) {
          console.error('isAnswerCorrect is missing'); // Log if isAnswerCorrect is missing
        } else {
          console.log('isAnswerCorrect exists:', questionData.isAnswerCorrect); // Log if isAnswerCorrect exists
        }

        if (!questionData.answers) {
          console.error('answers array is missing'); // Log if answers is missing
        } else {
          console.log('answers array exists:', questionData.answers); // Log if answers exists
        }

        if (questionData.isAnswerCorrect && questionData.answers &&
            questionData.isAnswerCorrect.length !== questionData.answers.length) {
          console.error('isAnswerCorrect length:', questionData.isAnswerCorrect.length); // Log lengths for comparison
          console.error('answers length:', questionData.answers.length);
          throw new BadRequestException('Invalid question data: isAnswerCorrect or answers array is missing or has incorrect length');
        }
        // Handle answer creation/update
        const answerDocuments = await Promise.all(
          questionData.answers.map(async (answerText: string, index: number) => {
              // If it's a new question, create new answers
              const newAnswer = new this.answerModel({
                text: answerText,
                isCorrect: questionData.isAnswerCorrect[index],
              });
              return newAnswer.save();
          })
        );

        // Handle question creation ONLY (no updates here, as we removed the ID)
        const newQuestion = new this.questionModel({
          text: questionData.text,
          answers: answerDocuments.map(answer => answer._id),
          type: questionData.type,
        });
        return newQuestion.save();
      })
    );

    // 4. Create/update the quiz in MongoDB
    let savedOrUpdatedQuiz: QuizDocument; // Use QuizDocument for type safety

    if (quizData.id) {
      console.log('Calling quizzesService.updateQuiz');
      savedOrUpdatedQuiz = await this.quizzesService.updateQuiz(quizData.id, quizData, userId) as QuizDocument;
      console.log('Quiz updated:', savedOrUpdatedQuiz);
    } else {
      // Generate a unique permalink for the new quiz using uuid
      const permalink = uuidv4();

      console.log('Generated permalink:', permalink);

       
      const newQuiz = new this.quizModel({
        title: quizData.title,
        questions: questionDocuments.map(question => question._id),
        createdBy: userId,
        isPublished: quizData.isPublished || false,
        permalink: permalink,
      });
      savedOrUpdatedQuiz = await newQuiz.save();
      console.log('Saved quiz:', savedOrUpdatedQuiz);
    }

    // Populate questions and answers before returning
    savedOrUpdatedQuiz = await this.quizModel 
      .findOne({ _id: savedOrUpdatedQuiz._id })
      .populate({
        path: 'questions',
        populate: {
          path: 'answers'
        }
      })
      .exec() as QuizDocument; 

    return savedOrUpdatedQuiz; 
  } catch (error) {
    console.error('Error in saveQuiz:', error);
    // Handle errors and return appropriate HTTP status codes
    if (error instanceof BadRequestException) {
      throw error; 
    } else {
      throw new HttpException('Failed to save quiz', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

@Post(':quizId/questions')
@UseGuards(FirebaseAuthGuard)
async addOrUpdateQuestion(
  @Param('quizId') quizId: string,
  @Body() questionData: QuestionDto,
  @Req() req: Request
) {
  try {
    // 1. Log received data
    console.log('Received request to add/update question');
    console.log('quizId:', quizId);
    console.log('questionData:', questionData);

    const userId = (req as any).user.uid;

    // 2. Find the quiz by ID and createdBy (ensure the user is authorized)
    const quiz = await this.quizModel.findOne({ _id: quizId, createdBy: userId });
    if (!quiz) {
      throw new NotFoundException('Quiz not found or you are not authorized to modify it');
    }

    // 3. Create answers in MongoDB
    const answerDocuments = await Promise.all(
      questionData.answers.map(async (answerText: string, index: number) => {
        const newAnswer = new this.answerModel({
          text: answerText,
          isCorrect: questionData.isAnswerCorrect[index], 
        });
        return newAnswer.save();
      })
    );

    // 4. Create the question in MongoDB (no updates here, as we removed the ID from QuestionDto)
    const newQuestion = new this.questionModel({
      text: questionData.text,
      answers: answerDocuments.map(answer => answer._id),
      type: questionData.type,
    });
    const savedQuestionDoc = await newQuestion.save();
    const savedQuestion = savedQuestionDoc.toObject() as Question;

    // Add the new question's ID to the quiz's questions array
    quiz.questions.push(savedQuestion._id);
    await quiz.save();

    return savedQuestion;
  } catch (error) {
    // Handle errors gracefully
    console.error('Error adding/updating question:', error);
    if (error instanceof HttpException) {
      throw error; 
    } else {
      throw new HttpException('Failed to add/update question', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
@Get(':quizId/questions')
  @UseGuards(FirebaseAuthGuard)
  async getQuestionsForQuiz(
    @Param('quizId') quizId: string,
    @Req() req: Request
  ) {
    try {
      const userId = (req as any).user.uid;

      // Find the quiz by ID and ensure the user is authorized
      const quiz = await this.quizModel.findOne({ _id: quizId, createdBy: userId });
      if (!quiz) {
        throw new NotFoundException('Quiz not found or you are not authorized to view its questions');
      }

      // Populate questions and their answers
      await quiz.populate({
        path: 'questions',
        populate: {
          path: 'answers'
        }
      });

      // Return only the questions array from the quiz
      return quiz.questions; 
    } catch (error) {
      console.error('Error fetching questions for quiz:', error);
      throw new HttpException('Failed to fetch questions for quiz', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
@Get('my-quizzes')
  @UseGuards(FirebaseAuthGuard)
  async getMyQuizzes(@Req() req: Request) {
    try {
      const userId = (req as any).user.uid;
      console.log('User ID in getMyQuizzes:', userId);
      const quizzes = await this.quizzesService.getUserQuizzes(userId);
      console.log('Quizzes retrieved:', quizzes); 
      return quizzes;
    } catch (error) {
      console.error('Error fetching user quizzes:', error);
      throw new HttpException('Failed to fetch quizzes', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
            
            @Delete(':id')
            @UseGuards(FirebaseAuthGuard)
            async deleteQuiz(@Param('id') quizId: string, @Req() req: Request) {
            try {
            const userId = (req as any).user.uid;
            
              // Find the quiz by ID and createdBy
              const quiz = await this.quizModel.findOne({ _id: quizId, createdBy: userId });
            
              if (!quiz) {
                throw new NotFoundException('Quiz not found or you are not authorized to delete it');
              }
            
              
            
              // Delete the quiz
              await this.quizModel.deleteOne({ _id: quizId });
            
              return { message: 'Quiz deleted successfully' };
            } catch (error) {
              // Handle errors gracefully
              console.error('Error deleting quiz:', error);
              if (error instanceof HttpException) {
                throw error; 
              } else {
                throw new HttpException('Failed to delete quiz', HttpStatus.INTERNAL_SERVER_ERROR);
              }
            }
            }
            
            @Put(':quizId/questions/:questionId')
@UseGuards(FirebaseAuthGuard)
async updateQuestion(
  @Param('quizId') quizId: string,
  @Param('questionId') questionId: string,
  @Body() questionData: QuestionDto,
  @Req() req: Request
) {
  try {
    const userId = (req as any).user.uid;

    // 1. Validate question data
    const validationErrors = await validate(questionData);
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(error => Object.values(error.constraints || {})).flat();
      throw new BadRequestException(errorMessages);
    }

    // 2. Find the quiz by ID and createdBy (ensure the user is authorized)
    const quiz = await this.quizModel.findOne({ _id: quizId, createdBy: userId });
    if (!quiz) {
      throw new NotFoundException('Quiz not found or you are not authorized to modify it');
    }

    // 3. Check if the question belongs to the quiz
    if (!quiz.questions.some(q => q.toString() === questionId)) {
      throw new NotFoundException('Question not found in this quiz');
    }

    // 4. Find the existing question
    const existingQuestion = await this.questionModel.findById(questionId).populate('answers');
    if (!existingQuestion) {
      throw new NotFoundException('Question not found');
    }

    // 5. Update/create answers 
    const updatedAnswerDocuments: AnswerDocument[] = await Promise.all( // Explicitly type the result
      questionData.answers.map(async (answerText: string, index: number) => {
        if (index < existingQuestion.answers.length) {
          // Update existing answer
          const existingAnswer = existingQuestion.answers[index] as AnswerDocument;
          existingAnswer.text = answerText;
          existingAnswer.isCorrect = questionData.isAnswerCorrect[index];
          return existingAnswer.save(); // Await and return the saved answer
        } else {
          // Create new answer
          const newAnswer = new this.answerModel({
            text: answerText,
            isCorrect: questionData.isAnswerCorrect[index],
          });
          return newAnswer.save(); // Await and return the saved answer
        }
      })
    );

    // 6. Delete any extra answers if the number of answers was reduced
    if (updatedAnswerDocuments.length < existingQuestion.answers.length) {
      const answersToDelete = existingQuestion.answers.slice(updatedAnswerDocuments.length);
      await this.answerModel.deleteMany({ _id: { $in: answersToDelete } });
    }

    // 7. Update the question in MongoDB
    existingQuestion.text = questionData.text;
    existingQuestion.answers = updatedAnswerDocuments; // Assign the updatedAnswerDocuments directly
    existingQuestion.type = questionData.type;
    const updatedQuestion = await existingQuestion.save();

    return updatedQuestion;
  } catch (error) {
    // Handle errors gracefully
    console.error('Error updating question:', error);
    if (error instanceof HttpException) {
      throw error;
    } else {
      throw new HttpException('Failed to update question', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
            
@Get('permalink/:permalink')
async getQuizByPermalink(@Param('permalink') permalink: string) {
  try {
    const quiz = await this.quizModel.findOne({ permalink }).populate('questions').exec(); 

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    
    // Populate answers for each question
    await Promise.all(quiz.questions.map(async (question: any) => {
      await question.populate('answers').execPopulate(); 
    }));
    
    return quiz;
  } catch (error) {
    // Handle errors gracefully
    console.error('Error fetching quiz by permalink:', error);
    throw new HttpException('Failed to fetch quiz', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
}