// src/quizzes/dtos/answer.dto.ts
import { IsNotEmpty, IsString, IsBoolean } from 'class-validator';

export class AnswerDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}