import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string; // In a real application, you'd likely hash and salt this

  // Add other user-related fields as needed (e.g., name, profile picture, etc.)
  @Prop({ required: true })
  id: string;
}

export const UserSchema = SchemaFactory.createForClass(User);