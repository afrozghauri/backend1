import { IsNotEmpty, IsString, IsEnum, IsArray, IsBoolean } from 'class-validator';
export class QuestionDto {
  @IsNotEmpty()
  @IsString()
  text: string; // No need for an 'id' field here

  @IsNotEmpty()
  @IsArray()
  answers: string[];

  @IsNotEmpty()
  @IsArray()
  @IsBoolean({ each: true })
  isAnswerCorrect: boolean[]; // Use isAnswerCorrect directly

  @IsNotEmpty()
  @IsEnum(['single', 'multiple'])
  type: 'single' | 'multiple';
}