import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { FirebaseService } from '../services/firebase.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])], // Import MongooseModule and register UserSchema
  controllers: [AuthController],
  providers: [FirebaseService],
})
export class AuthModule {}